import 'server-only'
import type { Route } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { AdminRole } from '@/domain/admin/types'
import { ADMIN_COOKIE, readAdminSession, type AdminSession } from './token'

export * from './token'

/**
 * Sesión del panel: una cookie firmada httpOnly, limitada a /admin, igual que
 * la del editor. La emite el login después de validar la credencial (Supabase
 * Auth + tabla users (role IS NOT NULL = admin), o el usuario de demo) y el servidor la verifica en
 * el proxy, en cada página y en cada Server Action: nunca se confía solo en el
 * proxy (un matcher mal escrito lo saltearía).
 */

/** La sesión del pedido actual (una sola lectura por render). */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies()
  return readAdminSession(store.get(ADMIN_COOKIE)?.value)
})

/** Para páginas: sin sesión, al login (y de vuelta a donde estaba). */
export async function requireAdmin(next?: string): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) {
    const target = next && next.startsWith('/admin') ? `?next=${encodeURIComponent(next)}` : ''
    redirect(`/admin/login${target}` as Route)
  }
  return session
}

export class AdminAuthError extends Error {
  constructor(message = 'Tu sesión venció. Volvé a entrar.') {
    super(message)
    this.name = 'AdminAuthError'
  }
}

/** Para Server Actions: sin sesión, error (la acción responde "volvé a entrar"). */
export async function requireAdminAction(roles?: readonly AdminRole[]): Promise<AdminSession> {
  const session = await getAdminSession()
  if (!session) throw new AdminAuthError()
  if (roles && !roles.includes(session.role))
    throw new AdminAuthError('Tu rol no tiene permiso para esta acción.')
  return session
}
