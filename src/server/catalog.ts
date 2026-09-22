import 'server-only'
import { cache } from 'react'
import { ThemeListingSchema, type CatalogTheme } from '@/domain/catalog'
import { couponDiscount, evaluateCoupon } from '@/domain/coupons'
import { listPrice } from '@/domain/pricing'
import { publicDb, serviceDb, unwrap, unwrapMaybe } from './db/client'
import { toCoupon } from './mappers'
import { log } from './log'

/**
 * Catálogo leído de la base (elimina el productsData hardcodeado del
 * prototipo, hallazgo I). Se lee con la clave pública: la RLS solo deja ver
 * temáticas publicadas.
 */

export interface PublicSettings {
  basePriceCents: number
  giftLifetimeDays: number
  currency: string
}

export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  const row = unwrap(
    await publicDb()
      .from('settings')
      .select('base_price_cents, gift_lifetime_days, currency')
      .single(),
    'settings',
  )
  return {
    basePriceCents: row.base_price_cents,
    giftLifetimeDays: row.gift_lifetime_days,
    currency: row.currency,
  }
})

export interface CatalogThemeWithVersion extends CatalogTheme {
  versionId: string
  sortOrder: number
}

type ThemeRow = {
  id: string
  slug: string
  name: string
  category: string
  description: string
  price_cents: number | null
  sort_order: number
  listing: unknown
  current_version_id: string | null
}

function toCatalogTheme(row: ThemeRow, settings: PublicSettings): CatalogThemeWithVersion | null {
  const listing = ThemeListingSchema.safeParse(row.listing)
  if (!listing.success || !row.current_version_id) {
    log.error('Temática publicada con ficha inválida: se oculta del catálogo', listing.error, {
      slug: row.slug,
    })
    return null
  }
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    description: row.description,
    priceCents: listPrice(settings.basePriceCents, row.price_cents),
    listing: listing.data,
    versionId: row.current_version_id,
    sortOrder: row.sort_order,
  }
}

const THEME_COLUMNS =
  'id, slug, name, category, description, price_cents, sort_order, listing, current_version_id'

export const listPublishedThemes = cache(async (): Promise<CatalogThemeWithVersion[]> => {
  const [settings, rows] = await Promise.all([
    getPublicSettings(),
    publicDb()
      .from('themes')
      .select(THEME_COLUMNS)
      .eq('status', 'published')
      .order('sort_order')
      .order('name')
      .then((r) => unwrap(r, 'themes')),
  ])
  return rows.flatMap((row) => toCatalogTheme(row, settings) ?? [])
})

export const getPublishedTheme = cache(
  async (slug: string): Promise<CatalogThemeWithVersion | null> => {
    if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null
    const [settings, row] = await Promise.all([
      getPublicSettings(),
      publicDb()
        .from('themes')
        .select(THEME_COLUMNS)
        .eq('slug', slug)
        .eq('status', 'published')
        .maybeSingle()
        .then((r) => unwrapMaybe(r, 'theme')),
    ])
    return row ? toCatalogTheme(row, settings) : null
  },
)

export interface UrgencyOffer {
  code: string
  kind: 'percent' | 'fixed'
  value: number
  label: string
  delaySeconds: number
}

export const getUrgencyOffer = cache(async (): Promise<UrgencyOffer | null> => {
  const settings = unwrap(
    await serviceDb().from('settings').select('offer_coupon_id, offer_delay_seconds').single(),
    'settings',
  )
  if (!settings.offer_coupon_id) return null
  const row = unwrapMaybe(
    await serviceDb().from('coupons').select('*').eq('id', settings.offer_coupon_id).maybeSingle(),
    'offer coupon',
  )
  if (!row) return null
  const coupon = toCoupon(row)
  if (!evaluateCoupon(coupon, new Date()).ok) return null
  return {
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.value,
    label: coupon.kind === 'percent' ? `${coupon.value}% OFF` : 'descuento',
    delaySeconds: settings.offer_delay_seconds,
  }
})

export function applyOffer(
  offer: { kind: 'percent' | 'fixed'; value: number },
  listCents: number,
): number {
  return listCents - couponDiscount(offer, listCents)
}
