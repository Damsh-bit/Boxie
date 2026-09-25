import { Clock, Eye, Gift, MousePointerClick, Repeat, TicketPercent } from 'lucide-react'
import type { Metadata } from 'next'
import { formatARS, formatPercent } from '@/domain/admin/format'
import { funnel, salesSeries, weekdayHourMatrix } from '@/domain/admin/metrics'
import { arDayKey, inRange, WEEKDAYS } from '@/domain/admin/range'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { rangeFromParams } from '../../_lib/range'
import { BarList, Funnel, Heatmap, Legend, LineChart, WithTable } from '../../_ui/charts'
import { SERIES } from '../../_ui/palette'
import { Card, CardHeader, NeedsDb, PageHeader } from '../../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../../_ui/RangePicker'
import { Stat } from '../../_ui/Stat'

export const metadata: Metadata = { title: 'Analítica' }

const HOUR = 3_600_000

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

function hoursLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 48) return `${Math.round(hours)} h`
  return `${Math.round(hours / 24)} días`
}

export default async function AnalyticsPage({ searchParams }: PageProps<'/admin/analitica'>) {
  await requireAdmin('/admin/analitica')
  const repo = await adminRepo()
  const data = await repo.dataset()
  const { range, bucket, picker, label } = rangeFromParams(await searchParams, '90d')

  const steps = funnel(data.orders, data.boxies, range)
  const matrix = weekdayHourMatrix(data.orders, range)
  const byWeekday = matrix.map((row, i) => ({
    key: WEEKDAYS[i]!,
    value: row.reduce((s, v) => s + v, 0),
  }))
  const byHour = Array.from({ length: 24 }, (_, h) => matrix.reduce((s, row) => s + row[h]!, 0))
  const peakHour = byHour.indexOf(Math.max(...byHour))
  const peakDay = byWeekday.reduce((a, b) => (b.value > a.value ? b : a), byWeekday[0]!)
  const series = salesSeries(data.orders, range, bucket)

  // Conversión por temática: de los checkouts de cada temática, cuántos pagaron.
  const themeName = new Map(data.themes.map((t) => [t.id, t.name]))
  const perTheme = new Map<string, { created: number; paid: number; revenue: number }>()
  for (const o of data.orders) {
    if (!inRange(o.createdAt, range)) continue
    const row = perTheme.get(o.themeId) ?? { created: 0, paid: 0, revenue: 0 }
    row.created++
    if (o.status === 'paid' || o.status === 'refunded') {
      row.paid++
      row.revenue += o.amountCents
    }
    perTheme.set(o.themeId, row)
  }
  const themeRows = [...perTheme.entries()]
    .map(([id, r]) => ({
      id,
      name: themeName.get(id) ?? '—',
      ...r,
      conversion: r.created ? r.paid / r.created : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  // Tiempos del ciclo del regalo (Boxies creadas en el período).
  const boxies = data.boxies.filter((b) => inRange(b.createdAt, range))
  const toLock = boxies.flatMap((b) =>
    b.lockedAt ? [(Date.parse(b.lockedAt) - Date.parse(b.createdAt)) / HOUR] : [],
  )
  const toOpen = boxies.flatMap((b) =>
    b.lockedAt && b.firstOpenedAt
      ? [(Date.parse(b.firstOpenedAt) - Date.parse(b.lockedAt)) / HOUR]
      : [],
  )
  const opens = boxies.filter((b) => b.openCount > 0)
  const avgOpens = opens.length ? opens.reduce((s, b) => s + b.openCount, 0) / opens.length : 0

  // Cupones: cuánto de lo vendido usó uno y cuánto se descontó.
  const sales = data.orders.filter(
    (o) => (o.status === 'paid' || o.status === 'refunded') && inRange(o.paidAt, range),
  )
  const withCoupon = sales.filter((o) => o.couponId)
  const discount = withCoupon.reduce((s, o) => s + o.discountCents, 0)

  // Recompra por cohorte: de los que compraron por primera vez en cada mes, cuántos volvieron.
  const first = new Map<string, string>()
  const counts = new Map<string, number>()
  for (const o of [...data.orders].sort((a, b) => (a.paidAt ?? '').localeCompare(b.paidAt ?? ''))) {
    if (!o.paidAt || (o.status !== 'paid' && o.status !== 'refunded')) continue
    const email = o.buyerEmail.toLowerCase()
    if (!first.has(email)) first.set(email, arDayKey(o.paidAt).slice(0, 7))
    counts.set(email, (counts.get(email) ?? 0) + 1)
  }
  const cohorts = new Map<string, { buyers: number; repeat: number }>()
  for (const [email, month] of first) {
    const row = cohorts.get(month) ?? { buyers: 0, repeat: 0 }
    row.buyers++
    if ((counts.get(email) ?? 0) > 1) row.repeat++
    cohorts.set(month, row)
  }
  const cohortRows = [...cohorts.entries()].sort((a, b) => a[0].localeCompare(b[0])).slice(-8)

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Negocio{' '}
            {repo.mode === 'demo' && (
              <NeedsDb what="orders, boxies (admin_sales_by_day, admin_theme_ranking)" />
            )}
          </span>
        }
        title="Analítica"
        description="Cómo compra la gente y qué pasa con el regalo después: dónde se cae el embudo, cuándo se vende y qué temáticas convierten mejor."
        actions={<RangePicker {...picker} />}
      />

      <RangeContent>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat
            label="Horas del pago al regalo"
            value={median(toLock)}
            format="number"
            icon={<Gift />}
            hint={`mediana: ${hoursLabel(median(toLock))}`}
          />
          <Stat
            label="Horas del regalo a la apertura"
            value={median(toOpen)}
            format="number"
            icon={<Clock />}
            hint={`mediana: ${hoursLabel(median(toOpen))}`}
            delay={0.05}
          />
          <Stat
            label="Aperturas por regalo"
            value={avgOpens}
            format="number"
            icon={<Eye />}
            hint={`${avgOpens.toFixed(1).replace('.', ',')} en promedio`}
            delay={0.1}
          />
          <Stat
            label="Ventas con cupón"
            value={sales.length ? withCoupon.length / sales.length : 0}
            format="percent"
            icon={<TicketPercent />}
            hint={`${formatARS(discount)} descontados`}
            delay={0.15}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card delay={0.1}>
            <CardHeader
              icon={<MousePointerClick />}
              title="Embudo"
              description="De las compras iniciadas en el período, cuántas llegaron a cada paso"
            />
            <Funnel steps={steps} />
            <div className="mt-5 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {steps.slice(1).map((s, i) => {
                const lost = steps[i]!.count - s.count
                return (
                  <p key={s.key} className="rounded-xl bg-canvas px-3 py-2 text-neutral-600">
                    <span className="font-semibold text-ink">{lost.toLocaleString('es-AR')}</span>{' '}
                    se quedaron antes de “{s.label.toLowerCase()}”
                  </p>
                )
              })}
            </div>
          </Card>
          <Card delay={0.15}>
            <CardHeader title="Checkouts y ventas" description="Compras iniciadas contra pagadas" />
            <div className="mb-5">
              <Legend
                items={[
                  { label: 'Compras iniciadas', color: SERIES[1]! },
                  { label: 'Ventas', color: SERIES[0]! },
                ]}
              />
            </div>
            <WithTable
              caption="Compras iniciadas y ventas por período"
              columns={['Período', 'Iniciadas', 'Ventas', 'Conversión']}
              rows={series.map((p) => [
                label(p.key),
                p.checkouts,
                p.sales,
                p.checkouts ? formatPercent(p.sales / p.checkouts, 0) : '—',
              ])}
              chart={
                <LineChart
                  ariaLabel="Compras iniciadas y ventas por período"
                  format="number"
                  area={false}
                  series={[
                    { name: 'Compras iniciadas', color: SERIES[1] },
                    { name: 'Ventas', color: SERIES[0] },
                  ]}
                  data={series.map((p) => ({
                    label: label(p.key),
                    values: [p.checkouts, p.sales],
                  }))}
                />
              }
            />
          </Card>
        </div>

        <Card className="mt-5" delay={0.15}>
          <CardHeader
            title="Cuándo se vende"
            description={`Ventas por día y hora (hora argentina). Pico: ${peakDay.key} a las ${peakHour} h.`}
          />
          <Heatmap
            matrix={matrix}
            rows={WEEKDAYS}
            columns={Array.from({ length: 24 }, (_, h) => `${h} h`)}
          />
          <p className="mt-4 text-sm text-neutral-600">
            Tip: programá las publicaciones y los mails para un rato antes del pico. La oferta de la
            ficha rinde más cuando hay más gente mirando.
          </p>
        </Card>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card delay={0.2} padded={false}>
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <CardHeader
                className="mb-0"
                title="Temáticas"
                description="Ventas y conversión de su checkout"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                    <th scope="col" className="px-6 py-2.5 font-semibold">
                      Temática
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Iniciadas
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Ventas
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Conversión
                    </th>
                    <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                      Facturado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {themeRows.map((r) => (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                        {r.name}
                      </th>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.created}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.paid}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-ink tabular-nums">
                        {formatPercent(r.conversion, 0)}
                      </td>
                      <td className="px-6 py-2.5 text-right tabular-nums">
                        {formatARS(r.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card delay={0.25}>
            <CardHeader title="Ventas por día de la semana" />
            <BarList
              format="number"
              items={byWeekday.map((d) => ({ key: d.key, label: d.key, value: d.value }))}
            />
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card delay={0.2}>
            <CardHeader
              icon={<Repeat />}
              title="¿Vuelven a comprar?"
              description="De los que compraron por primera vez cada mes, cuántos compraron otra vez"
            />
            <BarList
              format="percent"
              color="var(--color-series-5)"
              items={cohortRows.map(([month, r]) => ({
                key: month,
                label: month,
                value: r.buyers ? r.repeat / r.buyers : 0,
                detail: `${r.repeat} de ${r.buyers}`,
              }))}
            />
            <p className="mt-4 text-xs text-neutral-500">
              Los meses recientes tienen menos tiempo para volver: es normal que den más bajo.
            </p>
          </Card>
          <Card delay={0.25} className="border-dashed">
            <CardHeader
              icon={<Eye />}
              title="Visitas y de dónde llegan"
              description="Tráfico del sitio, fuentes y dispositivos"
              action={<NeedsDb what="Vercel Web Analytics" />}
            />
            <p className="text-sm text-neutral-600">
              Las visitas no pasan por la base: se miden con Vercel Web Analytics (sin cookies). Al
              activarlo en el proyecto de Vercel, esta tarjeta muestra visitas por página, fuentes
              (Instagram, Google, WhatsApp) y la conversión de visita a compra.
            </p>
            <ul className="mt-4 space-y-1.5 text-sm text-neutral-600">
              <li>1. Vercel → proyecto boxie-digital → Analytics → Enable.</li>
              <li>
                2. Sumar el paquete{' '}
                <code className="rounded bg-canvas px-1">@vercel/analytics</code> al layout.
              </li>
              <li>3. Conectar la API de Analytics a esta página.</li>
            </ul>
          </Card>
        </div>
      </RangeContent>
    </RangeScope>
  )
}
