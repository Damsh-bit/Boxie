/**
 * Ciclo de vida de una Boxie.
 *
 *   pago aprobado ──► editable ──(bloquear)──► regalo disponible ──► vencido
 *                        │                          │
 *                        └────────── reembolsada ◄──┘
 *
 * El vencimiento se calcula al leer (no depende de un cron): una Boxie cuyo
 * `expiresAt` pasó está vencida aunque su estado guardado siga en `active`.
 * Antes del bloqueo, `expiresAt` es el fin de la ventana de edición; después,
 * el fin de la vida del regalo (60 días desde que se bloquea, configurable).
 */

export type StoredBoxieStatus = 'active' | 'refunded' | 'expired'

export interface BoxieLifecycle {
  status: StoredBoxieStatus
  lockedAt: Date | null
  expiresAt: Date
}

export type GiftAvailability = 'available' | 'not_ready' | 'expired' | 'refunded'
export type EditorAvailability = 'editable' | 'locked' | 'expired' | 'refunded'

export function isExpired(b: BoxieLifecycle, now: Date): boolean {
  return b.status === 'expired' || b.expiresAt.getTime() <= now.getTime()
}

/** Qué ve el destinatario al abrir el link. */
export function giftAvailability(b: BoxieLifecycle, now: Date): GiftAvailability {
  if (b.status === 'refunded') return 'refunded'
  if (isExpired(b, now)) return 'expired'
  if (!b.lockedAt) return 'not_ready'
  return 'available'
}

/** Qué ve el comprador al entrar al editor. */
export function editorAvailability(b: BoxieLifecycle, now: Date): EditorAvailability {
  if (b.status === 'refunded') return 'refunded'
  if (b.lockedAt) return isExpired(b, now) ? 'expired' : 'locked'
  if (isExpired(b, now)) return 'expired'
  return 'editable'
}

export function daysLeft(b: BoxieLifecycle, now: Date): number {
  return Math.max(0, Math.ceil((b.expiresAt.getTime() - now.getTime()) / 86_400_000))
}

/** "K7M2Q9XD" → "K7M2-Q9XD", para leerlo por teléfono. */
export function formatBoxieCode(code: string): string {
  return code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code
}

/** Acepta "k7m2-q9xd", "K7M2 Q9XD", etc. */
export function parseBoxieCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^0-9A-Z]/g, '')
  return /^[2-9A-HJ-NP-Z]{8}$/.test(code) ? code : null
}
