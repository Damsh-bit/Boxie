import { Download, HeartHandshake, Mail, Users } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { formatARS, formatDate, formatRelative } from '@/domain/admin/format'
import { customers, customerSummary } from '@/domain/admin/metrics'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { segmentOf, vipThreshold } from '../../_lib/customers'
import { paginate } from '../../_lib/queries'
import { one } from '../../_lib/range'
import { Pagination, SearchBox, StatusTabs } from '../../_ui/Filters'
import { Badge, Card, CardHeader, EmptyState, NeedsDb, PageHeader } from '../../_ui/primitives'
import { RowLink } from '../../_ui/RowLink'
import { CountUp } from '../../_ui/Stat'

export const metadata: Metadata = { title: 'Clientes' }

const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
const DAY = 86_400_000
export default async function CustomersPage({ searchParams }: PageProps<'/admin/clientes'>) {
  await requireAdmin('/admin/clientes')
  const params = await searchParams
  const repo = await adminRepo()
  const data = await repo.dataset()
  const now = new Date().getTime()
  const rows = customers(data.orders)
  const summary = customerSummary(rows)
  const vipFrom = vipThreshold(rows)
  const themeName = new Map(data.themes.map((t) => [t.id, t.name]))

  const q = strip(one(params.q).trim())
  const segmento = one(params.segmento)
  const filtered = rows.filter(
    (r) =>
      (!segmento || segmentOf(r, now, vipFrom).includes(segmento)) &&
      (!q || strip(`${r.name} ${r.email} ${r.phone ?? ''}`).includes(q)),
  )
  const count = (s: string) => rows.filter((r) => segmentOf(r, now, vipFrom).includes(s)).length
  const { items, page, pages, total } = paginate(filtered, one(params.pagina))

  // Checkouts abandonados de los últimos 3 días (sin compra posterior del mismo mail).
  const recentAbandoned = rows
    .filter((r) => r.sales === 0 && now - Date.parse(r.lastActivityAt) < 3 * DAY)
    .slice(0, 6)
  const offer = data.coupons.find((c) => c.id === data.settings.offerCouponId && c.active)

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Ventas {repo.mode === 'demo' && <NeedsDb what="orders (agrupadas por mail)" />}
          </span>
        }
        title="Clientes"
        description="Quién compra, cuánto y cada cuánto. Sale de las órdenes: cada mail es un cliente."
        actions={
          <a
            href={`/admin/clientes/exportar?${new URLSearchParams({ segmento, q: one(params.q) })}`}
            className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
          >
            <Download className="size-4" aria-hidden /> Exportar CSV
          </a>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Mini
          label="Compradores"
          value={summary.buyers}
          hint={`de ${summary.total.toLocaleString('es-AR')} mails`}
        />
        <Mini
          label="Vuelven a comprar"
          value={summary.repeatRate}
          format="percent"
          hint={`${summary.repeatBuyers} recurrentes`}
        />
        <Mini
          label="Valor promedio por cliente"
          value={summary.avgLifetimeCents}
          format="ars"
          hint="todo lo que compró"
        />
        <Mini label="Iniciaron y no compraron" value={summary.abandoned} hint="posibles clientes" />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3">
            <StatusTabs
              id="customers"
              param="segmento"
              options={[
                { value: '', label: 'Todos', count: rows.length },
                { value: 'compradores', label: 'Compradores', count: count('compradores') },
                { value: 'recurrentes', label: 'Recurrentes', count: count('recurrentes') },
                { value: 'nuevos', label: 'Nuevos (30 d)', count: count('nuevos') },
                { value: 'vip', label: 'Top 5 %', count: count('vip') },
                { value: 'abandonaron', label: 'No compraron', count: count('abandonaron') },
              ]}
            />
            <SearchBox placeholder="Nombre, mail o teléfono" />
          </div>
          <Card padded={false} className="overflow-hidden">
            {items.length === 0 ? (
              <EmptyState
                icon={<Users />}
                title="Nadie coincide"
                text="Probá con otro segmento o búsqueda."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-canvas/60 text-left text-xs text-neutral-500">
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Cliente
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">
                        Compras
                      </th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">
                        Gastó
                      </th>
                      <th scope="col" className="px-3 py-3 font-semibold">
                        Última actividad
                      </th>
                      <th scope="col" className="px-6 py-3 font-semibold">
                        Temáticas
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((c, i) => {
                      const segments = segmentOf(c, now, vipFrom)
                      return (
                        <RowLink
                          key={c.email}
                          href={`/admin/ventas?q=${encodeURIComponent(c.email)}&periodo=12m`}
                          index={i}
                        >
                          <td className="max-w-72 px-6 py-3">
                            <span className="flex items-center gap-2">
                              <span className="truncate font-semibold text-ink">{c.name}</span>
                              {segments.includes('vip') && <Badge tone="violet">Top</Badge>}
                              {segments.includes('recurrentes') && (
                                <Badge tone="good">Vuelve</Badge>
                              )}
                              {c.refunds > 0 && <Badge tone="warning">Reembolso</Badge>}
                            </span>
                            <span className="block truncate text-xs text-neutral-500">
                              {c.email}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-ink tabular-nums">
                            {c.sales}
                            {c.orders > c.sales && (
                              <span className="text-xs text-neutral-400"> / {c.orders}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">
                            {c.spentCents ? formatARS(c.spentCents) : '—'}
                          </td>
                          <td
                            className="px-3 py-3 whitespace-nowrap text-neutral-600"
                            title={formatDate(c.lastActivityAt)}
                          >
                            {formatRelative(c.lastActivityAt)}
                          </td>
                          <td className="max-w-56 truncate px-6 py-3 text-neutral-600">
                            {c.themes.map((t) => themeName.get(t) ?? '—').join(', ') || '—'}
                          </td>
                        </RowLink>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="border-t border-line">
              <Pagination page={page} pages={pages} total={total} label="clientes" />
            </div>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card>
            <CardHeader
              icon={<HeartHandshake />}
              title="Recuperar compras"
              description="Iniciaron el pago en los últimos 3 días y no volvieron"
            />
            {recentAbandoned.length === 0 ? (
              <p className="text-sm text-neutral-500">Nadie para recuperar por ahora.</p>
            ) : (
              <ul className="space-y-2">
                {recentAbandoned.map((c) => {
                  const first = c.name.split(' ')[0]
                  const body = `¡Hola ${first}! Vimos que empezaste a armar una Boxie y no llegaste a terminar la compra.${offer ? ` Te dejamos el cupón ${offer.code} para que la completes con descuento.` : ''} Si tuviste algún problema con el pago, respondé este mail y te ayudamos.`
                  return (
                    <li
                      key={c.email}
                      className="flex items-center gap-3 rounded-2xl border border-line p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink">{c.name}</p>
                        <p className="truncate text-xs text-neutral-500">
                          {formatRelative(c.lastActivityAt)}
                        </p>
                      </div>
                      <a
                        href={`mailto:${c.email}?subject=${encodeURIComponent('Tu Boxie te está esperando 🎁')}&body=${encodeURIComponent(body)}`}
                        className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-xs font-semibold text-brand transition-colors hover:bg-brand hover:text-white"
                      >
                        <Mail className="size-3.5" aria-hidden /> Escribir
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-3 text-xs text-neutral-500">
              Abre tu programa de mail con un mensaje listo
              {offer ? ` y el cupón ${offer.code}` : ''}. El envío automático llega con la base y
              Resend.
            </p>
          </Card>
          <Card>
            <CardHeader title="Quiénes más compran" description="Top 5 por lo gastado" />
            <ol className="space-y-2">
              {rows.slice(0, 5).map((c, i) => (
                <li key={c.email}>
                  <Link
                    href={`/admin/ventas?q=${encodeURIComponent(c.email)}&periodo=12m` as Route}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-canvas"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-canvas text-xs font-bold text-neutral-500">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.name}</span>
                    <span className="text-sm font-semibold text-ink tabular-nums">
                      {formatARS(c.spentCents)}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  )
}

function Mini({
  label,
  value,
  format = 'number',
  hint,
}: {
  label: string
  value: number
  format?: 'number' | 'percent' | 'ars'
  hint?: string
}) {
  return (
    <div className="rounded-[20px] border border-line bg-white p-4">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-ink">
        <CountUp value={value} format={format} />
      </p>
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  )
}
