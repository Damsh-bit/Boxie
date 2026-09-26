import { isOverdue, type SupportTicket } from '@/domain/support'
import type {
  AdminBoxie,
  AdminCoupon,
  AdminOrder,
  AdminTask,
  AdminThemeSummary,
} from '@/domain/admin/types'

/**
 * Los indicadores del menú: cuánto trabajo espera en cada sección y qué tan
 * urgente es. `critical` pide atención ya, `warning` conviene mirarlo hoy e
 * `info` es algo pendiente sin apuro.
 */
export type BadgeTone = 'critical' | 'warning' | 'info'

export interface NavBadgeInfo {
  count: number
  tone: BadgeTone
  /** Para lectores de pantalla y el tooltip ("3 consultas por responder"). */
  label: string
}

export type NavBadges = Partial<Record<string, NavBadgeInfo>>

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function navBadges(input: {
  orders?: readonly AdminOrder[]
  boxies?: readonly AdminBoxie[]
  coupons?: readonly AdminCoupon[]
  themes?: readonly Pick<AdminThemeSummary, 'status'>[]
  tickets?: readonly SupportTicket[]
  tasks?: readonly AdminTask[]
  me?: string
  now?: Date
}): NavBadges {
  const now = input.now ?? new Date()
  const out: NavBadges = {}

  if (input.tickets) {
    const open = input.tickets.filter((t) => t.status === 'open')
    const late = open.filter((t) => isOverdue(t, now)).length
    if (open.length)
      out['/admin/soporte'] = {
        count: open.length,
        tone: late ? 'critical' : 'warning',
        label:
          plural(open.length, 'consulta por responder', 'consultas por responder') +
          (late ? ` (${late} ${late === 1 ? 'atrasada' : 'atrasadas'})` : ''),
      }
  }

  if (input.orders) {
    const mismatch = input.orders.filter((o) => o.providerStatus === 'amount_mismatch').length
    if (mismatch)
      out['/admin/ventas'] = {
        count: mismatch,
        tone: 'critical',
        label: plural(mismatch, 'pago para revisar', 'pagos para revisar'),
      }
    const day = now.getTime() - 86_400_000
    const abandoned = input.orders.filter(
      (o) =>
        o.status === 'pending' &&
        new Date(o.createdAt).getTime() > day &&
        now.getTime() - new Date(o.createdAt).getTime() > 30 * 60_000,
    ).length
    if (abandoned)
      out['/admin/clientes'] = {
        count: abandoned,
        tone: 'info',
        label: plural(abandoned, 'compra abandonada hoy', 'compras abandonadas hoy'),
      }
  }

  if (input.boxies) {
    const soon = now.getTime() + 5 * 86_400_000
    const closing = input.boxies.filter((b) => {
      const at = new Date(b.expiresAt).getTime()
      return b.status === 'active' && !b.lockedAt && at > now.getTime() && at <= soon
    }).length
    if (closing)
      out['/admin/boxies'] = {
        count: closing,
        tone: 'warning',
        label: plural(closing, 'Boxie por vencer', 'Boxies por vencer'),
      }
  }

  if (input.coupons) {
    let empty = 0
    let low = 0
    for (const c of input.coupons) {
      if (!c.active || c.maxUses === null) continue
      const left = c.maxUses - c.usedCount
      if (left <= 0) empty++
      else if (left / c.maxUses <= 0.1) low++
    }
    if (empty + low)
      out['/admin/cupones'] = {
        count: empty + low,
        tone: empty ? 'warning' : 'info',
        label: plural(
          empty + low,
          'cupón agotado o por agotarse',
          'cupones agotados o por agotarse',
        ),
      }
  }

  if (input.themes) {
    const drafts = input.themes.filter((t) => t.status === 'draft').length
    if (drafts)
      out['/admin/tematicas'] = {
        count: drafts,
        tone: 'info',
        label: plural(drafts, 'temática en borrador', 'temáticas en borrador'),
      }
  }

  if (input.tasks && input.me) {
    const today = now.toISOString().slice(0, 10)
    const mine = input.tasks.filter((t) => t.status !== 'done' && t.assignee === input.me)
    const late = mine.filter((t) => t.dueOn !== null && t.dueOn < today).length
    if (mine.length)
      out['/admin/tareas'] = {
        count: mine.length,
        tone: late ? 'critical' : mine.some((t) => t.priority === 'alta') ? 'warning' : 'info',
        label:
          plural(mine.length, 'tarea asignada a vos', 'tareas asignadas a vos') +
          (late ? ` (${late} ${late === 1 ? 'vencida' : 'vencidas'})` : ''),
      }
  }

  return out
}

const RANK: Record<BadgeTone, number> = { critical: 0, warning: 1, info: 2 }

/** El tono más urgente de una lista (para el punto de un grupo o del botón de menú). */
export function worstTone(badges: (NavBadgeInfo | undefined)[]): BadgeTone | null {
  let worst: BadgeTone | null = null
  for (const b of badges)
    if (b && b.count > 0 && (worst === null || RANK[b.tone] < RANK[worst])) worst = b.tone
  return worst
}
