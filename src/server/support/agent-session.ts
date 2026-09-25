import 'server-only'
import { cookies } from 'next/headers'
import type { AdminRole } from '@/domain/admin/types'
import type { Actor } from '../admin/repo'
import { ADMIN_COOKIE, readAdminSession } from '../admin/token'

/** Los roles que atienden el soporte. */
export const SUPPORT_AGENT_ROLES: readonly AdminRole[] = ['owner', 'admin', 'support']

/**
 * La sesión del panel para las rutas del soporte (stream y "escribiendo"):
 * como las acciones, verifican sesión y rol; el proxy es la primera barrera.
 */
export async function supportAgent(): Promise<Actor | null> {
  const session = readAdminSession((await cookies()).get(ADMIN_COOKIE)?.value)
  if (!session || !SUPPORT_AGENT_ROLES.includes(session.role)) return null
  return { email: session.email, name: session.name, id: session.uid }
}
