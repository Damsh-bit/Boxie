import { cookies } from 'next/headers'
import { handle, json, limit, supportTokens } from '@/server/support/http'
import { createTicket, customerTickets } from '@/server/support/service'
import { SUPPORT_COOKIE, supportCookieOptions, withSupportToken } from '@/server/support/session'

/**
 * Las consultas de este navegador (GET) y abrir una nueva (POST). La consulta
 * nueva suma su token a la cookie: desde ahí, este navegador la ve.
 */

export const dynamic = 'force-dynamic'

const HOUR = 60 * 60 * 1000

export async function GET(request: Request) {
  return handle(request, async () => {
    limit(request, 'list', 120, 10 * 60 * 1000)
    return json({ tickets: await customerTickets(await supportTokens()) })
  })
}

export async function POST(request: Request) {
  return handle(
    request,
    async () => {
      limit(request, 'create', 10, HOUR)
      const body = await request.json().catch(() => null)
      const { token, conversation } = await createTicket(body)
      const store = await cookies()
      store.set(
        SUPPORT_COOKIE,
        withSupportToken(await supportTokens(), token),
        supportCookieOptions(),
      )
      return json(conversation, { status: 201 })
    },
    { write: true },
  )
}
