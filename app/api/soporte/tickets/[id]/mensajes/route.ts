import { handle, json, limit, supportTokens } from '@/server/support/http'
import { customerReply } from '@/server/support/service'

/** El cliente escribe en su consulta (una resuelta se reabre; una cerrada, no). */

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: RouteContext<'/api/soporte/tickets/[id]/mensajes'>,
) {
  return handle(
    request,
    async () => {
      limit(request, 'message', 40, 10 * 60 * 1000)
      const { id } = await params
      const body = await request.json().catch(() => null)
      const message = await customerReply(await supportTokens(), id, body)
      return json({ message }, { status: 201 })
    },
    { write: true },
  )
}
