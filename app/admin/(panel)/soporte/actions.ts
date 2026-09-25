'use server'

import type { SupportMessage, SupportTicket } from '@/domain/support'
import type { AdminOrder } from '@/domain/admin/types'
import { SupportError } from '@/server/support/repo'
import {
  agentConversation,
  agentTickets,
  agentRead,
  agentReply,
  agentUpdate,
} from '@/server/support/service'
import { AdminRepoError } from '@/server/admin/repo'
import { runAction, SUPPORT_ROLES } from '../../_lib/action'

/**
 * Acciones de la bandeja de soporte. Solo dueño, administrador y soporte.
 * No revalidan páginas: la bandeja se actualiza en vivo (stream).
 */

const options = { roles: SUPPORT_ROLES, revalidate: [] }

/** Un error de la regla de soporte se muestra como el de cualquier acción del panel. */
async function translate<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof SupportError) throw new AdminRepoError(error.message)
    throw error
  }
}

export interface TicketDetail {
  ticket: SupportTicket
  messages: SupportMessage[]
  history: SupportTicket[]
  /** La Boxie vinculada (por el código que escribió el cliente). */
  boxie: {
    id: string
    code: string
    status: string
    recipientName: string
    lockedAt: string | null
    expiresAt: string
    openCount: number
    theme: string | null
    plan: string | null
  } | null
  /** Las compras de ese mail (para saber con quién se habla). */
  orders: Pick<AdminOrder, 'id' | 'status' | 'amountCents' | 'createdAt' | 'providerStatus'>[]
}

/** Abre una consulta: conversación completa, historial del cliente y su Boxie; la marca leída. */
export async function openTicket(ticketId: string) {
  return runAction<TicketDetail>(options, ({ repo }) =>
    translate(async () => {
      const conversation = await agentConversation(ticketId)
      const [read, boxie, dataset] = await Promise.all([
        agentRead(ticketId),
        conversation.ticket.boxieId ? repo.getBoxie(conversation.ticket.boxieId) : null,
        repo.dataset(),
      ])
      const email = conversation.ticket.customerEmail.toLowerCase()
      return {
        data: {
          ...conversation,
          ticket: read,
          boxie: boxie
            ? {
                id: boxie.boxie.id,
                code: boxie.boxie.code,
                status: boxie.boxie.status,
                recipientName: boxie.boxie.recipientName,
                lockedAt: boxie.boxie.lockedAt,
                expiresAt: boxie.boxie.expiresAt,
                openCount: boxie.boxie.openCount,
                theme: boxie.theme?.name ?? null,
                plan: boxie.plan?.name ?? null,
              }
            : null,
          orders: dataset.orders
            .filter((o) => o.buyerEmail.toLowerCase() === email)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .slice(0, 8)
            .map((o) => ({
              id: o.id,
              status: o.status,
              amountCents: o.amountCents,
              createdAt: o.createdAt,
              providerStatus: o.providerStatus,
            })),
        },
      }
    }),
  )
}

export async function replyTicket(input: unknown) {
  return runAction<{ message: SupportMessage; ticket: SupportTicket }>(options, ({ actor }) =>
    translate(async () => ({ data: await agentReply(actor, input), message: 'Enviado' })),
  )
}

export async function updateTicket(input: unknown) {
  return runAction<SupportTicket>(options, ({ actor }) =>
    translate(async () => ({
      data: await agentUpdate(actor, input),
      message: 'Consulta actualizada',
    })),
  )
}

export async function markTicketRead(ticketId: string) {
  return runAction<SupportTicket>(options, () =>
    translate(async () => ({ data: await agentRead(ticketId) })),
  )
}

/** La bandeja completa (al reconectar el stream, para ponerse al día). */
export async function loadTickets() {
  return runAction<SupportTicket[]>(options, () =>
    translate(async () => ({ data: await agentTickets({ status: 'all', limit: 500 }) })),
  )
}
