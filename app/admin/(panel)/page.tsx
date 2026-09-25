import {
  ArrowRight,
  BadgePercent,
  Gift,
  MailOpen,
  Receipt,
  ShoppingCart,
  Sparkles,
  Target,
  TicketPercent,
  TrendingUp,
  UserPlus,
  Wallet,
  WandSparkles,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  formatARS,
  formatCompactARS,
  formatDateTime,
  formatPercent,
  formatRelative,
} from '@/domain/admin/format'
import { monthProjection, profitAndLoss } from '@/domain/admin/finance'
import {
  alerts as computeAlerts,
  couponRanking,
  delta,
  funnel,
  kpisWithPrevious,
  mixBy,
  salesSeries,
  todayVsYesterday,
} from '@/domain/admin/metrics'
import { AR_OFFSET_MS, previousRange } from '@/domain/admin/range'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { ButtonLink } from '@/ui/Button'
import { rangeFromParams } from '../_lib/range'
import { AlertList } from '../_ui/AlertList'
import { BarList, Donut, Funnel, Legend, LineChart, WithTable } from '../_ui/charts'
import { SERIES } from '../_ui/palette'
import { Badge, Card, CardHeader, NeedsDb, PageHeader, Progress } from '../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../_ui/RangePicker'
import { CountUp, Stat } from '../_ui/Stat'
import { orderStatus } from '../_ui/status'

export const metadata: Metadata = { title: 'Resumen' }

function greeting(now = new Date()) {
  const hour = new Date(now.getTime() + AR_OFFSET_MS).getUTCHours()
  if (hour < 6) return 'Buenas noches'
  if (hour < 13) return 'Buen día'
  if (hour < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default async function DashboardPage({ searchParams }: PageProps<'/admin'>) {
  const session = await requireAdmin('/admin')
  const repo = await adminRepo()
  const data = await repo.dataset()
  const { range, bucket, picker, label } = rangeFromParams(await searchParams)
  const now = new Date()

  const { current: k, previous: p } = kpisWithPrevious(data.orders, data.boxies, range)
  const series = salesSeries(data.orders, range, bucket)
  const prevSeries = salesSeries(data.orders, previousRange(range), bucket)
  const pnl = profitAndLoss(data.orders, data.expenses, data.settings, range)
  const prevPnl = profitAndLoss(data.orders, data.expenses, data.settings, previousRange(range))
  const month = monthProjection(data.orders, data.settings.monthlyGoalCents, now)
  const today = todayVsYesterday(data.orders, now)

  const themeName = new Map(data.themes.map((t) => [t.id, t.name]))
  const planById = new Map(data.plans.map((pl) => [pl.id, pl]))
  const themeMix = mixBy(data.orders, range, (o) => o.themeId)
  const topThemes = themeMix.slice(0, 5)
  const otherThemes = themeMix.slice(5).reduce((s, r) => s + r.revenueCents, 0)
  const planMix = mixBy(data.orders, range, (o) => o.planId)
  const coupons = couponRanking(data.orders, range).slice(0, 5)
  const steps = funnel(data.orders, data.boxies, range)
  const alertList = computeAlerts({
    orders: data.orders,
    boxies: data.boxies,
    coupons: data.coupons,
    draftThemes: data.themes.filter((t) => t.status === 'draft').length,
    now,
  })
  const recent = [...data.orders]
    .filter((o) => o.status !== 'pending' || o.providerStatus === 'amount_mismatch')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 7)

  const trend = (key: 'revenueCents' | 'sales') => series.map((s) => s[key])
  const firstName = session.name.split(' ')[0]

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            {greeting(now)}, {firstName}
            {repo.mode === 'demo' && <NeedsDb what="orders, boxies, coupons, themes" />}
          </span>
        }
        title="Así viene Boxie"
        description={
          today.today > 0
            ? `Hoy van ${today.today} ${today.today === 1 ? 'venta' : 'ventas'} (${formatARS(today.todayCents)}); ayer fueron ${today.yesterday}.`
            : `Todavía no hay ventas hoy; ayer fueron ${today.yesterday}.`
        }
        actions={
          <>
            <RangePicker {...picker} />
            <ButtonLink href="/admin/generador" size="sm" className="h-10">
              <WandSparkles className="size-4" aria-hidden /> Generar temáticas
            </ButtonLink>
          </>
        }
      />

      <RangeContent>
        <div className="grid gap-4 lg:gap-5 xl:grid-cols-3">
          <Card className="xl:col-span-2" delay={0.05}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium text-neutral-600">
                  <Wallet className="size-4 text-brand" aria-hidden /> Facturación ·{' '}
                  {picker.label.toLowerCase()}
                </p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-ink">
                  <CountUp value={k.revenueCents} format="ars" />
                </p>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
                  <DeltaBadge value={delta(k.revenueCents, p.revenueCents)} />
                  vs. {formatCompactARS(p.revenueCents)} el período anterior
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                <span className="text-neutral-500">Ventas</span>
                <span className="text-right font-semibold text-ink tabular-nums">{k.sales}</span>
                <span className="text-neutral-500">Ganancia neta</span>
                <span className="text-right font-semibold text-ink tabular-nums">
                  {formatCompactARS(pnl.netCents)}
                </span>
                <span className="text-neutral-500">Margen neto</span>
                <span className="text-right font-semibold text-ink tabular-nums">
                  {formatPercent(pnl.netMargin)}
                </span>
              </div>
            </div>
            <div className="mt-6">
              <div className="mb-6">
                <Legend
                  items={[
                    { label: 'Este período', color: SERIES[0]! },
                    { label: 'Período anterior', color: '#c9c0c6' },
                  ]}
                />
              </div>
              <WithTable
                caption="Facturación por período"
                columns={['Período', 'Facturación', 'Período anterior', 'Ventas']}
                rows={series.map((s, i) => [
                  label(s.key),
                  formatARS(s.revenueCents),
                  formatARS(prevSeries[i]?.revenueCents ?? 0),
                  s.sales,
                ])}
                chart={
                  <LineChart
                    ariaLabel="Facturación por período comparada con el período anterior"
                    format="ars"
                    series={[
                      { name: 'Este período' },
                      { name: 'Período anterior', color: '#c9c0c6' },
                    ]}
                    data={series.map((s, i) => ({
                      label: label(s.key),
                      values: [s.revenueCents, prevSeries[i]?.revenueCents ?? 0],
                    }))}
                  />
                }
              />
            </div>
          </Card>

          <Card delay={0.1} className="flex flex-col">
            <CardHeader
              icon={<Target />}
              title="Meta del mes"
              description={`Día ${month.dayOfMonth} de ${month.daysInMonth}`}
              action={
                <Link
                  href="/admin/configuracion"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Cambiar
                </Link>
              }
            />
            <p className="text-3xl font-semibold text-ink">
              <CountUp value={month.soFarCents} format="ars" />
            </p>
            <p className="mt-1 text-sm text-neutral-500">de {formatARS(month.goalCents)}</p>
            <Progress
              value={month.progress}
              className="mt-4 h-3"
              tone={month.projectedCents >= month.goalCents ? 'good' : 'brand'}
              label="Avance de la meta del mes"
            />
            <div className="mt-5 rounded-2xl bg-canvas p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <TrendingUp className="size-4 text-brand" aria-hidden /> Proyección a fin de mes
              </p>
              <p className="mt-1 text-2xl font-semibold text-ink">
                {formatARS(Math.round(month.projectedCents / 100) * 100)}
              </p>
              <p className="mt-1 text-sm text-neutral-600">
                {month.projectedCents >= month.goalCents
                  ? `Al ritmo actual se supera la meta por ${formatCompactARS(month.projectedCents - month.goalCents)}.`
                  : `Faltarían ${formatCompactARS(month.goalCents - month.projectedCents)}: unas ${Math.ceil(
                      (month.goalCents - month.projectedCents) / Math.max(k.avgTicketCents, 1),
                    )} ventas más.`}
              </p>
            </div>
            <div className="mt-auto pt-5">
              <ButtonLink href="/admin/finanzas" variant="secondary" size="sm" block>
                Ver finanzas <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </Card>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 lg:mt-5 lg:gap-5 xl:grid-cols-4">
          <Stat
            label="Ventas"
            value={k.sales}
            delta={delta(k.sales, p.sales)}
            icon={<ShoppingCart />}
            trend={trend('sales')}
            delay={0.12}
          />
          <Stat
            label="Ticket promedio"
            value={k.avgTicketCents}
            format="ars"
            delta={delta(k.avgTicketCents, p.avgTicketCents)}
            icon={<Receipt />}
            delay={0.16}
          />
          <Stat
            label="Conversión del checkout"
            value={k.conversion}
            format="percent"
            delta={delta(k.conversion, p.conversion)}
            icon={<BadgePercent />}
            hint={`${k.checkouts} compras iniciadas`}
            delay={0.2}
          />
          <Stat
            label="Ganancia neta"
            value={pnl.netCents}
            format="ars"
            delta={delta(pnl.netCents, prevPnl.netCents)}
            icon={<Sparkles />}
            hint={`margen ${formatPercent(pnl.netMargin)}`}
            delay={0.24}
          />
          <Stat
            label="Boxies creadas"
            value={k.boxiesCreated}
            delta={delta(k.boxiesCreated, p.boxiesCreated)}
            icon={<Gift />}
            delay={0.28}
          />
          <Stat
            label="Regalos abiertos"
            value={k.giftsOpened}
            delta={delta(k.giftsOpened, p.giftsOpened)}
            icon={<MailOpen />}
            hint={`${formatPercent(k.openRate, 0)} de los regalados`}
            delay={0.32}
          />
          <Stat
            label="Clientes nuevos"
            value={k.newCustomers}
            delta={delta(k.newCustomers, p.newCustomers)}
            icon={<UserPlus />}
            hint={`de ${k.customers} compradores`}
            delay={0.36}
          />
          <Stat
            label="Descuentos otorgados"
            value={k.discountCents}
            format="ars"
            delta={delta(k.discountCents, p.discountCents)}
            goodWhenUp={false}
            icon={<TicketPercent />}
            delay={0.4}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:mt-5 lg:gap-5 xl:grid-cols-2">
          <Card delay={0.15}>
            <CardHeader
              title="Temáticas que más venden"
              description="Participación en la facturación del período"
              action={
                <Link
                  href="/admin/tematicas"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Catálogo
                </Link>
              }
            />
            <Donut
              format="ars-compact"
              center={{ value: formatCompactARS(k.revenueCents), label: 'facturado' }}
              items={[
                ...topThemes.map((t) => ({
                  label: themeName.get(t.key) ?? 'Temática borrada',
                  value: t.revenueCents,
                })),
                ...(otherThemes > 0
                  ? [{ label: 'Otras', value: otherThemes, color: '#b9aeb5' }]
                  : []),
              ]}
            />
          </Card>

          <Card delay={0.2}>
            <CardHeader
              title="Ventas por plan"
              description="Cuánto aporta cada nivel de precio"
              action={
                <Link
                  href="/admin/planes"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Planes
                </Link>
              }
            />
            <BarList
              format="ars"
              items={planMix.map((row) => {
                const plan = planById.get(row.key)
                return {
                  key: row.key,
                  label: (
                    <>
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: plan?.color ?? '#b9aeb5' }}
                        aria-hidden
                      />
                      {plan?.name ?? 'Sin plan'}
                    </>
                  ),
                  value: row.revenueCents,
                  color: plan?.color,
                  detail: `${row.sales} ventas · ${formatPercent(row.share, 0)}`,
                }
              })}
            />
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
              {data.plans
                .filter((pl) => pl.active)
                .sort((a, b) => a.rank - b.rank)
                .map((pl) => {
                  const row = planMix.find((r) => r.key === pl.id)
                  return (
                    <div key={pl.id}>
                      <p className="text-xs text-neutral-500">{pl.name}</p>
                      <p className="text-lg font-semibold text-ink">
                        {row ? formatPercent(row.sales / Math.max(k.sales, 1), 0) : '0 %'}
                      </p>
                      <p className="text-[11px] text-neutral-500">de las ventas</p>
                    </div>
                  )
                })}
            </div>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:mt-5 lg:gap-5 xl:grid-cols-5">
          <Card className="xl:col-span-3" delay={0.2}>
            <CardHeader
              title="Del checkout al regalo abierto"
              description="De las compras que se iniciaron en el período, cuántas llegaron a cada paso"
              action={
                <Link
                  href="/admin/analitica"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Analítica
                </Link>
              }
            />
            <Funnel steps={steps} />
          </Card>

          <Card className="xl:col-span-2" delay={0.25} id="alertas">
            <CardHeader
              title="Para revisar"
              description={alertList.length ? 'Lo que necesita atención' : undefined}
            />
            <AlertList alerts={alertList} />
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:mt-5 lg:gap-5 xl:grid-cols-5">
          <Card className="xl:col-span-3" delay={0.25} padded={false}>
            <div className="flex items-center justify-between p-5 pb-3 sm:p-6 sm:pb-3">
              <h2 className="font-semibold text-ink">Últimos movimientos</h2>
              <Link
                href="/admin/ventas"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <ul className="divide-y divide-line">
              {recent.map((o) => {
                const status = orderStatus(o)
                return (
                  <li key={o.id}>
                    <Link
                      href={`/admin/ventas/${o.id}`}
                      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-canvas sm:px-6"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-xs font-bold text-neutral-600">
                        {o.buyerName.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {o.buyerName}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          {themeName.get(o.themeId)} · {planById.get(o.planId ?? '')?.name ?? '—'} ·{' '}
                          <time dateTime={o.createdAt} title={formatDateTime(o.createdAt)}>
                            {formatRelative(o.createdAt, now)}
                          </time>
                        </span>
                      </span>
                      <span className="hidden sm:inline">
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </span>
                      <span className="w-24 text-right text-sm font-semibold text-ink tabular-nums">
                        {formatARS(o.amountCents)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="xl:col-span-2" delay={0.3}>
            <CardHeader
              title="Cupones más usados"
              description="Ventas con cupón en el período"
              action={
                <Link
                  href="/admin/cupones"
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Cupones
                </Link>
              }
            />
            <BarList
              format="number"
              color="var(--color-series-2)"
              emptyText="Ninguna venta usó cupón en el período."
              items={coupons.map((c) => ({
                key: c.couponId,
                label: <span className="font-mono text-[13px] font-semibold">{c.code}</span>,
                value: c.uses,
                detail: `−${formatCompactARS(c.discountCents)}`,
              }))}
            />
          </Card>
        </div>
      </RangeContent>
    </RangeScope>
  )
}

function DeltaBadge({ value }: { value: number | null }) {
  if (value === null) return <Badge>sin datos previos</Badge>
  const pct = Math.round(value * 100)
  return (
    <Badge tone={pct > 0 ? 'good' : pct < 0 ? 'critical' : 'neutral'}>
      {pct > 0 ? '▲' : pct < 0 ? '▼' : '='} {Math.abs(pct)} %
    </Badge>
  )
}
