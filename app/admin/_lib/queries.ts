import 'server-only'
import { inRange, type DateRange } from '@/domain/admin/range'
import type { AdminBoxie, AdminOrder } from '@/domain/admin/types'
import { parseBoxieCode } from '@/domain/boxie'

/**
 * Filtros de las listas del panel (ventas, Boxies), compartidos por las
 * páginas y la exportación a CSV. Con la base conectada se traducen a
 * consultas; las reglas son las mismas.
 */

const strip = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

export const PAGE_SIZE = 25

export type OrderFilter = 'paid' | 'pending' | 'refunded' | 'cancelled' | 'revisar'

export interface OrderQuery {
  q: string
  estado: string
  tematica: string
  plan: string
  cupon: string
  range: DateRange
}

export function matchOrderStatus(o: AdminOrder, estado: string): boolean {
  switch (estado) {
    case 'paid':
    case 'refunded':
    case 'cancelled':
      return o.status === estado
    case 'pending':
      return o.status === 'pending' && o.providerStatus !== 'amount_mismatch'
    case 'revisar':
      return o.providerStatus === 'amount_mismatch'
    default:
      return true
  }
}

export function filterOrders(orders: readonly AdminOrder[], query: OrderQuery): AdminOrder[] {
  const q = strip(query.q.trim())
  return orders
    .filter(
      (o) =>
        // "Revisar" muestra todos los pagos con problemas, sin importar la fecha.
        (query.estado === 'revisar' || inRange(o.createdAt, query.range)) &&
        matchOrderStatus(o, query.estado) &&
        (!query.tematica || o.themeId === query.tematica) &&
        (!query.plan || o.planId === query.plan) &&
        (!query.cupon || o.couponCode === query.cupon) &&
        (!q ||
          strip(
            `${o.buyerName} ${o.buyerEmail} ${o.buyerPhone ?? ''} ${o.couponCode ?? ''}`,
          ).includes(q) ||
          o.id.startsWith(q) ||
          o.mpPaymentId === q),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function paginate<T>(list: readonly T[], pageParam: string) {
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, Number.parseInt(pageParam, 10) || 1), pages)
  return {
    page,
    pages,
    total: list.length,
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  }
}

export type BoxieFilter =
  'new' | 'editing' | 'gifted' | 'opened' | 'expired' | 'refunded' | 'por-vencer'

/** Búsqueda de soporte: por código (con o sin guion), mail del comprador o destinatario. */
export function filterBoxies(
  boxies: readonly AdminBoxie[],
  orders: ReadonlyMap<string, AdminOrder>,
  query: { q: string; estado: string; stageOf(b: AdminBoxie): string },
): AdminBoxie[] {
  const raw = query.q.trim()
  const code = parseBoxieCode(raw)
  const q = strip(raw)
  const soon = Date.now() + 5 * 86_400_000
  return boxies
    .filter((b) => {
      if (query.estado === 'por-vencer') {
        if (b.status !== 'active' || b.lockedAt) return false
        const t = Date.parse(b.expiresAt)
        if (t <= Date.now() || t > soon) return false
      } else if (query.estado && query.stageOf(b) !== query.estado) return false
      if (!raw) return true
      if (code && b.code === code) return true
      const order = orders.get(b.orderId)
      return strip(
        `${b.code} ${b.recipientName} ${b.senderName} ${order?.buyerEmail ?? ''} ${order?.buyerName ?? ''}`,
      ).includes(q)
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Una celda de CSV (comillas, separador ; para Excel en español). */
export function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value)
  // Evita que Excel interprete fórmulas en datos que escribió un comprador.
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return `﻿${[header, ...rows].map((r) => r.map(csvCell).join(';')).join('\r\n')}\r\n`
}
