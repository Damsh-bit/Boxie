import 'server-only'
import { EventEmitter } from 'node:events'
import type { SupportMessage, SupportTicket } from '@/domain/support'

/**
 * Bus de eventos del soporte, en memoria de la instancia: cuando alguien
 * escribe, los que están mirando esa conversación (el cliente en el widget, el
 * equipo en el panel) lo reciben al instante por su stream (SSE).
 *
 * Vive en `globalThis` porque en Next cada ruta puede cargar su propia copia
 * del módulo. Entre instancias (Vercel con la base real) no llega: para eso
 * cada stream además consulta la base cada pocos segundos (`changesSince`).
 * "Escribiendo…" viaja solo por acá (es efímero: si se pierde, no pasa nada).
 */

export type SupportEvent =
  | { type: 'ticket'; ticket: SupportTicket }
  | { type: 'message'; message: SupportMessage }
  | { type: 'typing'; ticketId: string; who: 'customer' | 'agent'; name: string }

declare global {
  var __boxieSupportBus: EventEmitter | undefined
}

function bus(): EventEmitter {
  if (!globalThis.__boxieSupportBus) {
    globalThis.__boxieSupportBus = new EventEmitter()
    // Cada stream abierto es un oyente: no es una pérdida de memoria.
    globalThis.__boxieSupportBus.setMaxListeners(0)
  }
  return globalThis.__boxieSupportBus
}

export function publish(event: SupportEvent) {
  bus().emit('event', event)
}

export function subscribe(listener: (event: SupportEvent) => void): () => void {
  bus().on('event', listener)
  return () => {
    bus().off('event', listener)
  }
}
