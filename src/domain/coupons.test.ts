import { describe, expect, it } from 'vitest'
import { couponDiscount, describeCoupon, evaluateCoupon, normalizeCouponCode, type Coupon } from './coupons'

const NOW = new Date('2026-10-15T12:00:00-03:00')

function coupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: 'c1',
    code: 'BOXIE10',
    kind: 'percent',
    value: 10,
    active: true,
    maxUses: null,
    usedCount: 0,
    startsAt: null,
    expiresAt: null,
    affiliateId: null,
    ...overrides,
  }
}

describe('normalizeCouponCode', () => {
  it('normaliza mayúsculas y espacios', () => {
    expect(normalizeCouponCode('  loquieroya25 ')).toBe('LOQUIEROYA25')
    expect(normalizeCouponCode('pareja 20')).toBe('PAREJA20')
  })

  it('descarta lo que no puede ser un código', () => {
    expect(normalizeCouponCode('')).toBeNull()
    expect(normalizeCouponCode(null)).toBeNull()
    expect(normalizeCouponCode('ab')).toBeNull()
    expect(normalizeCouponCode("x'; drop table coupons;--")).toBeNull()
  })
})

describe('evaluateCoupon', () => {
  it('acepta un cupón vigente', () => {
    expect(evaluateCoupon(coupon(), NOW)).toEqual({ ok: true, coupon: coupon() })
  })

  it.each([
    ['inexistente', null, 'not_found'],
    ['inactivo', coupon({ active: false }), 'inactive'],
    ['que todavía no empezó', coupon({ startsAt: new Date('2026-11-01T00:00:00-03:00') }), 'not_started'],
    ['vencido', coupon({ expiresAt: new Date('2026-10-01T00:00:00-03:00') }), 'expired'],
    ['vencido justo ahora', coupon({ expiresAt: NOW }), 'expired'],
    ['sin usos disponibles', coupon({ maxUses: 5, usedCount: 5 }), 'exhausted'],
  ] as const)('rechaza un cupón %s', (_, c, reason) => {
    expect(evaluateCoupon(c, NOW)).toEqual({ ok: false, reason })
  })

  it('acepta el último uso disponible', () => {
    expect(evaluateCoupon(coupon({ maxUses: 5, usedCount: 4 }), NOW).ok).toBe(true)
  })
})

describe('couponDiscount', () => {
  it('LOQUIEROYA25 descuenta 25% y no 50% (hallazgo F12)', () => {
    expect(couponDiscount({ kind: 'percent', value: 25 }, 1_500_000)).toBe(375_000)
  })

  it('redondea el porcentaje hacia abajo al peso entero', () => {
    // 10% de $14.999 = $1.499,90 → $1.499
    expect(couponDiscount({ kind: 'percent', value: 10 }, 1_499_900)).toBe(149_900)
  })

  it('un monto fijo nunca supera el precio', () => {
    expect(couponDiscount({ kind: 'fixed', value: 500_000 }, 1_500_000)).toBe(500_000)
    expect(couponDiscount({ kind: 'fixed', value: 9_000_000 }, 1_500_000)).toBe(1_500_000)
  })

  it('100% deja el total en cero', () => {
    expect(couponDiscount({ kind: 'percent', value: 100 }, 1_500_000)).toBe(1_500_000)
  })
})

describe('describeCoupon', () => {
  it('formatea para mostrar', () => {
    expect(describeCoupon({ kind: 'percent', value: 25 })).toBe('25% OFF')
    expect(describeCoupon({ kind: 'fixed', value: 300_000 })).toBe('$3.000 OFF')
  })
})
