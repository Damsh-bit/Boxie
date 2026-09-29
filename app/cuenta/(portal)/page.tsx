import type { Metadata } from 'next'
import { getCustomerPortalData } from '@/server/customer/data'
import { requireCustomerSession } from '@/server/customer/session'
import { CustomerDashboard } from './CustomerDashboard'

export const metadata: Metadata = {
  title: 'Mis Boxies · Mi Cuenta',
  description: 'Gestioná tus regalos interactivos de Boxie Digital y enterate de las aperturas.',
}

export default async function CustomerAccountPage() {
  const session = await requireCustomerSession('/cuenta')
  const data = await getCustomerPortalData(session.email, session.user)

  return <CustomerDashboard name={session.name} data={data} />
}
