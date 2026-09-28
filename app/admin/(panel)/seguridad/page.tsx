import type { Metadata } from 'next'
import { requireAdmin } from '@/server/admin/session'
import { getTotpStatusAction } from './actions'
import { SecuritySettings } from './SecuritySettings'

export const metadata: Metadata = {
  title: 'Seguridad',
}

export default async function SecurityPage() {
  await requireAdmin('/admin/seguridad')
  const status = await getTotpStatusAction()

  return <SecuritySettings initialStatus={status} />
}
