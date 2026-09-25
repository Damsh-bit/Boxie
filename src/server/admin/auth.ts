/* eslint-disable @typescript-eslint/no-explicit-any */
import 'server-only'
import { createHash, timingSafeEqual } from 'node:crypto'
import type { AdminRole } from '@/domain/admin/types'
import { isDemoMode } from '../demo'
import { log } from '../log'
import { DEFAULT_DEMO_EMAIL, DEFAULT_DEMO_PASSWORD, type AdminIdentity } from './token'

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

export type AuthResult = { ok: true; identity: AdminIdentity } | { ok: false; error: string }

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

export async function authenticateAdmin(emailInput: string, password: string): Promise<AuthResult> {
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
      identity: {
        uid: member?.id ?? 'demo-owner',
        email: demo.email,
        name: member?.name ?? 'Administrador',
        role: 'owner',
      },
    }
  }

  return authenticateUser(email, password)
}

/**
 * Autentica contra la columna password_hash de public.users.
 * Con fallback de auto-migración para usuarios antiguos de Supabase Auth.
 */
async function authenticateUser(email: string, password: string): Promise<AuthResult> {
  try {
    const { serviceDb } = await import('../db/client')
    const { hashPassword, verifyPassword } = await import('./password')

    const db = serviceDb()
    const { data: admin, error } = await db
      .from('users')
      .select('*')
      .ilike('email', email)
      .not('role', 'is', null)
      .maybeSingle()

    if (error || !admin) return { ok: false, error: INVALID }

    const row = admin as {
      user_id: string
      role?: AdminRole
      name?: string
      password_hash?: string | null
    }

    // 1. Si la tabla users ya tiene password_hash:
    if (row.password_hash) {
      const { ok, needsRehash } = verifyPassword(password, row.password_hash)
      if (!ok) return { ok: false, error: INVALID }

      if (needsRehash) {
        Promise.resolve(
          db
            .from('users')
            .update({ password_hash: hashPassword(password) } as any)
            .eq('user_id', row.user_id),
        )
          .then(() => log.info('Clave de admin migrada a scrypt', { email }))
          .catch((err: unknown) => log.error('No se pudo rehashear la clave', err))
      }

      return {
        ok: true,
        identity: {
          uid: row.user_id,
          email,
          name: row.name || email.split('@')[0]!,
          role: row.role ?? 'owner',
        },
      }
    }

    // 2. Fallback de migración para usuarios preexistentes en Supabase Auth:
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const { env } = await import('../env')
      const auth = createClient(
        env().NEXT_PUBLIC_SUPABASE_URL,
        env().NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        },
      )
      const { data, error: authError } = await auth.auth.signInWithPassword({ email, password })
      await auth.auth.signOut().catch(() => {})

      if (!authError && data?.user) {
        // Guardamos el hash en users para los siguientes inicios de sesión
        await db
          .from('users')
          .update({ password_hash: hashPassword(password) } as any)
          .eq('user_id', row.user_id)

        return {
          ok: true,
          identity: {
            uid: row.user_id,
            email,
            name: row.name || email.split('@')[0]!,
            role: row.role ?? 'owner',
          },
        }
      }
    } catch {
      // Ignorar fallback si falla Auth
    }

    return { ok: false, error: INVALID }
  } catch (error) {
    log.error('Login del panel: falló la validación con la tabla users', error)
    return { ok: false, error: 'No se pudo validar la cuenta. Probá de nuevo en un rato.' }
  }
}
