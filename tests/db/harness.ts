import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'

const ROOT = join(import.meta.dirname, '..', '..')
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations')

export type Role = 'anon' | 'authenticated' | 'service_role'

export interface TestDb {
  pg: PGlite
  /** Ejecuta `fn` con el rol de la API indicado (y el usuario `sub`, si hay). */
  as<T>(role: Role, sub: string | null, fn: () => Promise<T>): Promise<T>
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>
  close(): Promise<void>
}

export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(MIGRATIONS_DIR, f))
}

/** Postgres en memoria con el shim de Supabase y todas las migraciones aplicadas. */
export async function createTestDb(): Promise<TestDb> {
  const pg = await PGlite.create({ extensions: { pgcrypto } })
  await pg.exec(readFileSync(join(import.meta.dirname, 'supabase-shim.sql'), 'utf8'))
  for (const file of migrationFiles()) {
    try {
      await pg.exec(readFileSync(file, 'utf8'))
    } catch (error) {
      throw new Error(`Falló la migración ${file}: ${(error as Error).message}`, { cause: error })
    }
  }

  const query = async <T>(sql: string, params: unknown[] = []) =>
    (await pg.query<T>(sql, params)).rows

  return {
    pg,
    query,
    // Requiere estar dentro de una transacción (los tests abren una por caso).
    // El savepoint permite que un error esperado no aborte el resto del test.
    async as(role, sub, fn) {
      await pg.exec('savepoint as_role')
      await pg.query(`select set_config('request.jwt.claim.sub', $1, true)`, [sub ?? ''])
      await pg.exec(`set local role ${role}`)
      try {
        const result = await fn()
        await pg.exec('reset role')
        await pg.query(`select set_config('request.jwt.claim.sub', '', true)`)
        await pg.exec('release savepoint as_role')
        return result
      } catch (error) {
        await pg.exec('rollback to savepoint as_role')
        await pg.exec('release savepoint as_role')
        throw error
      }
    },
    close: () => pg.close(),
  }
}

/**
 * Datos mínimos para los tests, además del catálogo inicial que cargan las
 * migraciones: un admin, una temática publicada propia, un borrador y un cupón.
 */
export async function seedBasics(db: TestDb) {
  const [admin] = await db.query<{ id: string }>(
    `insert into auth.users (email) values ('admin@boxie.test') returning id`,
  )
  const [buyerUser] = await db.query<{ id: string }>(
    `insert into auth.users (email) values ('nadie@boxie.test') returning id`,
  )
  await db.query(`insert into public.users (user_id, role) values ($1, 'owner')`, [admin!.id])

  const [theme] = await db.query<{ id: string }>(
    `insert into public.themes (slug, name, category) values ('test-tema', 'Tema de prueba', 'Amor') returning id`,
  )
  const [version] = await db.query<{ id: string }>(
    `insert into public.theme_versions (theme_id, version, config) values ($1, 1, '{"slides":[]}') returning id`,
    [theme!.id],
  )
  await db.query(
    `update public.themes set current_version_id = $1, status = 'published' where id = $2`,
    [version!.id, theme!.id],
  )

  const [draft] = await db.query<{ id: string }>(
    `insert into public.themes (slug, name, category) values ('borrador', 'Borrador', 'Amor') returning id`,
  )

  const [coupon] = await db.query<{ id: string }>(
    `insert into public.coupons (code, kind, value) values ('TEST10', 'percent', 10) returning id`,
  )
  await db.query(`update public.settings set base_price_cents = 1500000, gift_lifetime_days = 60`)

  return {
    adminId: admin!.id,
    userId: buyerUser!.id,
    themeId: theme!.id,
    versionId: version!.id,
    draftThemeId: draft!.id,
    couponId: coupon!.id,
  }
}

export type Seed = Awaited<ReturnType<typeof seedBasics>>

export async function createOrder(
  db: TestDb,
  seed: Seed,
  opts: { amount?: number; discount?: number; couponId?: string | null } = {},
) {
  const discount = opts.discount ?? 0
  const list = (opts.amount ?? 1500000) + discount
  const [order] = await db.query<{ id: string }>(
    `insert into public.orders (theme_id, theme_version_id, list_price_cents, discount_cents, amount_cents,
       coupon_id, coupon_code, buyer_name, buyer_email, payment_provider)
     values ($1, $2, $3, $4, $5, $6, $7, 'Leandro Pérez', 'leandro@example.com', 'mercadopago')
     returning id`,
    [
      seed.themeId,
      seed.versionId,
      list,
      discount,
      list - discount,
      opts.couponId ?? null,
      opts.couponId ? 'TEST10' : null,
    ],
  )
  return order!.id
}

let tokenCounter = 0
export function fakeTokens() {
  tokenCounter += 1
  return {
    giftHash: `gift-hash-${tokenCounter}`,
    giftEnc: `gift-enc-${tokenCounter}`,
    editHash: `edit-hash-${tokenCounter}`,
  }
}

export interface ApplyPaymentRow {
  outcome: string
  boxie_id: string | null
  created: boolean
}

export async function applyPayment(
  db: TestDb,
  args: {
    orderId: string
    paymentId: string
    status: string
    amount: number
    currency?: string
    source?: string
  },
) {
  const t = fakeTokens()
  return db.as('service_role', null, async () => {
    const rows = await db.query<ApplyPaymentRow>(
      `select * from public.apply_payment($1, 'mercadopago', $2, $3, $4, $5, $6, '{}'::jsonb, $7, $8, $9)`,
      [
        args.orderId,
        args.paymentId,
        args.status,
        args.amount,
        args.currency ?? 'ARS',
        args.source ?? 'webhook',
        t.giftHash,
        t.giftEnc,
        t.editHash,
      ],
    )
    return rows[0]!
  })
}
