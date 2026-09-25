import 'server-only'
import { after } from 'next/server'
import { siteUrl } from '@/content/site'
import {
  AgentReplySchema,
  CustomerMessageSchema,
  customerMessages,
  initialPriority,
  NewTicketSchema,
  RatingSchema,
  shouldNotifyCustomer,
  shouldNotifyTeam,
  STATUS_INFO,
  subjectFrom,
  TicketPatchSchema,
  toCustomerTicket,
  TOPIC_INFO,
  type CustomerTicket,
  type SupportMessage,
  type SupportStatus,
  type SupportTicket,
} from '@/domain/support'
import type { Actor } from '../admin/repo'
import { DEFAULT_BUSINESS, getPublicSettings } from '../catalog'
import { isDemoMode } from '../demo'
import { log } from '../log'
import { devOutbox, sendMail, type OutgoingMail } from '../mail/send'
import { supportReplyEmail, supportTeamEmail, supportTicketCreatedEmail } from '../mail/templates'
import { decryptToken, encryptToken, generateToken, hashToken } from '../security/tokens'
import { publish } from './bus'
import { SupportError, supportRepo, type TicketFilter } from './repo'

/**
 * El soporte de punta a punta: valida lo que llega, lo guarda (repo), lo
 * avisa en vivo a quien esté mirando (bus → streams SSE) y manda los mails
 * después de responder (`after`), sin hacer esperar a nadie.
 *
 * El cliente se identifica con los tokens de su cookie (una consulta por
 * token); el equipo, con su sesión del panel (la acción ya verificó el rol).
 */

export interface CustomerConversation {
  ticket: CustomerTicket
  messages: SupportMessage[]
}

// ── Mails ───────────────────────────────────────────────────────────────────

/** En demo no hay proveedor de mails: quedan en la bandeja de desarrollo. */
async function deliver(mail: OutgoingMail) {
  if (isDemoMode()) {
    const outbox = devOutbox()
    outbox.unshift({ ...mail, sentAt: new Date().toISOString() })
    outbox.length = Math.min(outbox.length, 50)
    log.info('mail de soporte (demo: no se envía)', { to: mail.to, subject: mail.subject })
    return
  }
  await sendMail(mail)
}

async function teamAddress(): Promise<string> {
  try {
    return (await getPublicSettings()).business.supportEmail || DEFAULT_BUSINESS.supportEmail
  } catch {
    return DEFAULT_BUSINESS.supportEmail
  }
}

const customerLink = (token: string) => `${siteUrl()}/soporte/${token}`

/** La clave de cifrado de tokens (la misma del link del regalo), si está configurada. */
function encryptionKey(): string | null {
  const key = process.env.TOKEN_ENCRYPTION_KEY?.trim()
  return key && Buffer.from(key, 'base64').length === 32 ? key : null
}

function sealToken(token: string): string | null {
  const key = encryptionKey()
  return key ? encryptToken(token, key) : null
}

function openToken(sealed: string | null): string | null {
  const key = encryptionKey()
  if (!sealed || !key) return null
  try {
    return decryptToken(sealed, key)
  } catch (error) {
    log.warn('Soporte: no se pudo descifrar un token', { error: String(error) })
    return null
  }
}

/** El link personal de la consulta (o, sin clave de cifrado, el de este dispositivo). */
async function linkFor(ticketId: string): Promise<string> {
  const token = openToken(await (await supportRepo()).accessTokenEnc(ticketId))
  return token ? customerLink(token) : `${siteUrl()}/soporte?consulta=${ticketId}`
}

function adminLink(ticketId: string) {
  const host = process.env.ADMIN_HOST?.trim()
  const base = host ? `https://${host}` : siteUrl()
  return `${base}/admin/soporte?ticket=${ticketId}`
}

/** Corre después de responder; un mail que falla no rompe nada (queda en el log). */
function later(what: string, fn: () => Promise<void>) {
  after(async () => {
    try {
      await fn()
    } catch (error) {
      log.error(`Soporte: falló ${what}`, error)
    }
  })
}

// ── Cliente ─────────────────────────────────────────────────────────────────

/** Abre una consulta. Devuelve el token (va a la cookie) y la conversación. */
export async function createTicket(
  raw: unknown,
): Promise<{ token: string; conversation: CustomerConversation }> {
  const input = NewTicketSchema.parse(raw)
  const repo = await supportRepo()
  const token = generateToken()
  const link = input.boxieCode
    ? await repo.findBoxieByCode(input.boxieCode).catch((error: unknown) => {
        log.warn('Soporte: no se pudo buscar la Boxie del código', { error: String(error) })
        return null
      })
    : null

  const { ticket, message } = await repo.createTicket({
    topic: input.topic,
    priority: initialPriority(input.topic),
    subject: subjectFrom(input.message, input.topic),
    customerName: input.name,
    customerEmail: input.email.trim().toLowerCase(),
    boxieCode: input.boxieCode,
    boxieId: link?.boxieId ?? null,
    orderId: link?.orderId ?? null,
    context: input.context ?? null,
    accessTokenHash: hashToken(token),
    accessTokenEnc: sealToken(token),
    body: input.message,
  })
  publish({ type: 'ticket', ticket })
  publish({ type: 'message', message })

  later('el aviso de una consulta nueva', async () => {
    await deliver({
      to: ticket.customerEmail,
      tag: 'support-created',
      ...supportTicketCreatedEmail({
        name: ticket.customerName,
        number: ticket.number,
        subject: ticket.subject,
        url: customerLink(token),
      }),
    })
    await deliver({
      to: await teamAddress(),
      replyTo: ticket.customerEmail,
      tag: 'support-team',
      ...supportTeamEmail({
        kind: 'new',
        number: ticket.number,
        topic: TOPIC_INFO[ticket.topic].label,
        subject: ticket.subject,
        customerName: ticket.customerName,
        customerEmail: ticket.customerEmail,
        message: message.body,
        adminUrl: adminLink(ticket.id),
      }),
    })
    const updated = await repo.updateTicket(ticket.id, { teamNotifiedAt: new Date().toISOString() })
    publish({ type: 'ticket', ticket: updated })
  })

  return { token, conversation: { ticket: toCustomerTicket(ticket), messages: [message] } }
}

/** Las consultas de este navegador (las de los tokens de su cookie). */
export async function customerTickets(tokens: string[]): Promise<CustomerTicket[]> {
  if (tokens.length === 0) return []
  const repo = await supportRepo()
  return (await repo.ticketsByTokenHashes(tokens.map(hashToken))).map(toCustomerTicket)
}

/** El ticket, solo si uno de los tokens del cliente es el suyo. */
async function ownedTicket(tokens: string[], ticketId: string): Promise<SupportTicket> {
  const repo = await supportRepo()
  const ticket = (await repo.ticketsByTokenHashes(tokens.map(hashToken))).find(
    (t) => t.id === ticketId,
  )
  if (!ticket)
    throw new SupportError('No encontramos esa consulta en este dispositivo.', 'forbidden')
  return ticket
}

export async function customerConversation(
  tokens: string[],
  ticketId: string,
): Promise<CustomerConversation> {
  const ticket = await ownedTicket(tokens, ticketId)
  const repo = await supportRepo()
  return {
    ticket: toCustomerTicket(ticket),
    messages: customerMessages(await repo.listMessages(ticket.id)),
  }
}

export async function customerReply(
  tokens: string[],
  ticketId: string,
  raw: unknown,
): Promise<SupportMessage> {
  const { body } = CustomerMessageSchema.parse(raw)
  const before = await ownedTicket(tokens, ticketId)
  const repo = await supportRepo()
  const { message, ticket } = await repo.postMessage({
    ticketId,
    author: 'customer',
    authorName: before.customerName.split(/\s+/)[0]!,
    body,
  })
  publish({ type: 'message', message })
  publish({ type: 'ticket', ticket })

  if (shouldNotifyTeam(before, new Date())) {
    later('el aviso al equipo', async () => {
      await deliver({
        to: await teamAddress(),
        replyTo: ticket.customerEmail,
        tag: 'support-team',
        ...supportTeamEmail({
          kind: 'reply',
          number: ticket.number,
          topic: TOPIC_INFO[ticket.topic].label,
          subject: ticket.subject,
          customerName: ticket.customerName,
          customerEmail: ticket.customerEmail,
          message: body,
          adminUrl: adminLink(ticket.id),
        }),
      })
      await repo.updateTicket(ticket.id, { teamNotifiedAt: new Date().toISOString() })
    })
  }
  return message
}

export async function customerRead(tokens: string[], ticketId: string) {
  await ownedTicket(tokens, ticketId)
  const repo = await supportRepo()
  const ticket = await repo.updateTicket(ticketId, { customerReadAt: new Date().toISOString() })
  publish({ type: 'ticket', ticket })
}

export async function customerRate(tokens: string[], ticketId: string, raw: unknown) {
  const { rating } = RatingSchema.parse(raw)
  const before = await ownedTicket(tokens, ticketId)
  if (before.status !== 'resolved' && before.status !== 'closed')
    throw new SupportError('Se puede calificar cuando la consulta está resuelta.')
  const repo = await supportRepo()
  const ticket = await repo.updateTicket(ticketId, { rating })
  publish({ type: 'ticket', ticket })
  return toCustomerTicket(ticket)
}

export async function customerTyping(tokens: string[], ticketId: string) {
  const ticket = await ownedTicket(tokens, ticketId)
  publish({
    type: 'typing',
    ticketId,
    who: 'customer',
    name: ticket.customerName.split(/\s+/)[0]!,
  })
}

/**
 * "Escribí desde otro dispositivo": manda por mail el link personal de las
 * consultas abiertas de ese mail. Responde siempre igual (no revela si hay
 * consultas); el límite de pedidos lo pone la ruta.
 */
export async function recoverTickets(email: string): Promise<{ sent: number }> {
  const repo = await supportRepo()
  const tickets = (await repo.ticketsByEmail(email.trim().toLowerCase()))
    .filter((t) => t.status !== 'closed')
    .slice(0, 5)
  let sent = 0
  for (const ticket of tickets) {
    const token = openToken(await repo.accessTokenEnc(ticket.id))
    if (!token) continue
    await deliver({
      to: ticket.customerEmail,
      tag: 'support-created',
      ...supportTicketCreatedEmail({
        name: ticket.customerName,
        number: ticket.number,
        subject: ticket.subject,
        url: customerLink(token),
      }),
    })
    sent += 1
  }
  return { sent }
}

// ── Equipo ──────────────────────────────────────────────────────────────────

export async function agentTickets(filter?: TicketFilter) {
  return (await supportRepo()).listTickets(filter)
}

export interface AgentConversation {
  ticket: SupportTicket
  messages: SupportMessage[]
  /** Otras consultas del mismo mail (las más nuevas primero). */
  history: SupportTicket[]
}

export async function agentConversation(ticketId: string): Promise<AgentConversation> {
  const repo = await supportRepo()
  const ticket = await repo.getTicket(ticketId)
  if (!ticket) throw new SupportError('La consulta no existe.', 'not_found')
  const [messages, history] = await Promise.all([
    repo.listMessages(ticketId),
    repo.ticketsByEmail(ticket.customerEmail),
  ])
  return { ticket, messages, history: history.filter((t) => t.id !== ticketId).slice(0, 6) }
}

/** El nombre con el que firma el equipo ("Lean"): el cliente ve el de pila. */
const agentName = (actor: Actor) => actor.name.trim().split(/\s+/)[0] || 'Equipo'

export async function agentReply(actor: Actor, raw: unknown) {
  const input = AgentReplySchema.parse(raw)
  const repo = await supportRepo()
  const before = await repo.getTicket(input.ticketId)
  if (!before) throw new SupportError('La consulta no existe.', 'not_found')

  const { message, ticket: posted } = await repo.postMessage({
    ticketId: input.ticketId,
    author: 'agent',
    authorName: agentName(actor),
    authorEmail: actor.email,
    body: input.body,
    internal: input.internal,
    status: input.status,
  })
  // Quien responde primero se queda con la consulta.
  const ticket =
    !posted.assignee && !input.internal
      ? await repo.updateTicket(posted.id, { assignee: actor.email })
      : posted
  publish({ type: 'message', message })
  publish({ type: 'ticket', ticket })

  if (input.status && input.status !== before.status)
    later('la bitácora', () =>
      repo.audit({
        actorEmail: actor.email,
        actorId: actor.id,
        action: 'support.status',
        ticketId: ticket.id,
        summary: `Respondió y pasó la consulta #${ticket.number} a "${STATUS_INFO[input.status!].label}"`,
      }),
    )

  if (!input.internal && shouldNotifyCustomer(before, new Date())) {
    later('el aviso de respuesta al cliente', async () => {
      await deliver({
        to: ticket.customerEmail,
        tag: 'support-reply',
        ...supportReplyEmail({
          name: ticket.customerName,
          number: ticket.number,
          agentName: `${agentName(actor)} de Boxie`,
          message: input.body,
          url: await linkFor(ticket.id),
        }),
      })
      await repo.updateTicket(ticket.id, { customerNotifiedAt: new Date().toISOString() })
    })
  }
  return { message, ticket }
}

/** Lo que ve el cliente cuando el equipo cambia el estado. */
const STATUS_NOTES: Partial<Record<SupportStatus, string>> = {
  resolved:
    'Marcamos tu consulta como resuelta. Si necesitás algo más, escribinos acá y la reabrimos.',
  closed:
    'La consulta quedó cerrada. Si necesitás algo más, abrí una nueva desde el botón de ayuda.',
  open: 'Reabrimos tu consulta: ya la estamos mirando.',
}

export async function agentUpdate(actor: Actor, raw: unknown) {
  const patch = TicketPatchSchema.parse(raw)
  const repo = await supportRepo()
  const before = await repo.getTicket(patch.ticketId)
  if (!before) throw new SupportError('La consulta no existe.', 'not_found')

  let ticket = before
  const changes: string[] = []
  if (patch.status && patch.status !== before.status) {
    const note = STATUS_NOTES[patch.status]
    if (note) {
      const posted = await repo.postMessage({
        ticketId: before.id,
        author: 'system',
        authorName: 'Boxie',
        body: note,
        status: patch.status,
      })
      publish({ type: 'message', message: posted.message })
      ticket = posted.ticket
    } else {
      ticket = await repo.updateTicket(before.id, { status: patch.status })
    }
    changes.push(`estado "${STATUS_INFO[patch.status].label}"`)
  }
  if (patch.priority && patch.priority !== before.priority) {
    ticket = await repo.updateTicket(before.id, { priority: patch.priority })
    changes.push(`prioridad ${patch.priority}`)
  }
  if (patch.assignee !== undefined && patch.assignee !== before.assignee) {
    ticket = await repo.updateTicket(before.id, { assignee: patch.assignee })
    changes.push(patch.assignee ? `asignada a ${patch.assignee}` : 'sin asignar')
  }
  if (changes.length === 0) return ticket

  publish({ type: 'ticket', ticket })
  later('la bitácora', () =>
    repo.audit({
      actorEmail: actor.email,
      actorId: actor.id,
      action: 'support.update',
      ticketId: ticket.id,
      summary: `Consulta #${ticket.number}: ${changes.join(', ')}`,
    }),
  )
  return ticket
}

export async function agentRead(ticketId: string) {
  const repo = await supportRepo()
  const ticket = await repo.updateTicket(ticketId, { agentReadAt: new Date().toISOString() })
  publish({ type: 'ticket', ticket })
  return ticket
}

export function agentTyping(ticketId: string, actor: Actor) {
  publish({ type: 'typing', ticketId, who: 'agent', name: agentName(actor) })
}
