'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ADMIN_COOKIE, adminCookieOptions } from '@/server/admin/session'

export async function logout() {
  const store = await cookies()
  store.set(ADMIN_COOKIE, '', { ...adminCookieOptions(0), maxAge: 0 })
  redirect('/admin/login')
}
