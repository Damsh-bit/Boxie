import { couponDiscount, type Coupon } from './coupons'
import type { Cents } from './money'

/**
 * precio + cupón = total. El navegador nunca decide nada que cueste plata:
 * este cálculo corre en el servidor, con el precio leído de la base.
 */

export interface PriceInput {
  /** Precio base de la configuración. */
  basePriceCents: Cents
  /** Precio propio de la temática; null = usa el base. */
  themePriceCents: Cents | null
  /** Cupón ya validado con `evaluateCoupon`, o null. */
  coupon: Pick<Coupon, 'id' | 'code' | 'kind' | 'value' | 'affiliateId'> | null
}

export interface PriceQuote {
  listPriceCents: Cents
  discountCents: Cents
  totalCents: Cents
  coupon: {
    id: string
    code: string
    kind: Coupon['kind']
    value: number
    affiliateId: string | null
  } | null
}

export function listPrice(basePriceCents: Cents, themePriceCents: Cents | null): Cents {
  const price = themePriceCents ?? basePriceCents
  if (!Number.isInteger(price) || price <= 0) {
    throw new RangeError(`Precio inválido: ${price}`)
  }
  return price
}

export function quote({ basePriceCents, themePriceCents, coupon }: PriceInput): PriceQuote {
  const listPriceCents = listPrice(basePriceCents, themePriceCents)
  const discountCents = coupon ? couponDiscount(coupon, listPriceCents) : 0
  return {
    listPriceCents,
    discountCents,
    totalCents: listPriceCents - discountCents,
    coupon: coupon
      ? {
          id: coupon.id,
          code: coupon.code,
          kind: coupon.kind,
          value: coupon.value,
          affiliateId: coupon.affiliateId,
        }
      : null,
  }
}
