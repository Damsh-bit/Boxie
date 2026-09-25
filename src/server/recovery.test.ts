import { beforeEach, describe, expect, it, vi } from 'vitest'
import { encryptToken, hashToken } from './security/tokens'

/**
 * Recuperar el acceso: con la base simulada (una cadena de supabase-js que
 * responde por tabla) y la bandeja de mails de desarrollo.
 */

const KEY = Buffer.alloc(32, 7).toString('base64')

const state = vi.hoisted(() => ({
  orders: [] as Record<string, unknown>[],
  boxies: [] as Record<string, unknown>[],
  updates: [] as { table: string; values: Record<string, unknown> }[],
  filters: [] as { table: string; op: string; args: unknown[] }[],
}))

vi.mock('./env', () => ({
  env: () => ({ TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64') }),
  siteUrl: (path: string) => `https://boxie.test${path}`,
}))

vi.mock('./db/client', () => {
  function builder(table: string) {
    let update: Record<string, unknown> | null = null
    const result = () => {
      if (update) return { error: null }
      if (table === 'orders') return { data: state.orders, error: null }
      if (table === 'boxies') return { data: state.boxies, error: null }
      return { data: { has_password: true }, error: null }
    }
    const chain: Record<string, unknown> = {}
    for (const op of ['select', 'ilike', 'eq', 'order', 'limit', 'in', 'gt', 'is']) {
      chain[op] = (...args: unknown[]) => {
        state.filters.push({ table, op, args })
        return chain
      }
    }
    chain.update = (values: Record<string, unknown>) => {
      update = values
      state.updates.push({ table, values })
      return chain
    }
    chain.maybeSingle = () => Promise.resolve(result())
    chain.then = (resolve: (v: unknown) => void) => resolve(result())
    return chain
  }
  return { serviceDb: () => ({ from: builder }) }
})

const { devOutbox } = await import('./mail/send')
const { exactIlike, resendAccessByEmail } = await import('./recovery')

beforeEach(() => {
  state.orders = []
  state.boxies = []
  state.updates = []
  state.filters = []
  devOutbox().length = 0
})

const order = { id: 'o1', buyer_name: 'Leandro Pérez', theme: { name: 'Pareja' } }
const future = new Date(Date.now() + 86_400_000).toISOString()

describe('recuperar el acceso', () => {
  it('busca el mail tal cual (sin comodines de LIKE)', () => {
    expect(exactIlike('a_b%c\\d@x.com')).toBe('a\\_b\\%c\\\\d@x.com')
  })

  it('sin compras con ese mail no manda nada', async () => {
    expect(await resendAccessByEmail('nadie@boxie.test')).toEqual({ sent: 0 })
    expect(devOutbox()).toHaveLength(0)
    expect(state.filters).toContainEqual({
      table: 'orders',
      op: 'ilike',
      args: ['buyer_email', 'nadie@boxie.test'],
    })
  })

  it('la que se está editando recibe un link nuevo y el viejo deja de valer', async () => {
    state.orders = [order]
    state.boxies = [
      {
        id: 'b1',
        code: 'K7M2Q9XD',
        order_id: 'o1',
        status: 'active',
        locked_at: null,
        expires_at: future,
        gift_token_enc: encryptToken('x'.repeat(32), KEY),
        recipient_name: 'Sofía',
      },
    ]
    expect(await resendAccessByEmail('leandro@example.com')).toEqual({ sent: 1 })

    const [mail] = devOutbox()
    expect(mail!.to).toBe('leandro@example.com')
    expect(mail!.subject).toBe('Tu nuevo link para editar tu Boxie')
    const token = mail!.text.match(/\/editor\/([A-Za-z0-9_-]{32})/)?.[1]
    expect(token).toBeDefined()
    // Se guardó el hash del token que viajó en el mail (rotación).
    expect(state.updates).toHaveLength(1)
    expect(state.updates[0]!.values.edit_token_hash).toBe(hashToken(token!))
  })

  it('la que ya se regaló recibe el link del regalo, sin tocar el de edición', async () => {
    const gift = 'g'.repeat(32)
    state.orders = [order]
    state.boxies = [
      {
        id: 'b2',
        code: 'P3Q4R5S6',
        order_id: 'o1',
        status: 'active',
        locked_at: new Date().toISOString(),
        expires_at: future,
        gift_token_enc: encryptToken(gift, KEY),
        recipient_name: 'Sofía',
      },
    ]
    expect(await resendAccessByEmail('leandro@example.com')).toEqual({ sent: 1 })
    const [mail] = devOutbox()
    expect(mail!.subject).toBe('El regalo para Sofía está listo 🎁')
    expect(mail!.text).toContain(`https://boxie.test/g/${gift}`)
    expect(mail!.text).toContain('Le pusiste una clave')
    expect(state.updates).toHaveLength(0)
  })
})
