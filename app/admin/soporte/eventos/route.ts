import { supportAgent } from '@/server/support/agent-session'
import { supportStream } from '@/server/support/stream'

/**
 * El stream en vivo de la bandeja de soporte: todas las consultas, con notas
 * internas y "escribiendo…" del cliente. Solo el equipo que atiende.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const agent = await supportAgent()
  if (!agent) return new Response(null, { status: 401 })
  return supportStream({
    request,
    scope: {},
    // El equipo ve todo, menos su propio "escribiendo…".
    filter: (event) => (event.type === 'typing' && event.who === 'agent' ? null : event),
  })
}
