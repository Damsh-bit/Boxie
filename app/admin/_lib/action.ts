import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { fieldErrors } from '@/domain/admin/inputs'
import type { AdminRole } from '@/domain/admin/types'
import { AdminRepoError, adminRepo, type Actor, type AdminRepo } from '@/server/admin/repo'
import { AdminAuthError, requireAdminAction, type AdminSession } from '@/server/admin/session'
import { log } from '@/server/log'

/**
 * Todas las Server Actions del panel pasan por acá: verifican la sesión y el
 * rol (nunca alcanza con que la página no muestre el botón), traducen los
 * errores a mensajes para la persona y revalidan las páginas afectadas.
 */

import type { ActionResult } from './action-result'

export type { ActionResult }

interface Context {
  session: AdminSession
  actor: Actor
  repo: AdminRepo
}

export async function runAction<T = null>(
  options: { roles?: readonly AdminRole[]; revalidate?: string[] },
  fn: (ctx: Context) => Promise<{ message?: string; data?: T } | void>,
): Promise<ActionResult<T>> {
  try {
    const session = await requireAdminAction(options.roles)
    const repo = await adminRepo()
    const result =
      (await fn({ session, repo, actor: { email: session.email, name: session.name } })) ?? {}
    for (const path of options.revalidate ?? ['/admin']) {
      // El panel se revalida entero (todo es dinámico). En el sitio público,
      // solo la página: revalidar '/' como layout invalida también las páginas
      // estáticas (legales) y pueden dar 404 hasta regenerarse.
      if (path.startsWith('/admin')) revalidatePath(path, 'layout')
      else revalidatePath(path)
    }
    return { ok: true, ...result }
  } catch (error) {
    if (error instanceof AdminAuthError) return { ok: false, error: error.message }
    if (error instanceof AdminRepoError) return { ok: false, error: error.message }
    if (error instanceof z.ZodError)
      return { ok: false, error: 'Revisá los campos marcados.', fields: fieldErrors(error) }
    log.error('Acción del panel falló', error)
    return { ok: false, error: 'Algo salió mal. Probá de nuevo en un rato.' }
  }
}

/** Roles que pueden tocar plata (precios, cupones, gastos, configuración). */
export const MONEY_ROLES: AdminRole[] = ['owner', 'admin']
export const CONTENT_ROLES: AdminRole[] = ['owner', 'admin', 'editor']
export const SUPPORT_ROLES: AdminRole[] = ['owner', 'admin', 'support']
