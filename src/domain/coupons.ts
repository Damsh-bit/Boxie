import type { Cents } from './money'

/**
 * Cupones: reglas puras. Leer el cupón de la base y sumar su uso (atómico,
 * al aprobarse el pago) es trabajo del servidor; acá solo se decide si vale y
 * cuánto descuenta.
 */

export type CouponKind = 'percent' | 'fixed'

export interface Coupon {
  id: string
  code: string
  kind: CouponKind
  /** percent: 1..100 · fixed: centavos */
  value: number
  active: boolean
  maxUses: number | null
  usedCount: number
  startsAt: Date | null
  expiresAt: Date | null
  affiliateId: string | null
}

export type CouponRejection = 'not_found' | 'inactive' | 'not_started' | 'expired' | 'exhausted'

export type CouponEvaluation = { ok: true; coupon: Coupon } | { ok: false; reason: CouponRejection }

export const COUPON_CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/

/** "  loquieroya25 " → "LOQUIEROYA25". Devuelve null si no puede ser un código. */
export function normalizeCouponCode(input: string | null | undefined): string | null {
  if (!input) return null
  const code = input.trim().toUpperCase().replace(/\s+/g, '')
  return COUPON_CODE_PATTERN.test(code) ? code : null
}

export function evaluateCoupon(coupon: Coupon | null, now: Date): CouponEvaluation {
  if (!coupon) return { ok: false, reason: 'not_found' }
  if (!coupon.active) return { ok: false, reason: 'inactive' }
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: 'not_started' }
  if (coupon.expiresAt && now >= coupon.expiresAt) return { ok: false, reason: 'expired' }
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)
    return { ok: false, reason: 'exhausted' }
  return { ok: true, coupon }
}

/**
 * Descuento en centavos sobre un precio de lista. Se redondea hacia abajo al
 * peso entero: el total queda en pesos redondos y el descuento nunca supera lo
 * prometido. Nunca descuenta más que el precio.
 */
export function couponDiscount(
  coupon: Pick<Coupon, 'kind' | 'value'>,
  listPriceCents: Cents,
): Cents {
  const raw =
    coupon.kind === 'percent' ? (listPriceCents * Math.min(coupon.value, 100)) / 100 : coupon.value
  const wholePesos = Math.floor(raw / 100) * 100
  return Math.max(0, Math.min(wholePesos, listPriceCents))
}

export function describeCoupon(coupon: Pick<Coupon, 'kind' | 'value'>): string {
  return coupon.kind === 'percent'
    ? `${coupon.value}% OFF`
    : `$${Math.floor(coupon.value / 100).toLocaleString('es-AR')} OFF`
}

export const COUPON_REJECTION_MESSAGE: Record<CouponRejection, string> = {
  not_found: 'Ese cupón no existe.',
  inactive: 'Ese cupón ya no está activo.',
  not_started: 'Ese cupón todavía no está vigente.',
  expired: 'Ese cupón venció.',
  exhausted: 'Ese cupón ya alcanzó su límite de usos.',
}
