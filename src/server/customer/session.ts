import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
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

/** Obtiene el usuario autenticado actual o null si no inició sesión */
export async function getCustomerSession(): Promise<CustomerSession | null> {
  const supabase = await createCustomerSupabase()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) return null

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
