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
 * - Con Supabase: Supabase Auth (mail y clave) + la tabla admin_users. El
 *   alta del primer admin está en docs/OPERACION.md.
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
  return { email, password, isDefault }
}

export async function authenticateAdmin(emailInput: string, password: string): Promise<AuthResult> {
  const email = emailInput.trim().toLowerCase()
  if (!email || !password) return { ok: false, error: 'Completá el mail y la clave.' }

  if (isDemoMode()) {
    const demo = demoCredentials()
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

  return authenticateWithSupabase(email, password)
}

/**
 * ⚠️ Pendiente de probar contra el proyecto real: Supabase Auth valida la
 * clave y la tabla admin_users decide si es admin (y con qué rol, columna que
 * agrega la migración admin_backoffice).
 */
async function authenticateWithSupabase(email: string, password: string): Promise<AuthResult> {
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const { env } = await import('../env')
    const auth = createClient(env().NEXT_PUBLIC_SUPABASE_URL, env().NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const { data, error } = await auth.auth.signInWithPassword({ email, password })
    if (error || !data.user) return { ok: false, error: INVALID }

    const { serviceDb } = await import('../db/client')
    const { data: admin } = await serviceDb()
      .from('admin_users')
      .select('*')
      .eq('user_id', data.user.id)
      .maybeSingle()
    await auth.auth.signOut().catch(() => {})
    if (!admin) return { ok: false, error: 'Esa cuenta no es administradora de Boxie.' }

    const row = admin as { role?: AdminRole; name?: string }
    return {
      ok: true,
      identity: {
        uid: data.user.id,
        email,
        name: row.name || email.split('@')[0]!,
        role: row.role ?? 'owner',
      },
    }
  } catch (error) {
    log.error('Login del panel: falló la validación con Supabase', error)
    return { ok: false, error: 'No se pudo validar la cuenta. Probá de nuevo en un rato.' }
  }
}
