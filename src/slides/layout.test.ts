import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { missingForLock, parseBuyerContent, readThemeConfig, styleAxesOf } from './config'
import { initialDraft } from './editor/draft'
import {
  clampPlacement,
  LAYOUT_FIELD,
  placementCss,
  readLayout,
  withLayout,
  type SlideLayout,
} from './layout'
import { slideDefinitions } from './schemas'
import type { SlideDefinition } from './types'

const seed = (slug: string) =>
  readThemeConfig(
    JSON.parse(readFileSync(join(process.cwd(), 'supabase/seed/themes', `${slug}.json`), 'utf8'))
      .config,
  )

describe('maqueta: mover, agrandar y sin fotos', () => {
  it('lee con tolerancia: lo que no valida se ignora y lo neutro no se guarda', () => {
    expect(readLayout(undefined)).toEqual({ piezas: {}, sinFotos: false })
    expect(readLayout({ [LAYOUT_FIELD]: 'cualquier cosa' })).toEqual({
      piezas: {},
      sinFotos: false,
    })
    expect(
      readLayout({
        [LAYOUT_FIELD]: {
          piezas: { photo: { x: 0.1, y: -0.2, s: 1.3 }, torta: { x: 0, y: 0, s: 1 } },
        },
      }),
    ).toEqual({ piezas: { photo: { x: 0.1, y: -0.2, s: 1.3 } }, sinFotos: false })
    // Fuera de rango o con un id raro: no vale.
    expect(
      readLayout({ [LAYOUT_FIELD]: { piezas: { photo: { x: 3, y: 0, s: 1 } } } }).piezas,
    ).toEqual({})
    expect(
      readLayout({ [LAYOUT_FIELD]: { piezas: { 'a"]{}': { x: 0, y: 0, s: 2 } } } }).piezas,
    ).toEqual({})
  })

  it('acota lo que se arrastra y saca la clave si no queda nada', () => {
    expect(clampPlacement({ x: 0.9, y: -0.9, s: 9 })).toEqual({ x: 0.5, y: -0.5, s: 2.2 })
    const empty: SlideLayout = { piezas: {}, sinFotos: false }
    expect(withLayout({ wish: 'hola', [LAYOUT_FIELD]: { sinFotos: true } }, empty)).toEqual({
      wish: 'hola',
    })
    expect(withLayout({}, { piezas: {}, sinFotos: true })).toEqual({
      [LAYOUT_FIELD]: { sinFotos: true },
    })
  })

  it('las reglas CSS mueven contra el escenario y, en las escenas, contra el viewBox', () => {
    const css = placementCss(
      '[data-maqueta="a-1"]',
      { photo: { x: 0.1, y: 0.2, s: 1.5 } },
      {
        w: 360,
        h: 640,
      },
    )
    expect(css).toContain(
      '[data-maqueta="a-1"] [data-mv="photo"]{translate:calc(100cqw * 0.1) calc(100cqh * 0.2);scale:1.5}',
    )
    expect(css).toContain('svg [data-mv="photo"]{translate:36.00px 128.00px')
  })

  it('el servidor guarda la maqueta, también en pantallas sin campos', () => {
    const config = seed('cumpleanos')
    const intro = config.slides.find((s) => s.kind === 'intro.brand')!
    const memory = config.slides.find((s) => s.kind === 'story.memory')!
    const parsed = parseBuyerContent(config, {
      recipientName: 'Ana',
      senderName: 'Leo',
      slides: {
        [intro.key]: { [LAYOUT_FIELD]: { piezas: { globos: { x: 0, y: 0.1, s: 1.2 } } } },
        [memory.key]: { [LAYOUT_FIELD]: { sinFotos: true } },
      },
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(readLayout(parsed.data.slides[intro.key]).piezas.globos).toEqual({
      x: 0,
      y: 0.1,
      s: 1.2,
    })
    expect(readLayout(parsed.data.slides[memory.key]).sinFotos).toBe(true)
    // Y el borrador la conserva al volver a abrir el editor.
    expect(readLayout(initialDraft(config, parsed.data).slides[memory.key]).sinFotos).toBe(true)
  })

  it('sin fotos, la foto obligatoria de la anécdota deja de faltar', () => {
    const config = seed('cumpleanos')
    const memory = config.slides.find((s) => s.kind === 'story.memory')!
    const base = { recipientName: 'Ana', senderName: 'Leo', slides: {} }
    const photoMissing = (slides: Record<string, Record<string, unknown>>) =>
      missingForLock(config, { ...base, slides }).some((m) => m.path === `${memory.key}.photo`)
    expect(photoMissing({})).toBe(true)
    expect(photoMissing({ [memory.key]: { [LAYOUT_FIELD]: { sinFotos: true } } })).toBe(false)
  })

  it('toda pantalla que muestra fotos ofrece la versión sin fotos', () => {
    for (const kind of [
      'cover.age',
      'cover.edition',
      'story.moments',
      'story.magazine',
      'story.magazine-love',
      'story.memory',
      'outro.recap',
      'reflect.diary',
    ] as const) {
      expect((slideDefinitions[kind] as SlideDefinition).offersNoPhotos, kind).toBe(true)
    }
  })
})

describe('Pareja usa el mismo maquetador que Cumpleaños', () => {
  it('editor directo y estilos para el comprador', () => {
    const config = seed('pareja')
    expect(config.editor).toBe('inline')
    expect(config.buyerStyles).toBe(true)
  })

  it('sus pantallas ofrecen estilos sin las piezas de cumpleaños', () => {
    const config = seed('pareja')
    const withAxes = config.slides.filter((s) => styleAxesOf(s).length > 0)
    expect(withAxes.length).toBeGreaterThanOrEqual(16)
    for (const slide of config.slides) {
      const deco = styleAxesOf(slide).find((a) => a.key === 'deco')
      const values = deco?.options.map((o) => o.value) ?? []
      expect(values, slide.key).not.toContain('globos')
      expect(values, slide.key).not.toContain('banderines')
      expect(
        styleAxesOf(slide).map((a) => a.key),
        slide.key,
      ).not.toContain('torta')
    }
  })
})
