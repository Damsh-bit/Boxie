'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/server/db/database.types'

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function getBrowserSupabase() {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  client = createBrowserClient<Database>(url, anonKey)
  return client
}
