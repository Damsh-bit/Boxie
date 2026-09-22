import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '../env'
import type { Database } from './database.types'

export type Db = SupabaseClient<Database>

let service: Db | undefined
let anon: Db | undefined

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}

/**
 * Service role: saltea RLS. Solo para los flujos que validan su propia
 * credencial (checkout, webhook, editor y regalo por token). Nunca se usa para
 * responder a algo que el usuario controla sin validarlo antes.
 */
export function serviceDb(): Db {
  service ??= createClient<Database>(
    env().NEXT_PUBLIC_SUPABASE_URL,
    env().SUPABASE_SERVICE_ROLE_KEY,
    options,
  )
  return service
}

/** Clave pública con RLS: lo que puede ver cualquiera (catálogo, precio base). */
export function publicDb(): Db {
  anon ??= createClient<Database>(
    env().NEXT_PUBLIC_SUPABASE_URL,
    env().NEXT_PUBLIC_SUPABASE_ANON_KEY,
    options,
  )
  return anon
}

export class DbError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'DbError'
  }
}

type DbFailure = { message: string; code?: string }
type Result<T> = { data: T; error: DbFailure | null }

/** Desenvuelve la respuesta de supabase-js: o datos, o excepción. */
export function unwrap<T>(result: Result<T>, what: string): NonNullable<T> {
  if (result.error) throw new DbError(`${what}: ${result.error.message}`, result.error.code)
  if (result.data === null || result.data === undefined) throw new DbError(`${what}: sin datos`)
  return result.data as NonNullable<T>
}

/** Para `.maybeSingle()`: null es un resultado válido (no existe). */
export function unwrapMaybe<T>(result: Result<T>, what: string): T | null {
  if (result.error) throw new DbError(`${what}: ${result.error.message}`, result.error.code)
  return result.data ?? null
}
