import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { demoCredentials } from '@/server/admin/auth'
import { getAdminSession } from '@/server/admin/session'
import { isDemoMode } from '@/server/demo'
import { LoginScreen } from './LoginScreen'

export const metadata: Metadata = { title: 'Entrar' }
export const dynamic = 'force-dynamic'

export default async function LoginPage({ searchParams }: PageProps<'/admin/login'>) {
  if (await getAdminSession()) redirect('/admin')
  const { next } = await searchParams
  const demo = isDemoMode()
  const creds = demo ? demoCredentials() : null
  return (
    <LoginScreen
      next={typeof next === 'string' ? next : ''}
      demo={demo}
      hint={creds?.isDefault ? { email: creds.email, password: creds.password } : null}
    />
  )
}
