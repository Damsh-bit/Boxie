import { alerts } from '@/domain/admin/metrics'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { log } from '@/server/log'
import { SUPPORT_AGENT_ROLES } from '@/server/support/agent-session'
import { SupportError, supportRepo } from '@/server/support/repo'
import { Shell } from '../_ui/Shell'
import { logout } from './actions'

export const dynamic = 'force-dynamic'

/** Consultas que esperan respuesta del equipo (el contador de Soporte en el menú). */
async function supportWaiting(): Promise<number> {
  try {
    const repo = await supportRepo()
    return (await repo.listTickets({ status: 'open', limit: 200 })).length
  } catch (error) {
    // Sin la migración de soporte (o sin base), el menú sigue andando.
    if (!(error instanceof SupportError && error.code === 'unavailable'))
      log.warn('No se pudo contar las consultas de soporte', {
        error: error instanceof Error ? error.message : String(error),
      })
    return 0
  }
}

export default async function PanelLayout({ children }: LayoutProps<'/admin'>) {
  const session = await requireAdmin()
  const repo = await adminRepo()
  const [count, waiting] = await Promise.all([
    repo
      .dataset()
      .then(
        (d) =>
          alerts({
            orders: d.orders,
            boxies: d.boxies,
            coupons: d.coupons,
            draftThemes: d.themes.filter((t) => t.status === 'draft').length,
          }).filter((a) => a.level !== 'info').length,
      )
      .catch(() => 0),
    SUPPORT_AGENT_ROLES.includes(session.role) ? supportWaiting() : 0,
  ])

  return (
    <Shell
      user={{ name: session.name, email: session.email, role: session.role }}
      demo={repo.mode === 'demo'}
      alerts={count}
      badges={{ '/admin/soporte': waiting }}
      logout={logout}
    >
      {children}
    </Shell>
  )
}
