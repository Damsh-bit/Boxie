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

const asAnon = <T>(fn: () => Promise<T>) => db.as('anon', null, fn)
const asUser = <T>(fn: () => Promise<T>) => db.as('authenticated', seed.userId, fn)
const asAdmin = <T>(fn: () => Promise<T>) => db.as('authenticated', seed.adminId, fn)

describe('RLS · público (clave anon)', () => {
  it('ve solo las temáticas publicadas', async () => {
    const themes = await asAnon(() =>
      db.query<{ slug: string }>(`select slug from public.themes order by slug`),
    )
    expect(themes.map((t) => t.slug)).toEqual(['amistad', 'cumpleanos', 'pareja', 'test-tema'])
  })

  it('ve las versiones de temáticas publicadas y la configuración', async () => {
    const versions = await asAnon(() =>
      db.query<{ theme_id: string }>(`select theme_id from public.theme_versions`),
    )
    expect(versions).toHaveLength(4)
    expect(versions.some((v) => v.theme_id === seed.draftThemeId)).toBe(false)
    expect(
      await asAnon(() => db.query(`select base_price_cents from public.settings`)),
    ).toHaveLength(1)
  })

  it.each([
    'coupons',
    'orders',
    'payment_events',
    'boxie_content',
    'media_assets',
    'affiliates',
    'users',
  ])('no ve nada de %s', async (table) => {
    expect(await asAnon(() => db.query(`select * from public.${table}`))).toEqual([])
  })

  it('no puede leer Boxies (ni siquiera los tokens hasheados)', async () => {
    await expect(asAnon(() => db.query(`select id from public.boxies`))).rejects.toThrow(
      /permission denied/,
    )
  })

  it('no puede crear órdenes ni cupones', async () => {
    await expect(
      asAnon(() =>
        db.query(
          `insert into public.orders (theme_id, theme_version_id, list_price_cents, amount_cents, buyer_name, buyer_email, payment_provider)
           values ($1, $2, 100, 100, 'Ana', 'ana@example.com', 'fake')`,
          [seed.themeId, seed.versionId],
        ),
      ),
    ).rejects.toThrow(/row-level security/)
    await expect(
      asAnon(() =>
        db.query(
          `insert into public.coupons (code, kind, value) values ('GRATIS', 'percent', 100)`,
        ),
      ),
    ).rejects.toThrow(/row-level security/)
  })

  it('no puede cambiar el precio base', async () => {
    const rows = await asAnon(() =>
      db.query(`update public.settings set base_price_cents = 1 returning base_price_cents`),
    )
    expect(rows).toEqual([])
  })

  it.each([
    ['generate_boxie_code()', []],
    ['lock_boxie($1)', ['00000000-0000-4000-8000-000000000000']],
    ['register_gift_open($1)', ['00000000-0000-4000-8000-000000000000']],
    ["admin_kpis(now() - interval '1 day', now())", []],
    ["publish_theme($1, '{}')", ['00000000-0000-4000-8000-000000000000']],
  ] as const)('no puede ejecutar %s', async (call, params) => {
    await expect(
      asAnon(() => db.query(`select * from public.${call}`, [...params])),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('RLS · usuario autenticado que no es admin', () => {
  it('tiene las mismas restricciones que el público', async () => {
    expect(await asUser(() => db.query(`select * from public.orders`))).toEqual([])
    expect(await asUser(() => db.query(`select * from public.coupons`))).toEqual([])
    expect(await asUser(() => db.query(`select id from public.boxies`))).toEqual([])
    expect(
      await asUser(() => db.query<{ slug: string }>(`select slug from public.themes`)),
    ).toHaveLength(4)
  })

  it('no puede usar las funciones del panel', async () => {
    await expect(
      asUser(() => db.query(`select * from public.admin_kpis(now() - interval '1 day', now())`)),
    ).rejects.toThrow(/forbidden/)
    await expect(
      asUser(() =>
        db.query(`select * from public.publish_theme($1, '{"slides":[]}')`, [seed.themeId]),
      ),
    ).rejects.toThrow(/forbidden/)
  })

  it('no puede darse de alta como admin', async () => {
    await expect(
      asUser(() =>
        db.query(`insert into public.users (user_id, role) values ($1, 'owner')`, [seed.userId]),
      ),
    ).rejects.toThrow(/row-level security/)
  })
})

describe('RLS · admin', () => {
  it('ve borradores, órdenes y cupones', async () => {
    const orderId = await createOrder(db, seed)
    expect(await asAdmin(() => db.query(`select slug from public.themes`))).toHaveLength(5)
    expect(
      await asAdmin(() => db.query(`select id from public.orders where id = $1`, [orderId])),
    ).toHaveLength(1)
    expect(await asAdmin(() => db.query(`select code from public.coupons`))).toHaveLength(6)
  })

  it('gestiona cupones', async () => {
    await asAdmin(() =>
      db.query(
        `insert into public.coupons (code, kind, value, max_uses) values ('NUEVO35', 'percent', 35, 100)`,
      ),
    )
    const rows = await asAdmin(() =>
      db.query<{ active: boolean }>(
        `update public.coupons set active = false where code = 'NUEVO35' returning active`,
      ),
    )
    expect(rows).toEqual([{ active: false }])
  })

  it('ve las Boxies pero nunca los tokens', async () => {
    const orderId = await createOrder(db, seed)
    await applyPayment(db, { orderId, paymentId: 'mp-sec-1', status: 'approved', amount: 1500000 })

    const visible = await asAdmin(() => db.query(`select code, recipient_name from public.boxies`))
    expect(visible).toHaveLength(1)
    await expect(
      asAdmin(() => db.query(`select gift_token_hash from public.boxies`)),
    ).rejects.toThrow(/permission denied/)
    await expect(
      asAdmin(() => db.query(`select edit_token_hash from public.boxies`)),
    ).rejects.toThrow(/permission denied/)
    await expect(
      asAdmin(() => db.query(`update public.boxies set edit_token_hash = 'x'`)),
    ).rejects.toThrow(/permission denied/)
  })

  it('puede corregir el destinatario de una Boxie', async () => {
    const orderId = await createOrder(db, seed)
    const { boxie_id } = await applyPayment(db, {
      orderId,
      paymentId: 'mp-sec-2',
      status: 'approved',
      amount: 1500000,
    })
    const rows = await asAdmin(() =>
      db.query(`update public.boxies set recipient_name = 'Sofi' where id = $1 returning code`, [
        boxie_id,
      ]),
    )
    expect(rows).toHaveLength(1)
  })
})

describe('Inmutabilidad de temáticas', () => {
  it('una versión publicada no se puede editar ni borrar, ni siquiera con el service role', async () => {
    await expect(
      db.as('service_role', null, () =>
        db.query(`update public.theme_versions set config = '{}' where id = $1`, [seed.versionId]),
      ),
    ).rejects.toThrow(/inmutable/)
    await expect(
      db.as('service_role', null, () =>
        db.query(`delete from public.theme_versions where id = $1`, [seed.versionId]),
      ),
    ).rejects.toThrow(/inmutable/)
  })

  it('publicar crea una versión nueva y la deja vigente, sin tocar la anterior', async () => {
    const [v2] = await asAdmin(() =>
      db.query<{ version: number; id: string }>(
        `select * from public.publish_theme($1, '{"slides":[{"kind":"x"}]}')`,
        [seed.themeId],
      ),
    )
    expect(v2!.version).toBe(2)
    const [theme] = await db.query<{ current_version_id: string }>(
      `select current_version_id from public.themes where id = $1`,
      [seed.themeId],
    )
    expect(theme!.current_version_id).toBe(v2!.id)
    const [v1] = await db.query<{ config: unknown }>(
      `select config from public.theme_versions where id = $1`,
      [seed.versionId],
    )
    expect(v1!.config).toEqual({ slides: [] })
  })

  it('publicar un borrador lo pasa a publicado', async () => {
    await asAdmin(() =>
      db.query(`select * from public.publish_theme($1, '{"slides":[]}')`, [seed.draftThemeId]),
    )
    const [theme] = await db.query<{ status: string }>(
      `select status from public.themes where id = $1`,
      [seed.draftThemeId],
    )
    expect(theme!.status).toBe('published')
  })

  it('una temática no puede apuntar a la versión de otra', async () => {
    await expect(
      db.query(`update public.themes set current_version_id = $1 where id = $2`, [
        seed.versionId,
        seed.draftThemeId,
      ]),
    ).rejects.toThrow(/foreign key/)
  })
})

describe('Storage', () => {
  it('crea los buckets con sus límites', async () => {
    const buckets = await db.query<{ id: string; public: boolean }>(
      `select id, public from storage.buckets order by id`,
    )
    expect(buckets).toEqual([
      { id: 'boxie-media', public: false },
      { id: 'theme-assets', public: true },
    ])
  })

  it('solo un admin sube assets de temáticas', async () => {
    await expect(
      asUser(() =>
        db.query(
          `insert into storage.objects (bucket_id, name) values ('theme-assets', 'cs/intro.mp4')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/)
    await asAdmin(() =>
      db.query(
        `insert into storage.objects (bucket_id, name) values ('theme-assets', 'cs/intro.mp4')`,
      ),
    )
  })

  it('nadie con la clave pública lee fotos de compradores', async () => {
    await db.query(
      `insert into storage.objects (bucket_id, name) values ('boxie-media', 'b/1.webp')`,
    )
    expect(await asAnon(() => db.query(`select * from storage.objects`))).toEqual([])
    expect(await asUser(() => db.query(`select * from storage.objects`))).toEqual([])
  })
})

describe('Catálogo inicial', () => {
  it('carga las tres temáticas del prototipo como datos, publicadas y versionadas', async () => {
    const rows = await db.query<{ slug: string; status: string; version: number; slides: number }>(
      `select t.slug, t.status, v.version, jsonb_array_length(v.config -> 'slides') as slides
         from public.themes t join public.theme_versions v on v.id = t.current_version_id
        where t.slug in ('pareja', 'amistad', 'cumpleanos') order by t.sort_order`,
    )
    expect(rows).toEqual([
      { slug: 'pareja', status: 'published', version: 1, slides: 20 },
      { slug: 'cumpleanos', status: 'published', version: 1, slides: 20 },
      { slug: 'amistad', status: 'published', version: 1, slides: 20 },
    ])
  })

  it('LOQUIEROYA25 descuenta 25% y es la oferta de la ficha de producto', async () => {
    const [row] = await db.query<{ value: number; offer: boolean }>(
      `select c.value, s.offer_coupon_id = c.id as offer
         from public.coupons c cross join public.settings s where c.code = 'LOQUIEROYA25'`,
    )
    expect(row).toEqual({ value: 25, offer: true })
  })
})
