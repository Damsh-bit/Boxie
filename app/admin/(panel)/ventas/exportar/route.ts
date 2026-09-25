import { formatDateTime } from '@/domain/admin/format'
import { adminRepo } from '@/server/admin/repo'
import { getAdminSession } from '@/server/admin/session'
import { filterOrders, toCsv } from '../../../_lib/queries'
import { rangeFromParams } from '../../../_lib/range'

export const dynamic = 'force-dynamic'

/** Las órdenes del filtro actual como CSV (separado por ; para abrir en Excel). */
export async function GET(request: Request) {
  const session = await getAdminSession()
  if (!session || session.role === 'editor') return new Response('No autorizado', { status: 401 })

  const url = new URL(request.url)
  const params = Object.fromEntries(url.searchParams)
  const repo = await adminRepo()
  const data = await repo.dataset()
  const { range } = rangeFromParams(params)
  const orders = filterOrders(data.orders, {
    q: params.q ?? '',
    estado: params.estado ?? '',
    tematica: params.tematica ?? '',
    plan: params.plan ?? '',
    cupon: params.cupon ?? '',
    range,
  })
  const theme = new Map(data.themes.map((t) => [t.id, t.name]))
  const plan = new Map(data.plans.map((p) => [p.id, p.name]))
  const csv = toCsv(
    [
      'Fecha',
      'Orden',
      'Estado',
      'Comprador',
      'Mail',
      'Teléfono',
      'Temática',
      'Plan',
      'Cupón',
      'Lista',
      'Descuento',
      'Cobrado',
      'Pago MP',
      'Pagada',
      'Reembolsada',
    ],
    orders.map((o) => [
      formatDateTime(o.createdAt),
      o.id,
      o.status,
      o.buyerName,
      o.buyerEmail,
      o.buyerPhone,
      theme.get(o.themeId),
      plan.get(o.planId ?? ''),
      o.couponCode,
      (o.listPriceCents / 100).toFixed(2).replace('.', ','),
      (o.discountCents / 100).toFixed(2).replace('.', ','),
      (o.amountCents / 100).toFixed(2).replace('.', ','),
      o.mpPaymentId,
      o.paidAt ? formatDateTime(o.paidAt) : '',
      o.refundedAt ? formatDateTime(o.refundedAt) : '',
    ]),
  )
  const day = new Date().toISOString().slice(0, 10)
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="boxie-ventas-${day}.csv"`,
      'cache-control': 'private, no-store',
    },
  })
}
