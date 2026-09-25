import 'server-only'
import amistad from '../../supabase/seed/themes/amistad.json'
import cumpleanos from '../../supabase/seed/themes/cumpleanos.json'
import pareja from '../../supabase/seed/themes/pareja.json'
import { ThemeListingSchema } from '@/domain/catalog'
import type { Coupon } from '@/domain/coupons'
import { readThemeConfig, type ParsedThemeConfig } from '@/slides/config'

/**
 * Modo demo (DEMO_MODE=1): el sitio funciona sin Supabase ni Mercado Pago,
 * leyendo el catálogo inicial de supabase/seed. Sirve para mostrar el producto
 * y revisar diseño en un deploy sin secretos. El cobro queda deshabilitado.
 *
 * Nunca se activa solo: si falta la variable, la app usa la base de verdad.
 */

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === '1'
}

const SEEDS = [pareja, cumpleanos, amistad]

/** Precio de referencia de la demo (ficticio): el real vive en la tabla settings. */
export const DEMO_SETTINGS = { basePriceCents: 499_000, giftLifetimeDays: 60, currency: 'ARS' }

export function demoThemes() {
  return SEEDS.map((seed) => ({
    id: seed.slug,
    slug: seed.slug,
    name: seed.name,
    category: seed.category,
    description: seed.description,
    priceCents: DEMO_SETTINGS.basePriceCents,
    listing: ThemeListingSchema.parse(seed.listing),
    versionId: `demo-${seed.slug}`,
    sortOrder: seed.sortOrder,
  })).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function demoThemeConfig(versionId: string): ParsedThemeConfig | null {
  const seed = SEEDS.find((s) => `demo-${s.slug}` === versionId)
  return seed ? readThemeConfig(seed.config) : null
}

/** Los mismos cupones que carga la migración inicial. */
const coupon = (code: string, value: number): Coupon => ({
  id: `demo-${code}`,
  code,
  kind: 'percent',
  value,
  active: true,
  maxUses: null,
  usedCount: 0,
  startsAt: null,
  expiresAt: null,
  affiliateId: null,
})

export const DEMO_COUPONS: Coupon[] = [
  coupon('BOXIE10', 10),
  coupon('PAREJA20', 20),
  coupon('INFLUENCER50', 50),
  coupon('LOQUIEROYA25', 25),
  coupon('PROMO35', 35),
]

export const DEMO_OFFER_CODE = 'LOQUIEROYA25'
