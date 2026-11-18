import { describe, expect, it } from 'vitest'
import { hasTrustedLogin } from './session'

describe('hasTrustedLogin (portal de clientes)', () => {
  it('acepta Google, magic link y OTP: prueban que el mail es de quien entra', () => {
    expect(hasTrustedLogin([{ method: 'oauth', timestamp: 1 }])).toBe(true)
    expect(hasTrustedLogin([{ method: 'magiclink', timestamp: 1 }])).toBe(true)
    expect(hasTrustedLogin([{ method: 'otp', timestamp: 1 }])).toBe(true)
  })

  it('rechaza clave (signUp con el mail de otro) y sesiones anónimas', () => {
    expect(hasTrustedLogin([{ method: 'password', timestamp: 1 }])).toBe(false)
    expect(hasTrustedLogin([{ method: 'anonymous', timestamp: 1 }])).toBe(false)
    expect(hasTrustedLogin([{ method: 'otp' }, { method: 'password' }])).toBe(false)
  })

  it('rechaza claims ausentes o con otra forma', () => {
    expect(hasTrustedLogin(undefined)).toBe(false)
    expect(hasTrustedLogin([])).toBe(false)
    expect(hasTrustedLogin(['otp'])).toBe(false)
  })
})
