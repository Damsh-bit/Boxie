import { toCustomerTicket } from '@/domain/support'
import { supportTokens } from '@/server/support/http'
import { customerTickets } from '@/server/support/service'
import { supportStream } from '@/server/support/stream'

/**
 * El stream en vivo del cliente: sus consultas, sin notas internas ni datos
 * del equipo. Sin consultas, no hay nada que escuchar.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  // Sin consultas (o sin el soporte en la base) no hay nada que escuchar.
  const tickets = await customerTickets(await supportTokens()).catch(() => [])
  if (tickets.length === 0) return new Response(null, { status: 204 })
  const ids = new Set(tickets.map((t) => t.id))

  return supportStream({
    request,
    scope: { ticketIds: [...ids] },
    filter(event) {
      if (event.type === 'message')
        return ids.has(event.message.ticketId) && !event.message.internal ? event : null
      if (event.type === 'ticket')
        // El cliente ve su ticket como lo ve en el widget (sin asignación, contexto ni notas).
        return ids.has(event.ticket.id)
          ? { type: 'ticket', ticket: toCustomerTicket(event.ticket) }
          : null
      return ids.has(event.ticketId) && event.who === 'agent' ? event : null
    },
  })
}
