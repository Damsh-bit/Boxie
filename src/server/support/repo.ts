import 'server-only'
import type {
  MessageAuthor,
  SupportMessage,
  SupportPriority,
  SupportStatus,
  SupportTicket,
  SupportTopic,
  TicketContext,
} from '@/domain/support'
import { isDemoMode } from '../demo'

/**
 * El contrato de datos del soporte, con dos implementaciones (como el panel):
 * demo (en memoria, con conversaciones de muestra) y Supabase. Las rutas y
 * las acciones hablan con `support/service.ts`, que usa esto.
 */

export interface NewTicketRecord {
  topic: SupportTopic
  priority: SupportPriority
  subject: string
  customerName: string
  customerEmail: string
  boxieCode: string | null
  boxieId: string | null
  orderId: string | null
  context: TicketContext | null
  accessTokenHash: string
  /** El token cifrado (para volver a mandar el link); null sin clave de cifrado. */
  accessTokenEnc: string | null
  /** El primer mensaje del cliente. */
  body: string
}

export interface PostMessageInput {
  ticketId: string
  author: MessageAuthor
  authorName: string
  authorEmail?: string | null
  body: string
  internal?: boolean
  /** Fuerza el estado (responder y resolver en un paso). */
  status?: SupportStatus
}

export type TicketPatch = Partial<
  Pick<
    SupportTicket,
    | 'status'
    | 'priority'
    | 'assignee'
    | 'rating'
    | 'customerReadAt'
    | 'agentReadAt'
    | 'customerNotifiedAt'
    | 'teamNotifiedAt'
  >
>

export interface TicketFilter {
  /** 'active' = abiertos y esperando al cliente. */
  status?: SupportStatus | 'active' | 'all'
  limit?: number
}

export interface SupportChanges {
  tickets: SupportTicket[]
  messages: SupportMessage[]
}

export interface SupportAuditEntry {
  actorEmail: string
  actorId?: string | null
  action: string
  ticketId: string
  summary: string
}

export interface SupportRepo {
  readonly mode: 'demo' | 'supabase'

  createTicket(record: NewTicketRecord): Promise<{ ticket: SupportTicket; message: SupportMessage }>
  getTicket(id: string): Promise<SupportTicket | null>
  /** El ticket cuyo token de acceso tiene ese hash (el cliente). */
  getTicketByTokenHash(hash: string): Promise<SupportTicket | null>
  ticketsByTokenHashes(hashes: string[]): Promise<SupportTicket[]>
  listTickets(filter?: TicketFilter): Promise<SupportTicket[]>
  listMessages(ticketId: string): Promise<SupportMessage[]>
  /** Publica un mensaje y actualiza el ticket (estado, tiempos) en una sola operación. */
  postMessage(input: PostMessageInput): Promise<{ message: SupportMessage; ticket: SupportTicket }>
  updateTicket(id: string, patch: TicketPatch): Promise<SupportTicket>
  /** Lo que cambió desde `since` (ISO): tickets tocados y mensajes nuevos. */
  changesSince(since: string, scope: { ticketIds?: string[] }): Promise<SupportChanges>
  /** La Boxie de un código (para vincular el ticket; el cliente nunca ve el resultado). */
  findBoxieByCode(code: string): Promise<{ boxieId: string; orderId: string } | null>
  /** Tickets anteriores del mismo mail (el panel muestra el historial del cliente). */
  ticketsByEmail(email: string): Promise<SupportTicket[]>
  /** La copia cifrada del token de acceso (solo para mandarle el link al cliente). */
  accessTokenEnc(ticketId: string): Promise<string | null>
  audit(entry: SupportAuditEntry): Promise<void>
}

/** Sin la migración de soporte en la base: el sitio lo dice en vez de fallar. */
export const SUPPORT_UNAVAILABLE =
  'El chat de soporte no está disponible en este momento. Escribinos por mail o WhatsApp (están en Contacto) y te respondemos.'

export class SupportError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'closed' | 'invalid' | 'forbidden' | 'unavailable' = 'invalid',
  ) {
    super(message)
    this.name = 'SupportError'
  }
}

let repo: Promise<SupportRepo> | undefined

/** El repositorio del entorno: demo si DEMO_MODE=1, Supabase si no. */
export function supportRepo(): Promise<SupportRepo> {
  repo ??= isDemoMode()
    ? import('./demo-repo').then((m) => m.demoSupportRepo)
    : import('./supabase-repo').then((m) => m.supabaseSupportRepo)
  return repo
}
