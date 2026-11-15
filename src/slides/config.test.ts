import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import {
  collectAssetIds,
  missingForLock,
  parseBuyerContent,
  parseThemeConfig,
  readThemeConfig,
} from './config'
import { arrayElement, getFieldMeta, objectShape } from './fields'
import { ribblyDefinitions } from './ribbly/schemas'
import { initialBuyerProps, SLIDE_KINDS, slideDefinitions } from './schemas'

const SEED_DIR = join(import.meta.dirname, '..', '..', 'supabase', 'seed', 'themes')
const seeds = readdirSync(SEED_DIR).map((f) => JSON.parse(readFileSync(join(SEED_DIR, f), 'utf8')))
const pareja = seeds.find((s) => s.slug === 'pareja')
const amistad = seeds.find((s) => s.slug === 'amistad')
const cumpleanos = seeds.find((s) => s.slug === 'cumpleanos')

describe('registro de slides', () => {
  it.each(SLIDE_KINDS)(
    '%s: la temática funciona sin configurar nada (defaults completos)',
    (kind) => {
      const def = slideDefinitions[kind]
      expect(() => def.themeSchema.parse({})).not.toThrow()
      if (def.buyerSchema) expect(() => (def.buyerSchema as z.ZodType).parse({})).not.toThrow()
    },
  )

  it.each(SLIDE_KINDS)('%s: cada campo de la temática tiene rótulo para el formulario', (kind) => {
    const shape = objectShape(slideDefinitions[kind].themeSchema)!
    for (const [key, schema] of Object.entries(shape)) {
      expect(getFieldMeta(schema)?.label, `${kind}.${key}`).toBeTruthy()
    }
  })

  it('las listas exponen su tipo de ítem para generar el formulario', () => {
    const shape = objectShape(slideDefinitions['game.trivia'].themeSchema)!
    const question = arrayElement(shape.questions!)
    expect(getFieldMeta(question!)?.widget).toBe('group')
    expect(Object.keys(objectShape(question!)!)).toEqual(['question', 'options', 'correct', 'hint'])
  })
})

describe('temáticas iniciales (criterio de aceptación de la Fase 5)', () => {
  it.each(seeds.map((s) => [s.slug, s]))('%s valida contra el registro', (_, seed) => {
    const result = parseThemeConfig(seed.config)
    expect(result.success ? [] : result.issues).toEqual([])
  })

  it('las tres tienen 20 slides', () => {
    for (const seed of seeds) expect(readThemeConfig(seed.config).slides).toHaveLength(20)
  })

  it('cumpleaños usa las 20 pantallas de la base de Ribbly', () => {
    const kinds = readThemeConfig(cumpleanos.config).slides.map((slide) => slide.kind)
    expect(kinds).toEqual(Object.keys(ribblyDefinitions).slice(0, 20))
    // Todas a pantalla completa y con su propio fondo.
    for (const slide of readThemeConfig(cumpleanos.config).slides) {
      expect(slide.frame).toMatchObject({ background: 'none', fullScreen: true })
    }
  })

  it('pareja usa las pantallas de Ribbly: las compartidas con su estilo y las suyas', () => {
    const slides = readThemeConfig(pareja.config).slides
    expect(slides.every((s) => s.kind in ribblyDefinitions)).toBe(true)
    expect(slides.map((s) => s.kind)).toEqual([
      'intro.brand',
      'cover.gift',
      'cover.edition',
      'story.card',
      'story.moments',
      'media.video',
      'media.mix',
      'game.quiz',
      'connector.premiere',
      'media.poster',
      'game.slots',
      'game.vouchers',
      'story.magazine-love',
      'story.wishes',
      'reflect.pause',
      'reflect.diary',
      'game.cookie',
      'story.memory',
      'outro.recap',
      'outro.finale',
    ])
    for (const slide of slides) expect((slide.props as { look: string }).look).toBe('pareja')
  })

  it('cada una usa su portada y sus textos propios', () => {
    const cover = (slug: string) =>
      readThemeConfig(seeds.find((s) => s.slug === slug).config).slides[1]!.kind
    expect(cover('pareja')).toBe('cover.gift')
    expect(cover('amistad')).toBe('cover.friends')
    expect(cover('cumpleanos')).toBe('cover.cake')
  })

  it('el resultado resuelto sobrevive a JSON (se guarda en theme_versions)', () => {
    const resolved = readThemeConfig(pareja.config)
    expect(readThemeConfig(JSON.parse(JSON.stringify(resolved)))).toEqual(resolved)
  })
})

describe('validación de temáticas', () => {
  it('rechaza tipos desconocidos, claves repetidas y props inválidas', () => {
    const result = parseThemeConfig({
      slides: [
        { key: 'a', kind: 'no.existe' },
        { key: 'b', kind: 'intro.logo', props: { tagline: 'x'.repeat(500) } },
        { key: 'b', kind: 'outro.thanks' },
      ],
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.issues.join('\n')).toMatch(/tipo desconocido "no.existe"/)
      expect(result.issues.join('\n')).toMatch(/tagline/)
      expect(result.issues.join('\n')).toMatch(/clave está repetida/)
    }
  })

  it('una temática vacía no se puede publicar', () => {
    expect(parseThemeConfig({ slides: [] }).success).toBe(false)
  })
})

describe('contenido del comprador', () => {
  // Amistad conserva las pantallas del prototipo (dedicatoria con foto, razones, cuponera).
  const config = readThemeConfig(amistad.config)
  const photo = { assetId: '6a9f3c1e-2b4d-4e8f-9a1b-3c5d7e9f1a2b' }

  it('un borrador incompleto se puede guardar', () => {
    const result = parseBuyerContent(config, { recipientName: '', senderName: '', slides: {} })
    expect(result.success).toBe(true)
  })

  it('rechaza lo que no respeta el schema', () => {
    const result = parseBuyerContent(config, {
      recipientName: 'Sofi',
      senderName: 'Lean',
      slides: { dedicatoria: { text: 'x'.repeat(251), photo: { assetId: 'no-es-uuid' } } },
    })
    expect(result.success).toBe(false)
  })

  it('para bloquear exige nombres y las dos fotos (como el modal de revisión del prototipo)', () => {
    const empty = parseBuyerContent(config, { recipientName: '', senderName: '', slides: {} })
    if (!empty.success) throw new Error('debería parsear')
    expect(missingForLock(config, empty.data).map((m) => m.label)).toEqual([
      'Para (destinatario)',
      'De parte de',
      'Foto de la dedicatoria',
      'Foto de la anécdota',
    ])

    const full = parseBuyerContent(config, {
      recipientName: 'Sofi',
      senderName: 'Lean',
      slides: {
        dedicatoria: { photo },
        anecdota: { photo: { assetId: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f' } },
      },
    })
    if (!full.success) throw new Error('debería parsear')
    expect(missingForLock(config, full.data)).toEqual([])
    expect(collectAssetIds(full.data).sort()).toEqual(
      ['0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f', photo.assetId].sort(),
    )
  })

  it('el editor arranca con las sugerencias de la temática', () => {
    const reasons = config.slides.find((s) => s.key === 'razones')!
    expect(
      initialBuyerProps(reasons.kind, reasons.props as Record<string, unknown>).reasons,
    ).toHaveLength(10)
    const coupons = config.slides.find((s) => s.key === 'cuponera')!
    expect(
      initialBuyerProps(coupons.kind, coupons.props as Record<string, unknown>).coupons,
    ).toHaveLength(8)
  })
})
