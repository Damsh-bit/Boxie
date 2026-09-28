import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createOrder, createTestDb, seedBasics, type Seed, type TestDb } from './harness'

/**
 * Migración de marketing: campañas, resultados diarios (uno por campaña y
 * día), visitas agregadas con su contador atómico, origen de las órdenes y
 * los permisos (anon no ve ni escribe nada; el contador solo lo usa el
 * servidor).
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
/** Con savepoint: un error esperado no aborta la transacción del test. */
const asService = <T>(fn: () => Promise<T>) => db.as('service_role', null, fn)

async function campaign(utm = 'meta-madre-2026') {
  const [row] = await db.query<{ id: string }>(
    `insert into public.marketing_campaigns (name, channel, utm_campaign, starts_on, coupon_id)
     values ('Meta · Madre', 'meta', $1, '2026-09-27', $2) returning id`,
    [utm, seed.couponId],
  )
  return row!.id
}

const track = (step: string, day = '2026-09-27') =>
  db.query(
    `select public.marketing_track($1, 'ig', 'paid_social', 'meta-madre-2026', 'mobile', '/', $2)`,
    [day, step],
  )

describe('marketing', () => {
  it('hay una sola fila de supuestos, con valores por defecto', async () => {
    const rows = await db.query<{ target_margin_bps: number; default_model: string }>(
      `select * from public.marketing_settings`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ target_margin_bps: 2500, default_model: 'last' })
    await expect(
      asService(() => db.query(`insert into public.marketing_settings (id) values (false)`)),
    ).rejects.toThrow()
  })

  it('valida la campaña: canal, nombre para los links y fechas', async () => {
    await campaign()
    await expect(asService(() => campaign())).rejects.toThrow() // utm_campaign único
    await expect(asService(() => campaign('Con Espacios'))).rejects.toThrow()
    await expect(
      asService(() =>
        db.query(
          `insert into public.marketing_campaigns (name, channel, utm_campaign, starts_on)
         values ('X', 'myspace', 'x-1', '2026-01-01')`,
        ),
      ),
    ).rejects.toThrow()
    await expect(
      asService(() =>
        db.query(
          `insert into public.marketing_campaigns (name, channel, utm_campaign, starts_on, ends_on)
         values ('XY', 'meta', 'xy', '2026-02-01', '2026-01-01')`,
        ),
      ),
    ).rejects.toThrow()
  })

  it('un día por campaña: se reemplaza con upsert y se borra con la campaña', async () => {
    const id = await campaign()
    const upsert = (spend: number) =>
      db.query(
        `insert into public.marketing_spend (campaign_id, day, spend_cents, impressions, clicks)
         values ($1, '2026-09-27', $2, 1000, 20)
         on conflict (campaign_id, day) do update set spend_cents = excluded.spend_cents`,
        [id, spend],
      )
    await upsert(100_000)
    await upsert(250_000)
    const rows = await db.query<{ spend_cents: number }>(
      `select spend_cents from public.marketing_spend`,
    )
    expect(rows.map((r) => Number(r.spend_cents))).toEqual([250_000])
    await db.query(`delete from public.marketing_campaigns where id = $1`, [id])
    expect(await db.query(`select 1 from public.marketing_spend`)).toHaveLength(0)
  })

  it('el contador de visitas suma en la misma fila', async () => {
    await asService(async () => {
      await track('session')
      await track('session')
      await track('theme')
      await track('checkout')
    })
    const rows = await db.query<{ sessions: number; theme_views: number; checkouts: number }>(
      `select sessions, theme_views, checkouts from public.marketing_traffic`,
    )
    expect(rows).toEqual([{ sessions: 2, theme_views: 1, checkouts: 1 }])
    await expect(asService(() => track('comprar'))).rejects.toThrow(/Paso desconocido/)
  })

  it('el origen de una orden se guarda una vez y se va con la orden', async () => {
    const orderId = await createOrder(db, seed)
    await db.query(
      `insert into public.order_attribution (order_id, last_source, last_medium, last_campaign, last_landing, last_at, device)
       values ($1, 'ig', 'paid_social', 'meta-madre-2026', '/tematicas/pareja', now(), 'mobile')`,
      [orderId],
    )
    // Ya tiene origen, y un toque sin fecha no vale.
    await expect(
      asService(() =>
        db.query(
          `insert into public.order_attribution (order_id, last_source, last_at) values ($1, 'google', now())`,
          [orderId],
        ),
      ),
    ).rejects.toThrow()
    const other = await createOrder(db, seed)
    await expect(
      asService(() =>
        db.query(
          `insert into public.order_attribution (order_id, last_source) values ($1, 'google')`,
          [other],
        ),
      ),
    ).rejects.toThrow()
    await expect(
      asService(() =>
        db.query(
          `insert into public.order_attribution (order_id, first_landing, first_source, first_at)
           values ($1, '/<script>', 'x', now())`,
          [other],
        ),
      ),
    ).rejects.toThrow()
    await db.query(`delete from public.orders where id = $1`, [orderId])
    expect(await db.query(`select 1 from public.order_attribution`)).toHaveLength(0)
  })

  it('anon no ve ni escribe nada; un usuario sin rol tampoco', async () => {
    await campaign()
    await asService(() => track('session'))
    for (const as of [asAnon, asUser]) {
      for (const table of [
        'marketing_campaigns',
        'marketing_spend',
        'marketing_traffic',
        'order_attribution',
        'marketing_settings',
      ]) {
        const rows = await as(() => db.query(`select * from public.${table}`)).catch(
          () => [] as unknown[],
        )
        expect(rows).toHaveLength(0)
      }
    }
    await expect(asAnon(() => track('session'))).rejects.toThrow()
    await expect(asUser(() => track('session'))).rejects.toThrow()
    await expect(
      asAnon(() =>
        db.query(
          `insert into public.marketing_campaigns (name, channel, utm_campaign, starts_on)
           values ('Hack', 'meta', 'hack', '2026-01-01')`,
        ),
      ),
    ).rejects.toThrow()
  })

  it('un admin lee campañas y visitas', async () => {
    await campaign()
    await asService(() => track('session'))
    expect(await asAdmin(() => db.query(`select * from public.marketing_campaigns`))).toHaveLength(
      1,
    )
    expect(await asAdmin(() => db.query(`select * from public.marketing_traffic`))).toHaveLength(1)
  })
})
