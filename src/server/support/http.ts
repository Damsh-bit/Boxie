import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { log } from '../log'
import { clientIp, rateLimit } from '../rate-limit'
import { SupportError } from './repo'
import { isSameOrigin, readSupportTokens, SUPPORT_COOKIE } from './session'

/**
 * Lo común a las rutas del soporte del cliente (/api/soporte/*): leer los
 * tokens de la cookie, frenar pedidos de otro sitio y en ráfaga, y traducir
 * los errores a mensajes para la persona.
 */

export class TooManyRequests extends Error {}

export async function supportTokens(): Promise<string[]> {
  return readSupportTokens((await cookies()).get(SUPPORT_COOKIE)?.value)
}

/** Límite por IP (y lo que se quiera sumar a la clave). Tira si se pasa. */
export function limit(request: Request, key: string, max: number, windowMs: number) {
  if (!rateLimit(`support:${key}:${clientIp(request.headers)}`, { limit: max, windowMs }))
    throw new TooManyRequests()
}

const noStore = { 'cache-control': 'private, no-store' }

export function json(body: unknown, init: ResponseInit = {}) {
  return NextResponse.json(body, { ...init, headers: { ...noStore, ...init.headers } })
}

export async function handle(
  request: Request,
  fn: () => Promise<Response>,
  opts: { write?: boolean } = {},
): Promise<Response> {
  if (opts.write && !isSameOrigin(request))
    return json({ error: 'Pedido de otro sitio.' }, { status: 403 })
  try {
    return await fn()
  } catch (error) {
    if (error instanceof TooManyRequests)
      return json(
        { error: 'Mandaste muchos pedidos seguidos. Esperá un momento y probá de nuevo.' },
        { status: 429 },
      )
    if (error instanceof z.ZodError) {
      const fields: Record<string, string> = {}
      for (const issue of error.issues) {
        const key = issue.path.join('.') || 'form'
        fields[key] ??= issue.message
      }
      return json(
        { error: error.issues[0]?.message ?? 'Revisá los datos.', fields },
        { status: 400 },
      )
    }
    if (error instanceof SupportError) {
      const status =
        error.code === 'not_found'
          ? 404
          : error.code === 'forbidden'
            ? 403
            : error.code === 'closed'
              ? 409
              : 400
      return json({ error: error.message }, { status })
    }
    log.error('Soporte: falló un pedido', error)
    return json(
      { error: 'No pudimos procesar el pedido. Probá de nuevo en un rato.' },
      { status: 500 },
    )
  }
}
