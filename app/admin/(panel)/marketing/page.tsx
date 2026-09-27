import {
  ArrowRight,
  BadgeDollarSign,
  CalendarClock,
  Coins,
  Gauge,
  HandCoins,
  Megaphone,
  Percent,
  PiggyBank,
  Plus,
  Repeat,
  Target,
  UserPlus,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { formatARS, formatCompactARS, formatMultiple, formatPercent } from '@/domain/admin/format'
import { delta } from '@/domain/admin/metrics'
import { previousRange } from '@/domain/admin/range'
import { upcomingEvents } from '@/domain/marketing/calendar'
import { channelLabel, type ChannelId } from '@/domain/marketing/channels'
import { longestLtv, ltvCurve } from '@/domain/marketing/economics'
import { likelyDuplicatedAdSpend, marketingInsights } from '@/domain/marketing/insights'
import {
  blended,
  campaignPerformance,
  channelPerformance,
  marketingSeries,
  monthPacing,
  orderContribution,
  siteFunnel,
  verdict,
} from '@/domain/marketing/performance'
import { requireAdmin } from '@/server/admin/session'
import { ButtonLink } from '@/ui/Button'
import { ColumnChart, Donut, Funnel, Legend, LineChart, WithTable } from '../../_ui/charts'
import { SERIES } from '../../_ui/palette'
import { Badge, Card, CardHeader, NeedsDb, PageHeader } from '../../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../../_ui/RangePicker'
import { Stat } from '../../_ui/Stat'
import { loadMarketing, MODEL_SLUG } from './_lib/load'
import { ChannelTag, InsightList, ModelPicker } from './_ui/bits'
import { channelColor, hasOwnColor, OTHER_COLOR } from './_ui/colors'
import { CpaGauge, PacingBar, RatioLine } from './_ui/health'
import { MarketingNav } from './_ui/MarketingNav'
import { SchemaNotice } from './_ui/SchemaNotice'
import { SettingsButton } from './_ui/SettingsButton'

export const metadata: Metadata = { title: 'Marketing' }

export default async function MarketingPage({ searchParams }: PageProps<'/admin/marketing'>) {
  await requireAdmin('/admin/marketing')
  const ctx = await loadMarketing(await searchParams, '30d')
  const { input, idx, range, bucket, model, targets, m, now, label } = ctx

  const b = blended(input, range, model, idx)
  const prev = blended(input, previousRange(range), model, idx)
  const { rows: channels } = channelPerformance(input, range, model, idx)
  const campaigns = campaignPerformance(input, range, model, now, idx).map((c) => ({
    ...c,
    verdict: verdict(c, targets),
  }))
  const pacing = monthPacing(m.spend, m.settings.monthlyBudgetCents, now)
  const funnel = siteFunnel(input, range)
  const upcoming = upcomingEvents(now, 150)
  const series = marketingSeries(input, range, bucket, idx)
  const ltv = longestLtv(
    ltvCurve(
      input.orders,
      (o) => orderContribution(o, input.settings, idx),
      now,
      [0, 90, 180, 270, 365],
    ),
  )
  const ltvToCac = b.blendedCacCents && ltv ? ltv.contributionCents / b.blendedCacCents : null
  const ltvWhen = !ltv
    ? ''
    : ltv.days === 0
      ? 'en su primera compra'
      : ltv.days === 365
        ? 'en un año'
        : `en ${ltv.days} días`

  const insights = marketingInsights({
    blended: b,
    channels,
    campaigns: campaigns.filter((c) => c.state === 'active'),
    maxCpaCents: targets.maxCpaCents,
    targetCpaCents: targets.targetCpaCents,
    pacing,
    funnel,
    upcoming,
    duplicated: likelyDuplicatedAdSpend(input.expenses, b.adSpendCents),
    available: m.available,
  })

  // Mix de facturación: hasta cinco canales con color propio y el resto en "Otros".
  const withRevenue = channels.filter((c) => c.revenueCents > 0)
  const own = withRevenue.filter((c) => hasOwnColor(c.channel)).slice(0, 5)
  const rest = withRevenue.filter((c) => !own.includes(c))
  const mix = [
    ...own.map((c) => ({
      label: channelLabel(c.channel),
      value: c.revenueCents,
      color: channelColor(c.channel),
    })),
    ...(rest.length
      ? [
          {
            label: 'Otros',
            value: rest.reduce((s, c) => s + c.revenueCents, 0),
            color: OTHER_COLOR,
          },
        ]
      : []),
  ]

  const steps = [
    { label: 'Visitas', count: funnel.sessions },
    { label: 'Vieron una temática', count: funnel.themeViews },
    { label: 'Llegaron al checkout', count: funnel.checkoutViews },
    { label: 'Iniciaron el pago', count: funnel.paymentStarts },
    { label: 'Compraron', count: funnel.sales },
  ].map((s, i, all) => ({
    ...s,
    ofTotal: all[0]!.count ? s.count / all[0]!.count : 0,
    ofPrevious: i === 0 ? 1 : all[i - 1]!.count ? s.count / all[i - 1]!.count : 0,
  }))

  // Por día, el CPA de un día suelto salta mucho (o no existe si no hubo ventas): se usa el de los últimos 7 días.
  const window = bucket === 'day' ? 7 : 1
  const cpaSeries = series.map((p, i) => {
    const slice = series.slice(Math.max(0, i - window + 1), i + 1)
    const spend = slice.reduce((sum, x) => sum + x.spendCents, 0)
    const sales = slice.reduce((sum, x) => sum + x.paidSales, 0)
    return { label: label(p.key), values: [sales ? Math.round(spend / sales) : 0] }
  })
  const topChannels = channels.filter((c) => c.channel !== 'sin-datos').slice(0, 7)

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            Crecimiento
            {ctx.mode === 'demo' && (
              <NeedsDb what="marketing_campaigns, marketing_spend, marketing_traffic, order_attribution (migración marketing)" />
            )}
          </span>
        }
        title="Marketing"
        description="Cuánto se invierte en publicidad, cuánto trae y cuánto cuesta cada venta. Todo con los costos reales de una Boxie."
        actions={
          <>
            <RangePicker {...ctx.picker} />
            <ModelPicker model={model} slugs={MODEL_SLUG} />
            <SettingsButton
              settings={m.settings}
              chargedCents={ctx.base.chargedCents}
              contributionCents={ctx.base.contributionCents}
              disabled={!m.available}
            />
            <ButtonLink href="/admin/marketing/campanas?nueva=1" size="sm" className="h-10">
              <Plus className="size-4" aria-hidden /> Campaña
            </ButtonLink>
          </>
        }
      >
        <MarketingNav />
      </PageHeader>

      <RangeContent>
        {!m.available && <SchemaNotice />}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat
            label="Inversión en pauta"
            value={b.adSpendCents}
            format="ars"
            delta={delta(b.adSpendCents, prev.adSpendCents)}
            neutral
            icon={<Megaphone />}
            trend={series.map((p) => p.spendCents)}
            hint={
              b.otherMarketingCents
                ? `+ ${formatCompactARS(b.otherMarketingCents)} en otros gastos de marketing`
                : undefined
            }
          />
          <Stat
            label="Ventas por pauta y socios"
            value={b.paidSales}
            format="number"
            delta={delta(b.paidSales, prev.paidSales)}
            icon={<Target />}
            delay={0.04}
            hint={`${formatPercent(b.sales ? b.paidSales / b.sales : 0, 0)} de ${Math.round(b.sales)} ventas`}
          />
          <Stat
            label="Costo por venta (CPA)"
            value={b.paidCpaCents ?? 0}
            format="ars"
            delta={
              b.paidCpaCents && prev.paidCpaCents
                ? delta(b.paidCpaCents, prev.paidCpaCents)
                : undefined
            }
            goodWhenUp={false}
            icon={<BadgeDollarSign />}
            delay={0.08}
            hint={`objetivo ${formatARS(Math.round(targets.targetCpaCents / 100) * 100)} · máx. ${formatARS(Math.round(targets.maxCpaCents / 100) * 100)}`}
          />
          <Stat
            label="ROAS de la pauta"
            value={b.paidRoas ?? 0}
            format="multiple"
            delta={b.paidRoas && prev.paidRoas ? delta(b.paidRoas, prev.paidRoas) : undefined}
            icon={<Gauge />}
            delay={0.12}
            hint={`equilibrio ${formatMultiple(targets.breakEvenRoas)} · objetivo ${formatMultiple(targets.targetRoas)}`}
          />
          <Stat
            label="CAC combinado"
            value={b.blendedCacCents ?? 0}
            format="ars"
            delta={
              b.blendedCacCents && prev.blendedCacCents
                ? delta(b.blendedCacCents, prev.blendedCacCents)
                : undefined
            }
            goodWhenUp={false}
            icon={<UserPlus />}
            delay={0.16}
            hint={`todo el marketing ÷ ${b.newCustomers} clientes nuevos`}
          />
          <Stat
            label="MER (eficiencia total)"
            value={b.mer ?? 0}
            format="multiple"
            delta={b.mer && prev.mer ? delta(b.mer, prev.mer) : undefined}
            icon={<Percent />}
            delay={0.2}
            hint="facturación ÷ todo el marketing"
          />
          <Stat
            label="LTV : CAC"
            value={ltvToCac ?? 0}
            format="multiple"
            icon={<Repeat />}
            delay={0.24}
            hint={
              ltv
                ? `un cliente deja ${formatCompactARS(ltv.contributionCents)} ${ltvWhen}`
                : 'sin clientes todavía'
            }
          />
          <Stat
            label="Ganancia después de marketing"
            value={b.profitAfterMarketingCents}
            format="ars"
            delta={delta(b.profitAfterMarketingCents, prev.profitAfterMarketingCents)}
            icon={<PiggyBank />}
            delay={0.28}
            hint="contribución − pauta − otros gastos de marketing"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card delay={0.08}>
            <CardHeader
              icon={<Coins />}
              title="Inversión y lo que trajo"
              description="Pauta invertida contra lo facturado por ventas de pauta y socios (último clic)"
            />
            <div className="mb-6">
              <Legend
                items={[
                  { label: 'Inversión', color: SERIES[1]!, shape: 'box' },
                  { label: 'Facturación por pauta', color: SERIES[0]!, shape: 'box' },
                ]}
              />
            </div>
            <WithTable
              caption="Inversión y facturación por período"
              columns={[
                'Período',
                'Inversión',
                'Facturación por pauta',
                'ROAS',
                'Ventas por pauta',
              ]}
              rows={series.map((p) => [
                label(p.key),
                formatARS(p.spendCents),
                formatARS(p.paidRevenueCents),
                formatMultiple(p.spendCents ? p.paidRevenueCents / p.spendCents : null),
                p.paidSales,
              ])}
              chart={
                <ColumnChart
                  ariaLabel="Inversión y facturación por pauta"
                  format="ars"
                  highlightLast
                  series={[
                    { name: 'Inversión', color: SERIES[1] },
                    { name: 'Facturación por pauta', color: SERIES[0] },
                  ]}
                  data={series.map((p) => ({
                    label: label(p.key),
                    values: [p.spendCents, p.paidRevenueCents],
                  }))}
                />
              }
            />
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold text-ink">Costo por venta en el tiempo</p>
              <p className="mb-4 text-xs text-neutral-500">
                {window > 1 ? 'Promedio de los últimos 7 días. ' : ''}Si la línea pasa el máximo,
                esas ventas se pagaron más caro de lo que dejan.
              </p>
              <LineChart
                ariaLabel="Costo por venta de la pauta por período"
                format="ars"
                height={200}
                area={false}
                series={[{ name: 'Costo por venta', color: SERIES[4] }]}
                data={cpaSeries}
                references={[
                  { value: targets.targetCpaCents, label: 'Objetivo' },
                  { value: targets.maxCpaCents, label: 'Máximo' },
                ]}
              />
            </div>
          </Card>

          <div className="space-y-5">
            <Card delay={0.12}>
              <CardHeader
                icon={<HandCoins />}
                title="Salud de la pauta"
                description="¿Cada venta paga se paga sola?"
              />
              <CpaGauge
                cpaCents={b.paidCpaCents}
                targetCents={targets.targetCpaCents}
                maxCents={targets.maxCpaCents}
              />
              <div className="space-y-2">
                <RatioLine
                  label="ROAS de la pauta"
                  value={b.paidRoas}
                  reference={targets.targetRoas}
                  referenceLabel="objetivo"
                />
                <RatioLine
                  label="MER"
                  value={b.mer}
                  reference={targets.breakEvenRoas}
                  referenceLabel="equilibrio"
                />
                <RatioLine
                  label="LTV : CAC"
                  value={ltvToCac}
                  reference={3}
                  referenceLabel="sano desde"
                />
              </div>
              <Link
                href="/admin/marketing/rentabilidad"
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                Ver de dónde salen estos números <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </Card>
            <Card delay={0.16}>
              <CardHeader
                icon={<CalendarClock />}
                title="Ritmo del mes"
                description="Pauta invertida este mes contra el presupuesto"
              />
              <PacingBar {...pacing} />
            </Card>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card delay={0.12}>
            <CardHeader
              title="Qué hacer ahora"
              description="Lo que dicen los números del período, ordenado por urgencia"
              action={<Badge tone="brand">{insights.length}</Badge>}
            />
            <InsightList insights={insights} limit={7} />
          </Card>
          <Card delay={0.16} padded={false}>
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <CardHeader
                className="mb-0"
                title="Canales"
                description="Lo que invirtió y dejó cada uno"
                action={
                  <Link
                    href="/admin/marketing/canales"
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Ver todo
                  </Link>
                }
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                    <th scope="col" className="px-6 py-2.5 font-semibold">
                      Canal
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Inversión
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Ventas
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      CPA
                    </th>
                    <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                      ROAS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topChannels.map((c) => (
                    <tr key={c.channel} className="border-b border-line last:border-0">
                      <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                        <ChannelTag channel={c.channel as ChannelId} />
                      </th>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {c.spendCents ? formatCompactARS(c.spendCents) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{Math.round(c.sales)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {c.cpaCents !== null ? formatCompactARS(c.cpaCents) : '—'}
                      </td>
                      <td className="px-6 py-2.5 text-right font-semibold text-ink tabular-nums">
                        {formatMultiple(c.roas)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-6 py-4 text-xs text-neutral-500">
              {formatPercent(b.coverage, 0)} de las ventas del período tiene su origen medido.
            </p>
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card delay={0.14}>
            <CardHeader
              title="Embudo del sitio"
              description="De cada visita a la compra (visitas medidas en la tienda)"
            />
            {funnel.sessions > 0 ? (
              <Funnel steps={steps} />
            ) : (
              <p className="text-sm text-neutral-500">
                Todavía no hay visitas medidas en el período.
              </p>
            )}
          </Card>
          <Card delay={0.18}>
            <CardHeader
              title="De dónde viene la facturación"
              description={`Por canal · ${channels.length ? 'modelo ' + (model === 'last' ? 'último clic' : model === 'first' ? 'primer clic' : 'repartido') : ''}`}
            />
            {mix.length ? (
              <Donut
                format="ars-compact"
                items={mix}
                center={{ value: formatCompactARS(b.revenueCents), label: 'facturado' }}
                size={170}
              />
            ) : (
              <p className="text-sm text-neutral-500">Sin ventas en el período.</p>
            )}
          </Card>
        </div>

        <Card className="mt-5" delay={0.16}>
          <CardHeader
            icon={<CalendarClock />}
            title="Próximas fechas"
            description="Cuándo arranca la demanda de cada una"
            action={
              <Link
                href="/admin/marketing/planificador"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Planificar
              </Link>
            }
          />
          <ul className="grid gap-3 md:grid-cols-3">
            {upcoming.slice(0, 3).map((e) => {
              const ramp = e.daysUntil - e.leadDays
              return (
                <li key={`${e.id}-${e.date}`} className="rounded-2xl bg-canvas p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{e.name}</p>
                    <Badge tone={ramp <= 0 ? 'brand' : ramp <= 14 ? 'warning' : 'neutral'}>
                      {e.daysUntil === 0 ? 'hoy' : `en ${e.daysUntil} días`}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {ramp > 0
                      ? `La demanda arranca en ${ramp} días (${e.rampStart.split('-').reverse().slice(0, 2).join('/')})`
                      : 'Ya es temporada: la pauta tiene que estar prendida'}
                  </p>
                  <p className="mt-2 text-sm text-neutral-600">{e.idea}</p>
                </li>
              )
            })}
          </ul>
        </Card>
      </RangeContent>
    </RangeScope>
  )
}
