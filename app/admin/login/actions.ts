'use server'

import type { Route } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { authenticateAdmin, verify2FALogin } from '@/server/admin/auth'
import { adminRepo } from '@/server/admin/repo'
import { ADMIN_COOKIE, adminCookieOptions, issueAdminSession } from '@/server/admin/session'
import { isDemoMode } from '@/server/demo'
import { log } from '@/server/log'
import { clientIp, isRateLimited, rateLimit } from '@/server/rate-limit'

export interface LoginState {
  error: string | null
  email: string
  requires2FA?: boolean
  preAuthToken?: string
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

  // Contra la fuerza bruta cuentan los intentos fallidos (por IP y por mail).
  const ip = clientIp(await headers())
  const byIp = `admin-login-fail:${ip}`
  const byEmail = `admin-login-fail:${email.toLowerCase()}`
  const span = { windowMs: 15 * 60_000 }
  if (
    isRateLimited(byIp, { limit: 10, ...span }) ||
    isRateLimited(byEmail, { limit: 5, ...span })
  ) {
    return { error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.', email }
  }

  const result = await authenticateAdmin(email, password, remember)
  if (!result.ok) {
    rateLimit(byIp, { limit: 10, ...span })
    rateLimit(byEmail, { limit: 5, ...span })
    log.warn('Login del panel rechazado', { ip })
    return { error: result.error, email }
  }

  if (result.requires2FA) {
    return {
      error: null,
      email,
      requires2FA: true,
      preAuthToken: result.preAuthToken,
    }
  }

  const { value, maxAge } = issueAdminSession(result.identity, remember, isDemoMode())
  const store = await cookies()
  store.set(ADMIN_COOKIE, value, adminCookieOptions(maxAge))
  await (await adminRepo()).touchMember(result.identity.email).catch(() => {})
  log.info('Login del panel', { email: result.identity.email })
  redirect(safeNext(form.get('next')) as Route)
}

export async function submit2FA(_prev: LoginState, form: FormData): Promise<LoginState> {
  const preAuthToken = String(form.get('preAuthToken') ?? '')
  const code = String(form.get('code') ?? '')
  const email = String(form.get('email') ?? '')

  if (!code) {
    return {
      error: 'Ingresá el código de 6 dígitos.',
      email,
      requires2FA: true,
      preAuthToken,
    }
  }

  const ip = clientIp(await headers())
  const byIp = `admin-2fa-fail:${ip}`
  const span = { windowMs: 15 * 60_000 }
  if (isRateLimited(byIp, { limit: 8, ...span })) {
    return {
      error: 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
      email,
      requires2FA: true,
      preAuthToken,
    }
  }

  const result = await verify2FALogin(preAuthToken, code)
  if (!result.ok) {
    rateLimit(byIp, { limit: 8, ...span })
    return {
      error: result.error,
      email,
      requires2FA: true,
      preAuthToken,
    }
  }

  const { value, maxAge } = issueAdminSession(result.identity, result.remember, false)
  const store = await cookies()
  store.set(ADMIN_COOKIE, value, adminCookieOptions(maxAge))
  await (await adminRepo()).touchMember(result.identity.email).catch(() => {})
  log.info('Login con 2FA completado', { email: result.identity.email })
  redirect(safeNext(form.get('next')) as Route)
}
