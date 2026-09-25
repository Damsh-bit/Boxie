import 'server-only'
import { randomUUID } from 'node:crypto'
import {
  statusAfterAgentMessage,
  statusAfterCustomerMessage,
  SupportRuleError,
  type SupportMessage,
  type SupportStatus,
  type SupportTicket,
} from '@/domain/support'
import type { DemoDb, DemoSupport } from '../admin/demo/seed'
import { demoDb, mutateDemoDb } from '../admin/demo/store'
import { seedSupport } from './demo-seed'
import { SupportError, type SupportRepo, type TicketPatch } from './repo'

/**
 * El soporte sobre la base de demo (en memoria), con las mismas reglas que la
 * función `support_post_message` de la base real.
 */

type DemoTicket = DemoSupport['tickets'][number]

/** La base de soporte de la demo; la primera vez, con conversaciones de muestra. */
function support(db: DemoDb): DemoSupport {
  db.support ??= seedSupport(db)
  return db.support
}

function withSupport<T>(fn: (s: DemoSupport, db: DemoDb) => T): T {
  return mutateDemoDb((db) => fn(support(db), db))
}

/** Sin el hash del token: lo que sale del repositorio. */
function publicTicket({
  accessTokenHash: _hash,
  accessTokenEnc: _enc,
  ...ticket
}: DemoTicket): SupportTicket {
  return { ...ticket }
}

function find(s: DemoSupport, id: string): DemoTicket {
  const ticket = s.tickets.find((t) => t.id === id)
  if (!ticket) throw new SupportError('La consulta no existe.', 'not_found')
  return ticket
}

const now = () => new Date().toISOString()

export const demoSupportRepo: SupportRepo = {
  mode: 'demo',

  async createTicket(record) {
    return withSupport((s) => {
      const createdAt = now()
      const ticket: DemoTicket = {
        id: randomUUID(),
        number: s.nextNumber++,
        topic: record.topic,
        status: 'open',
        priority: record.priority,
        subject: record.subject,
        customerName: record.customerName,
        customerEmail: record.customerEmail,
        boxieCode: record.boxieCode,
        boxieId: record.boxieId,
        orderId: record.orderId,
        assignee: null,
        context: record.context,
        rating: null,
        firstResponseAt: null,
        resolvedAt: null,
        lastMessageAt: createdAt,
        lastCustomerMessageAt: createdAt,
        lastAgentMessageAt: null,
        customerReadAt: createdAt,
        agentReadAt: null,
        customerNotifiedAt: null,
        teamNotifiedAt: null,
        createdAt,
        updatedAt: createdAt,
        accessTokenHash: record.accessTokenHash,
        accessTokenEnc: record.accessTokenEnc,
      }
      const message: SupportMessage = {
        id: randomUUID(),
        ticketId: ticket.id,
        author: 'customer',
        authorName: record.customerName.split(/\s+/)[0]!,
        body: record.body,
        internal: false,
        createdAt,
      }
      s.tickets.push(ticket)
      s.messages.push(message)
      return { ticket: publicTicket(ticket), message }
    })
  },

  async getTicket(id) {
    const ticket = support(demoDb()).tickets.find((t) => t.id === id)
    return ticket ? publicTicket(ticket) : null
  },

  async getTicketByTokenHash(hash) {
    const ticket = support(demoDb()).tickets.find((t) => t.accessTokenHash === hash)
    return ticket ? publicTicket(ticket) : null
  },

  async ticketsByTokenHashes(hashes) {
    const set = new Set(hashes)
    return support(demoDb())
      .tickets.filter((t) => set.has(t.accessTokenHash))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .map(publicTicket)
  },

  async listTickets(filter = {}) {
    const status = filter.status ?? 'all'
    return support(demoDb())
      .tickets.filter((t) =>
        status === 'all'
          ? true
          : status === 'active'
            ? t.status === 'open' || t.status === 'pending'
            : t.status === status,
      )
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
      .slice(0, filter.limit ?? 500)
      .map(publicTicket)
  },

  async listMessages(ticketId) {
    return support(demoDb())
      .messages.filter((m) => m.ticketId === ticketId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  },

  async postMessage(input) {
    return withSupport((s) => {
      const ticket = find(s, input.ticketId)
      let status: SupportStatus
      try {
        status =
          input.author === 'customer'
            ? statusAfterCustomerMessage(ticket.status)
            : input.author === 'agent'
              ? statusAfterAgentMessage(ticket.status, input.internal ?? false, input.status)
              : (input.status ?? ticket.status)
      } catch (error) {
        if (error instanceof SupportRuleError) throw new SupportError(error.message, 'closed')
        throw error
      }
      const createdAt = now()
      const internal = input.author === 'agent' && (input.internal ?? false)
      const message: SupportMessage = {
        id: randomUUID(),
        ticketId: ticket.id,
        author: input.author,
        authorName: input.authorName,
        body: input.body,
        internal,
        createdAt,
      }
      s.messages.push(message)

      ticket.status = status
      if (!internal) ticket.lastMessageAt = createdAt
      if (input.author === 'customer') {
        ticket.lastCustomerMessageAt = createdAt
        ticket.customerReadAt = createdAt
      }
      if (input.author === 'agent') {
        ticket.agentReadAt = createdAt
        if (!internal) {
          ticket.lastAgentMessageAt = createdAt
          ticket.firstResponseAt ??= createdAt
        }
      }
      if (status === 'resolved') ticket.resolvedAt ??= createdAt
      else if (status === 'open' || status === 'pending') ticket.resolvedAt = null
      ticket.updatedAt = createdAt
      return { message, ticket: publicTicket(ticket) }
    })
  },

  async updateTicket(id, patch: TicketPatch) {
    return withSupport((s) => {
      const ticket = find(s, id)
      Object.assign(ticket, patch)
      if (patch.status === 'resolved') ticket.resolvedAt ??= now()
      else if (patch.status === 'open' || patch.status === 'pending') ticket.resolvedAt = null
      ticket.updatedAt = now()
      return publicTicket(ticket)
    })
  },

  async changesSince(since, scope) {
    const s = support(demoDb())
    const ids = scope.ticketIds ? new Set(scope.ticketIds) : null
    return {
      tickets: s.tickets
        .filter((t) => t.updatedAt >= since && (!ids || ids.has(t.id)))
        .map(publicTicket),
      messages: s.messages.filter((m) => m.createdAt >= since && (!ids || ids.has(m.ticketId))),
    }
  },

  async findBoxieByCode(code) {
    const boxie = demoDb().boxies.find((b) => b.code === code)
    return boxie ? { boxieId: boxie.id, orderId: boxie.orderId } : null
  },

  async ticketsByEmail(email) {
    const target = email.trim().toLowerCase()
    return support(demoDb())
      .tickets.filter((t) => t.customerEmail.toLowerCase() === target)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(publicTicket)
  },

  async accessTokenEnc(ticketId) {
    return support(demoDb()).tickets.find((t) => t.id === ticketId)?.accessTokenEnc ?? null
  },

  async audit(entry) {
    mutateDemoDb((db) => {
      db.audit.unshift({
        id: randomUUID(),
        at: now(),
        actor: entry.actorEmail,
        action: entry.action,
        entity: 'ticket',
        entityId: entry.ticketId,
        summary: entry.summary.slice(0, 300),
      })
      if (db.audit.length > 500) db.audit.length = 500
    })
  },
}
