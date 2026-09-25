import type { Metadata } from 'next'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { one } from '../../_lib/range'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { TaskBoard } from './TaskBoard'

export const metadata: Metadata = { title: 'Tareas' }

export default async function TasksPage({ searchParams }: PageProps<'/admin/tareas'>) {
  const session = await requireAdmin('/admin/tareas')
  const params = await searchParams
  const repo = await adminRepo()
  const [tasks, team] = await Promise.all([repo.listTasks(), repo.listTeam()])
  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Equipo{' '}
            {repo.mode === 'demo' && <NeedsDb what="admin_tasks (migración admin_backoffice)" />}
          </span>
        }
        title="Tareas"
        description="Lo que hay que hacer para que el negocio avance: campañas, temáticas por publicar, pendientes técnicos. Arrastrá las tarjetas entre columnas."
      />
      <TaskBoard
        tasks={tasks}
        team={team.map((m) => ({ email: m.email, name: m.name }))}
        me={session.email}
        openNew={one(params.nueva) === '1'}
      />
    </>
  )
}
