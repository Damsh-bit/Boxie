import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { isDemoMode } from '../demo'
import { env } from '../env'
import type { Database } from '../db/database.types'

export async function createCustomerSupabase() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    env().NEXT_PUBLIC_SUPABASE_URL,
    env().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Se puede ignorar en Server Components donde no se pueden mutar cookies
          }
        },
      },
    },
  )
}

export interface CustomerSession {
  user: User
  email: string
  name: string
  avatarUrl?: string
}

/**
 * Cómo se puede haber probado que el mail es de quien entra. El portal da
 * acceso a los regalos de las órdenes con ese mail (links del regalo y del
 * editor), así que solo valen los métodos que pasan por la casilla o por un
 * proveedor que verifica el mail. `password` no: con la confirmación de mail
 * apagada en Supabase, cualquiera podía hacer signUp() con la clave pública y
 * el mail de un comprador.
 */
const TRUSTED_AMR = new Set(['otp', 'magiclink', 'oauth', 'email/signup', 'invite', 'recovery'])

export function hasTrustedLogin(amr: unknown): boolean {
  if (!Array.isArray(amr) || amr.length === 0) return false
  return amr.every(
    (entry) =>
      entry &&
      typeof entry === 'object' &&
      TRUSTED_AMR.has(String((entry as { method?: unknown }).method)),
  )
}

/** Obtiene el usuario autenticado actual o null si no inició sesión */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  // En modo demo no hay Supabase: nadie inició sesión.
  if (isDemoMode()) return null
  const supabase = await createCustomerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email || user.is_anonymous || !user.email_confirmed_at) return null

  // getUser() valida el token contra Supabase; los claims dicen cómo se entró.
  const { data: claimsData } = await supabase.auth.getClaims()
  if (!claimsData || !hasTrustedLogin(claimsData.claims.amr)) return null

  const name =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email.split('@')[0] ||
    'Cliente'

  const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture

  return {
    user,
    email: user.email.toLowerCase(),
    name,
    avatarUrl,
  }
}

/** Exige que el cliente esté autenticado. Si no, redirige a /cuenta/login */
export async function requireCustomerSession(nextUrl = '/cuenta'): Promise<CustomerSession> {
  const session = await getCustomerSession()
  if (!session) {
    redirect(`/cuenta/login?next=${encodeURIComponent(nextUrl)}`)
  }
  return session
}
