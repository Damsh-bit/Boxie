import { describe, expect, it } from 'vitest'
import { activateMemberAccount, getInviteDetails } from './invite'

describe('flujo de invitaciones de equipo', () => {
  it('rechaza tokens cortos o vacíos inmediatamente', async () => {
    const resShort = await getInviteDetails('abc')
    expect(resShort.ok).toBe(false)
    if (!resShort.ok) {
      expect(resShort.error).toContain('inválido')
    }

    const resEmpty = await getInviteDetails('')
    expect(resEmpty.ok).toBe(false)
  })

  it('exige contraseña de al menos 8 caracteres al activar', async () => {
    const res = await activateMemberAccount('some_token', '12345')
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toContain('al menos 8 caracteres')
    }
  })
})
