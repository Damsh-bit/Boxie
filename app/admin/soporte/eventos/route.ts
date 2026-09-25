import { supportAgent } from '@/server/support/agent-session'
import { SupportError, supportRepo } from '@/server/support/repo'
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
  // Sin la migración de soporte no hay nada que escuchar (la bandeja ya lo explica).
  try {
    await (await supportRepo()).listTickets({ status: 'open', limit: 1 })
  } catch (error) {
    if (error instanceof SupportError && error.code === 'unavailable')
      return new Response(null, { status: 204 })
    throw error
  }
  return supportStream({
    request,
    scope: {},
    // El equipo ve todo, menos su propio "escribiendo…".
    filter: (event) => (event.type === 'typing' && event.who === 'agent' ? null : event),
  })
}
