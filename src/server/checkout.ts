import 'server-only'
import { COUPON_REJECTION_MESSAGE, describeCoupon, evaluateCoupon } from '@/domain/coupons'
import { recommendedPlan, type Plan } from '@/domain/plans'
import { quote, type PriceQuote } from '@/domain/pricing'
import {
  findCoupon,
  getPublicSettings,
  getPublishedTheme,
  listPublicPlans,
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
  /** El plan que se cobra (null si la tienda no tiene planes). */
  plan: Plan | null
  plans: Plan[]
}

/**
 * Con planes, se cobra el precio del plan (el pedido o, si no existe, el
 * recomendado). Sin planes, el precio base o el de la temática, como siempre.
 */
export async function quoteCheckout(
  themeSlug: string,
  couponCode: string | null | undefined,
  planSlug?: string | null,
): Promise<CheckoutQuote | null> {
  const theme = await getPublishedTheme(themeSlug)
  if (!theme) return null
  const [settings, plans] = await Promise.all([getPublicSettings(), listPublicPlans()])
  const plan = plans.length
    ? (plans.find((p) => p.slug === planSlug) ?? recommendedPlan(plans))
    : null

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
      basePriceCents: plan ? plan.priceCents : settings.basePriceCents,
      themePriceCents: plan ? null : theme.priceCents,
      coupon,
    }),
    couponLabel: coupon ? describeCoupon(coupon) : null,
    couponError,
    plan,
    plans,
  }
}

/**
 * Los pagos están habilitados cuando PAYMENTS_PROVIDER=mercadopago, no es modo
 * demo y las ventas no están pausadas desde el panel.
 */
export async function paymentsEnabled(): Promise<boolean> {
  if (isDemoMode() || env().PAYMENTS_PROVIDER !== 'mercadopago') return false
  return !(await getPublicSettings()).salesPaused
}
