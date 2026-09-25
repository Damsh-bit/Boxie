import { handle, json, limit, supportTokens } from '@/server/support/http'
import { customerRead } from '@/server/support/service'

/** El cliente leyó las respuestas (se apaga el aviso de "sin leer"). */

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: RouteContext<'/api/soporte/tickets/[id]/leido'>,
) {
  return handle(
    request,
    async () => {
      limit(request, 'read-mark', 120, 10 * 60 * 1000)
      const { id } = await params
      await customerRead(await supportTokens(), id)
      return json({ ok: true })
    },
    { write: true },
  )
}
