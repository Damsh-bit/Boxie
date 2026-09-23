import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getPublicSettings, listPublishedThemes } from '@/server/catalog'
import { paymentsEnabled, quoteCheckout } from '@/server/checkout'
import { isDemoMode } from '@/server/demo'
import { CheckoutForm } from './CheckoutForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Finalizar compra', robots: { index: false } }

export default async function CheckoutPage({ searchParams }: PageProps<'/checkout'>) {
  const params = await searchParams
  const slug = typeof params.tematica === 'string' ? params.tematica : null
  const coupon = typeof params.cupon === 'string' ? params.cupon : null

  // Sin temática no hay qué cobrar: el prototipo perdía la temática elegida
  // en este paso (hallazgo F10).
  if (!slug) {
    const first = (await listPublishedThemes())[0]
    redirect(first ? `/tematicas/${first.slug}` : '/galeria')
  }

  const [result, settings] = await Promise.all([quoteCheckout(slug, coupon), getPublicSettings()])
  if (!result) redirect('/galeria')

  return (
    <div className="bg-[#f8f9fa] px-4 pt-[120px] pb-20">
      <CheckoutForm
        theme={{
          slug: result.theme.slug,
          name: result.theme.name,
          image: result.theme.listing.images[0]!,
        }}
        initialQuote={{
          listPriceCents: result.quote.listPriceCents,
          discountCents: result.quote.discountCents,
          totalCents: result.quote.totalCents,
          coupon: result.quote.coupon
            ? { code: result.quote.coupon.code, label: result.couponLabel }
            : null,
          couponError: result.couponError,
        }}
        giftLifetimeDays={settings.giftLifetimeDays}
        paymentsEnabled={paymentsEnabled()}
        demo={isDemoMode()}
      />
    </div>
  )
}
