import type { Metadata } from 'next'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { TeamBoard } from './TeamBoard'

export const metadata: Metadata = { title: 'Equipo' }

export default async function TeamPage() {
  const session = await requireAdmin('/admin/equipo')
  const repo = await adminRepo()
  const team = await repo.listTeam()
  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Equipo {repo.mode === 'demo' && <NeedsDb what="admin_users (+ rol) · Supabase Auth" />}
          </span>
        }
        title="Equipo"
        description="Quiénes entran al panel y qué puede hacer cada uno. Solo el dueño administra el equipo."
      />
      <TeamBoard team={team} me={session.email} canManage={session.role === 'owner'} />
    </>
  )
}
