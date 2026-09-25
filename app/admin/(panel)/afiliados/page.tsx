import type { Metadata } from 'next'
import { arStartOfMonth, inRange, rangeFromPreset } from '@/domain/admin/range'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { AffiliatesBoard } from './AffiliatesBoard'

export const metadata: Metadata = { title: 'Afiliados' }

export default async function AffiliatesPage() {
  await requireAdmin('/admin/afiliados')
  const repo = await adminRepo()
  const data = await repo.dataset()
  const month = rangeFromPreset('mtd')
  const previousMonth = {
    from: arStartOfMonth(new Date(), -1),
    to: month.from,
    preset: 'custom' as const,
  }

  const rows = data.affiliates.map((a) => {
    const sales = data.orders.filter((o) => o.affiliateId === a.id && o.status === 'paid')
    const sum = (list: typeof sales) => list.reduce((s, o) => s + o.amountCents, 0)
    const thisMonth = sales.filter((o) => inRange(o.paidAt, month))
    const lastMonth = sales.filter((o) => inRange(o.paidAt, previousMonth))
    const commission = (cents: number) => Math.round((cents * a.commissionBps) / 10_000)
    return {
      affiliate: a,
      coupons: data.coupons.filter((c) => c.affiliateId === a.id).map((c) => c.code),
      sales: sales.length,
      revenue: sum(sales),
      monthSales: thisMonth.length,
      monthRevenue: sum(thisMonth),
      monthCommission: commission(sum(thisMonth)),
      lastMonthCommission: commission(sum(lastMonth)),
      totalCommission: commission(sum(sales)),
    }
  })

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Ventas{' '}
            {repo.mode === 'demo' && (
              <NeedsDb what="affiliates, coupons.affiliate_id, orders.affiliate_id" />
            )}
          </span>
        }
        title="Afiliados"
        description="Creadores y comercios que venden con su código. Cada venta con un cupón suyo les suma comisión; la liquidación se hace a mano, a mes vencido."
      />
      <AffiliatesBoard rows={rows} />
    </>
  )
}
