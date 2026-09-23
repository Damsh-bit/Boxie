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

let paymentCounter = 0
async function paidBoxie(): Promise<string> {
  paymentCounter += 1
  const orderId = await createOrder(db, seed)
  const result = await applyPayment(db, {
    orderId,
    paymentId: `editor-${paymentCounter}`,
    status: 'approved',
    amount: 1500000,
  })
  return result.boxie_id!
}

const asService = <T>(fn: () => Promise<T>) => db.as('service_role', null, fn)

function save(boxieId: string, slides: unknown, names = { recipient: 'Sofía', sender: 'Lean' }) {
  return asService(() =>
    db.query<{ save_boxie_content: string }>(
      `select public.save_boxie_content($1, $2, $3, $4::jsonb)`,
      [boxieId, names.recipient, names.sender, JSON.stringify(slides)],
    ),
  )
}

async function content(boxieId: string) {
  const rows = await db.query<{ slide_key: string; props: Record<string, unknown> }>(
    `select slide_key, props from public.boxie_content where boxie_id = $1 order by slide_key`,
    [boxieId],
  )
  return Object.fromEntries(rows.map((r) => [r.slide_key, r.props]))
}

describe('save_boxie_content', () => {
  it('guarda los nombres y el contenido de cada slide en una sola llamada', async () => {
    const boxieId = await paidBoxie()
    await save(boxieId, {
      dedicatoria: { text: 'Te quiero', photo: null },
      cancion: { youtubeUrl: 'https://youtu.be/450p7goxZqg', songTitle: 'All of Me' },
    })

    const [boxie] = await db.query<{ recipient_name: string; sender_name: string }>(
      `select recipient_name, sender_name from public.boxies where id = $1`,
      [boxieId],
    )
    expect(boxie).toEqual({ recipient_name: 'Sofía', sender_name: 'Lean' })
    expect(await content(boxieId)).toEqual({
      cancion: { youtubeUrl: 'https://youtu.be/450p7goxZqg', songTitle: 'All of Me' },
      dedicatoria: { text: 'Te quiero', photo: null },
    })
  })

  it('un segundo guardado reemplaza lo que cambió y no toca las otras slides', async () => {
    const boxieId = await paidBoxie()
    await save(boxieId, { dedicatoria: { text: 'Primera versión' }, razones: { reasons: ['Una'] } })
    await save(boxieId, { dedicatoria: { text: 'Segunda versión' } })

    expect(await content(boxieId)).toEqual({
      dedicatoria: { text: 'Segunda versión' },
      razones: { reasons: ['Una'] },
    })
  })

  it('no edita una Boxie bloqueada', async () => {
    const boxieId = await paidBoxie()
    await asService(() => db.query(`select public.lock_boxie($1)`, [boxieId]))
    await expect(save(boxieId, { dedicatoria: { text: 'Tarde' } })).rejects.toThrow(
      /ya no se puede editar/,
    )
  })

  it('no edita una Boxie vencida ni una reembolsada', async () => {
    const vencida = await paidBoxie()
    await db.query(
      `update public.boxies set expires_at = now() - interval '1 minute' where id = $1`,
      [vencida],
    )
    await expect(save(vencida, {})).rejects.toThrow(/ya no se puede editar/)

    const reembolsada = await paidBoxie()
    await db.query(`update public.boxies set status = 'refunded' where id = $1`, [reembolsada])
    await expect(save(reembolsada, {})).rejects.toThrow(/ya no se puede editar/)
  })

  it('rechaza contenido que no es un objeto por slide', async () => {
    const boxieId = await paidBoxie()
    await expect(save(boxieId, ['no', 'es', 'un', 'objeto'])).rejects.toThrow(
      /un objeto con una clave por slide/,
    )
    await expect(save(boxieId, { dedicatoria: 'texto suelto' })).rejects.toThrow(/no es un objeto/)
  })

  it('respeta el formato de las claves de slide y el largo de los nombres', async () => {
    const boxieId = await paidBoxie()
    await expect(save(boxieId, { 'Clave Inválida': {} })).rejects.toThrow(/check constraint/)
    await expect(save(boxieId, {}, { recipient: 'x'.repeat(41), sender: 'Lean' })).rejects.toThrow(
      /check constraint/,
    )
  })

  it('una Boxie inexistente da error', async () => {
    await expect(save('00000000-0000-4000-8000-000000000000', {})).rejects.toThrow(
      /Boxie inexistente/,
    )
  })

  it.each(['anon', 'authenticated'] as const)('%s no puede llamarla', async (role) => {
    const boxieId = await paidBoxie()
    await expect(
      db.as(role, role === 'authenticated' ? seed.adminId : null, () =>
        db.query(`select public.save_boxie_content($1, 'a', 'b', '{}'::jsonb)`, [boxieId]),
      ),
    ).rejects.toThrow(/permission denied/)
  })
})

describe('fotos del comprador (media_assets)', () => {
  // Como las registra el servidor: con el service role.
  function addMedia(owner: 'boxie' | 'theme', ownerId: string, bucket: string, path: string) {
    return asService(() =>
      db.query(
        `insert into public.media_assets (owner_type, owner_id, bucket, path, mime, bytes)
         values ($1, $2, $3, $4, 'image/webp', 1000)`,
        [owner, ownerId, bucket, path],
      ),
    )
  }
  const addPhoto = (boxieId: string, path: string) =>
    addMedia('boxie', boxieId, 'boxie-media', path)

  it('solo se registran dentro de la carpeta de su Boxie', async () => {
    const mine = await paidBoxie()
    const other = await paidBoxie()
    await expect(addPhoto(mine, `boxies/${mine}/foto.webp`)).resolves.toBeDefined()
    await expect(addPhoto(mine, `boxies/${other}/foto.webp`)).rejects.toThrow(
      /media_assets_boxie_path/,
    )
    await expect(
      addMedia('boxie', mine, 'theme-assets', `boxies/${mine}/otra.webp`),
    ).rejects.toThrow(/media_assets_boxie_path/)
  })

  it('las de temáticas no tienen esa restricción', async () => {
    await expect(
      addMedia('theme', seed.themeId, 'theme-assets', 'pareja/portada.webp'),
    ).resolves.toBeDefined()
  })

  it('tienen un tope de 30 por Boxie', async () => {
    const boxieId = await paidBoxie()
    for (let i = 0; i < 30; i++) await addPhoto(boxieId, `boxies/${boxieId}/${i}.webp`)
    await expect(addPhoto(boxieId, `boxies/${boxieId}/31.webp`)).rejects.toThrow(/máximo de fotos/)
  })
})
