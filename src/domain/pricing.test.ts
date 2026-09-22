import { describe, expect, it } from 'vitest'
import { formatARS } from './money'
import { listPrice, quote } from './pricing'

const coupon = (kind: 'percent' | 'fixed', value: number) => ({
  id: 'c1',
  code: 'TEST',
  kind,
  value,
  affiliateId: null,
})

describe('quote', () => {
  it('sin cupón cobra el precio base', () => {
    expect(quote({ basePriceCents: 1_500_000, themePriceCents: null, coupon: null })).toEqual({
      listPriceCents: 1_500_000,
      discountCents: 0,
      totalCents: 1_500_000,
      coupon: null,
    })
  })

  it('una temática con precio propio pisa el base', () => {
    expect(
      quote({ basePriceCents: 1_500_000, themePriceCents: 1_800_000, coupon: null }).totalCents,
    ).toBe(1_800_000)
  })

  it('aplica un porcentaje sobre el precio de lista', () => {
    const q = quote({
      basePriceCents: 1_500_000,
      themePriceCents: null,
      coupon: coupon('percent', 20),
    })
    expect(q.discountCents).toBe(300_000)
    expect(q.totalCents).toBe(1_200_000)
    expect(q.coupon?.code).toBe('TEST')
  })

  it('el total nunca es negativo', () => {
    const q = quote({
      basePriceCents: 1_500_000,
      themePriceCents: null,
      coupon: coupon('fixed', 2_000_000),
    })
    expect(q.totalCents).toBe(0)
  })

  it('lista + descuento = total, siempre en centavos enteros', () => {
    for (const value of [1, 7, 13, 33, 50, 99]) {
      const q = quote({
        basePriceCents: 1_499_900,
        themePriceCents: null,
        coupon: coupon('percent', value),
      })
      expect(q.listPriceCents - q.discountCents).toBe(q.totalCents)
      expect(Number.isInteger(q.totalCents)).toBe(true)
    }
  })

  it('rechaza precios inválidos', () => {
    expect(() => listPrice(0, null)).toThrow(RangeError)
    expect(() => listPrice(1_500_000, -1)).toThrow(RangeError)
    expect(() => listPrice(1_500_000.5, null)).toThrow(RangeError)
  })
})

describe('formatARS', () => {
  it('formatea como en el sitio', () => {
    expect(formatARS(1_500_000).replace(/\s/g, ' ')).toBe('$ 15.000')
    expect(formatARS(1_499_950).replace(/\s/g, ' ')).toBe('$ 14.999,50')
  })
})
