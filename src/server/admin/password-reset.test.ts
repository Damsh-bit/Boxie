import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * "¿Olvidaste tu clave?" del panel: busca la cuenta igual que el login (sin
 * distinguir mayúsculas, solo con rol), nunca le dice a quien lo pide si el
 * mail es de un admin, y deja rastro enmascarado en el log cuando no lo es.
 */

const state = vi.hoisted(() => ({
  row: null as Record<string, unknown> | null,
  filters: [] as { op: string; args: unknown[] }[],
  updates: [] as Record<string, unknown>[],
}))
const mail = vi.hoisted(() => ({ sendMail: vi.fn() }))
const logger = vi.hoisted(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }))

vi.mock('../db/client', () => ({
  escapeIlike: (v: string) => v.replace(/[\\%_]/g, (c) => `\\${c}`),
  serviceDb: () => ({
    from: () => {
      const chain: Record<string, unknown> = {}
      for (const op of ['select', 'ilike', 'not', 'eq']) {
        chain[op] = (...args: unknown[]) => {
          state.filters.push({ op, args })
          return chain
        }
      }
      chain.maybeSingle = async () => ({ data: state.row, error: null })
      chain.update = (values: Record<string, unknown>) => {
        state.updates.push(values)
        return { eq: async () => ({ error: null }) }
      }
      return chain
    },
  }),
}))
vi.mock('../mail/send', () => mail)
vi.mock('../log', () => ({ log: logger }))
vi.mock('../env', () => ({ siteUrl: (path: string) => `https://ribbly.test${path}` }))

const { maskEmail, sendPasswordResetEmail } = await import('./invite')

beforeEach(() => {
  state.row = null
  state.filters.length = 0
  state.updates.length = 0
  vi.clearAllMocks()
})

describe('restablecer la clave del panel', () => {
  it('busca sin distinguir mayúsculas y solo entre cuentas con rol (igual que el login)', async () => {
    await sendPasswordResetEmail('  Dueno@Ribbly.Test ')
    expect(state.filters).toContainEqual({ op: 'ilike', args: ['email', 'dueno@ribbly.test'] })
    expect(state.filters).toContainEqual({ op: 'not', args: ['role', 'is', null] })
  })

  it('con un mail de admin genera el token y manda el mail', async () => {
    state.row = { user_id: 'u1', email: 'dueno@ribbly.test', name: 'Dueño', role: 'owner' }
    const res = await sendPasswordResetEmail('DUENO@ribbly.test')
    expect(res).toEqual({ ok: true })
    expect(state.updates[0]).toHaveProperty('invite_token_hash')
    expect(mail.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'dueno@ribbly.test', tag: 'admin-password-reset' }),
    )
  })

  it('con un mail que no es admin: responde ok, no manda nada y lo deja enmascarado en el log', async () => {
    const res = await sendPasswordResetEmail('alguien@gmail.com')
    expect(res).toEqual({ ok: true })
    expect(mail.sendMail).not.toHaveBeenCalled()
    expect(state.updates).toHaveLength(0)
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('no es de ningún admin'), {
      email: 'alg***@gmail.com',
    })
  })

  it('enmascara mails para los logs', () => {
    expect(maskEmail('santiago@gmail.com')).toBe('san***@gmail.com')
    expect(maskEmail('ab@x.co')).toBe('ab***@x.co')
  })
})
