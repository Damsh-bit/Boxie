import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  applyPayment,
  createOrder,
  createTestDb,
  seedBasics,
  type Seed,
  type TestDb,
} from './harness'

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

async function orderRow(id: string) {
  const [row] = await db.query<{
    status: string
    paid_at: string | null
    mp_payment_id: string | null
    provider_status: string | null
  }>(`select status, paid_at, mp_payment_id, provider_status from public.orders where id = $1`, [
    id,
  ])
  return row!
}

describe('apply_payment', () => {
  it('un pago aprobado marca la orden como pagada y crea exactamente una Boxie', async () => {
    const orderId = await createOrder(db, seed)
    const result = await applyPayment(db, {
      orderId,
      paymentId: 'mp-1',
      status: 'approved',
      amount: 1500000,
    })

    expect(result.outcome).toBe('paid')
    expect(result.created).toBe(true)
    expect(result.boxie_id).toBeTruthy()

    const order = await orderRow(orderId)
    expect(order.status).toBe('paid')
    expect(order.paid_at).not.toBeNull()
    expect(order.mp_payment_id).toBe('mp-1')

    const boxies = await db.query<{
      code: string
      sender_name: string
      theme_version_id: string
      locked_at: string | null
    }>(
      `select code, sender_name, theme_version_id, locked_at from public.boxies where order_id = $1`,
      [orderId],
    )
    expect(boxies).toHaveLength(1)
    expect(boxies[0]!.code).toMatch(/^[2-9A-HJ-NP-Z]{8}$/)
    // El remitente arranca con el nombre de pila del comprador; la versión es la vendida.
    expect(boxies[0]!.sender_name).toBe('Leandro')
    expect(boxies[0]!.theme_version_id).toBe(seed.versionId)
    expect(boxies[0]!.locked_at).toBeNull()
  })

  it('es idempotente: el mismo aviso repetido no crea una segunda Boxie', async () => {
    const orderId = await createOrder(db, seed)
    const first = await applyPayment(db, {
      orderId,
      paymentId: 'mp-2',
      status: 'approved',
      amount: 1500000,
    })
    const retry = await applyPayment(db, {
      orderId,
      paymentId: 'mp-2',
      status: 'approved',
      amount: 1500000,
    })
    const viaReturn = await applyPayment(db, {
      orderId,
      paymentId: 'mp-2',
      status: 'approved',
      amount: 1500000,
      source: 'return',
    })

    expect(first.outcome).toBe('paid')
    expect(retry).toEqual({ outcome: 'duplicate', boxie_id: first.boxie_id, created: false })
    expect(viaReturn.outcome).toBe('duplicate')

    const [{ count }] = (await db.query<{ count: number }>(
      `select count(*)::int as count from public.boxies where order_id = $1`,
      [orderId],
    )) as [{ count: number }]
    expect(count).toBe(1)
  })

  it('un pendiente seguido de un aprobado procesa ambos estados', async () => {
    const orderId = await createOrder(db, seed)
    const pending = await applyPayment(db, {
      orderId,
      paymentId: 'mp-3',
      status: 'pending',
      amount: 1500000,
    })
    expect(pending.outcome).toBe('recorded')
    expect((await orderRow(orderId)).status).toBe('pending')
    expect((await orderRow(orderId)).provider_status).toBe('pending')

    const approved = await applyPayment(db, {
      orderId,
      paymentId: 'mp-3',
      status: 'approved',
      amount: 1500000,
    })
    expect(approved.outcome).toBe('paid')
  })

  it('un rechazo deja la orden abierta para reintentar el pago', async () => {
    const orderId = await createOrder(db, seed)
    await applyPayment(db, { orderId, paymentId: 'mp-4a', status: 'rejected', amount: 1500000 })
    expect((await orderRow(orderId)).status).toBe('pending')

    const retry = await applyPayment(db, {
      orderId,
      paymentId: 'mp-4b',
      status: 'approved',
      amount: 1500000,
    })
    expect(retry.outcome).toBe('paid')
  })

  it('nunca entrega una Boxie si el monto pagado no coincide con el calculado', async () => {
    const orderId = await createOrder(db, seed)
    const result = await applyPayment(db, {
      orderId,
      paymentId: 'mp-5',
      status: 'approved',
      amount: 100,
    })

    expect(result.outcome).toBe('amount_mismatch')
    expect(result.boxie_id).toBeNull()
    const order = await orderRow(orderId)
    expect(order.status).toBe('pending')
    expect(order.provider_status).toBe('amount_mismatch')
  })

  it('rechaza una moneda distinta', async () => {
    const orderId = await createOrder(db, seed)
    const result = await applyPayment(db, {
      orderId,
      paymentId: 'mp-6',
      status: 'approved',
      amount: 1500000,
      currency: 'USD',
    })
    expect(result.outcome).toBe('amount_mismatch')
  })

  it('detecta un segundo pago de una orden ya pagada', async () => {
    const orderId = await createOrder(db, seed)
    await applyPayment(db, { orderId, paymentId: 'mp-7a', status: 'approved', amount: 1500000 })
    const second = await applyPayment(db, {
      orderId,
      paymentId: 'mp-7b',
      status: 'approved',
      amount: 1500000,
    })
    expect(second.outcome).toBe('double_payment')
    expect(second.created).toBe(false)
  })

  it('suma el uso del cupón solo cuando el pago se aprueba', async () => {
    const orderId = await createOrder(db, seed, {
      amount: 1350000,
      discount: 150000,
      couponId: seed.couponId,
    })
    const usage = async () =>
      (
        await db.query<{ used_count: number }>(
          `select used_count from public.coupons where id = $1`,
          [seed.couponId],
        )
      )[0]!.used_count

    expect(await usage()).toBe(0)
    await applyPayment(db, { orderId, paymentId: 'mp-8', status: 'pending', amount: 1350000 })
    expect(await usage()).toBe(0)
    await applyPayment(db, { orderId, paymentId: 'mp-8', status: 'approved', amount: 1350000 })
    expect(await usage()).toBe(1)
    await applyPayment(db, { orderId, paymentId: 'mp-8', status: 'approved', amount: 1350000 })
    expect(await usage()).toBe(1)
  })

  it('un reembolso de Mercado Pago da de baja la orden y la Boxie', async () => {
    const orderId = await createOrder(db, seed)
    const paid = await applyPayment(db, {
      orderId,
      paymentId: 'mp-9',
      status: 'approved',
      amount: 1500000,
    })
    const refund = await applyPayment(db, {
      orderId,
      paymentId: 'mp-9',
      status: 'refunded',
      amount: 1500000,
    })

    expect(refund.outcome).toBe('refunded')
    expect((await orderRow(orderId)).status).toBe('refunded')
    const [boxie] = await db.query<{ status: string }>(
      `select status from public.boxies where id = $1`,
      [paid.boxie_id],
    )
    expect(boxie!.status).toBe('refunded')
  })

  it('registra el aviso aunque la orden no exista', async () => {
    const result = await applyPayment(db, {
      orderId: '00000000-0000-4000-8000-000000000000',
      paymentId: 'mp-10',
      status: 'approved',
      amount: 1500000,
    })
    expect(result.outcome).toBe('order_not_found')
    const events = await db.query(
      `select * from public.payment_events where provider_payment_id = 'mp-10'`,
    )
    expect(events).toHaveLength(1)
  })

  it('no la puede llamar un cliente con la clave pública', async () => {
    const orderId = await createOrder(db, seed)
    await expect(
      db.as('anon', null, () =>
        db.query(
          `select * from public.apply_payment($1, 'mercadopago', 'x', 'approved', 1500000, 'ARS', 'webhook', '{}', 'a', 'b', 'c')`,
          [orderId],
        ),
      ),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('lock_boxie', () => {
  it('bloquea una sola vez y corre el vencimiento desde el bloqueo', async () => {
    const orderId = await createOrder(db, seed)
    const { boxie_id } = await applyPayment(db, {
      orderId,
      paymentId: 'mp-11',
      status: 'approved',
      amount: 1500000,
    })

    const [locked] = await db.as('service_role', null, () =>
      db.query<{ locked_at: string; expires_at: string }>(`select * from public.lock_boxie($1)`, [
        boxie_id,
      ]),
    )
    expect(locked!.locked_at).toBeTruthy()
    const days =
      (new Date(locked!.expires_at).getTime() - new Date(locked!.locked_at).getTime()) / 86_400_000
    expect(Math.round(days)).toBe(60)

    await expect(
      db.as('service_role', null, () =>
        db.query(`select * from public.lock_boxie($1)`, [boxie_id]),
      ),
    ).rejects.toThrow(/no se puede bloquear/)
  })
})
