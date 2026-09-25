import type { Metadata } from 'next'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { SettingsForm } from './SettingsForm'

export const metadata: Metadata = { title: 'Configuración' }

export default async function SettingsPage() {
  const session = await requireAdmin('/admin/configuracion')
  const repo = await adminRepo()
  const [settings, coupons] = await Promise.all([
    repo.getSettings(),
    repo.dataset().then((d) => d.coupons),
  ])
  const { updatedAt: _u, ...values } = settings
  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Ajustes{' '}
            {repo.mode === 'demo' && (
              <NeedsDb what="settings (columnas nuevas en admin_backoffice)" />
            )}
          </span>
        }
        title="Configuración"
        description="Lo que el negocio ajusta sin programar ni hacer un deploy: precios, vida del regalo, costos para la rentabilidad y datos de contacto."
      />
      <SettingsForm
        initial={values}
        coupons={coupons.map((c) => ({ id: c.id, code: c.code }))}
        demo={repo.mode === 'demo'}
        canReset={session.role === 'owner'}
      />
    </>
  )
}
