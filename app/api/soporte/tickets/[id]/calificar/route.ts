import { handle, json, limit, supportTokens } from '@/server/support/http'
import { customerRate } from '@/server/support/service'

/** "¿Te ayudamos?": 👍 o 👎 cuando la consulta está resuelta. */

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: RouteContext<'/api/soporte/tickets/[id]/calificar'>,
) {
  return handle(
    request,
    async () => {
      limit(request, 'rate', 20, 10 * 60 * 1000)
      const { id } = await params
      const body = await request.json().catch(() => null)
      return json({ ticket: await customerRate(await supportTokens(), id, body) })
    },
    { write: true },
  )
}
