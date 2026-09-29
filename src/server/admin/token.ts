import 'server-only'
import { createHash } from 'node:crypto'
import type { AdminRole } from '@/domain/admin/types'
import { expiresIn, sign, verify, type SignedPayload } from '../security/signed'

/**
 * La cookie de sesión del panel, sin nada más: la usan el proxy (que corre
 * antes de cada pedido a /admin) y session.ts. Liviano a propósito: el proxy
 * no carga el catálogo ni la base.
 */

const isDemo = () => process.env.DEMO_MODE === '1'

export const ADMIN_COOKIE = 'bx_admin'
const SESSION_HOURS = 12
export const REMEMBER_DAYS = 7

/** Huella del hash de contraseña para invalidación inmediata de sesiones activas (P1.2). */
export function adminPasswordFingerprint(passwordHash: string): string {
  return createHash('sha256').update(passwordHash).digest('hex').slice(0, 16)
}

export interface AdminIdentity {
  uid: string
  email: string
  name: string
  role: AdminRole
  /** Huella del hash de la contraseña para revocar sesiones ante cambios de clave. */
  fp?: string
}

export interface AdminSession extends SignedPayload, AdminIdentity {
  purpose: 'admin'
  /** Sesión del modo demo (datos de muestra). */
  demo: boolean
}

export interface PreAuthSession extends SignedPayload, AdminIdentity {
  purpose: 'admin_2fa_pending'
  remember: boolean
}

export const DEFAULT_DEMO_EMAIL = 'admin@boxie.demo'
export const DEFAULT_DEMO_PASSWORD = 'boxie-admin'

/**
 * Secreto de firma. SESSION_SECRET si está (el mismo de las otras cookies);
 * en demo, sin él, uno derivado de la clave de demo: cambiar la clave cierra
 * las sesiones abiertas. Fuera de la demo, sin secreto no hay panel.
 */
export function adminSecret(): string {
  const configured = process.env.SESSION_SECRET?.trim()
  if (configured && configured.length >= 32) return configured
  if (isDemo()) {
    const password = process.env.ADMIN_DEMO_PASSWORD?.trim() || DEFAULT_DEMO_PASSWORD
    return createHash('sha256').update(`boxie-admin-demo:${password}`).digest('base64url')
  }
  throw new Error('Falta SESSION_SECRET: el panel no puede firmar sesiones.')
}

export function issueAdminSession(identity: AdminIdentity, remember: boolean, demo: boolean) {
  const maxAge = remember ? REMEMBER_DAYS * 86_400 : SESSION_HOURS * 3_600
  const value = sign<AdminSession>(
    { purpose: 'admin', ...identity, demo, exp: expiresIn(maxAge) },
    adminSecret(),
  )
  return { value, maxAge }
}

export function readAdminSession(value: string | undefined | null): AdminSession | null {
  let secret: string
  try {
    secret = adminSecret()
  } catch {
    return null
  }
  const session = verify<AdminSession>(value, 'admin', secret)
  return session && typeof session.uid === 'string' && typeof session.email === 'string'
    ? session
    : null
}

export function issuePreAuthToken(identity: AdminIdentity, remember: boolean): string {
  return sign<PreAuthSession>(
    { purpose: 'admin_2fa_pending', ...identity, remember, exp: expiresIn(300) },
    adminSecret(),
  )
}

export function readPreAuthToken(token: string | undefined | null): PreAuthSession | null {
  if (!token) return null
  let secret: string
  try {
    secret = adminSecret()
  } catch {
    return null
  }
  const session = verify<PreAuthSession>(token, 'admin_2fa_pending', secret)
  return session && typeof session.uid === 'string' && typeof session.email === 'string'
    ? session
    : null
}

export function adminCookieOptions(maxAge: number) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return {
    httpOnly: true,
    secure: site.startsWith('https://') || process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/admin',
    maxAge,
  }
}
