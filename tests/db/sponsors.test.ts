import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createTestDb, seedBasics, type Seed, type TestDb } from './harness'

/**
 * Migración de sponsors: lo que la base no deja guardar (un activo sin
 * lugares, un logo de otro sitio, fechas al revés) y los permisos: anon no ve
 * ni escribe nada (el sitio lee desde el servidor y muestra solo lo público).
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

const insert = (columns: string, values: string) =>
  asService(() => db.query(`insert into public.sponsors (${columns}) values (${values})`))

describe('sponsors', () => {
  it('un contacto nuevo se guarda con lo mínimo', async () => {
    await insert(`name, contact_email, source`, `'Café Martina', 'hola@cafe.com', 'web'`)
    const [row] = await db.query<{ stage: string; placements: string[] }>(
      `select stage, placements from public.sponsors`,
    )
    expect(row).toMatchObject({ stage: 'lead', placements: [] })
  })

  it('un activo tiene que aparecer en algún lugar', async () => {
    await expect(insert(`name, stage`, `'Café Martina', 'activo'`)).rejects.toThrow()
    await insert(`name, stage, placements`, `'Café Martina', 'activo', '{galeria}'`)
  })

  it('valida lugares, links, logo, cupón y fechas', async () => {
    await expect(insert(`name, placements`, `'X', '{portada-gigante}'`)).rejects.toThrow()
    await expect(insert(`name, url`, `'Café', 'http://cafe.com'`)).rejects.toThrow()
    await expect(insert(`name, logo_url`, `'Café', '//otro.com/logo.png'`)).rejects.toThrow()
    await expect(insert(`name, logo_url`, `'Café', 'javascript:alert(1)'`)).rejects.toThrow()
    await expect(insert(`name, coupon_code`, `'Café', 'con espacios'`)).rejects.toThrow()
    await expect(
      insert(`name, starts_on, ends_on`, `'Café', '2026-10-10', '2026-10-01'`),
    ).rejects.toThrow()
    await insert(
      `name, logo_url, url, coupon_code`,
      `'Café', '/brand/cafe.png', 'https://cafe.com', 'MARTINA10'`,
    )
  })

  it('anon no ve ni escribe nada; un usuario sin rol tampoco', async () => {
    await insert(`name, stage, placements`, `'Café Martina', 'activo', '{home}'`)
    for (const as of [asAnon, asUser]) {
      const rows = await as(() => db.query(`select * from public.sponsors`)).catch(
        () => [] as unknown[],
      )
      expect(rows).toHaveLength(0)
    }
    await expect(
      asAnon(() => db.query(`insert into public.sponsors (name) values ('Hack')`)),
    ).rejects.toThrow()
  })

  it('un admin lee y edita', async () => {
    await insert(`name`, `'Café Martina'`)
    await asAdmin(() =>
      db.query(`update public.sponsors set stage = 'conversacion' where name = 'Café Martina'`),
    )
    const rows = await asAdmin(() =>
      db.query<{ stage: string }>(`select stage from public.sponsors`),
    )
    expect(rows).toEqual([{ stage: 'conversacion' }])
  })
})
