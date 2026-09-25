import { Gift } from 'lucide-react'
import type { Metadata } from 'next'
import { formatDate, formatRelative } from '@/domain/admin/format'
import { formatBoxieCode } from '@/domain/boxie'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { filterBoxies, paginate } from '../../_lib/queries'
import { one } from '../../_lib/range'
import { Pagination, SearchBox, StatusTabs } from '../../_ui/Filters'
import { Badge, Card, EmptyState, NeedsDb, PageHeader, Progress } from '../../_ui/primitives'
import { RowLink } from '../../_ui/RowLink'
import { CountUp } from '../../_ui/Stat'
import { BOXIE_STAGE, boxieStage, type BoxieStage } from '../../_ui/status'

export const metadata: Metadata = { title: 'Boxies' }

export default async function BoxiesPage({ searchParams }: PageProps<'/admin/boxies'>) {
  await requireAdmin('/admin/boxies')
  const params = await searchParams
  const repo = await adminRepo()
  const data = await repo.dataset()
  const orders = new Map(data.orders.map((o) => [o.id, o]))
  const versionTheme = new Map<string, string>()
  const themeName = new Map(data.themes.map((t) => [t.id, t.name]))
  for (const o of data.orders) versionTheme.set(o.themeVersionId, themeName.get(o.themeId) ?? '—')
  const planName = new Map(data.plans.map((p) => [p.id, p.name]))

  const now = new Date().getTime()
  const stageOf = (b: (typeof data.boxies)[number]) => boxieStage(b, now)
  const q = one(params.q)
  const estado = one(params.estado)
  const filtered = filterBoxies(data.boxies, orders, { q, estado, stageOf })
  const { items, page, pages, total } = paginate(filtered, one(params.pagina))

  const counts = new Map<string, number>()
  for (const b of data.boxies) counts.set(stageOf(b), (counts.get(stageOf(b)) ?? 0) + 1)
  const closing = filterBoxies(data.boxies, orders, { q: '', estado: 'por-vencer', stageOf }).length
  const alive = data.boxies.filter((b) => ['gifted', 'opened'].includes(stageOf(b)))
  const openRate = alive.length ? alive.filter((b) => b.firstOpenedAt).length / alive.length : 0
  const stages: BoxieStage[] = ['new', 'editing', 'gifted', 'opened', 'expired', 'refunded']

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Soporte {repo.mode === 'demo' && <NeedsDb what="boxies, boxie_content" />}
          </span>
        }
        title="Boxies"
        description="Cada regalo vendido. Buscá por código (K7M2-Q9XD), mail del comprador o nombre de quien lo recibe."
      />

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Mini label="Boxies en total" value={data.boxies.length} />
        <Mini label="Regaladas y vigentes" value={alive.length} />
        <Mini
          label="Se abrieron"
          value={openRate}
          format="percent"
          hint="de las regaladas vigentes"
        />
        <Mini label="Vencen en 5 días sin regalarse" value={closing} hint="conviene escribirles" />
      </div>

      <div className="mb-4 flex flex-col gap-3">
        <StatusTabs
          id="boxies"
          param="estado"
          options={[
            { value: '', label: 'Todas', count: data.boxies.length },
            ...stages.map((s) => ({
              value: s,
              label: BOXIE_STAGE[s].label,
              count: counts.get(s) ?? 0,
            })),
            { value: 'por-vencer', label: 'Por vencer', count: closing },
          ]}
        />
        <SearchBox placeholder="Código, mail o destinatario" />
      </div>

      <Card padded={false} className="overflow-hidden">
        {items.length === 0 ? (
          <EmptyState
            icon={<Gift />}
            title={q ? `Nada coincide con “${q}”` : 'No hay Boxies en este estado'}
            text="El código tiene 8 caracteres (con o sin guion). También sirve el mail del comprador."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60 text-left text-xs text-neutral-500">
                  <th scope="col" className="px-6 py-3 font-semibold">
                    Código
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Para · de
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Temática · plan
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Módulos
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-3 font-semibold">
                    Vence
                  </th>
                  <th scope="col" className="px-6 py-3 text-right font-semibold">
                    Aperturas
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((b, i) => {
                  const stage = BOXIE_STAGE[stageOf(b)]
                  const order = orders.get(b.orderId)
                  return (
                    <RowLink key={b.id} href={`/admin/boxies/${b.id}`} index={i}>
                      <td className="px-6 py-3 font-mono font-semibold tracking-wide text-ink">
                        {formatBoxieCode(b.code)}
                      </td>
                      <td className="max-w-56 px-3 py-3">
                        <span className="block truncate font-semibold text-ink">
                          {b.recipientName || '—'}
                        </span>
                        <span className="block truncate text-xs text-neutral-500">
                          de {b.senderName || '—'} · {order?.buyerEmail}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-neutral-700">
                        {versionTheme.get(b.themeVersionId) ?? '—'}
                        <span className="text-neutral-400"> · </span>
                        {planName.get(order?.planId ?? '') ?? '—'}
                      </td>
                      <td className="w-36 px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Progress
                            value={b.modulesTotal ? b.modulesDone / b.modulesTotal : 0}
                            tone={b.modulesDone >= b.modulesTotal ? 'good' : 'brand'}
                            className="h-1.5 flex-1"
                            label="Módulos completos"
                          />
                          <span className="text-xs text-neutral-500 tabular-nums">
                            {b.modulesDone}/{b.modulesTotal}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={stage.tone} dot>
                          {stage.label}
                        </Badge>
                      </td>
                      <td
                        className="px-3 py-3 whitespace-nowrap text-neutral-600"
                        title={formatDate(b.expiresAt)}
                      >
                        {formatRelative(b.expiresAt)}
                      </td>
                      <td className="px-6 py-3 text-right text-neutral-700 tabular-nums">
                        {b.openCount || '—'}
                      </td>
                    </RowLink>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-line">
          <Pagination page={page} pages={pages} total={total} label="Boxies" />
        </div>
      </Card>
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
  format?: 'number' | 'percent'
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
