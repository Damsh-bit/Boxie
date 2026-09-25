import { createHash, randomBytes } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, seedBasics, type Seed, type TestDb } from './harness'

/**
 * Migración de soporte: tickets, mensajes, la función que publica un mensaje
 * y actualiza el ticket en una sola operación, su RLS, y la configuración que
 * la tienda (anon) ya no puede leer entera.
 */

let db: TestDb
let seed: Seed

beforeAll(async () => {
  db = await createTestDb()
  seed = await seedBasics(db)
})
afterAll(() => db.close())

beforeEach(async () => {
  await db.query('begin')
  return async () => {
    await db.query('rollback')
  }
})

const asAnon = <T>(fn: () => Promise<T>) => db.as('anon', null, fn)
const asUser = <T>(fn: () => Promise<T>) => db.as('authenticated', seed.userId, fn)
const asAdmin = <T>(fn: () => Promise<T>) => db.as('authenticated', seed.adminId, fn)
const asService = <T>(fn: () => Promise<T>) => db.as('service_role', null, fn)

const tokenHash = () => createHash('sha256').update(randomBytes(24)).digest('hex')

interface TicketRow {
  id: string
  number: number
  status: string
  first_response_at: string | null
  last_customer_message_at: string | null
  last_agent_message_at: string | null
  agent_read_at: string | null
  customer_read_at: string | null
  resolved_at: string | null
  last_message_at: string
}

async function openTicket(opts: { topic?: string; code?: string | null } = {}) {
  const [row] = await db.query<{ id: string; number: number }>(
    `insert into public.support_tickets
       (topic, subject, customer_name, customer_email, boxie_code, access_token_hash)
     values ($1, 'No puedo entrar al editor', 'Sofía', 'sofi@example.com', $2, $3)
     returning id, number`,
    [opts.topic ?? 'boxie', opts.code ?? null, tokenHash()],
  )
  return row!
}

function post(
  ticketId: string,
  author: 'customer' | 'agent' | 'system',
  body: string,
  opts: { internal?: boolean; status?: string | null } = {},
) {
  return db.query<{ id: string; internal: boolean }>(
    `select * from public.support_post_message($1, $2, $3, $4, $5, $6, $7)`,
    [
      ticketId,
      author,
      author === 'agent' ? 'Lean · Boxie' : 'Sofía',
      body,
      author === 'agent' ? 'lean@boxie.test' : null,
      opts.internal ?? false,
      opts.status ?? null,
    ],
  )
}

const ticketRow = async (id: string) =>
  (await db.query<TicketRow>(`select * from public.support_tickets where id = $1`, [id]))[0]!

describe('tickets', () => {
  it('se numeran correlativos desde #1001', async () => {
    const a = await openTicket()
    const b = await openTicket()
    expect(a.number).toBeGreaterThanOrEqual(1001)
    expect(b.number).toBe(a.number + 1)
  })

  it('validan el código de la Boxie y el hash del token', async () => {
    // Con savepoint (asService): un error esperado no aborta la transacción del test.
    const fails = (fn: () => Promise<unknown>) =>
      expect(asService(fn)).rejects.toThrow(/check constraint/)
    await fails(() => openTicket({ code: 'K7M2-Q9XD' }))
    await fails(() => openTicket({ code: 'K7M2Q9X0' }))
    expect((await openTicket({ code: 'K7M2Q9XD' })).id).toBeTruthy()
    await fails(() =>
      db.query(
        `insert into public.support_tickets (topic, subject, customer_name, customer_email, access_token_hash)
         values ('otro', 'Hola', 'Sofía', 'sofi@example.com', 'no-es-un-hash')`,
      ),
    )
  })
})

describe('support_post_message', () => {
  it('el mensaje del cliente deja el ticket del lado del equipo', async () => {
    const { id } = await openTicket()
    await asService(() => post(id, 'customer', 'No me llegó el mail'))
    const t = await ticketRow(id)
    expect(t.status).toBe('open')
    expect(t.last_customer_message_at).not.toBeNull()
    expect(t.customer_read_at).toEqual(t.last_customer_message_at)
    expect(t.first_response_at).toBeNull()
  })

  it('la respuesta del equipo espera al cliente y registra la primera respuesta una sola vez', async () => {
    const { id } = await openTicket()
    await asService(() => post(id, 'customer', 'Hola'))
    await asService(() => post(id, 'agent', '¡Hola Sofía! Ya lo revisamos'))
    const first = await ticketRow(id)
    expect(first.status).toBe('pending')
    expect(first.first_response_at).not.toBeNull()
    expect(first.agent_read_at).toEqual(first.last_agent_message_at)

    await asService(() => post(id, 'customer', 'Gracias'))
    await asService(() => post(id, 'agent', 'Listo, te reenviamos el link', { status: 'resolved' }))
    const second = await ticketRow(id)
    expect(second.first_response_at).toEqual(first.first_response_at)
    expect(second.status).toBe('resolved')
    expect(second.resolved_at).not.toBeNull()
  })

  it('una nota interna no cambia el estado ni cuenta como respuesta', async () => {
    const { id } = await openTicket()
    await asService(() => post(id, 'customer', 'Hola'))
    const before = await ticketRow(id)
    const [note] = await asService(() =>
      post(id, 'agent', 'Revisar el pago en MP', { internal: true }),
    )
    expect(note!.internal).toBe(true)
    const after = await ticketRow(id)
    expect(after.status).toBe('open')
    expect(after.first_response_at).toBeNull()
    expect(after.last_agent_message_at).toBeNull()
    expect(after.last_message_at).toEqual(before.last_message_at)
  })

  it('el cliente reabre una resuelta, pero no una cerrada', async () => {
    const { id } = await openTicket()
    await asService(() => post(id, 'agent', 'Resuelto', { status: 'resolved' }))
    await asService(() => post(id, 'customer', 'Me pasa de nuevo'))
    const reopened = await ticketRow(id)
    expect(reopened.status).toBe('open')
    expect(reopened.resolved_at).toBeNull()

    await db.query(`update public.support_tickets set status = 'closed' where id = $1`, [id])
    await expect(asService(() => post(id, 'customer', '¿Hola?'))).rejects.toThrow(/cerrada/)
  })

  it('solo las del equipo pueden ser internas, y los mensajes no se editan', async () => {
    const { id } = await openTicket()
    await expect(
      asService(() => post(id, 'customer', 'Secreto', { internal: true })),
    ).rejects.toThrow(/support_messages_internal_agents/)
    const [message] = await asService(() => post(id, 'customer', 'Hola'))
    await expect(
      asService(() =>
        db.query(`update public.support_messages set body = 'otra cosa' where id = $1`, [
          message!.id,
        ]),
      ),
    ).rejects.toThrow(/no se editan/)
  })

  it('un ticket que no existe se rechaza', async () => {
    await expect(
      asService(() => post('00000000-0000-4000-8000-000000000000', 'customer', 'Hola')),
    ).rejects.toThrow(/no existe/)
  })
})

describe('RLS y permisos', () => {
  it('anon no ve, no crea y no puede publicar mensajes', async () => {
    const { id } = await openTicket()
    await expect(asAnon(() => db.query(`select id from public.support_tickets`))).rejects.toThrow(
      /permission denied/,
    )
    await expect(
      asAnon(() =>
        db.query(
          `insert into public.support_tickets (topic, subject, customer_name, customer_email, access_token_hash)
           values ('otro', 'Hola', 'X', 'x@y.z', $1)`,
          [tokenHash()],
        ),
      ),
    ).rejects.toThrow(/permission denied/)
    await expect(asAnon(() => post(id, 'customer', 'Hola'))).rejects.toThrow(/permission denied/)
    await expect(asAnon(() => db.query(`select id from public.support_messages`))).rejects.toThrow(
      /permission denied/,
    )
  })

  it('un usuario común no ve nada; el equipo ve todo menos el hash del token', async () => {
    const { id } = await openTicket()
    await asService(() => post(id, 'customer', 'Hola'))
    expect(await asUser(() => db.query(`select id from public.support_tickets`))).toEqual([])
    expect(await asUser(() => db.query(`select id from public.support_messages`))).toEqual([])
    await expect(asUser(() => post(id, 'agent', 'Hola'))).rejects.toThrow(/forbidden/)

    const visible = await asAdmin(() =>
      db.query<{ id: string }>(`select id, status, customer_email from public.support_tickets`),
    )
    expect(visible.map((t) => t.id)).toContain(id)
    await expect(
      asAdmin(() => db.query(`select access_token_hash from public.support_tickets`)),
    ).rejects.toThrow(/permission denied/)
  })

  it('un admin responde con la función y cambia el estado', async () => {
    const { id } = await openTicket()
    await asAdmin(() => post(id, 'agent', 'Te ayudo'))
    expect((await ticketRow(id)).status).toBe('pending')
    await asAdmin(() =>
      db.query(`update public.support_tickets set priority = 'alta' where id = $1`, [id]),
    )
    expect(
      (
        await db.query<{ priority: string }>(
          `select priority from public.support_tickets where id = $1`,
          [id],
        )
      )[0]!.priority,
    ).toBe('alta')
  })
})

describe('configuración pública', () => {
  it('la tienda lee precio, días, pausa y datos del negocio', async () => {
    const [row] = await asAnon(() =>
      db.query<{ base_price_cents: number; sales_paused: boolean; support_email: string }>(
        `select base_price_cents, gift_lifetime_days, currency, sales_paused, business_name,
                support_email, whatsapp, instagram from public.settings`,
      ),
    )
    expect(row!.base_price_cents).toBe(1500000)
    expect(row!.sales_paused).toBe(false)
  })

  it('pero no la rentabilidad (comisiones, impuestos, meta del mes)', async () => {
    for (const column of ['monthly_goal_cents', 'gateway_fee_bps', 'offer_coupon_id', '*']) {
      await expect(asAnon(() => db.query(`select ${column} from public.settings`))).rejects.toThrow(
        /permission denied/,
      )
    }
    // El servidor (service role) y el panel siguen leyendo todo.
    const [all] = await asService(() =>
      db.query<{ monthly_goal_cents: string }>(`select * from public.settings`),
    )
    expect(all).toHaveProperty('monthly_goal_cents')
  })
})
