import type { Metadata, Route } from 'next'
import { redirect } from 'next/navigation'
import { getCustomerSession } from '@/server/customer/session'
import { CustomerLoginScreen } from './CustomerLoginScreen'

export const metadata: Metadata = {
  title: 'Iniciar Sesión · Mi Cuenta Boxie',
  description: 'Ingresá a tu cuenta de Boxie para ver tus regalos comprados y métricas.',
}

export default async function CustomerLoginPage(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const session = await getCustomerSession()
  const searchParams = await props.searchParams
  const next = typeof searchParams.next === 'string' ? searchParams.next : '/cuenta'

  if (session) {
    redirect((next.startsWith('/') ? next : '/cuenta') as Route)
  }

  return <CustomerLoginScreen nextUrl={next} />
}
