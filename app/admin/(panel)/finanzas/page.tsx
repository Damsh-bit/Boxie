import { Calculator, Landmark, PiggyBank, Scale, Target, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { formatARS, formatBps, formatCompactARS, formatPercent } from '@/domain/admin/format'
import {
  breakEven,
  effectiveGatewayRate,
  monthlyFixedCents,
  monthlyResults,
  monthProjection,
  profitAndLoss,
  profitabilityBy,
} from '@/domain/admin/finance'
import { delta } from '@/domain/admin/metrics'
import { bucketLabel, previousRange } from '@/domain/admin/range'
import { EXPENSE_CATEGORIES } from '@/domain/admin/types'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { rangeFromParams } from '../../_lib/range'
import { ColumnChart, Donut, Legend, WithTable } from '../../_ui/charts'
import { SERIES } from '../../_ui/palette'
import { Card, CardHeader, NeedsDb, PageHeader, Progress } from '../../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../../_ui/RangePicker'
import { Stat } from '../../_ui/Stat'
import { ExpensesTable, PnlTable, Simulator } from './FinanceClient'

export const metadata: Metadata = { title: 'Finanzas' }

export default async function FinancePage({ searchParams }: PageProps<'/admin/finanzas'>) {
  await requireAdmin('/admin/finanzas')
  const repo = await adminRepo()
  const data = await repo.dataset()
  const { range, picker } = rangeFromParams(await searchParams, 'mtd')
  const s = data.settings
  const now = new Date()

  const pnl = profitAndLoss(data.orders, data.expenses, s, range)
  const prev = profitAndLoss(data.orders, data.expenses, s, previousRange(range))
  const fixedMonthly = monthlyFixedCents(data.expenses, now)
  const be = breakEven(pnl, fixedMonthly)
  const month = monthProjection(data.orders, s.monthlyGoalCents, now)
  const since = now.getTime() - 30 * 86_400_000
  const monthSalesPace = data.orders.filter(
    (o) =>
      (o.status === 'paid' || o.status === 'refunded') && o.paidAt && Date.parse(o.paidAt) >= since,
  ).length
  const months = monthlyResults(data.orders, data.expenses, s, 12, now)
  const themeName = new Map(data.themes.map((t) => [t.id, t.name]))
  const planName = new Map(data.plans.map((p) => [p.id, p.name]))
  const byTheme = profitabilityBy(data.orders, s, range, (o) => o.themeId).map((r) => ({
    ...r,
    name: themeName.get(r.key) ?? '—',
  }))
  const byPlan = profitabilityBy(data.orders, s, range, (o) => o.planId).map((r) => ({
    ...r,
    name: planName.get(r.key) ?? 'Sin plan',
  }))
  const netRevenue = pnl.revenueCents - pnl.refundsCents
  const avgTicket = pnl.sales ? Math.round(pnl.revenueCents / pnl.sales) : 0

  const categoryItems = EXPENSE_CATEGORIES.flatMap((c) =>
    pnl.fixedByCategory[c.value] ? [{ label: c.label, value: pnl.fixedByCategory[c.value]! }] : [],
  ).sort((a, b) => b.value - a.value)

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Negocio{' '}
            {repo.mode === 'demo' && (
              <NeedsDb what="orders, expenses, settings (migración admin_backoffice)" />
            )}
          </span>
        }
        title="Finanzas"
        description="Cuánto entra, cuánto se va y cuánto queda. Las ventas cuentan por fecha de pago; los reembolsos, por fecha de devolución."
        actions={<RangePicker {...picker} />}
      />

      <RangeContent>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat
            label="Facturación neta"
            value={netRevenue}
            format="ars"
            delta={delta(netRevenue, prev.revenueCents - prev.refundsCents)}
            icon={<Wallet />}
            hint={`${pnl.sales} ventas`}
          />
          <Stat
            label="Contribución"
            value={pnl.contributionCents}
            format="ars"
            delta={delta(pnl.contributionCents, prev.contributionCents)}
            icon={<PiggyBank />}
            hint={`margen ${formatPercent(pnl.contributionMargin)}`}
            delay={0.05}
          />
          <Stat
            label="Gastos fijos"
            value={pnl.fixedCents}
            format="ars"
            delta={delta(pnl.fixedCents, prev.fixedCents)}
            goodWhenUp={false}
            icon={<Landmark />}
            delay={0.1}
          />
          <Stat
            label="Resultado"
            value={pnl.netCents}
            format="ars"
            delta={delta(pnl.netCents, prev.netCents)}
            icon={<Scale />}
            hint={`margen neto ${formatPercent(pnl.netMargin)}`}
            delay={0.15}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card delay={0.1}>
            <CardHeader
              title="Estado de resultados"
              description={`${picker.label} · sobre lo cobrado`}
            />
            <PnlTable
              lines={[
                { label: 'Ventas a precio de lista', value: pnl.grossCents, kind: 'base' },
                { label: 'Descuentos por cupones', value: -pnl.discountCents, kind: 'minus' },
                { label: 'Cobrado', value: pnl.revenueCents, kind: 'total' },
                { label: 'Reembolsos', value: -pnl.refundsCents, kind: 'minus' },
                {
                  label: `Comisión de Mercado Pago (${formatBps(s.gatewayFeeBps)} + IVA)`,
                  value: -pnl.gatewayCents,
                  kind: 'minus',
                },
                {
                  label: `Impuestos sobre ventas (${formatBps(s.taxBps)})`,
                  value: -pnl.taxCents,
                  kind: 'minus',
                },
                {
                  label: `Costo de entrega (${formatARS(s.variableCostCents)} por Boxie)`,
                  value: -pnl.variableCents,
                  kind: 'minus',
                },
                { label: 'Contribución', value: pnl.contributionCents, kind: 'total' },
                ...EXPENSE_CATEGORIES.flatMap((c) =>
                  pnl.fixedByCategory[c.value]
                    ? [
                        {
                          label: c.label,
                          value: -pnl.fixedByCategory[c.value]!,
                          kind: 'minus' as const,
                        },
                      ]
                    : [],
                ),
                { label: 'Resultado del período', value: pnl.netCents, kind: 'result' },
              ]}
              base={pnl.revenueCents}
            />
          </Card>

          <div className="space-y-5">
            <Card delay={0.15}>
              <CardHeader
                icon={<Target />}
                title="Punto de equilibrio"
                description="Ventas por mes para cubrir los gastos fijos"
              />
              {be.salesPerMonth === null ? (
                <p className="text-sm text-critical">
                  Con los costos actuales, cada venta pierde plata: revisá precios y comisiones.
                </p>
              ) : (
                <>
                  <p className="text-4xl font-semibold text-ink">
                    {be.salesPerMonth}{' '}
                    <span className="text-base font-normal text-neutral-500">ventas/mes</span>
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {formatARS(fixedMonthly)} de fijos ÷{' '}
                    {formatARS(Math.round(be.avgContributionCents / 100) * 100)} que deja cada
                    venta.
                  </p>
                  <Progress
                    value={monthSalesPace / Math.max(be.salesPerMonth, 1)}
                    tone={monthSalesPace >= be.salesPerMonth ? 'good' : 'warning'}
                    className="mt-4 h-3"
                    label="Ventas de los últimos 30 días contra el equilibrio"
                  />
                  <p className="mt-2 text-sm text-neutral-600">
                    Últimos 30 días:{' '}
                    <span className="font-semibold text-ink">{monthSalesPace} ventas</span>
                    {monthSalesPace >= be.salesPerMonth
                      ? ` · ${monthSalesPace - be.salesPerMonth} por encima del equilibrio.`
                      : ` · faltan ${be.salesPerMonth - monthSalesPace}.`}
                  </p>
                </>
              )}
            </Card>
            <Card delay={0.2}>
              <CardHeader
                icon={<Calculator />}
                title="Supuestos"
                description="Se editan en Configuración"
                action={
                  <Link
                    href="/admin/configuracion"
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Cambiar
                  </Link>
                }
              />
              <dl className="space-y-1.5 text-sm">
                {[
                  [
                    'Comisión efectiva de la pasarela',
                    formatPercent(effectiveGatewayRate(s, avgTicket || 499_000), 2),
                  ],
                  ['Impuestos sobre ventas', formatBps(s.taxBps)],
                  ['Costo de entrega por Boxie', formatARS(s.variableCostCents)],
                  ['Gastos fijos por mes (hoy)', formatARS(fixedMonthly)],
                  ['Meta mensual', formatARS(s.monthlyGoalCents)],
                  ['Proyección del mes', formatARS(Math.round(month.projectedCents / 100) * 100)],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-neutral-600">{k}</dt>
                    <dd className="font-semibold text-ink tabular-nums">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </div>

        <Card className="mt-5" delay={0.15}>
          <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
            <CardHeader
              className="mb-0"
              title="Mes a mes"
              description="Últimos 12 meses (el actual, en curso, más claro)"
            />
          </div>
          <div className="mb-6">
            <Legend
              items={[
                { label: 'Ingresos netos', color: SERIES[0]!, shape: 'box' },
                { label: 'Costos y gastos', color: SERIES[1]!, shape: 'box' },
              ]}
            />
          </div>
          <WithTable
            caption="Resultado por mes"
            columns={['Mes', 'Ingresos netos', 'Costos y gastos', 'Resultado', 'Ventas']}
            rows={months.map((m) => [
              bucketLabel(m.key, 'month'),
              formatARS(m.revenueCents),
              formatARS(m.costsCents),
              formatARS(m.netCents),
              m.sales,
            ])}
            chart={
              <ColumnChart
                ariaLabel="Ingresos netos y costos por mes"
                format="ars"
                highlightLast
                series={[{ name: 'Ingresos netos' }, { name: 'Costos y gastos' }]}
                data={months.map((m) => ({
                  label: bucketLabel(m.key, 'month'),
                  values: [m.revenueCents, m.costsCents],
                }))}
              />
            }
          />
          <div className="mt-6 border-t border-line pt-5">
            <p className="mb-4 text-sm font-semibold text-ink">Resultado de cada mes</p>
            <ColumnChart
              ariaLabel="Resultado neto por mes"
              format="ars"
              height={200}
              highlightLast
              series={[{ name: 'Resultado', color: SERIES[2] }]}
              data={months.map((m) => ({
                label: bucketLabel(m.key, 'month'),
                values: [m.netCents],
              }))}
            />
          </div>
        </Card>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card delay={0.2} padded={false}>
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <CardHeader
                className="mb-0"
                title="Rentabilidad por temática"
                description="Contribución después de comisiones, impuestos y entrega"
              />
            </div>
            <ProfitTable rows={byTheme} />
          </Card>
          <Card delay={0.25} padded={false}>
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <CardHeader
                className="mb-0"
                title="Rentabilidad por plan"
                description="¿Conviene empujar el plan más caro?"
              />
            </div>
            <ProfitTable rows={byPlan} />
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card delay={0.2} padded={false}>
            <ExpensesTable expenses={data.expenses} />
          </Card>
          <div className="space-y-5">
            <Card delay={0.25}>
              <CardHeader title="Gastos fijos del período" description="Por categoría" />
              {categoryItems.length ? (
                <Donut
                  format="ars-compact"
                  items={categoryItems.slice(0, 5)}
                  center={{ value: formatCompactARS(pnl.fixedCents), label: 'en gastos' }}
                  size={160}
                />
              ) : (
                <p className="text-sm text-neutral-500">Sin gastos en el período.</p>
              )}
            </Card>
            <Simulator
              basePriceCents={avgTicket || 499_000}
              salesPerMonth={monthSalesPace}
              fixedMonthlyCents={fixedMonthly}
              settings={{
                gatewayFeeBps: s.gatewayFeeBps,
                gatewayVatBps: s.gatewayVatBps,
                gatewayFixedCents: s.gatewayFixedCents,
                taxBps: s.taxBps,
                variableCostCents: s.variableCostCents,
                monthlyGoalCents: s.monthlyGoalCents,
              }}
            />
          </div>
        </div>
      </RangeContent>
    </RangeScope>
  )
}

function ProfitTable({
  rows,
}: {
  rows: {
    key: string
    name: string
    sales: number
    revenueCents: number
    costsCents: number
    contributionCents: number
    margin: number
  }[]
}) {
  if (rows.length === 0)
    return <p className="px-6 pb-6 text-sm text-neutral-500">Sin ventas en el período.</p>
  const max = Math.max(...rows.map((r) => r.contributionCents), 1)
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
            <th scope="col" className="px-6 py-2.5 font-semibold">
              Nombre
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Ventas
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Cobrado
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Contribución
            </th>
            <th scope="col" className="px-6 py-2.5 text-right font-semibold">
              Margen
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-line last:border-0">
              <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                {r.name}
                <span className="mt-1 block h-1 rounded-full bg-canvas">
                  <span
                    className="block h-full rounded-full bg-series-3"
                    style={{ width: `${(r.contributionCents / max) * 100}%` }}
                  />
                </span>
              </th>
              <td className="px-3 py-2.5 text-right tabular-nums">{r.sales}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {formatCompactARS(r.revenueCents)}
              </td>
              <td className="px-3 py-2.5 text-right font-semibold text-ink tabular-nums">
                {formatCompactARS(r.contributionCents)}
              </td>
              <td className="px-6 py-2.5 text-right tabular-nums">{formatPercent(r.margin, 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
