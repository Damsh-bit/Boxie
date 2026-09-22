import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { collectAssetIds, missingForLock, parseBuyerContent, parseThemeConfig, readThemeConfig } from './config'
import { arrayElement, getFieldMeta, objectShape } from './fields'
import { initialBuyerProps, SLIDE_KINDS, slideDefinitions } from './schemas'

const SEED_DIR = join(import.meta.dirname, '..', '..', 'supabase', 'seed', 'themes')
const seeds = readdirSync(SEED_DIR).map((f) => JSON.parse(readFileSync(join(SEED_DIR, f), 'utf8')))
const pareja = seeds.find((s) => s.slug === 'pareja')

describe('registro de slides', () => {
  it.each(SLIDE_KINDS)('%s: la temática funciona sin configurar nada (defaults completos)', (kind) => {
    const def = slideDefinitions[kind]
    expect(() => def.themeSchema.parse({})).not.toThrow()
    if (def.buyerSchema) expect(() => (def.buyerSchema as z.ZodType).parse({})).not.toThrow()
  })

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

  it('las tres tienen las 20 slides del prototipo en el mismo orden', () => {
    const kinds = seeds.map((s) => readThemeConfig(s.config).slides.map((slide) => slide.kind.split('.')[0]))
    for (const k of kinds) expect(k).toHaveLength(20)
    expect(new Set(kinds.map((k) => k.join()))).toHaveProperty('size', 1)
  })

  it('cada una usa su portada y sus textos propios', () => {
    const cover = (slug: string) => readThemeConfig(seeds.find((s) => s.slug === slug).config).slides[1]!.kind
    expect(cover('pareja')).toBe('cover.recipient')
    expect(cover('amistad')).toBe('cover.friends')
    expect(cover('cumpleanos')).toBe('cover.birthday')
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
  const config = readThemeConfig(pareja.config)
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
      slides: { dedicatoria: { photo }, anecdota: { photo: { assetId: '0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f' } } },
    })
    if (!full.success) throw new Error('debería parsear')
    expect(missingForLock(config, full.data)).toEqual([])
    expect(collectAssetIds(full.data).sort()).toEqual(['0c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f', photo.assetId].sort())
  })

  it('el editor arranca con las sugerencias de la temática', () => {
    const reasons = config.slides.find((s) => s.key === 'razones')!
    expect(initialBuyerProps(reasons.kind, reasons.props as Record<string, unknown>).reasons).toHaveLength(10)
    const coupons = config.slides.find((s) => s.key === 'cuponera')!
    expect(initialBuyerProps(coupons.kind, coupons.props as Record<string, unknown>).coupons).toHaveLength(8)
  })
})
