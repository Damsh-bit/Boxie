import { alerts } from '@/domain/admin/metrics'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { Shell } from '../_ui/Shell'
import { logout } from './actions'

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: LayoutProps<'/admin'>) {
  const session = await requireAdmin()
  const repo = await adminRepo()
  const count = await repo
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
    .catch(() => 0)

  return (
    <Shell
      user={{ name: session.name, email: session.email, role: session.role }}
      demo={repo.mode === 'demo'}
      alerts={count}
      logout={logout}
    >
      {children}
    </Shell>
  )
}
