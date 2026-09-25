import type { Metadata } from 'next'
import { couponRanking } from '@/domain/admin/metrics'
import { rangeFromPreset } from '@/domain/admin/range'
import { activePlans } from '@/domain/plans'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { one } from '../../_lib/range'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { CouponsBoard } from './CouponsBoard'

export const metadata: Metadata = { title: 'Cupones' }

export default async function CouponsPage({ searchParams }: PageProps<'/admin/cupones'>) {
  await requireAdmin('/admin/cupones')
  const params = await searchParams
  const repo = await adminRepo()
  const data = await repo.dataset()
  const last30 = couponRanking(data.orders, rangeFromPreset('30d'))
  const allTime = couponRanking(data.orders, {
    from: new Date(0),
    to: new Date(8_640_000_000_000_000),
    preset: 'custom',
  })
  const stats = Object.fromEntries(
    data.coupons.map((c) => {
      const r30 = last30.find((r) => r.couponId === c.id)
      const all = allTime.find((r) => r.couponId === c.id)
      return [
        c.id,
        {
          uses30: r30?.uses ?? 0,
          discount30: r30?.discountCents ?? 0,
          revenue30: r30?.revenueCents ?? 0,
          discountAll: all?.discountCents ?? 0,
          revenueAll: all?.revenueCents ?? 0,
        },
      ]
    }),
  )

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Ventas {repo.mode === 'demo' && <NeedsDb what="coupons, settings.offer_coupon_id" />}
          </span>
        }
        title="Cupones"
        description="Descuentos con tope de usos y fechas. El checkout los valida en el servidor: lo que ves acá es lo que se cobra."
      />
      <CouponsBoard
        coupons={data.coupons}
        affiliates={data.affiliates.map((a) => ({ id: a.id, name: a.name }))}
        stats={stats}
        offer={{
          couponId: data.settings.offerCouponId,
          delaySeconds: data.settings.offerDelaySeconds,
        }}
        prices={activePlans(data.plans).map((p) => ({ name: p.name, cents: p.priceCents }))}
        openNew={one(params.nuevo) === '1'}
      />
    </>
  )
}
