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

describe('muchas claves distintas', () => {
  it('no resetean el límite de una clave que ya está frenada', () => {
    const now = 1_000_000
    const key = 'admin-login-fail:victima@ribbly.test'
    for (let i = 0; i < 5; i++) rateLimit(key, { limit: 5, windowMs: 15 * 60_000 }, now)
    expect(isRateLimited(key, { limit: 5, windowMs: 15 * 60_000 }, now)).toBe(true)

    // Un atacante manda pedidos con 12.000 mails distintos para llenar el mapa.
    for (let i = 0; i < 12_000; i++) {
      rateLimit(`recover:mail:${i}@spam.test`, { limit: 3, windowMs: 60 * 60_000 }, now + 1)
    }
    // Cada espacio de nombres tiene su propio mapa: llenar `recover` no toca el login.
    rateLimit(key, { limit: 5, windowMs: 15 * 60_000 }, now + 2)
    expect(isRateLimited(key, { limit: 5, windowMs: 15 * 60_000 }, now + 2)).toBe(true)
  })
})
