import 'server-only'
import type { Route } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import type { AdminRole } from '@/domain/admin/types'
import {
  ADMIN_COOKIE,
  adminPasswordFingerprint,
  readAdminSession,
  type AdminSession,
} from './token'

export * from './token'

/**
 * Sesión del panel: una cookie firmada httpOnly, limitada a /admin, igual que
 * la del editor. La emite el login después de validar la credencial.
 *
 * P1.2 · Revocación activa:
 * En cada solicitud, además de verificar criptográficamente la cookie firmada,
 * se releen en la base de datos el rol actual, el estado de activación (`is_active`)
 * y la huella (`fp`) de la contraseña.
 * Si un miembro es dado de baja, eliminado o cambia su clave, el acceso se corta
 * en el acto sin esperar a que expire la cookie.
 */

/** La sesión del pedido actual (una sola lectura por render, memoizada con cache). */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const store = await cookies()
  const session = readAdminSession(store.get(ADMIN_COOKIE)?.value)
  if (!session) return null

  // 1. Modo demo
  if (session.demo || process.env.DEMO_MODE === '1') {
    const { isDemoMode } = await import('../demo')
    if (!isDemoMode()) return null
    const { demoDb } = await import('./demo/store')
    const member = demoDb().team.find((m) => m.email.toLowerCase() === session.email.toLowerCase())
    if (!member) return null
    return {
      ...session,
      role: member.role,
      name: member.name,
    }
  }

  // 2. Validación activa contra la base de datos
  try {
    const { serviceDb } = await import('../db/client')
    const db = serviceDb()
    const { data: user, error } = await db
      .from('users')
      .select('user_id, email, name, role, is_active, password_hash')
      .eq('user_id', session.uid)
      .maybeSingle()

    // Si el usuario fue eliminado o no existe, revocar acceso
    if (error || !user) return null

    // Si el usuario está inactivo / dado de baja, revocar acceso
    if (!user.is_active) return null

    // Si el usuario ya no tiene rol administrativo, revocar acceso
    if (!user.role) return null

    // Si la sesión tiene huella de contraseña (fp), verificar que coincida con el hash actual
    if (session.fp && user.password_hash) {
      const currentFp = adminPasswordFingerprint(user.password_hash)
      if (session.fp !== currentFp) return null
    }

    // Devolver sesión con datos actualizados desde la BD
    return {
      ...session,
      role: user.role as AdminRole,
      name: user.name || session.name,
      email: user.email ? user.email.toLowerCase().trim() : session.email,
    }
  } catch {
    return null
  }
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
