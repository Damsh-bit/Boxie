'use server'

import type { Route } from 'next'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { activateMemberAccount } from '@/server/admin/invite'
import { ADMIN_COOKIE, adminCookieOptions, issueAdminSession } from '@/server/admin/session'
import { log } from '@/server/log'
import { clientIp, rateLimit } from '@/server/rate-limit'

export interface ActivateState {
  error: string | null
}

export async function activateAccount(
  _prev: ActivateState,
  form: FormData,
): Promise<ActivateState> {
  const token = String(form.get('token') ?? '').trim()
  const password = String(form.get('password') ?? '').slice(0, 200)
  const confirm = String(form.get('confirm') ?? '').slice(0, 200)

  if (!token) {
    return { error: 'Token de activación ausente o inválido.' }
  }

  if (password.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  if (password !== confirm) {
    return { error: 'Las contraseñas no coinciden.' }
  }

  const ip = clientIp(await headers())
  if (!rateLimit(`admin-activate:${ip}`, { limit: 10, windowMs: 15 * 60_000 })) {
    return { error: 'Demasiados intentos. Esperá unos minutos.' }
  }

  const result = await activateMemberAccount(token, password)
  if (!result.ok) {
    return { error: result.error }
  }

  const { value, maxAge } = issueAdminSession(result.identity, false, false)
  const store = await cookies()
  store.set(ADMIN_COOKIE, value, adminCookieOptions(maxAge))

  log.info('Cuenta de equipo activada exitosamente', { email: result.identity.email })
  redirect('/admin' as Route)
}
