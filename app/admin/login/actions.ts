'use server'

import type { Route } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authenticateAdmin } from '@/server/admin/auth'
import { adminRepo } from '@/server/admin/repo'
import { ADMIN_COOKIE, adminCookieOptions, issueAdminSession } from '@/server/admin/session'
import { isDemoMode } from '@/server/demo'
import { log } from '@/server/log'
import { clientIp, rateLimit } from '@/server/rate-limit'

export interface LoginState {
  error: string | null
  email: string
}

/** Solo rutas del panel: un `next` armado a mano no puede sacar a otro sitio. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : ''
  return next.startsWith('/admin') && !next.startsWith('/admin/login') && !/[\\]|\/\//.test(next)
    ? next
    : '/admin'
}

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').slice(0, 254)
  const password = String(form.get('password') ?? '').slice(0, 200)
  const remember = form.get('remember') === 'on'

  const ip = clientIp(await headers())
  if (
    !rateLimit(`admin-login:${ip}`, { limit: 8, windowMs: 10 * 60_000 }) ||
    !rateLimit(`admin-login:${email.toLowerCase()}`, { limit: 5, windowMs: 10 * 60_000 })
  ) {
    return { error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.', email }
  }

  const result = await authenticateAdmin(email, password)
  if (!result.ok) {
    log.warn('Login del panel rechazado', { ip })
    return { error: result.error, email }
  }

  const { value, maxAge } = issueAdminSession(result.identity, remember, isDemoMode())
  const store = await cookies()
  store.set(ADMIN_COOKIE, value, adminCookieOptions(maxAge))
  await (await adminRepo()).touchMember(result.identity.email).catch(() => {})
  log.info('Login del panel', { email: result.identity.email })
  redirect(safeNext(form.get('next')) as Route)
}
