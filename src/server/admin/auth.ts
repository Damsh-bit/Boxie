/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { AdminRole } from '@/domain/admin/types'
import { isDemoMode } from '../demo'
import { log } from '../log'
import {
  DEFAULT_DEMO_EMAIL,
  DEFAULT_DEMO_PASSWORD,
  issuePreAuthToken,
  readPreAuthToken,
  type AdminIdentity,
} from './token'

/**
 * Credenciales del panel.
 *
 * - Modo demo: un usuario de muestra (ADMIN_DEMO_EMAIL / ADMIN_DEMO_PASSWORD;
 *   sin definirlas, los valores de muestra que muestra la pantalla de login).
 *   En un deploy (Vercel) la clave de muestra no sirve: es pública (está en
 *   el repo) y cualquiera podría cambiar el catálogo de la demo. Ahí el panel
 *   queda cerrado hasta definir ADMIN_DEMO_PASSWORD.
 * - Con Supabase: Supabase Auth (mail y clave) + la tabla users (donde
 *   role IS NOT NULL indica que es admin). El alta del primer admin está en
 *   docs/OPERACION.md.
 */

export type AuthResult =
  | { ok: true; requires2FA?: false; identity: AdminIdentity }
  | { ok: true; requires2FA: true; preAuthToken: string }
  | { ok: false; error: string }

const INVALID = 'Mail o clave incorrectos.'

function same(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest()
  const hb = createHash('sha256').update(b).digest()
  return timingSafeEqual(ha, hb)
}

export function demoCredentials() {
  const email = (process.env.ADMIN_DEMO_EMAIL?.trim() || DEFAULT_DEMO_EMAIL).toLowerCase()
  const password = process.env.ADMIN_DEMO_PASSWORD?.trim() || DEFAULT_DEMO_PASSWORD
  const isDefault = !process.env.ADMIN_DEMO_PASSWORD?.trim()
  const locked = isDefault && process.env.VERCEL === '1'
  return { email, password, isDefault, locked }
}

export const DEMO_LOCKED_MESSAGE =
  'El panel de esta demo está cerrado: falta definir ADMIN_DEMO_PASSWORD en Vercel.'

export async function authenticateAdmin(
  emailInput: string,
  password: string,
  remember = false,
): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase()
  if (!email || !password) return { ok: false, error: 'Completá el mail y la clave.' }

  if (isDemoMode()) {
    const demo = demoCredentials()
    if (demo.locked) return { ok: false, error: DEMO_LOCKED_MESSAGE }
    // Se comparan las dos cosas siempre (mismo tiempo acierte o no el mail).
    const okEmail = same(email, demo.email)
    const okPassword = same(password, demo.password)
    if (!okEmail || !okPassword) return { ok: false, error: INVALID }
    const { demoDb } = await import('./demo/store')
    const member = demoDb().team.find((m) => m.email === DEFAULT_DEMO_EMAIL)
    return {
      ok: true,
      requires2FA: false,
      identity: {
        uid: member?.id ?? 'demo-owner',
        email: demo.email,
        name: member?.name ?? 'Administrador',
        role: 'owner',
      },
    }
  }

  return authenticateUser(email, password, remember)
}

/**
 * Autentica contra la columna password_hash de public.users.
 * Con fallback de auto-migración para usuarios antiguos de Supabase Auth.
 */
/**
 * Autentica contra la columna password_hash de public.users.
 */
async function authenticateUser(
  email: string,
  password: string,
  remember: boolean,
): Promise<AuthResult> {
  try {
    const { serviceDb, escapeIlike } = await import('../db/client')
    const { hashPassword, verifyPassword } = await import('./password')

    const db = serviceDb()
    const { data: admin, error } = await db
      .from('users')
      .select('*')
      .ilike('email', escapeIlike(email))
      .not('role', 'is', null)
      .maybeSingle()

    if (error || !admin) return { ok: false, error: INVALID }

    const row = admin as {
      user_id: string
      email?: string | null
      role?: AdminRole
      name?: string
      password_hash?: string | null
      totp_enabled?: boolean
      totp_secret_enc?: string | null
    }

    if (!row.password_hash) {
      return { ok: false, error: INVALID }
    }

    const { ok, needsRehash } = verifyPassword(password, row.password_hash)
    if (!ok) return { ok: false, error: INVALID }

    const canonicalEmail = row.email ? row.email.toLowerCase().trim() : email

    if (needsRehash) {
      Promise.resolve(
        db
          .from('users')
          .update({ password_hash: hashPassword(password) } as any)
          .eq('user_id', row.user_id),
      )
        .then(() => log.info('Clave de admin migrada a scrypt', { email: canonicalEmail }))
        .catch((err: unknown) => log.error('No se pudo rehashear la clave', err))
    }

    const identity: AdminIdentity = {
      uid: row.user_id,
      email: canonicalEmail,
      name: row.name || canonicalEmail.split('@')[0]!,
      role: row.role ?? 'owner',
    }

    // Si tiene 2FA configurado y activo, requiere el segundo factor
    if (row.totp_enabled && row.totp_secret_enc) {
      return {
        ok: true,
        requires2FA: true,
        preAuthToken: issuePreAuthToken(identity, remember),
      }
    }

    return {
      ok: true,
      requires2FA: false,
      identity,
    }
  } catch (error) {
    log.error('Login del panel: falló la validación con la tabla users', error)
    return { ok: false, error: 'No se pudo validar la cuenta. Probá de nuevo en un rato.' }
  }
}

/**
 * Verifica el código 2FA (o código de respaldo) en el segundo paso del login.
 */
export async function verify2FALogin(
  preAuthToken: string,
  code: string,
): Promise<
  { ok: true; identity: AdminIdentity; remember: boolean } | { ok: false; error: string }
> {
  const session = readPreAuthToken(preAuthToken)
  if (!session) {
    return { ok: false, error: 'La sesión de verificación expiró. Ingresá nuevamente.' }
  }

  const { serviceDb } = await import('../db/client')
  const { verifyTotpToken, consumeBackupCode } = await import('./totp')

  const db = serviceDb()
  const { data: user, error } = await db
    .from('users')
    .select(
      'user_id, email, name, role, totp_enabled, totp_secret_enc, totp_backup_codes, is_active',
    )
    .eq('user_id', session.uid)
    .maybeSingle()

  if (error || !user || !user.is_active) {
    return { ok: false, error: 'Usuario no disponible o inactivo.' }
  }

  const row = user as {
    user_id: string
    email: string
    name: string
    role: AdminRole
    totp_enabled: boolean
    totp_secret_enc: string | null
    totp_backup_codes: string[] | null
  }

  if (!row.totp_enabled || !row.totp_secret_enc) {
    return { ok: false, error: '2FA no configurado para este usuario.' }
  }

  const clean = code.trim()
  const isTotpValid = await verifyTotpToken(row.totp_secret_enc, clean)
  const isBackupValid =
    !isTotpValid && (await consumeBackupCode(row.user_id, row.totp_backup_codes, clean))

  if (!isTotpValid && !isBackupValid) {
    return { ok: false, error: 'Código inválido. Verificá tu aplicación de autenticación.' }
  }

  return {
    ok: true,
    identity: {
      uid: row.user_id,
      email: row.email || session.email,
      name: row.name || session.name,
      role: row.role || session.role,
    },
    remember: session.remember,
  }
}
