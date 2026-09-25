import 'server-only'
import type {
  MessageAuthor,
  SupportMessage,
  SupportRating,
  SupportTicket,
  TicketContext,
} from '@/domain/support'
import { serviceDb, unwrap, unwrapMaybe } from '../db/client'
import type { Tables, TablesUpdate } from '../db/database.types'
import { log } from '../log'
import { SupportError, type SupportRepo } from './repo'

/**
 * El soporte sobre Supabase, con el service role: cada ruta ya validó el
 * token del cliente o la sesión del panel. La base igual hace cumplir sus
 * reglas (una consulta cerrada no se reabre, los mensajes no se editan, las
 * notas internas son solo del equipo). Necesita la migración
 * 20260926120000_support.sql.
 */

const db = () => serviceDb()

// Todo menos el hash del token: nunca sale de acá.
const TICKET_COLUMNS =
  'id, number, topic, status, priority, subject, customer_name, customer_email, boxie_code, boxie_id, order_id, assignee, context, rating, first_response_at, resolved_at, last_message_at, last_customer_message_at, last_agent_message_at, customer_read_at, agent_read_at, customer_notified_at, team_notified_at, created_at, updated_at'

type TicketRow = Omit<Tables<'support_tickets'>, 'access_token_hash' | 'access_token_enc'>

function toTicket(r: TicketRow): SupportTicket {
  const context = r.context as TicketContext | null
  return {
    id: r.id,
    number: r.number,
    topic: r.topic,
    status: r.status,
    priority: r.priority,
    subject: r.subject,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    boxieCode: r.boxie_code,
    boxieId: r.boxie_id,
    orderId: r.order_id,
    assignee: r.assignee,
    context: context && Object.keys(context).length ? context : null,
    rating: r.rating as SupportRating | null,
    firstResponseAt: r.first_response_at,
    resolvedAt: r.resolved_at,
    lastMessageAt: r.last_message_at,
    lastCustomerMessageAt: r.last_customer_message_at,
    lastAgentMessageAt: r.last_agent_message_at,
    customerReadAt: r.customer_read_at,
    agentReadAt: r.agent_read_at,
    customerNotifiedAt: r.customer_notified_at,
    teamNotifiedAt: r.team_notified_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toMessage(r: Tables<'support_messages'>): SupportMessage {
  return {
    id: r.id,
    ticketId: r.ticket_id,
    author: r.author as MessageAuthor,
    authorName: r.author_name,
    body: r.body,
    internal: r.internal,
    createdAt: r.created_at,
  }
}

type PgError = { message: string; code?: string } | null

function check(error: PgError, what: string) {
  if (!error) return
  if (error.code === 'P0002') throw new SupportError('La consulta no existe.', 'not_found')
  if (error.code === '23514') throw new SupportError(error.message, 'closed')
  throw new Error(`${what}: ${error.message}`)
}

async function fetchTicket(id: string): Promise<SupportTicket> {
  const row = unwrapMaybe(
    await db().from('support_tickets').select(TICKET_COLUMNS).eq('id', id).maybeSingle(),
    'ticket',
  )
  if (!row) throw new SupportError('La consulta no existe.', 'not_found')
  return toTicket(row)
}

export const supabaseSupportRepo: SupportRepo = {
  mode: 'supabase',

  async createTicket(record) {
    const ticket = toTicket(
      unwrap(
        await db()
          .from('support_tickets')
          .insert({
            topic: record.topic,
            priority: record.priority,
            subject: record.subject,
            customer_name: record.customerName,
            customer_email: record.customerEmail,
            boxie_code: record.boxieCode,
            boxie_id: record.boxieId,
            order_id: record.orderId,
            context: (record.context ?? {}) as Record<string, string>,
            access_token_hash: record.accessTokenHash,
            access_token_enc: record.accessTokenEnc,
          })
          .select(TICKET_COLUMNS)
          .single(),
        'nuevo ticket',
      ),
    )
    const { message } = await this.postMessage({
      ticketId: ticket.id,
      author: 'customer',
      authorName: record.customerName.split(/\s+/)[0]!,
      body: record.body,
    })
    return { ticket: await fetchTicket(ticket.id), message }
  },

  async getTicket(id) {
    const row = unwrapMaybe(
      await db().from('support_tickets').select(TICKET_COLUMNS).eq('id', id).maybeSingle(),
      'ticket',
    )
    return row ? toTicket(row) : null
  },

  async getTicketByTokenHash(hash) {
    const row = unwrapMaybe(
      await db()
        .from('support_tickets')
        .select(TICKET_COLUMNS)
        .eq('access_token_hash', hash)
        .maybeSingle(),
      'ticket',
    )
    return row ? toTicket(row) : null
  },

  async ticketsByTokenHashes(hashes) {
    if (hashes.length === 0) return []
    const rows = unwrap(
      await db()
        .from('support_tickets')
        .select(TICKET_COLUMNS)
        .in('access_token_hash', hashes)
        .order('last_message_at', { ascending: false }),
      'tickets',
    )
    return rows.map(toTicket)
  },

  async listTickets(filter = {}) {
    let query = db()
      .from('support_tickets')
      .select(TICKET_COLUMNS)
      .order('last_message_at', { ascending: false })
      .limit(filter.limit ?? 500)
    if (filter.status === 'active') query = query.in('status', ['open', 'pending'])
    else if (filter.status && filter.status !== 'all') query = query.eq('status', filter.status)
    return unwrap(await query, 'tickets').map(toTicket)
  },

  async listMessages(ticketId) {
    const rows = unwrap(
      await db()
        .from('support_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true }),
      'mensajes',
    )
    return rows.map(toMessage)
  },

  async postMessage(input) {
    // Devuelve una fila (no un conjunto): PostgREST la manda como objeto, como lock_boxie.
    const { data, error } = await db().rpc('support_post_message', {
      p_ticket_id: input.ticketId,
      p_author: input.author,
      p_author_name: input.authorName.slice(0, 80),
      p_body: input.body,
      ...(input.authorEmail ? { p_author_email: input.authorEmail } : {}),
      p_internal: input.author === 'agent' && (input.internal ?? false),
      ...(input.status ? { p_status: input.status } : {}),
    })
    check(error, 'mensaje')
    if (!data) throw new Error('mensaje: la base no devolvió el mensaje')
    const message = toMessage(data)
    return { message, ticket: await fetchTicket(input.ticketId) }
  },

  async updateTicket(id, patch) {
    const update: TablesUpdate<'support_tickets'> = {
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.assignee !== undefined && { assignee: patch.assignee }),
      ...(patch.rating !== undefined && { rating: patch.rating }),
      ...(patch.customerReadAt !== undefined && { customer_read_at: patch.customerReadAt }),
      ...(patch.agentReadAt !== undefined && { agent_read_at: patch.agentReadAt }),
      ...(patch.customerNotifiedAt !== undefined && {
        customer_notified_at: patch.customerNotifiedAt,
      }),
      ...(patch.teamNotifiedAt !== undefined && { team_notified_at: patch.teamNotifiedAt }),
    }
    if (patch.status === 'resolved') update.resolved_at = new Date().toISOString()
    else if (patch.status === 'open' || patch.status === 'pending') update.resolved_at = null
    const row = unwrapMaybe(
      await db()
        .from('support_tickets')
        .update(update)
        .eq('id', id)
        .select(TICKET_COLUMNS)
        .maybeSingle(),
      'ticket',
    )
    if (!row) throw new SupportError('La consulta no existe.', 'not_found')
    return toTicket(row)
  },

  async changesSince(since, scope) {
    let tickets = db().from('support_tickets').select(TICKET_COLUMNS).gte('updated_at', since)
    let messages = db()
      .from('support_messages')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
    if (scope.ticketIds) {
      if (scope.ticketIds.length === 0) return { tickets: [], messages: [] }
      tickets = tickets.in('id', scope.ticketIds)
      messages = messages.in('ticket_id', scope.ticketIds)
    }
    const [t, m] = await Promise.all([tickets.limit(200), messages.limit(500)])
    return {
      tickets: unwrap(t, 'tickets').map(toTicket),
      messages: unwrap(m, 'mensajes').map(toMessage),
    }
  },

  async findBoxieByCode(code) {
    const row = unwrapMaybe(
      await db().from('boxies').select('id, order_id').eq('code', code).maybeSingle(),
      'boxie',
    )
    return row ? { boxieId: row.id, orderId: row.order_id } : null
  },

  async ticketsByEmail(email) {
    const rows = unwrap(
      await db()
        .from('support_tickets')
        .select(TICKET_COLUMNS)
        .ilike(
          'customer_email',
          email.replace(/[\\%_]/g, (c) => `\\${c}`),
        )
        .order('created_at', { ascending: false })
        .limit(50),
      'tickets',
    )
    return rows.map(toTicket)
  },

  async accessTokenEnc(ticketId) {
    const row = unwrapMaybe(
      await db()
        .from('support_tickets')
        .select('access_token_enc')
        .eq('id', ticketId)
        .maybeSingle(),
      'token',
    )
    return row?.access_token_enc ?? null
  },

  async audit(entry) {
    const { error } = await db()
      .from('admin_audit_log')
      .insert({
        actor_id: entry.actorId ?? null,
        actor_email: entry.actorEmail,
        action: entry.action,
        entity: 'ticket',
        entity_id: entry.ticketId,
        summary: entry.summary.slice(0, 300),
      })
    // La bitácora nunca rompe la acción que ya se hizo.
    if (error) log.warn('No se pudo registrar en la bitácora', { error: error.message })
  },
}
