import { describe, expect, it } from 'vitest'
import { isRateLimited, rateLimit } from './rate-limit'

describe('límite de pedidos', () => {
  const opts = { limit: 3, windowMs: 60_000 }

  it('deja pasar hasta el límite dentro de la ventana', () => {
    const key = `t-${Math.random()}`
    expect([1, 2, 3, 4].map(() => rateLimit(key, opts, 1_000))).toEqual([true, true, true, false])
    // Pasada la ventana, vuelve a dejar pasar.
    expect(rateLimit(key, opts, 1_000 + 60_001)).toBe(true)
  })

  it('consultar no cuenta como intento (el login limita solo los fallidos)', () => {
    const key = `t-${Math.random()}`
    expect(isRateLimited(key, opts, 1_000)).toBe(false)
    rateLimit(key, opts, 1_000)
    rateLimit(key, opts, 1_000)
    expect(isRateLimited(key, opts, 1_000)).toBe(false)
    rateLimit(key, opts, 1_000)
    expect(isRateLimited(key, opts, 1_000)).toBe(true)
    expect(isRateLimited(key, opts, 1_000 + 60_001)).toBe(false)
  })
})
