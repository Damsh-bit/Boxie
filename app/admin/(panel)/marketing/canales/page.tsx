import { Hourglass, Monitor, Route as RouteIcon, Signpost, Split, Waypoints } from 'lucide-react'
import type { Metadata } from 'next'
import { formatCompactARS, formatNumber, formatPercent } from '@/domain/admin/format'
import { channelLabel, type ChannelId } from '@/domain/marketing/channels'
import {
  assistedByChannel,
  channelPerformance,
  channelSeries,
  creditOfSource,
  daysToPurchase,
  deviceStats,
  landingStats,
  sourceMediumStats,
  verdict,
} from '@/domain/marketing/performance'
import { ATTRIBUTION_MODELS } from '@/domain/marketing/types'
import { requireAdmin } from '@/server/admin/session'
import { BarList, ColumnChart, Legend, LineChart, WithTable } from '../../../_ui/charts'
import { SERIES } from '../../../_ui/palette'
import { Card, CardHeader, NeedsDb, PageHeader } from '../../../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../../../_ui/RangePicker'
import { loadMarketing, MODEL_SLUG } from '../_lib/load'
import { ChannelTag, ModelPicker } from '../_ui/bits'
import { channelColor, hasOwnColor } from '../_ui/colors'
import { MarketingNav } from '../_ui/MarketingNav'
import { SchemaNotice } from '../_ui/SchemaNotice'
import { ChannelTable } from './ChannelTable'

export const metadata: Metadata = { title: 'Canales · Marketing' }

const DEVICE_LABEL: Record<string, string> = {
  mobile: 'Celular',
  desktop: 'Computadora',
  tablet: 'Tablet',
}

function landingLabel(path: string) {
  if (path === '/') return 'Inicio'
  if (path.startsWith('/tematicas/')) return `Temática · ${path.slice(11)}`
  if (path.startsWith('/ejemplo/')) return `Ejemplo · ${path.slice(9)}`
  return path
}

export default async function ChannelsPage({
  searchParams,
}: PageProps<'/admin/marketing/canales'>) {
  await requireAdmin('/admin/marketing/canales')
  const ctx = await loadMarketing(await searchParams, '30d')
  const { input, idx, range, bucket, model, targets, m, label } = ctx

  const { rows, total } = channelPerformance(input, range, model, idx)
  const tableRows = rows.map((r) => ({
    channel: r.channel,
    sessions: r.sessions,
    cvr: r.cvr,
    sales: r.sales,
    newCustomers: r.newCustomers,
    revenueCents: r.revenueCents,
    spendCents: r.spendCents,
    cpaCents: r.cpaCents,
    cacCents: r.cacCents,
    roas: r.roas,
    poas: r.poas,
    profitCents: r.profitCents,
    contributionCents: r.contributionCents,
    verdict: verdict(r, targets),
  }))

  // Ventas en el tiempo de los canales con color propio que más venden (hasta 5).
  const top = rows
    .filter((r) => hasOwnColor(r.channel) && r.sales > 0)
    .slice(0, 5)
    .map((r) => r.channel)
  const series = channelSeries(input, range, bucket, model, top, idx)

  // Primer clic contra último: quién presenta Boxie y quién cierra la venta.
  const first = channelPerformance(input, range, 'first', idx).rows
  const last = channelPerformance(input, range, 'last', idx).rows
  const compared = [...new Set([...first, ...last].map((r) => r.channel))]
    .filter((c) => c !== 'sin-datos')
    .map((channel) => ({
      channel,
      first: first.find((r) => r.channel === channel)?.sales ?? 0,
      last: last.find((r) => r.channel === channel)?.sales ?? 0,
    }))
    .sort((a, b) => b.first + b.last - (a.first + a.last))
    .slice(0, 8)

  const assisted = assistedByChannel(input, range, idx).filter((r) => r.channel !== 'sin-datos')
  const lag = daysToPurchase(input, range, idx)
  const devices = deviceStats(input, range)
  const landings = landingStats(input, range).slice(0, 10)
  const sources = sourceMediumStats(input, range).slice(0, 15)
  const modelInfo = ATTRIBUTION_MODELS.find((x) => x.value === model)!

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            Marketing
            {ctx.mode === 'demo' && <NeedsDb what="marketing_traffic, order_attribution" />}
          </span>
        }
        title="Canales"
        description="Qué trae cada canal, cuánto cuesta y cuánto deja. Cambiá el modelo de atribución para ver quién descubre y quién cierra las ventas."
        actions={
          <>
            <RangePicker {...ctx.picker} />
            <ModelPicker model={model} slugs={MODEL_SLUG} />
          </>
        }
      >
        <MarketingNav />
      </PageHeader>

      <RangeContent>
        {!m.available && <SchemaNotice />}

        <Card padded={false} delay={0.05}>
          <div className="flex flex-col gap-2 p-5 pb-3 sm:flex-row sm:items-start sm:justify-between sm:p-6 sm:pb-3">
            <CardHeader
              className="mb-0"
              icon={<Waypoints />}
              title="Todos los canales"
              description={`Modelo: ${modelInfo.label.toLowerCase()}. ${modelInfo.hint}`}
            />
            <p className="shrink-0 text-xs text-neutral-500 sm:text-right">
              {formatNumber(total.sessions)} visitas · {formatNumber(Math.round(total.sales))}{' '}
              ventas · {formatCompactARS(total.revenueCents)}
            </p>
          </div>
          <ChannelTable rows={tableRows} />
          <p className="px-6 py-4 text-xs text-neutral-500">
            CPA = inversión ÷ ventas · CAC = inversión ÷ clientes nuevos · ROAS = facturación ÷
            inversión · POAS = contribución (lo cobrado menos pasarela, impuestos, entrega y
            comisiones) ÷ inversión. Un POAS mayor a 1 quiere decir que la publicidad se paga sola.
          </p>
        </Card>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card delay={0.1}>
            <CardHeader
              title="Ventas por canal"
              description="Los canales que más venden, en el tiempo"
            />
            <div className="mb-5">
              <Legend
                items={top.map((c) => ({ label: channelLabel(c), color: channelColor(c) }))}
              />
            </div>
            <WithTable
              caption="Ventas por canal y período"
              columns={['Período', ...top.map((c) => channelLabel(c))]}
              rows={series.map((p) => [label(p.key), ...p.values.map((v) => Math.round(v))])}
              chart={
                <LineChart
                  ariaLabel="Ventas por canal y período"
                  format="number"
                  area={false}
                  series={top.map((c) => ({ name: channelLabel(c), color: channelColor(c) }))}
                  data={series.map((p) => ({ label: label(p.key), values: p.values }))}
                />
              }
            />
          </Card>
          <Card delay={0.14}>
            <CardHeader
              icon={<Split />}
              title="Quién descubre y quién cierra"
              description="Ventas de cada canal con primer clic y con último clic"
            />
            <div className="mb-5">
              <Legend
                items={[
                  { label: 'Primer clic (descubrió)', color: SERIES[4]!, shape: 'box' },
                  { label: 'Último clic (cerró)', color: SERIES[0]!, shape: 'box' },
                ]}
              />
            </div>
            <WithTable
              caption="Ventas por canal con primer y último clic"
              columns={['Canal', 'Primer clic', 'Último clic']}
              rows={compared.map((r) => [
                channelLabel(r.channel),
                Math.round(r.first),
                Math.round(r.last),
              ])}
              chart={
                <ColumnChart
                  ariaLabel="Ventas por canal con primer y último clic"
                  format="number"
                  series={[
                    { name: 'Primer clic', color: SERIES[4] },
                    { name: 'Último clic', color: SERIES[0] },
                  ]}
                  data={compared.map((r) => ({
                    label: channelLabel(r.channel).replace(' (orgánico)', ''),
                    values: [r.first, r.last],
                  }))}
                />
              }
            />
            <p className="mt-4 text-xs text-neutral-500">
              Un canal con más primeros clics que últimos presenta la marca (prospección, redes): si
              se lo mide solo por último clic, parece peor de lo que es.
            </p>
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card delay={0.12} padded={false}>
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <CardHeader
                className="mb-0"
                icon={<RouteIcon />}
                title="Ventas asistidas"
                description="Ventas que cada canal cerró y en las que participó antes (fue el primer toque)"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                    <th scope="col" className="px-6 py-2.5 font-semibold">
                      Canal
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Cerró
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Asistió
                    </th>
                    <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                      Asistidas por venta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assisted.map((r) => (
                    <tr key={r.channel} className="border-b border-line last:border-0">
                      <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                        <ChannelTag channel={r.channel as ChannelId} />
                      </th>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.closed}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.assisted}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-ink tabular-nums">
                        {r.closed
                          ? (r.assisted / r.closed).toLocaleString('es-AR', {
                              maximumFractionDigits: 2,
                            })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <Card delay={0.16}>
            <CardHeader
              icon={<Hourglass />}
              title="Cuánto tardan en comprar"
              description="Desde que llegaron por primera vez hasta la compra"
            />
            <BarList
              format="number"
              color={SERIES[1]}
              items={lag.map((b) => ({ key: b.label, label: b.label, value: b.count }))}
            />
            <p className="mt-4 text-xs text-neutral-500">
              Si la mayoría compra en días, el remarketing de 7 a 14 días tiene sentido; si compran
              el mismo día, lo que importa es el anuncio y la página de entrada.
            </p>
          </Card>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card delay={0.14}>
            <CardHeader
              icon={<Monitor />}
              title="Dispositivos"
              description="Visitas, ventas y conversión"
            />
            <ul className="space-y-3">
              {devices.map((d) => (
                <li key={d.key} className="rounded-2xl bg-canvas p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-semibold text-ink">{DEVICE_LABEL[d.key] ?? d.key}</p>
                    <p className="text-sm font-semibold text-ink tabular-nums">
                      {d.cvr === null ? '—' : formatPercent(d.cvr, 2)}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {formatNumber(d.sessions)} visitas · {formatNumber(d.sales)} ventas ·{' '}
                    {formatCompactARS(d.revenueCents)}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
          <Card delay={0.18} padded={false}>
            <div className="p-5 pb-2 sm:p-6 sm:pb-2">
              <CardHeader
                className="mb-0"
                icon={<Signpost />}
                title="Páginas de entrada"
                description="Dónde aterrizan las visitas y cuántas siguen hasta comprar"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                    <th scope="col" className="px-6 py-2.5 font-semibold">
                      Página
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Visitas
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Vieron temática
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Al checkout
                    </th>
                    <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                      Ventas
                    </th>
                    <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                      Conv.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {landings.map((l) => (
                    <tr key={l.key} className="border-b border-line last:border-0">
                      <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                        {landingLabel(l.key)}
                      </th>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(l.sessions)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {l.sessions ? formatPercent(l.themeViews / l.sessions, 0) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {l.sessions ? formatPercent(l.checkoutViews / l.sessions, 1) : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{l.sales}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-ink tabular-nums">
                        {l.cvr === null ? '—' : formatPercent(l.cvr, 2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <Card className="mt-5" delay={0.16} padded={false}>
          <div className="p-5 pb-2 sm:p-6 sm:pb-2">
            <CardHeader
              className="mb-0"
              title="Origen / medio / campaña"
              description="El detalle crudo de las etiquetas (utm_source, utm_medium, utm_campaign) y el canal en el que caen"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                  <th scope="col" className="px-6 py-2.5 font-semibold">
                    Origen / medio
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Campaña
                  </th>
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    Canal
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Visitas
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                    Ventas
                  </th>
                  <th scope="col" className="px-6 py-2.5 text-right font-semibold">
                    Conv.
                  </th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => {
                  const [source = '', medium = '', campaign = ''] = s.key.split('\u0000')
                  const credit = creditOfSource({ source, medium, campaign }, idx)
                  return (
                    <tr key={s.key} className="border-b border-line last:border-0">
                      <th scope="row" className="px-6 py-2.5 text-left font-medium text-ink">
                        {source} <span className="text-neutral-400">/</span>{' '}
                        <span className="text-neutral-600">{medium || '(sin medio)'}</span>
                      </th>
                      <td className="max-w-56 truncate px-3 py-2.5 text-neutral-600">
                        {campaign || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <ChannelTag channel={credit.channel} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {formatNumber(s.sessions)}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{s.sales}</td>
                      <td className="px-6 py-2.5 text-right font-semibold text-ink tabular-nums">
                        {s.cvr === null ? '—' : formatPercent(s.cvr, 2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </RangeContent>
    </RangeScope>
  )
}
