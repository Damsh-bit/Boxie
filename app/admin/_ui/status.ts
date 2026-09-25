import type { AdminBoxie, AdminOrder, ThemeStatus } from '@/domain/admin/types'
import type { Tone } from './primitives'

/** Estados con nombre y color (siempre con texto: el color nunca va solo). */

export function orderStatus(o: Pick<AdminOrder, 'status' | 'providerStatus'>): {
  label: string
  tone: Tone
} {
  if (o.providerStatus === 'amount_mismatch') return { label: 'Revisar pago', tone: 'critical' }
  switch (o.status) {
    case 'paid':
      return { label: 'Pagada', tone: 'good' }
    case 'refunded':
      return { label: 'Reembolsada', tone: 'violet' }
    case 'cancelled':
      return { label: 'Cancelada', tone: 'neutral' }
    case 'pending':
      return o.providerStatus === 'rejected'
        ? { label: 'Rechazada', tone: 'neutral' }
        : { label: 'Pendiente', tone: 'warning' }
  }
}

export type BoxieStage = 'refunded' | 'expired' | 'opened' | 'gifted' | 'editing' | 'new'

export function boxieStage(
  b: Pick<AdminBoxie, 'status' | 'expiresAt' | 'lockedAt' | 'firstOpenedAt' | 'lastEditedAt'>,
  now = Date.now(),
): BoxieStage {
  if (b.status === 'refunded') return 'refunded'
  if (b.status === 'expired' || Date.parse(b.expiresAt) <= now) return 'expired'
  if (b.lockedAt) return b.firstOpenedAt ? 'opened' : 'gifted'
  return b.lastEditedAt ? 'editing' : 'new'
}

export const BOXIE_STAGE: Record<BoxieStage, { label: string; tone: Tone; hint: string }> = {
  new: { label: 'Sin empezar', tone: 'neutral', hint: 'Pagada, el comprador todavía no la editó' },
  editing: { label: 'En edición', tone: 'warning', hint: 'El comprador la está armando' },
  gifted: { label: 'Regalada', tone: 'info', hint: 'Bloqueada y enviada, sin abrir todavía' },
  opened: { label: 'Abierta', tone: 'good', hint: 'El destinatario ya la abrió' },
  expired: { label: 'Vencida', tone: 'neutral', hint: 'Pasó su fecha de vencimiento' },
  refunded: { label: 'Reembolsada', tone: 'violet', hint: 'Se devolvió el dinero' },
}

export const THEME_STATUS: Record<ThemeStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Borrador', tone: 'warning' },
  published: { label: 'A la venta', tone: 'good' },
  archived: { label: 'Archivada', tone: 'neutral' },
}
