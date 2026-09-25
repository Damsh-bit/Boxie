import 'server-only'
import type { CustomerTicket } from '@/domain/support'
import { log } from '../log'
import { subscribe, type SupportEvent } from './bus'
import { supportRepo } from './repo'

/**
 * El stream en vivo del soporte (Server-Sent Events), para el widget del
 * cliente y la bandeja del panel.
 *
 *  · Lo que pasa en esta instancia llega al instante (bus en memoria).
 *  · Con la base real, además relee cada 2,5 s una ventana de los últimos
 *    15 s: así se entera de lo que pasó en otra instancia. La ventana (y no
 *    "desde lo último visto") es a propósito: una transacción que confirma
 *    tarde no se pierde. Lo repetido se descarta.
 *  · Cierra a los 50 s y el navegador reconecta solo (EventSource): ninguna
 *    función queda abierta más de lo que permite Vercel. Al reconectar, el
 *    cliente vuelve a pedir el estado completo, así no se pierde nada.
 */

/** Lo que viaja por el stream: el evento tal cual (equipo) o con el ticket del cliente. */
export type StreamEvent = SupportEvent | { type: 'ticket'; ticket: CustomerTicket }

const encoder = new TextEncoder()
const STREAM_MS = 50_000
const POLL_MS = 2_500
const WINDOW_MS = 15_000
const HEARTBEAT_MS = 15_000

export function supportStream({
  request,
  scope,
  filter,
}: {
  request: Request
  /** Tickets que puede ver (el cliente, los suyos; el equipo, todos). */
  scope: { ticketIds?: string[] }
  /** Adapta (o descarta) cada evento para quien mira. */
  filter(event: SupportEvent): StreamEvent | null
}): Response {
  let stop = () => {}

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const timers: ReturnType<typeof setTimeout>[] = []
      const write = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          close()
        }
      }

      // Lo mismo puede llegar por el bus y por la base: se manda una vez por versión.
      const seen = new Map<string, string>()
      const emit = (event: SupportEvent) => {
        const visible = filter(event)
        if (!visible) return
        if (visible.type !== 'typing') {
          const key =
            visible.type === 'message' ? `m:${visible.message.id}` : `t:${visible.ticket.id}`
          // Un ticket se vuelve a mandar solo si cambió algo de lo que ve quien mira.
          const version = visible.type === 'message' ? '1' : JSON.stringify(visible.ticket)
          if (seen.get(key) === version) return
          seen.set(key, version)
        }
        write(`data: ${JSON.stringify(visible)}\n\n`)
      }

      const unsubscribe = subscribe(emit)
      function close() {
        if (closed) return
        closed = true
        unsubscribe()
        timers.forEach((t) => clearInterval(t))
        try {
          controller.close()
        } catch {
          // ya estaba cerrado
        }
      }
      stop = close
      request.signal.addEventListener('abort', close)

      // Reconexión rápida y un primer latido para que el navegador sepa que abrió.
      write('retry: 2000\n\n: conectado\n\n')
      timers.push(setInterval(() => write(': ping\n\n'), HEARTBEAT_MS))
      timers.push(setTimeout(close, STREAM_MS))

      const repo = await supportRepo()
      if (repo.mode === 'supabase' && (!scope.ticketIds || scope.ticketIds.length > 0)) {
        let busy = false
        timers.push(
          setInterval(async () => {
            if (busy || closed) return
            busy = true
            try {
              const since = new Date(Date.now() - WINDOW_MS).toISOString()
              const changes = await repo.changesSince(since, scope)
              changes.tickets.forEach((ticket) => emit({ type: 'ticket', ticket }))
              changes.messages.forEach((message) => emit({ type: 'message', message }))
            } catch (error) {
              log.warn('Soporte: no se pudieron leer los cambios del stream', {
                error: error instanceof Error ? error.message : String(error),
              })
            } finally {
              busy = false
            }
          }, POLL_MS),
        )
      }
    },
    cancel() {
      stop()
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Sin buffer en proxies (nginx y parecidos): cada evento sale al toque.
      'x-accel-buffering': 'no',
    },
  })
}
