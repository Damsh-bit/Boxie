import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  applyPayment,
  createOrder,
  createTestDb,
  seedBasics,
  type Seed,
  type TestDb,
} from './harness'

/**
 * Migración del panel (admin_backoffice): planes, gastos, bitácora, tareas y
 * roles del equipo, con su RLS.
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

async function insertPlan(
  slug: string,
  rank: number,
  opts: { active?: boolean; highlighted?: boolean } = {},
) {
  const [plan] = await db.query<{ id: string }>(
    `insert into public.plans (slug, name, price_cents, rank, active, highlighted)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [
      slug,
      slug.toUpperCase(),
      rank * 100_000,
      rank,
      opts.active ?? true,
      opts.highlighted ?? false,
    ],
  )
  return plan!.id
}

describe('planes', () => {
  it('la tienda (anon) ve solo los activos y no puede escribir', async () => {
    await insertPlan('esencial', 1)
    await insertPlan('viejo', 2, { active: false })
    const visible = await asAnon(() =>
      db.query<{ slug: string }>(`select slug from public.plans order by slug`),
    )
    expect(visible.map((p) => p.slug)).toEqual(['esencial'])
    await expect(
      asAnon(() =>
        db.query(
          `insert into public.plans (slug, name, price_cents, rank) values ('x', 'XX', 1, 1)`,
        ),
      ),
    ).rejects.toThrow()
  })

  it('un admin los crea y edita; un usuario común no', async () => {
    await asAdmin(() =>
      db.query(
        `insert into public.plans (slug, name, price_cents, rank) values ('premium', 'Premium', 799000, 3)`,
      ),
    )
    await expect(
      asUser(() =>
        db.query(
          `insert into public.plans (slug, name, price_cents, rank) values ('trucho', 'Trucho', 1, 1)`,
        ),
      ),
    ).rejects.toThrow()
    const updated = await asUser(() =>
      db.query(`update public.plans set price_cents = 1 where slug = 'premium' returning id`),
    )
    expect(updated).toEqual([])
  })

  it('valida precio tachado mayor al precio y un solo destacado', async () => {
    await expect(
      asService(() =>
        db.query(
          `insert into public.plans (slug, name, price_cents, compare_at_cents, rank) values ('a', 'AA', 500, 400, 1)`,
        ),
      ),
    ).rejects.toThrow()
    await insertPlan('uno', 1, { highlighted: true })
    await expect(asService(() => insertPlan('dos', 2, { highlighted: true }))).rejects.toThrow()
  })

  it('la orden guarda el plan y un plan con ventas no se borra', async () => {
    const planId = await insertPlan('clasica', 2)
    const orderId = await createOrder(db, seed)
    await db.query(`update public.orders set plan_id = $1 where id = $2`, [planId, orderId])
    const paid = await applyPayment(db, {
      orderId,
      paymentId: 'plan-1',
      status: 'approved',
      amount: 1500000,
    })
    expect(paid.outcome).toBe('paid')
    await expect(
      asService(() => db.query(`delete from public.plans where id = $1`, [planId])),
    ).rejects.toThrow()
    const ranking = await asAdmin(() =>
      db.query<{ plan_name: string; orders_paid: number }>(
        `select * from public.admin_plan_ranking(now() - interval '1 day', now() + interval '1 day')`,
      ),
    )
    expect(ranking[0]?.plan_name).toBe('CLASICA')
    expect(Number(ranking[0]?.orders_paid)).toBe(1)
  })

  it('la analítica por plan es solo para admins', async () => {
    await expect(
      asUser(() =>
        db.query(`select * from public.admin_plan_ranking(now() - interval '1 day', now())`),
      ),
    ).rejects.toThrow(/forbidden/)
  })
})

describe('gastos, tareas y bitácora', () => {
  it.each(['expenses', 'admin_tasks', 'admin_audit_log'])(
    '%s: anon y usuarios comunes no ven nada',
    async (table) => {
      expect(await asAnon(() => db.query(`select * from public.${table}`))).toEqual([])
      expect(await asUser(() => db.query(`select * from public.${table}`))).toEqual([])
    },
  )

  it('un gasto único no tiene fecha de fin', async () => {
    await expect(
      asService(() =>
        db.query(
          `insert into public.expenses (category, description, amount_cents, recurrence, starts_on, ends_on)
           values ('marketing', 'Campaña', 1000, 'once', '2026-09-01', '2026-09-30')`,
        ),
      ),
    ).rejects.toThrow()
    await asAdmin(() =>
      db.query(
        `insert into public.expenses (category, description, amount_cents, recurrence, starts_on)
         values ('infraestructura', 'Hosting', 2400000, 'monthly', '2026-01-01')`,
      ),
    )
    expect(await asAdmin(() => db.query(`select * from public.expenses`))).toHaveLength(1)
  })

  it('la bitácora se escribe a nombre propio y no se puede editar ni borrar', async () => {
    await asAdmin(() =>
      db.query(
        `insert into public.admin_audit_log (actor_id, actor_email, action, entity, summary)
         values ($1, 'admin@boxie.test', 'coupon.create', 'coupon', 'Creó un cupón')`,
        [seed.adminId],
      ),
    )
    await expect(
      asAdmin(() =>
        db.query(
          `insert into public.admin_audit_log (actor_id, actor_email, action, entity, summary)
           values ($1, 'otro@boxie.test', 'x', 'x', 'A nombre de otro')`,
          [seed.userId],
        ),
      ),
    ).rejects.toThrow()
    await expect(
      asService(() => db.query(`update public.admin_audit_log set summary = 'cambiado'`)),
    ).rejects.toThrow(/inmutable/)
    await expect(asService(() => db.query(`delete from public.admin_audit_log`))).rejects.toThrow(
      /inmutable/,
    )
  })

  it('las tareas las maneja cualquier admin', async () => {
    const rows = await asAdmin(() =>
      db.query<{ id: string }>(
        `insert into public.admin_tasks (title, tags) values ('Publicar Navidad', '{temáticas}') returning id`,
      ),
    )
    await asAdmin(() =>
      db.query(`update public.admin_tasks set status = 'done' where id = $1`, [rows[0]!.id]),
    )
    const [task] = await asAdmin(() =>
      db.query<{ status: string }>(`select status from public.admin_tasks`),
    )
    expect(task?.status).toBe('done')
  })
})

describe('equipo y configuración', () => {
  it('el primer admin queda como dueño y no se puede quedar el equipo sin dueño', async () => {
    const [me] = await asAdmin(() =>
      db.query<{ role: string }>(`select public.admin_role() as role`),
    )
    expect(me?.role).toBe('owner')
    await expect(
      asAdmin(() =>
        db.query(`update public.admin_users set role = 'admin' where user_id = $1`, [seed.adminId]),
      ),
    ).rejects.toThrow(/dueño/)
  })

  it('solo el dueño suma gente al equipo', async () => {
    await asAdmin(() =>
      db.query(
        `insert into public.admin_users (user_id, email, name, role) values ($1, 'nadie@boxie.test', 'Nadie', 'support')`,
        [seed.userId],
      ),
    )
    // El que se sumó con rol soporte no puede promoverse.
    const promoted = await asUser(() =>
      db.query(
        `update public.admin_users set role = 'owner' where user_id = $1 returning user_id`,
        [seed.userId],
      ),
    )
    expect(promoted).toEqual([])
  })

  it('la configuración trae los parámetros de rentabilidad con valores por defecto', async () => {
    const [row] = await db.query<{
      gateway_fee_bps: number
      sales_paused: boolean
      business_name: string
    }>(`select gateway_fee_bps, sales_paused, business_name from public.settings`)
    expect(row).toEqual({
      gateway_fee_bps: 629,
      sales_paused: false,
      business_name: 'Boxie Digital',
    })
  })

  it('las temáticas iniciales quedan marcadas como semilla', async () => {
    const rows = await db.query<{ slug: string; origin: string }>(
      `select slug, origin from public.themes where slug in ('pareja', 'test-tema') order by slug`,
    )
    expect(rows).toEqual([
      { slug: 'pareja', origin: 'seed' },
      { slug: 'test-tema', origin: 'manual' },
    ])
  })
})
