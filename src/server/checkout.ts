import 'server-only'
import { COUPON_REJECTION_MESSAGE, describeCoupon, evaluateCoupon } from '@/domain/coupons'
import { quote, type PriceQuote } from '@/domain/pricing'
import {
  findCoupon,
  getPublicSettings,
  getPublishedTheme,
  type CatalogThemeWithVersion,
} from './catalog'
import { isDemoMode } from './demo'
import { env } from './env'

/**
 * Cotización del checkout: el precio sale de la base y el cupón se valida
 * acá. El navegador solo muestra el resultado (hallazgo D: el prototipo
 * mandaba el precio desde el navegador y el servidor lo aceptaba).
 */

export interface CheckoutQuote {
  theme: CatalogThemeWithVersion
  quote: PriceQuote
  couponLabel: string | null
  couponError: string | null
}

export async function quoteCheckout(
  themeSlug: string,
  couponCode: string | null | undefined,
): Promise<CheckoutQuote | null> {
  const theme = await getPublishedTheme(themeSlug)
  if (!theme) return null
  const settings = await getPublicSettings()

  let coupon = null
  let couponError: string | null = null
  if (couponCode?.trim()) {
    const evaluation = evaluateCoupon(await findCoupon(couponCode), new Date())
    if (evaluation.ok) coupon = evaluation.coupon
    else couponError = COUPON_REJECTION_MESSAGE[evaluation.reason]
  }

  return {
    theme,
    quote: quote({
      basePriceCents: settings.basePriceCents,
      themePriceCents: theme.priceCents,
      coupon,
    }),
    couponLabel: coupon ? describeCoupon(coupon) : null,
    couponError,
  }
}

/** Los pagos están habilitados cuando PAYMENTS_PROVIDER=mercadopago y no es modo demo. */
export function paymentsEnabled(): boolean {
  return env().PAYMENTS_PROVIDER === 'mercadopago' && !isDemoMode()
}
