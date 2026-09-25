import { Download, ShoppingBag } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { formatARS, formatDateTime } from '@/domain/admin/format'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { filterOrders, matchOrderStatus, paginate } from '../../_lib/queries'
import { one, rangeFromParams } from '../../_lib/range'
import { FilterSelect, Pagination, SearchBox, StatusTabs } from '../../_ui/Filters'
import { Badge, Card, EmptyState, NeedsDb, PageHeader } from '../../_ui/primitives'
import { RangePicker, RangeScope } from '../../_ui/RangePicker'
import { orderStatus } from '../../_ui/status'
import { CountUp } from '../../_ui/Stat'
import { RowLink } from '../../_ui/RowLink'

export const metadata: Metadata = { title: 'Ventas' }

export default async function OrdersPage({ searchParams }: PageProps<'/admin/ventas'>) {
  await requireAdmin('/admin/ventas')
  const params = await searchParams
  const repo = await adminRepo()
  const data = await repo.dataset()
  const { range, picker } = rangeFromParams(params)
  const query = {
    q: one(params.q),
    estado: one(params.estado),
    tematica: one(params.tematica),
    plan: one(params.plan),
    cupon: one(params.cupon),
    range,
  }
  const filtered = filterOrders(data.orders, query)
  const { items, page, pages, total } = paginate(filtered, one(params.pagina))
  const themeName = new Map(data.themes.map((t) => [t.id, t.name]))
  const planName = new Map(data.plans.map((p) => [p.id, p.name]))

  const sales = filtered.filter((o) => o.status === 'paid' || o.status === 'refunded')
  const revenue = sales.reduce((s, o) => s + o.amountCents, 0)
  const refunded = filtered.filter((o) => o.status === 'refunded')
  const inPeriod = filterOrders(data.orders, { ...query, estado: '' })
  const count = (estado: string) => inPeriod.filter((o) => matchOrderStatus(o, estado)).length
  const toReview = data.orders.filter((o) => matchOrderStatus(o, 'revisar')).length
  const exportUrl = `/admin/ventas/exportar?${new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (typeof v === 'string' ? [[k, v]] : [])),
  )}`

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Ventas {repo.mode === 'demo' && <NeedsDb what="orders, payment_events" />}
          </span>
        }
        title="Ventas"
        description="Cada intento de compra, se pague o no. Buscá por nombre, mail, cupón o número de pago."
        actions={
          <>
            <RangePicker {...picker} />
            <a
              href={exportUrl}
              className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
            >
              <Download className="size-4" aria-hidden /> Exportar CSV
            </a>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat label="Órdenes (filtro)" value={total} format="number" />
        <MiniStat label="Facturado" value={revenue} format="ars" />
        <MiniStat
          label="Ticket promedio"
          value={sales.length ? revenue / sales.length : 0}
          format="ars"
        />
        <MiniStat
          label="Conversión"
          value={
            inPeriod.length
              ? inPeriod.filter((o) => o.status === 'paid' || o.status === 'refunded').length /
                inPeriod.length
              : 0
          }
          format="percent"
          hint={refunded.length ? `${refunded.length} reembolsadas` : undefined}
        />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <StatusTabs
          id="orders"
          param="estado"
          options={[
            { value: '', label: 'Todas', count: inPeriod.length },
            { value: 'paid', label: 'Pagadas', count: count('paid') },
            { value: 'pending', label: 'Pendientes', count: count('pending') },
            { value: 'refunded', label: 'Reembolsadas', count: count('refunded') },
            { value: 'cancelled', label: 'Canceladas', count: count('cancelled') },
            { value: 'revisar', label: 'Revisar', count: toReview },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <SearchBox placeholder="Nombre, mail, cupón o N.º de pago" />
          <FilterSelect
            param="tematica"
            label="Temática"
            allLabel="Todas"
            options={data.themes.map((t) => ({ value: t.id, label: t.name }))}
          />
          <FilterSelect
            param="plan"
            label="Plan"
            options={data.plans.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
      </div>

      <Card padded={false} className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag />}
            title="No hay ventas con estos filtros"
            text="Probá con otro período o sacá algún filtro."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-xs text-neutral-500">
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Fecha
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Comprador
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Temática · plan
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Cupón
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">
                    Monto
                  </th>
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((o, i) => {
                  const status = orderStatus(o)
                  return (
                    <RowLink key={o.id} href={`/admin/ventas/${o.id}`} index={i}>
                      <td className="px-6 py-3 whitespace-nowrap text-neutral-600 tabular-nums">
                        {formatDateTime(o.createdAt)}
                      </td>
                      <td className="max-w-64 px-3 py-3">
                        <span className="block truncate font-semibold text-ink">{o.buyerName}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {o.buyerEmail}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {themeName.get(o.themeId) ?? '—'}
                        <span className="text-neutral-400"> · </span>
                        {planName.get(o.planId ?? '') ?? 'sin plan'}
                      </td>
                      <td className="px-3 py-3">
                        {o.couponCode ? (
                          <span className="rounded-md bg-canvas px-1.5 py-0.5 font-mono text-xs font-semibold">
                            {o.couponCode}
                          </span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">
                        {formatARS(o.amountCents)}
                        {o.discountCents > 0 && (
                          <span className="block text-[11px] font-normal text-neutral-400 line-through">
                            {formatARS(o.listPriceCents)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <Badge tone={status.tone} dot>
                          {status.label}
                        </Badge>
                      </td>
                    </RowLink>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-line">
          <Pagination page={page} pages={pages} total={total} label="órdenes" />
        </div>
      </Card>
      {query.estado === 'revisar' && (
        <p className="mt-4 text-sm text-neutral-600">
          Un pago con monto distinto al de la orden no crea la Boxie (la base lo frena). Revisá en{' '}
          <Link
            href="https://www.mercadopago.com.ar/activities"
            className="font-semibold text-brand hover:underline"
            target="_blank"
          >
            Mercado Pago
          </Link>{' '}
          y devolvé el pago o contactá al comprador.
        </p>
      )}
    </RangeScope>
  )
}

function MiniStat({
  label,
  value,
  format,
  hint,
}: {
  label: string
  value: number
  format: 'ars' | 'number' | 'percent'
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
