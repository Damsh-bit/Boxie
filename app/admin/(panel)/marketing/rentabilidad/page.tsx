import { Coins, Layers, Repeat, TicketPercent, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { formatARS, formatCompactARS, formatMultiple, formatPercent } from '@/domain/admin/format'
import { expenseInRange } from '@/domain/admin/finance'
import { couponRanking } from '@/domain/admin/metrics'
import { bucketLabel } from '@/domain/admin/range'
import { channelInfo, channelLabel } from '@/domain/marketing/channels'
import {
  acquisitionCohorts,
  extraSalesForDiscount,
  ltvCurve,
  longestLtv,
  paybackDays,
  salesMix,
  targetCpa,
  unitEconomics,
} from '@/domain/marketing/economics'
import { blended, channelPerformance, orderContribution } from '@/domain/marketing/performance'
import { requireAdmin } from '@/server/admin/session'
import { Legend, LineChart, WithTable } from '../../../_ui/charts'
import { SERIES } from '../../../_ui/palette'
import { Card, CardHeader, NeedsDb, PageHeader } from '../../../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../../../_ui/RangePicker'
import { loadMarketing } from '../_lib/load'
import { MarketingNav } from '../_ui/MarketingNav'
import { SettingsButton } from '../_ui/SettingsButton'
import { UnitExplorer, type AcquisitionOption, type PlanOption } from './UnitExplorer'

export const metadata: Metadata = { title: 'Rentabilidad · Marketing' }

const pesos = (cents: number) => formatARS(Math.round(cents / 100) * 100)

export default async function ProfitabilityPage({
  searchParams,
}: PageProps<'/admin/marketing/rentabilidad'>) {
  await requireAdmin('/admin/marketing/rentabilidad')
  const ctx = await loadMarketing(await searchParams, '90d')
  const { input, idx, range, model, m, now, data, mix, fixedPerSale } = ctx
  const s = data.settings

  // Planes: la venta promedio de cada uno (y "Todos").
  const mixes = salesMix(data.orders, data.affiliates, range)
  const planOptions: PlanOption[] = [
    { key: 'todos', label: 'Promedio', mix },
    ...data.plans
      .filter((p) => p.active)
      .sort((a, b) => a.rank - b.rank)
      .map((p) => {
        const sold = mixes.byPlan.find((x) => x.planId === p.id)
        return {
          key: p.id,
          label: p.name,
          mix:
            sold ??
            ({
              planId: p.id,
              sales: 0,
              listPriceCents: p.priceCents,
              discountRate: mix.discountRate,
              affiliateCents: 0,
              chargedCents: p.priceCents,
            } as const),
        }
      }),
  ]

  // Formas de conseguir la venta: la pauta combinada, cada canal con inversión, el CAC total y sin publicidad.
  const b = blended(input, range, model, idx)
  const channels = channelPerformance(input, range, model, idx).rows
  const acquisitions: AcquisitionOption[] = [
    ...(b.paidCpaCents !== null
      ? [
          {
            key: 'pauta',
            label: 'Pauta combinada',
            cpaCents: b.paidCpaCents,
            hint: 'Costo por venta de toda la pauta del período (inversión ÷ ventas de pauta y socios).',
          },
        ]
      : []),
    ...channels
      .filter((c) => c.spendCents > 0 && c.cpaCents !== null)
      .map((c) => ({
        key: c.channel,
        label: channelLabel(c.channel),
        cpaCents: c.cpaCents!,
        hint: `${channelInfo(c.channel).hint} CPA del período con el modelo elegido.`,
      })),
    ...(b.blendedCacCents !== null
      ? [
          {
            key: 'cac',
            label: 'CAC combinado (todo el marketing)',
            cpaCents: b.blendedCacCents,
            hint: 'Todo el marketing (pauta y otros gastos) dividido por los clientes nuevos.',
          },
        ]
      : []),
    {
      key: 'organico',
      label: 'Sin publicidad (orgánico)',
      cpaCents: 0,
      hint: 'Una venta que llegó sola: redes, búsqueda, recomendación.',
    },
  ]

  // Tabla por plan.
  const planRows = planOptions.slice(1).map((p) => {
    const u = unitEconomics({
      listPriceCents: p.mix.listPriceCents,
      discountRate: p.mix.discountRate,
      affiliateCents: p.mix.affiliateCents,
      settings: s,
      acquisitionCents: 0,
      fixedPerSaleCents: 0,
    })
    return { ...p, u, target: targetCpa(u, m.settings.targetMarginBps) }
  })
  const totalPlanSales = planRows.reduce((sum, p) => sum + p.mix.sales, 0)

  // LTV y recuperación.
  const contributionOf = (o: (typeof data.orders)[number]) => orderContribution(o, s, idx)
  // Solo los puntos con clientes que ya tuvieron esos días (una tienda nueva no llega a 365).
  const curve = ltvCurve(data.orders, contributionOf, now, [0, 30, 60, 90, 180, 270, 365]).filter(
    (p, i) => i === 0 || p.customers > 0,
  )
  const cac = b.blendedCacCents ?? 0
  const payback = paybackDays(curve, cac)
  // El horizonte más largo con clientes suficientes (con menos de un año de ventas, no hay 365 días).
  const ltv365 = longestLtv(curve) ?? curve[0]!
  const horizon =
    ltv365.days === 365
      ? 'En un año'
      : ltv365.days === 0
        ? 'Por ahora'
        : `A los ${ltv365.days} días`
  const marketingOfMonth = (month: string) => {
    const from = new Date(`${month}-01T00:00:00.000-03:00`)
    const [y, mo] = month.split('-').map(Number) as [number, number]
    const next = mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
    const to = new Date(`${next}-01T00:00:00.000-03:00`)
    const r = { from, to, preset: 'custom' as const }
    const ads = m.spend
      .filter((e) => e.day.startsWith(month))
      .reduce((sum, e) => sum + e.spendCents, 0)
    const other = data.expenses
      .filter((e) => e.category === 'marketing')
      .reduce((sum, e) => sum + expenseInRange(e, r), 0)
    return ads + other
  }
  const cohorts = acquisitionCohorts(data.orders, contributionOf, marketingOfMonth, now, 12)

  // Descuentos y precio.
  const cm = ctx.base.contributionMargin
  const discounts = [0.1, 0.15, 0.2, 0.25, 0.35, 0.5].map((d) => ({
    d,
    extra: extraSalesForDiscount(cm, d),
  }))
  const raises = [0.05, 0.1, 0.15, 0.2].map((r) => ({ r, canLose: 1 - cm / (cm + r) }))
  const coupons = couponRanking(data.orders, range).slice(0, 8)

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            Marketing
            {ctx.mode === 'demo' && <NeedsDb what="orders, settings, marketing_spend" />}
          </span>
        }
        title="Rentabilidad"
        description="Qué queda de cada Boxie después de la pasarela, los impuestos, los afiliados y la publicidad, cuánto se puede pagar por una venta y cuánto deja un cliente en el tiempo."
        actions={
          <>
            <RangePicker {...ctx.picker} />
            <SettingsButton
              settings={m.settings}
              chargedCents={ctx.base.chargedCents}
              contributionCents={ctx.base.contributionCents}
              disabled={!m.available}
            />
          </>
        }
      >
        <MarketingNav />
      </PageHeader>

      <RangeContent>
        <Card delay={0.05}>
          <CardHeader
            icon={<Coins />}
            title="Anatomía de una venta"
            description="Del precio de lista a lo que queda de verdad, línea por línea"
          />
          <UnitExplorer
            plans={planOptions}
            acquisitions={acquisitions}
            settings={{
              gatewayFeeBps: s.gatewayFeeBps,
              gatewayVatBps: s.gatewayVatBps,
              gatewayFixedCents: s.gatewayFixedCents,
              taxBps: s.taxBps,
              variableCostCents: s.variableCostCents,
              monthlyGoalCents: s.monthlyGoalCents,
            }}
            fixedPerSaleCents={fixedPerSale}
            targetMarginBps={m.settings.targetMarginBps}
          />
        </Card>

        <Card className="mt-5" padded={false} delay={0.1}>
          <div className="p-5 pb-2 sm:p-6 sm:pb-2">
            <CardHeader
              className="mb-0"
              icon={<Layers />}
              title="Cuánto se puede pagar por venta en cada plan"
              description="Un plan más caro aguanta un costo por venta más alto: conviene empujarlo en la pauta"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                  <th scope="col" className="px-6 py-2.5 font-semibold">
                    Plan
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Precio
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Cobrado prom.
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Contribución
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    CPA máximo
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    CPA objetivo
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    ROAS equilibrio
                  </th>
                  <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                    Ventas
                  </th>
                </tr>
              </thead>
              <tbody>
                {planRows.map((p) => (
                  <tr key={p.key} className="border-b border-line last:border-0">
                    <th scope="row" className="px-6 py-2.5 text-left font-semibold text-ink">
                      {p.label}
                    </th>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {pesos(p.mix.listPriceCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {pesos(p.u.chargedCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {pesos(p.u.contributionCents)}{' '}
                      <span className="text-xs text-neutral-500">
                        ({formatPercent(p.u.contributionMargin, 0)})
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink tabular-nums">
                      {pesos(p.u.maxCpaCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{pesos(p.target)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {formatMultiple(p.u.breakEvenRoas, 2)}
                    </td>
                    <td className="px-6 py-2.5 text-right tabular-nums">
                      {p.mix.sales}{' '}
                      <span className="text-xs text-neutral-500">
                        ({totalPlanSales ? formatPercent(p.mix.sales / totalPlanSales, 0) : '—'})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card delay={0.12}>
            <CardHeader
              icon={<Repeat />}
              title="Lo que deja un cliente en el tiempo (LTV)"
              description="Promedio por cliente desde su primera compra, contra lo que costó conseguirlo"
            />
            <div className="mb-5">
              <Legend
                items={[
                  { label: 'Facturación por cliente', color: SERIES[0]! },
                  { label: 'Contribución por cliente', color: SERIES[2]! },
                ]}
              />
            </div>
            <WithTable
              caption="Valor por cliente según los días desde su primera compra"
              columns={['Días', 'Clientes', 'Facturación', 'Contribución', 'Ya volvieron']}
              rows={curve.map((p) => [
                p.days === 0 ? 'Primera compra' : `${p.days} días`,
                p.customers,
                pesos(p.revenueCents),
                pesos(p.contributionCents),
                formatPercent(p.repeatRate, 1),
              ])}
              chart={
                <LineChart
                  ariaLabel="Valor por cliente según los días desde su primera compra"
                  format="ars"
                  area={false}
                  series={[
                    { name: 'Facturación por cliente', color: SERIES[0] },
                    { name: 'Contribución por cliente', color: SERIES[2] },
                  ]}
                  data={curve.map((p) => ({
                    label: p.days === 0 ? 'Compra' : `${p.days} d`,
                    values: [p.revenueCents, p.contributionCents],
                  }))}
                  references={cac ? [{ value: cac, label: 'CAC' }] : []}
                />
              }
            />
          </Card>
          <Card delay={0.16}>
            <CardHeader
              icon={<Users />}
              title="Recuperación"
              description="¿Cuándo se paga lo que costó cada cliente?"
            />
            <p className="text-4xl font-semibold text-ink">
              {payback === 0
                ? 'En la 1.ª compra'
                : payback === null
                  ? 'Todavía no'
                  : `${payback} días`}
            </p>
            <p className="mt-2 text-sm text-neutral-600">
              Un cliente nuevo cuesta {pesos(cac)} (CAC combinado) y su primera compra deja{' '}
              {pesos(curve[0]!.contributionCents)}. {horizon} deja {pesos(ltv365.contributionCents)}{' '}
              ({formatMultiple(cac ? ltv365.contributionCents / cac : null)} lo que costó).
            </p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between rounded-xl bg-canvas px-3 py-2">
                <span className="text-neutral-600">
                  Vuelven a comprar ({horizon.toLowerCase()})
                </span>
                <span className="font-semibold text-ink">
                  {formatPercent(ltv365.repeatRate, 1)}
                </span>
              </div>
              <div className="flex justify-between rounded-xl bg-canvas px-3 py-2">
                <span className="text-neutral-600">LTV : CAC</span>
                <span className="font-semibold text-ink">
                  {formatMultiple(cac ? ltv365.contributionCents / cac : null)}
                </span>
              </div>
            </div>
            <p className="mt-4 text-xs text-neutral-500">
              Un regalo se compra pocas veces al año: la recompra (aniversarios, cumpleaños, otras
              fechas) es la palanca más barata. Mails de fechas y el cupón de aniversario la
              empujan.
            </p>
          </Card>
        </div>

        <Card className="mt-5" padded={false} delay={0.14}>
          <div className="p-5 pb-2 sm:p-6 sm:pb-2">
            <CardHeader
              className="mb-0"
              title="Cohortes de clientes"
              description="Clientes según el mes de su primera compra: lo que costaron y lo que dejaron hasta hoy"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                  <th scope="col" className="px-6 py-2.5 font-semibold">
                    Mes
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Clientes nuevos
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    CAC
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Facturación por cliente
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Contribución por cliente
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    LTV : CAC
                  </th>
                  <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                    Volvieron
                  </th>
                </tr>
              </thead>
              <tbody>
                {cohorts.map((c) => (
                  <tr key={c.month} className="border-b border-line last:border-0">
                    <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                      {bucketLabel(c.month, 'month')}
                    </th>
                    <td className="px-3 py-2.5 text-right tabular-nums">{c.customers}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {c.cacCents === null ? '—' : pesos(c.cacCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{pesos(c.revenueCents)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {pesos(c.contributionCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-ink tabular-nums">
                      {formatMultiple(c.cacCents ? c.contributionCents / c.cacCents : null)}
                    </td>
                    <td className="px-6 py-2.5 text-right tabular-nums">
                      {formatPercent(c.repeatRate, 1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card delay={0.16}>
            <CardHeader
              icon={<TicketPercent />}
              title="Lo que cuesta un descuento"
              description={`Con un margen de contribución de ${formatPercent(cm, 0)}, cuántas ventas más hacen falta para ganar lo mismo`}
            />
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {discounts.map(({ d, extra }) => (
                <li key={d} className="rounded-2xl bg-canvas p-3">
                  <p className="text-xs text-neutral-500">{formatPercent(d, 0)} de descuento</p>
                  <p className="text-lg font-semibold text-ink">
                    {extra === null ? 'Pierde' : `+${formatPercent(extra, 0)}`}
                  </p>
                  <p className="text-[11px] text-neutral-500">ventas para empatar</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 mb-2 text-sm font-semibold text-ink">Y si subís el precio…</p>
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {raises.map(({ r, canLose }) => (
                <li key={r} className="rounded-2xl border border-line p-3">
                  <p className="text-xs text-neutral-500">+{formatPercent(r, 0)} de precio</p>
                  <p className="text-lg font-semibold text-ink">−{formatPercent(canLose, 0)}</p>
                  <p className="text-[11px] text-neutral-500">ventas que podés perder</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-neutral-500">
              Aproximado: supone que los costos por venta cambian en la misma proporción que el
              precio (la pasarela y los impuestos son porcentajes).
            </p>
          </Card>
          <Card delay={0.2} padded={false}>
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <CardHeader
                className="mb-0"
                title="Cupones como costo de adquisición"
                description="Un descuento es plata que se paga por la venta, igual que la pauta"
              />
            </div>
            {coupons.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                      <th scope="col" className="px-6 py-2.5 font-semibold">
                        Cupón
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                        Usos
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                        Descontado
                      </th>
                      <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                        Por venta
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {coupons.map((c) => (
                      <tr key={c.couponId} className="border-b border-line last:border-0">
                        <th
                          scope="row"
                          className="px-6 py-2.5 text-left font-mono text-xs font-semibold text-ink"
                        >
                          {c.code}
                        </th>
                        <td className="px-3 py-2.5 text-right tabular-nums">{c.uses}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          {formatCompactARS(c.discountCents)}
                        </td>
                        <td className="px-6 py-2.5 text-right font-semibold text-ink tabular-nums">
                          {pesos(Math.round(c.discountCents / Math.max(c.uses, 1)))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-6 pb-6 text-sm text-neutral-500">
                Sin ventas con cupón en el período.
              </p>
            )}
            <p className="px-6 py-4 text-xs text-neutral-500">
              Si el descuento por venta de un cupón supera el CPA objetivo (
              {pesos(ctx.targets.targetCpaCents)}), ese cupón cuesta más que conseguir la venta con
              pauta.
            </p>
          </Card>
        </div>
      </RangeContent>
    </RangeScope>
  )
}
