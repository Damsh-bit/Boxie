import { handle, json, limit, supportTokens } from '@/server/support/http'
import { customerConversation } from '@/server/support/service'

/** Una consulta con sus mensajes (sin las notas internas del equipo). */

export const dynamic = 'force-dynamic'

export async function GET(request: Request, { params }: RouteContext<'/api/soporte/tickets/[id]'>) {
  return handle(request, async () => {
    limit(request, 'read', 240, 10 * 60 * 1000)
    const { id } = await params
    return json(await customerConversation(await supportTokens(), id))
  })
}
