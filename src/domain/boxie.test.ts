import { describe, expect, it } from 'vitest'
import {
  daysLeft,
  editorAvailability,
  formatBoxieCode,
  giftAvailability,
  parseBoxieCode,
  type BoxieLifecycle,
} from './boxie'

const NOW = new Date('2026-11-10T12:00:00Z')
const day = 86_400_000

function boxie(overrides: Partial<BoxieLifecycle> = {}): BoxieLifecycle {
  return {
    status: 'active',
    lockedAt: null,
    expiresAt: new Date(NOW.getTime() + 30 * day),
    ...overrides,
  }
}

describe('giftAvailability', () => {
  it('antes de bloquear, el regalo todavía se está preparando', () => {
    expect(giftAvailability(boxie(), NOW)).toBe('not_ready')
  })

  it('bloqueada y vigente, se puede abrir', () => {
    expect(giftAvailability(boxie({ lockedAt: NOW }), NOW)).toBe('available')
  })

  it('vence por fecha aunque el estado guardado siga activo', () => {
    expect(
      giftAvailability(boxie({ lockedAt: NOW, expiresAt: new Date(NOW.getTime() - 1) }), NOW),
    ).toBe('expired')
  })

  it('reembolsada no se muestra, aunque esté vigente', () => {
    expect(giftAvailability(boxie({ lockedAt: NOW, status: 'refunded' }), NOW)).toBe('refunded')
  })
})

describe('editorAvailability', () => {
  it('se edita hasta bloquearla', () => {
    expect(editorAvailability(boxie(), NOW)).toBe('editable')
    expect(editorAvailability(boxie({ lockedAt: NOW }), NOW)).toBe('locked')
  })

  it('una Boxie sin bloquear cuya ventana de edición pasó está vencida', () => {
    expect(editorAvailability(boxie({ expiresAt: new Date(NOW.getTime() - day) }), NOW)).toBe(
      'expired',
    )
  })

  it('reembolsada gana sobre todo', () => {
    expect(editorAvailability(boxie({ status: 'refunded' }), NOW)).toBe('refunded')
  })
})

describe('daysLeft', () => {
  it('redondea hacia arriba y nunca es negativo', () => {
    expect(daysLeft(boxie({ expiresAt: new Date(NOW.getTime() + 1.2 * day) }), NOW)).toBe(2)
    expect(daysLeft(boxie({ expiresAt: new Date(NOW.getTime() - day) }), NOW)).toBe(0)
  })
})

describe('código de soporte', () => {
  it('se formatea y se parsea tolerando guiones, espacios y minúsculas', () => {
    expect(formatBoxieCode('K7M2Q9XD')).toBe('K7M2-Q9XD')
    expect(parseBoxieCode('k7m2-q9xd')).toBe('K7M2Q9XD')
    expect(parseBoxieCode('K7M2 Q9XD')).toBe('K7M2Q9XD')
  })

  it('rechaza caracteres ambiguos que el generador nunca usa', () => {
    expect(parseBoxieCode('K7M2-Q9X0')).toBeNull()
    expect(parseBoxieCode('BOX-1234')).toBeNull()
  })
})
