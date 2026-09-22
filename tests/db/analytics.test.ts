import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyPayment, createOrder, createTestDb, seedBasics, type Seed, type TestDb } from './harness'

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

const asAdmin = <T>(fn: () => Promise<T>) => db.as('authenticated', seed.adminId, fn)
const range = [`now() - interval '7 days'`, `now() + interval '1 day'`].join(', ')

async function paidOrder(paymentId: string, opts: { amount?: number; discount?: number; couponId?: string } = {}) {
  const orderId = await createOrder(db, seed, opts)
  const result = await applyPayment(db, { orderId, paymentId, status: 'approved', amount: opts.amount ?? 1500000 })
  expect(result.outcome).toBe('paid')
  return result
}

describe('analítica del panel', () => {
  it('KPIs: facturación, ticket promedio y conversión del checkout', async () => {
    await paidOrder('a1')
    await paidOrder('a2', { amount: 1350000, discount: 150000, couponId: seed.couponId })
    await createOrder(db, seed) // abandonada

    const [kpis] = await asAdmin(() => db.query<Record<string, number>>(`select * from public.admin_kpis(${range})`))
    expect(kpis).toMatchObject({
      orders_created: 3,
      orders_paid: 2,
      revenue_cents: 2850000,
      discount_cents: 150000,
      avg_ticket_cents: 1425000,
      boxies_locked: 0,
      gifts_opened: 0,
    })
  })

  it('ranking de temáticas y de cupones', async () => {
    await paidOrder('b1')
    await paidOrder('b2', { amount: 1350000, discount: 150000, couponId: seed.couponId })

    const themes = await asAdmin(() => db.query(`select theme_name, orders_paid, revenue_cents from public.admin_theme_ranking(${range})`))
    expect(themes).toEqual([{ theme_name: 'Tema de prueba', orders_paid: 2, revenue_cents: 2850000 }])

    const coupons = await asAdmin(() => db.query(`select code, uses, discount_cents from public.admin_coupon_ranking(${range})`))
    expect(coupons).toEqual([{ code: 'TEST10', uses: 1, discount_cents: 150000 }])
  })

  it('ventas por día devuelve todos los días del período, con ceros', async () => {
    await paidOrder('c1')
    const days = await asAdmin(() =>
      db.query<{ orders_paid: number }>(`select * from public.admin_sales_by_day(now() - interval '3 days', now() + interval '1 minute')`),
    )
    expect(days.length).toBeGreaterThanOrEqual(3)
    expect(days.reduce((sum, d) => sum + Number(d.orders_paid), 0)).toBe(1)
  })

  it('cuenta las Boxies abiertas por el destinatario', async () => {
    const { boxie_id } = await paidOrder('d1')
    await db.as('service_role', null, async () => {
      await db.query(`select public.register_gift_open($1)`, [boxie_id])
      await db.query(`select public.register_gift_open($1)`, [boxie_id])
    })
    const [kpis] = await asAdmin(() => db.query<{ gifts_opened: number }>(`select gifts_opened from public.admin_kpis(${range})`))
    expect(kpis!.gifts_opened).toBe(1)
    const [boxie] = await db.query<{ open_count: number }>(`select open_count from public.boxies where id = $1`, [boxie_id])
    expect(boxie!.open_count).toBe(2)
  })
})
