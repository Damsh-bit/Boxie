import { rateLimit } from '@/server/rate-limit'
import { handle, json, supportTokens } from '@/server/support/http'
import { customerTyping } from '@/server/support/service'

/** "Escribiendo…": efímero, no se guarda. Uno cada 2 segundos alcanza. */

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: RouteContext<'/api/soporte/tickets/[id]/escribiendo'>,
) {
  return handle(
    request,
    async () => {
      const { id } = await params
      // Si llega más seguido, se ignora en silencio (no es un error).
      if (rateLimit(`support:typing:${id}`, { limit: 1, windowMs: 2_000 }))
        await customerTyping(await supportTokens(), id)
      return json({ ok: true })
    },
    { write: true },
  )
}
