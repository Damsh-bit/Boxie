import { formatDate } from '@/domain/admin/format'
import { customers } from '@/domain/admin/metrics'
import { adminRepo } from '@/server/admin/repo'
import { getAdminSession } from '@/server/admin/session'
import { segmentOf, vipThreshold } from '../../../_lib/customers'
import { toCsv } from '../../../_lib/queries'

export const dynamic = 'force-dynamic'

const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Los clientes del segmento actual como CSV (para mailing, con su permiso). */
export async function GET(request: Request) {
  const session = await getAdminSession()
  if (!session || session.role === 'editor') return new Response('No autorizado', { status: 401 })
  const url = new URL(request.url)
  const segmento = url.searchParams.get('segmento') ?? ''
  const q = strip(url.searchParams.get('q')?.trim() ?? '')
  const data = await (await adminRepo()).dataset()
  const rows = customers(data.orders)
  const now = new Date().getTime()
  const vipFrom = vipThreshold(rows)
  const themeName = new Map(data.themes.map((t) => [t.id, t.name]))
  const filtered = rows.filter(
    (r) =>
      (!segmento || segmentOf(r, now, vipFrom).includes(segmento)) &&
      (!q || strip(`${r.name} ${r.email} ${r.phone ?? ''}`).includes(q)),
  )
  const csv = toCsv(
    [
      'Nombre',
      'Mail',
      'Teléfono',
      'Compras',
      'Intentos',
      'Gastado',
      'Primera compra',
      'Última compra',
      'Temáticas',
      'Cupones',
    ],
    filtered.map((r) => [
      r.name,
      r.email,
      r.phone,
      r.sales,
      r.orders,
      (r.spentCents / 100).toFixed(2).replace('.', ','),
      r.firstPurchaseAt ? formatDate(r.firstPurchaseAt) : '',
      r.lastPurchaseAt ? formatDate(r.lastPurchaseAt) : '',
      r.themes.map((t) => themeName.get(t) ?? '').join(', '),
      r.couponsUsed.join(', '),
    ]),
  )
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="boxie-clientes-${new Date().toISOString().slice(0, 10)}.csv"`,
      'cache-control': 'private, no-store',
    },
  })
}
