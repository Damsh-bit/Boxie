import type { SupportTicket } from '@/domain/support'
import { alerts } from '@/domain/admin/metrics'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { log } from '@/server/log'
import { SUPPORT_AGENT_ROLES } from '@/server/support/agent-session'
import { SupportError, supportRepo } from '@/server/support/repo'
import { navBadges } from '../_lib/badges'
import { navFor } from '../_ui/nav'
import { Shell } from '../_ui/Shell'
import { logout } from './actions'

export const dynamic = 'force-dynamic'

/** Las consultas de soporte (para el contador del menú). */
async function supportTickets(): Promise<SupportTicket[] | undefined> {
  try {
    const repo = await supportRepo()
    return await repo.listTickets({ status: 'open', limit: 200 })
  } catch (error) {
    // Sin la migración de soporte (o sin base), el menú sigue andando.
    if (!(error instanceof SupportError && error.code === 'unavailable'))
      log.warn('No se pudo contar las consultas de soporte', {
        error: error instanceof Error ? error.message : String(error),
      })
    return undefined
  }
}

export default async function PanelLayout({ children }: LayoutProps<'/admin'>) {
  const session = await requireAdmin()
  const repo = await adminRepo()
  const [dataset, tickets, tasks] = await Promise.all([
    repo.dataset().catch(() => null),
    SUPPORT_AGENT_ROLES.includes(session.role) ? supportTickets() : undefined,
    repo.listTasks().catch(() => undefined),
  ])
  const count = dataset
    ? alerts({
        orders: dataset.orders,
        boxies: dataset.boxies,
        coupons: dataset.coupons,
        draftThemes: dataset.themes.filter((t) => t.status === 'draft').length,
      }).filter((a) => a.level !== 'info').length
    : 0
  // Cada rol ve solo los contadores de las secciones que tiene en el menú.
  const visible = new Set(navFor(session.role).flatMap((g) => g.items.map((i) => i.href)))
  const all = navBadges({
    orders: dataset?.orders,
    boxies: dataset?.boxies,
    coupons: dataset?.coupons,
    themes: dataset?.themes,
    tickets,
    tasks,
    me: session.email,
  })
  const badges = Object.fromEntries(
    Object.entries(all).filter(([href]) => visible.has(href as never)),
  )

  return (
    <Shell
      user={{ name: session.name, email: session.email, role: session.role }}
      demo={repo.mode === 'demo'}
      alerts={count}
      badges={badges}
      logout={logout}
    >
      {children}
    </Shell>
  )
}
