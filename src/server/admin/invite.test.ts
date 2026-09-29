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

  it('exige contraseña de al menos 12 caracteres al activar', async () => {
    const res = await activateMemberAccount('some_token', '1234567890')
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.error).toContain('al menos 12 caracteres')
    }
  })

  it('rechaza invitar al equipo a un correo que ya pertenece a un cliente comprador', async () => {
    const actor = { id: 'admin-1', email: 'owner@boxie.ar', name: 'Owner' }
    const { demoRepo } = await import('./demo/repo')
    const { demoDb } = await import('./demo/store')

    const buyerEmail = demoDb().orders[0]?.buyerEmail
    expect(buyerEmail).toBeDefined()

    // Intentar invitar con un email de comprador existente en demoDb
    await expect(
      demoRepo.inviteMember({ email: buyerEmail!, name: 'Cliente', role: 'support' }, actor),
    ).rejects.toThrow(/pertenece a un cliente/)
  })
})
