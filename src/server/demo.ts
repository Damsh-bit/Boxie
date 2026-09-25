import 'server-only'
import { ThemeListingSchema } from '@/domain/catalog'
import type { Coupon } from '@/domain/coupons'
import { activePlans, type Plan } from '@/domain/plans'
import { listPrice } from '@/domain/pricing'
import { parseThemeConfig, type ParsedThemeConfig } from '@/slides/config'
import { demoDb } from './admin/demo/store'

/**
 * Modo demo (DEMO_MODE=1): el sitio funciona sin Supabase ni Mercado Pago.
 * Sirve para mostrar el producto y revisar diseño en un deploy sin secretos.
 * El cobro queda deshabilitado.
 *
 * El catálogo, los precios, los cupones y la oferta salen de la misma base de
 * demo que usa el panel (`admin/demo/store`): lo que se publica o se cambia
 * en el panel se ve en la tienda. Arranca con el catálogo de supabase/seed.
 *
 * Nunca se activa solo: si falta la variable, la app usa la base de verdad.
 */

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === '1'
}

export function demoSettings() {
  const s = demoDb().settings
  return {
    basePriceCents: s.basePriceCents,
    giftLifetimeDays: s.giftLifetimeDays,
    currency: s.currency,
    salesPaused: s.salesPaused,
    business: {
      name: s.businessName,
      supportEmail: s.supportEmail,
      whatsapp: s.whatsapp,
      instagram: s.instagram,
    },
  }
}

export function demoThemes() {
  const db = demoDb()
  return db.themes
    .filter((t) => t.status === 'published' && t.currentVersionId)
    .flatMap((t) => {
      const listing = ThemeListingSchema.safeParse(t.listing)
      if (!listing.success) return []
      return [
        {
          id: t.id,
          slug: t.slug,
          name: t.name,
          category: t.category,
          description: t.description,
          priceCents: listPrice(db.settings.basePriceCents, t.priceCents),
          listing: listing.data,
          versionId: t.currentVersionId!,
          sortOrder: t.sortOrder,
        },
      ]
    })
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
}

export function demoThemeConfig(versionId: string): ParsedThemeConfig | null {
  for (const theme of demoDb().themes) {
    const version = theme.versions.find((v) => v.id === versionId)
    if (version) {
      const parsed = parseThemeConfig(version.config)
      return parsed.success ? parsed.data : null
    }
  }
  return null
}

export function demoCoupons(): Coupon[] {
  return demoDb().coupons.map((c) => ({
    id: c.id,
    code: c.code,
    kind: c.kind,
    value: c.value,
    active: c.active,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    startsAt: c.startsAt ? new Date(c.startsAt) : null,
    expiresAt: c.expiresAt ? new Date(c.expiresAt) : null,
    affiliateId: c.affiliateId,
  }))
}

export function demoOffer(): { couponId: string | null; delaySeconds: number } {
  const s = demoDb().settings
  return { couponId: s.offerCouponId, delaySeconds: s.offerDelaySeconds }
}

export function demoPlans(): Plan[] {
  return activePlans(demoDb().plans)
}
