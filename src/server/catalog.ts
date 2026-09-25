import 'server-only'
import { cache } from 'react'
import { ThemeListingSchema, type CatalogTheme } from '@/domain/catalog'
import { evaluateCoupon, normalizeCouponCode, type Coupon } from '@/domain/coupons'
import { listPrice } from '@/domain/pricing'
import { readThemeConfig, type ParsedThemeConfig } from '@/slides/config'
import { publicDb, serviceDb, unwrap, unwrapMaybe } from './db/client'
import { activePlans, type Plan } from '@/domain/plans'
import {
  demoCoupons,
  demoOffer,
  demoPlans,
  demoSettings,
  demoThemeConfig,
  demoThemes,
  isDemoMode,
} from './demo'
import { log } from './log'
import { toCoupon, toPlan } from './mappers'

/**
 * Catálogo leído de la base (elimina el productsData hardcodeado del
 * prototipo, hallazgo I). Se lee con la clave pública: la RLS solo deja ver
 * temáticas publicadas. En modo demo sale del catálogo inicial.
 */

export interface PublicSettings {
  basePriceCents: number
  giftLifetimeDays: number
  currency: string
  /** Ventas pausadas desde el panel: el checkout avisa y no cobra. */
  salesPaused: boolean
}

export const getPublicSettings = cache(async (): Promise<PublicSettings> => {
  if (isDemoMode()) return demoSettings()
  // select('*'): sales_paused llega con la migración del panel; sin ella, no está pausado.
  const row = unwrap(await publicDb().from('settings').select('*').single(), 'settings') as {
    base_price_cents: number
    gift_lifetime_days: number
    currency: string
    sales_paused?: boolean
  }
  return {
    basePriceCents: row.base_price_cents,
    giftLifetimeDays: row.gift_lifetime_days,
    currency: row.currency,
    salesPaused: row.sales_paused === true,
  }
})

/**
 * Los planes a la venta, del más básico al más completo. Sin planes (o sin la
 * migración del panel), la tienda cobra el precio base como siempre.
 */
export const listPublicPlans = cache(async (): Promise<Plan[]> => {
  if (isDemoMode()) return demoPlans()
  const result = await publicDb().from('plans').select('*').eq('active', true).order('rank')
  if (result.error) {
    log.warn('No se pudieron leer los planes: se vende al precio base', {
      error: result.error.message,
    })
    return []
  }
  return activePlans(result.data.map(toPlan))
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
  if (isDemoMode()) return demoThemes()
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
    if (isDemoMode()) return demoThemes().find((t) => t.slug === slug) ?? null
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

/** La configuración (capa 1) de una versión publicada, ya validada. */
export const getThemeVersionConfig = cache(
  async (versionId: string): Promise<ParsedThemeConfig | null> => {
    if (isDemoMode()) return demoThemeConfig(versionId)
    const row = unwrapMaybe(
      await publicDb().from('theme_versions').select('config').eq('id', versionId).maybeSingle(),
      'theme version',
    )
    return row ? readThemeConfig(row.config) : null
  },
)

/** Busca un cupón por código (sin validarlo: eso es evaluateCoupon). */
export async function findCoupon(input: string | null | undefined): Promise<Coupon | null> {
  const code = normalizeCouponCode(input)
  if (!code) return null
  if (isDemoMode()) return demoCoupons().find((c) => c.code === code) ?? null
  const row = unwrapMaybe(
    await serviceDb().from('coupons').select('*').eq('code', code).maybeSingle(),
    'coupon',
  )
  return row ? toCoupon(row) : null
}

export interface UrgencyOffer {
  code: string
  kind: 'percent' | 'fixed'
  value: number
  label: string
  delaySeconds: number
}

/**
 * La oferta que aparece en la ficha a los N segundos (LOQUIEROYA25). El monto
 * sale del cupón real de la base: el prototipo prometía "50% OFF" en la
 * pantalla y el cupón aplicaba lo que dijera server.js.
 */
export const getUrgencyOffer = cache(async (): Promise<UrgencyOffer | null> => {
  let coupon: Coupon | null
  let delaySeconds = 15
  if (isDemoMode()) {
    const offer = demoOffer()
    if (!offer.couponId) return null
    delaySeconds = offer.delaySeconds
    coupon = demoCoupons().find((c) => c.id === offer.couponId) ?? null
  } else {
    const settings = unwrap(
      await serviceDb().from('settings').select('offer_coupon_id, offer_delay_seconds').single(),
      'settings',
    )
    if (!settings.offer_coupon_id) return null
    delaySeconds = settings.offer_delay_seconds
    const row = unwrapMaybe(
      await serviceDb()
        .from('coupons')
        .select('*')
        .eq('id', settings.offer_coupon_id)
        .maybeSingle(),
      'offer coupon',
    )
    coupon = row ? toCoupon(row) : null
  }
  if (!coupon || !evaluateCoupon(coupon, new Date()).ok) return null
  return {
    code: coupon.code,
    kind: coupon.kind,
    value: coupon.value,
    label: coupon.kind === 'percent' ? `${coupon.value}% OFF` : 'descuento',
    delaySeconds,
  }
})
