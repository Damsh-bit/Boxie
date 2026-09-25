import { History } from 'lucide-react'
import type { Metadata } from 'next'
import { formatDateTime, formatRelative, initials } from '@/domain/admin/format'
import { arDayKey, bucketLabel } from '@/domain/admin/range'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { one } from '../../_lib/range'
import { SearchBox, StatusTabs } from '../../_ui/Filters'
import { Badge, Card, EmptyState, NeedsDb, PageHeader, type Tone } from '../../_ui/primitives'

export const metadata: Metadata = { title: 'Actividad' }

const ENTITY: Record<string, { label: string; tone: Tone }> = {
  theme: { label: 'Temática', tone: 'brand' },
  plan: { label: 'Plan', tone: 'violet' },
  coupon: { label: 'Cupón', tone: 'info' },
  order: { label: 'Venta', tone: 'good' },
  boxie: { label: 'Boxie', tone: 'warning' },
  settings: { label: 'Configuración', tone: 'dark' },
  expense: { label: 'Gasto', tone: 'neutral' },
  affiliate: { label: 'Afiliado', tone: 'violet' },
  team: { label: 'Equipo', tone: 'dark' },
  task: { label: 'Tarea', tone: 'neutral' },
}

const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export default async function ActivityPage({ searchParams }: PageProps<'/admin/actividad'>) {
  await requireAdmin('/admin/actividad')
  const params = await searchParams
  const repo = await adminRepo()
  const [entries, team] = await Promise.all([repo.listAudit(300), repo.listTeam()])
  const tipo = one(params.tipo)
  const q = strip(one(params.q).trim())
  const filtered = entries.filter(
    (e) => (!tipo || e.entity === tipo) && (!q || strip(`${e.summary} ${e.actor}`).includes(q)),
  )
  const names = new Map(team.map((m) => [m.email, m.name]))
  const groups = new Map<string, typeof filtered>()
  for (const e of filtered) {
    const day = arDayKey(e.at)
    groups.set(day, [...(groups.get(day) ?? []), e])
  }
  const today = arDayKey(new Date())
  const yesterday = arDayKey(new Date(new Date().getTime() - 86_400_000))
  const entityTypes = [...new Set(entries.map((e) => e.entity))]

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Equipo{' '}
            {repo.mode === 'demo' && (
              <NeedsDb what="admin_audit_log (migración admin_backoffice)" />
            )}
          </span>
        }
        title="Actividad"
        description="Cada cambio que se hace en el panel queda registrado: quién, qué y cuándo."
      />
      <div className="mb-4 flex flex-col gap-3">
        <StatusTabs
          id="activity"
          param="tipo"
          options={[
            { value: '', label: 'Todo', count: entries.length },
            ...entityTypes.map((t) => ({
              value: t,
              label: ENTITY[t]?.label ?? t,
              count: entries.filter((e) => e.entity === t).length,
            })),
          ]}
        />
        <SearchBox placeholder="Buscar en la actividad" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState icon={<History />} title="Sin actividad con ese filtro" />
        </Card>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([day, list]) => (
            <Card key={day} padded={false}>
              <h2 className="border-b border-line px-6 py-3 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                {day === today
                  ? 'Hoy'
                  : day === yesterday
                    ? 'Ayer'
                    : bucketLabel(day, 'day') + ` ${day.slice(0, 4)}`}
              </h2>
              <ol className="divide-y divide-line">
                {list.map((e) => {
                  const entity = ENTITY[e.entity] ?? { label: e.entity, tone: 'neutral' as Tone }
                  const name = names.get(e.actor) ?? e.actor.split('@')[0]!
                  return (
                    <li key={e.id} className="flex items-start gap-3 px-6 py-3.5">
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-xs font-bold text-white"
                        aria-hidden
                      >
                        {initials(name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-ink">
                          <span className="font-semibold">{name}</span> · {e.summary}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                          <Badge tone={entity.tone}>{entity.label}</Badge>
                          <time dateTime={e.at} title={formatDateTime(e.at)}>
                            {formatRelative(e.at)}
                          </time>
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
