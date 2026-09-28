import { CalendarRange, FlaskConical, PieChart, Plus, Sparkles } from 'lucide-react'
import type { Metadata } from 'next'
import type { Route } from 'next'
import Link from 'next/link'
import {
  formatARS,
  formatDate,
  formatMultiple,
  formatNumber,
  formatPercent,
} from '@/domain/admin/format'
import { addDays, arDayKey, arStartOfMonth, rangeFromPreset } from '@/domain/admin/range'
import { eventLift, upcomingEvents } from '@/domain/marketing/calendar'
import { channelLabel } from '@/domain/marketing/channels'
import { blended, channelPerformance } from '@/domain/marketing/performance'
import { requireAdmin } from '@/server/admin/session'
import { ColumnChart, WithTable } from '../../../_ui/charts'
import { SERIES } from '../../../_ui/palette'
import { Badge, Card, CardHeader, NeedsDb, PageHeader } from '../../../_ui/primitives'
import { loadMarketing } from '../_lib/load'
import { ChannelTag } from '../_ui/bits'
import { MarketingNav } from '../_ui/MarketingNav'
import { BudgetPlanner } from './BudgetPlanner'

export const metadata: Metadata = { title: 'Planificador · Marketing' }

const pesos = (cents: number) => formatARS(Math.round(cents / 1000) * 1000)
const short = (day: string) => formatDate(`${day}T12:00:00-03:00`).replace(/ \d{4}$/, '')

export default async function PlannerPage({
  searchParams,
}: PageProps<'/admin/marketing/planificador'>) {
  await requireAdmin('/admin/marketing/planificador')
  const ctx = await loadMarketing(await searchParams, '30d')
  const { input, idx, m, now, data, base, targets } = ctx

  // El ritmo de hoy: los últimos 30 días.
  const last30 = rangeFromPreset('30d', now)
  const b = blended(input, last30, 'last', idx)
  const organic = Math.max(b.sales - b.paidSales, 0)
  const ticket = b.sales ? Math.round(b.revenueCents / b.sales) : base.chargedCents
  const dailySpend = b.adSpendCents / 30
  const dailySales = b.sales / 30

  const events = upcomingEvents(now, 365).map((e) => {
    const lift = eventLift(data.orders, e.lastYear)
    const days = e.leadDays + 1
    const extraSales = lift.lift !== null ? Math.max(lift.lift - 1, 0) * dailySales * days : null
    const theme = e.theme ? data.themes.find((t) => t.slug === e.theme) : undefined
    // Una campaña de la fecha: termina con ella (las siempre prendidas no cuentan).
    const campaign = m.campaigns.find(
      (c) =>
        c.status !== 'draft' &&
        c.endsOn !== null &&
        c.endsOn >= e.rampStart &&
        c.endsOn <= arDayKey(addDays(new Date(`${e.date}T12:00:00-03:00`), 3)) &&
        c.startsOn <= e.date,
    )
    const year = e.date.slice(0, 4)
    const params = new URLSearchParams({
      nueva: '1',
      nombre: `Meta · ${e.name} ${year}`,
      inicio: e.rampStart,
      fin: e.date,
      ...(theme ? { tematica: theme.id } : {}),
    })
    return {
      ...e,
      lift,
      extraSales,
      // Para sostener el CPA en el pico: la pauta crece con la demanda.
      budgetCents:
        lift.lift !== null ? Math.round(dailySpend * Math.max(lift.lift, 1) * days) : null,
      theme,
      campaign: e.importance >= 2 ? campaign : undefined,
      createHref: `/admin/marketing/campanas?${params}`,
    }
  })

  // Reparto sugerido: más a lo que deja más por peso (POAS contra el objetivo), sin cambios bruscos.
  const channels = channelPerformance(input, last30, 'last', idx).rows.filter(
    (c) => c.spendCents > 0,
  )
  const totalSpend = channels.reduce((s, c) => s + c.spendCents, 0)
  const weights = channels.map((c) => ({
    ...c,
    weight:
      c.spendCents *
      Math.min(Math.max((c.poas ?? 0) / Math.max(targets.targetPoas, 0.01), 0.4), 1.6),
  }))
  const totalWeight = weights.reduce((s, c) => s + c.weight, 0)

  // Estacionalidad: ventas de cada mes de los últimos 12.
  const months = Array.from({ length: 12 }, (_, i) =>
    arDayKey(arStartOfMonth(now, i - 11)).slice(0, 7),
  )
  const byMonth = new Map<string, number>()
  for (const o of data.orders) {
    if ((o.status !== 'paid' && o.status !== 'refunded') || !o.paidAt) continue
    const k = arDayKey(o.paidAt).slice(0, 7)
    byMonth.set(k, (byMonth.get(k) ?? 0) + 1)
  }
  const MONTHS = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ]
  const monthLabel = (k: string) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(2, 4)}`

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            Marketing
            {ctx.mode === 'demo' && <NeedsDb what="orders, marketing_spend" />}
          </span>
        }
        title="Planificador"
        description="Las fechas que mueven los regalos en Argentina, cuánto vendieron el año pasado y cuánto invertir para llegar a la meta."
      >
        <MarketingNav />
      </PageHeader>

      <Card delay={0.05}>
        <CardHeader
          icon={<CalendarRange />}
          title="Calendario comercial"
          description="Cuándo arranca la demanda de cada fecha y cuánto movió las ventas el año pasado"
        />
        <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {events.map((e) => {
            const ramp = e.daysUntil - e.leadDays
            return (
              <li
                key={`${e.id}-${e.date}`}
                className="flex flex-col rounded-2xl border border-line p-4 transition-colors hover:border-neutral-300"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{e.name}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(`${e.date}T12:00:00-03:00`)} ·{' '}
                      {e.importance === 3
                        ? 'fecha fuerte'
                        : e.importance === 2
                          ? 'fecha media'
                          : 'fecha chica'}
                    </p>
                  </div>
                  <Badge tone={ramp <= 0 ? 'brand' : ramp <= 14 ? 'warning' : 'neutral'}>
                    {e.daysUntil === 0 ? 'hoy' : `${e.daysUntil} días`}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl bg-canvas px-2.5 py-2">
                    <dt className="text-neutral-500">Año pasado</dt>
                    <dd className="font-semibold text-ink">
                      {e.lift.lift === null ? '—' : formatMultiple(e.lift.lift)}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-canvas px-2.5 py-2">
                    <dt className="text-neutral-500">Ventas</dt>
                    <dd className="font-semibold text-ink">{formatNumber(e.lift.sales)}</dd>
                  </div>
                  <div className="rounded-xl bg-canvas px-2.5 py-2">
                    <dt className="text-neutral-500">Pauta sugerida</dt>
                    <dd className="font-semibold text-ink">
                      {e.budgetCents === null ? '—' : pesos(e.budgetCents)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-neutral-600">
                  <b className="text-ink">Preparar</b> anuncios, cupón y temática antes del{' '}
                  {short(e.prepareBy)} · <b className="text-ink">prender la pauta</b> el{' '}
                  {short(e.rampStart)}
                  {e.extraSales !== null && e.extraSales >= 1
                    ? ` · si se repite el alza, ~${formatNumber(Math.round(e.extraSales))} ventas extra`
                    : ''}
                  .
                </p>
                <p className="mt-2 flex-1 text-sm text-neutral-600">{e.idea}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {e.theme && <Badge tone="violet">Temática: {e.theme.name}</Badge>}
                  {e.campaign ? (
                    <Link
                      href={`/admin/marketing/campanas/${e.campaign.id}` as Route}
                      className="text-xs font-semibold text-good-ink hover:underline"
                    >
                      ✓ Campaña: {e.campaign.name}
                    </Link>
                  ) : (
                    e.importance >= 2 &&
                    m.available && (
                      <Link
                        href={e.createHref as Route}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                      >
                        <Plus className="size-3.5" aria-hidden /> Crear la campaña
                      </Link>
                    )
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 text-xs text-neutral-500">
          “Año pasado” compara las ventas por día en la ventana de la fecha con las cuatro semanas
          anteriores. La pauta sugerida mantiene la inversión diaria de hoy multiplicada por esa
          alza durante la ventana.
        </p>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Card delay={0.1}>
          <CardHeader
            icon={<FlaskConical />}
            title="¿Cuánto invertir?"
            description="Del objetivo de ventas a la inversión (o al revés), con el rendimiento de hoy"
          />
          {b.paidCpaCents ? (
            <BudgetPlanner
              baseSpendCents={b.adSpendCents}
              baseCpaCents={b.paidCpaCents}
              organicSales={organic}
              ticketCents={ticket}
              contributionPerSaleCents={base.contributionCents}
              fixedCents={ctx.fixedMonthly}
            />
          ) : (
            <p className="text-sm text-neutral-500">
              Hace falta al menos una venta con pauta en los últimos 30 días para proyectar.
            </p>
          )}
        </Card>
        <Card delay={0.14} padded={false}>
          <div className="p-5 pb-2 sm:p-6 sm:pb-2">
            <CardHeader
              className="mb-0"
              icon={<PieChart />}
              title="Reparto sugerido"
              description="Más plata a lo que deja más por peso invertido, sin mover más de 60 % de golpe"
            />
          </div>
          {channels.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                  <th scope="col" className="px-6 py-2.5 font-semibold">
                    Canal
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Hoy
                  </th>
                  <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                    Sugerido
                  </th>
                </tr>
              </thead>
              <tbody>
                {weights.map((c) => {
                  const now = totalSpend ? c.spendCents / totalSpend : 0
                  const next = totalWeight ? c.weight / totalWeight : 0
                  return (
                    <tr key={c.channel} className="border-b border-line last:border-0">
                      <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                        <ChannelTag channel={c.channel} />
                        <span className="block text-[11px] font-normal text-neutral-500">
                          POAS {formatMultiple(c.poas)}
                        </span>
                      </th>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatPercent(now, 0)}
                      </td>
                      <td
                        className={`px-6 py-2.5 text-right font-semibold tabular-nums ${next > now + 0.02 ? 'text-good-ink' : next < now - 0.02 ? 'text-critical' : 'text-ink'}`}
                      >
                        {formatPercent(next, 0)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-6 pb-6 text-sm text-neutral-500">
              Sin inversión en los últimos 30 días.
            </p>
          )}
          <p className="px-6 py-4 text-xs text-neutral-500">
            Sobre los últimos 30 días con último clic.{' '}
            {channels.length
              ? `${channelLabel(channels[0]!.channel)} es donde más se invierte.`
              : ''}
          </p>
        </Card>
      </div>

      <Card className="mt-5" delay={0.14}>
        <CardHeader
          icon={<Sparkles />}
          title="Estacionalidad"
          description="Ventas de cada mes: dónde conviene guardar presupuesto"
        />
        <WithTable
          caption="Ventas por mes"
          columns={['Mes', 'Ventas']}
          rows={months.map((k) => [monthLabel(k), byMonth.get(k) ?? 0])}
          chart={
            <ColumnChart
              ariaLabel="Ventas por mes de los últimos 12 meses"
              format="number"
              height={220}
              highlightLast
              series={[{ name: 'Ventas', color: SERIES[0] }]}
              data={months.map((k) => ({ label: monthLabel(k), values: [byMonth.get(k) ?? 0] }))}
            />
          }
        />
      </Card>
    </>
  )
}
