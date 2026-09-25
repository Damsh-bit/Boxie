import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { log } from '@/server/log'
import { clientIp, rateLimit } from '@/server/rate-limit'
import { hashToken, isWellFormedToken } from '@/server/security/tokens'
import { supportRepo } from '@/server/support/repo'
import {
  readSupportTokens,
  SUPPORT_COOKIE,
  supportCookieOptions,
  withSupportToken,
} from '@/server/support/session'

/**
 * El link personal del mail (/soporte/<token>): se canjea por la cookie de
 * este navegador y la URL queda limpia (/soporte?consulta=<id>), igual que el
 * link del editor. Un link que no existe lleva a /soporte con un aviso.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: RouteContext<'/soporte/[token]'>) {
  const { token } = await params
  const url = new URL(request.url)
  const back = (search: string) => NextResponse.redirect(new URL(`/soporte${search}`, url))

  if (!rateLimit(`support:link:${clientIp(request.headers)}`, { limit: 30, windowMs: 600_000 }))
    return back('?error=limite')
  if (!isWellFormedToken(token)) return back('?error=link')

  try {
    const ticket = await (await supportRepo()).getTicketByTokenHash(hashToken(token))
    if (!ticket) return back('?error=link')
    const store = await cookies()
    const current = readSupportTokens(store.get(SUPPORT_COOKIE)?.value)
    const response = back(`?consulta=${ticket.id}`)
    response.cookies.set(SUPPORT_COOKIE, withSupportToken(current, token), supportCookieOptions())
    return response
  } catch (error) {
    log.error('Soporte: no se pudo abrir el link de una consulta', error)
    return back('?error=servidor')
  }
}
