import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password hashing y verificación', () => {
  it('hashea y verifica correctamente una clave', () => {
    const password = 'super-secret-password-123'
    const hash = hashPassword(password)

    expect(hash).toContain(':')
    const result = verifyPassword(password, hash)
    expect(result.ok).toBe(true)
    expect(result.needsRehash).toBe(false)
  })

  it('rechaza una clave errónea', () => {
    const hash = hashPassword('correct-password')
    const result = verifyPassword('wrong-password', hash)
    expect(result.ok).toBe(false)
  })

  it('rechaza claves que no tienen formato salt:hash (no admite texto plano)', () => {
    const plaintext = 'clave_en_texto_plano'
    const result = verifyPassword(plaintext, plaintext)
    expect(result.ok).toBe(false)
    expect(result.needsRehash).toBe(false)

    const malformed = verifyPassword('password', 'invalid-hash-without-salt')
    expect(malformed.ok).toBe(false)
  })
})
