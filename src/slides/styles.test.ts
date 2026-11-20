import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseBuyerContent, readThemeConfig, slideStyle, styleAxesOf } from './config'
import { initialDraft } from './editor/draft'
import { coverScene, cumpleMomentsScene } from './ribbly/cumple-art'
import { roughMeasure } from './ribbly/love-art'
import { CUMPLE_STYLES } from './ribbly/slide-styles'
import { ORIGINAL } from './ribbly/style-kit'
import { slideDefinitions } from './schemas'
import {
  offeredAxes,
  offeredOptions,
  readStyleChoice,
  resolveStyle,
  SlideStylesConfigSchema,
  type StyleAxis,
} from './styles'

const SEED = join(import.meta.dirname, '..', '..', 'supabase', 'seed', 'themes')
const cumpleanos = JSON.parse(readFileSync(join(SEED, 'cumpleanos.json'), 'utf8'))
const pareja = JSON.parse(readFileSync(join(SEED, 'pareja.json'), 'utf8'))

const torta: StyleAxis = {
  key: 'torta',
  label: 'Torta',
  options: [
    { value: 'clasica', label: 'Clásica' },
    { value: 'chocolate', label: 'Chocolate' },
    { value: 'frutilla', label: 'Frutilla' },
  ],
}
const paleta: StyleAxis = {
  key: 'paleta',
  label: 'Colores',
  options: [
    { value: 'original', label: 'Como viene' },
    { value: 'cielo', label: 'Cielo' },
  ],
}

describe('estilos: lo que elige el comprador', () => {
  it('sin elegir nada, cada eje va con la opción de la temática', () => {
    expect(resolveStyle([torta, paleta], undefined, {})).toEqual({
      torta: 'clasica',
      paleta: 'original',
    })
  })

  it('lo elegido vale si la temática lo ofrece', () => {
    expect(resolveStyle([torta], undefined, { torta: 'chocolate' })).toEqual({ torta: 'chocolate' })
    expect(
      resolveStyle([torta], { torta: { allow: ['clasica', 'frutilla'] } }, { torta: 'chocolate' }),
    ).toEqual({ torta: 'clasica' })
  })

  it('la temática puede elegir otra opción por defecto y el orden de las ofrecidas', () => {
    const config = { torta: { allow: ['frutilla', 'clasica'], default: 'clasica' } }
    expect(offeredOptions(torta, config).map((o) => o.value)).toEqual(['clasica', 'frutilla'])
    expect(resolveStyle([torta], config, {})).toEqual({ torta: 'clasica' })
  })

  it('un eje con una sola opción ofrecida no se muestra', () => {
    expect(
      offeredAxes([torta, paleta], { torta: { allow: ['frutilla'] } }).map((a) => a.key),
    ).toEqual(['paleta'])
  })

  it('lo guardado con forma rara se descarta sin romper', () => {
    expect(readStyleChoice({ estilo: { torta: 'chocolate', 'Mal Eje': 'x', paleta: 3 } })).toEqual({
      torta: 'chocolate',
    })
    expect(readStyleChoice({ estilo: 'cielo' })).toEqual({})
    expect(readStyleChoice(null)).toEqual({})
  })

  it('la configuración de la temática valida ejes y opciones', () => {
    expect(SlideStylesConfigSchema.safeParse({ torta: { allow: ['clasica'] } }).success).toBe(true)
    expect(SlideStylesConfigSchema.safeParse({ Torta: { allow: ['clasica'] } }).success).toBe(false)
    expect(SlideStylesConfigSchema.safeParse({ torta: { allow: ['<b>'] } }).success).toBe(false)
  })
})

describe('estilos: en el contenido del comprador', () => {
  const config = readThemeConfig(cumpleanos.config)

  it('se guardan en todas las slides, también en las que no tienen campos', () => {
    const parsed = parseBuyerContent(config, {
      recipientName: 'Vale',
      senderName: 'Martín',
      slides: {
        intro: { estilo: { paleta: 'cielo' } },
        portada: { age: '30', estilo: { paleta: 'menta', deco: 'globos' } },
      },
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.slides.intro).toEqual({ estilo: { paleta: 'cielo' } })
    expect(parsed.data.slides.portada).toMatchObject({
      age: '30',
      estilo: { paleta: 'menta', deco: 'globos' },
    })
  })

  it('el borrador del editor los conserva', () => {
    const draft = initialDraft(config, {
      slides: { intro: { estilo: { tipo: 'elegante' } }, portada: { estilo: { paleta: 'cielo' } } },
    })
    expect(draft.slides.intro).toEqual({ estilo: { tipo: 'elegante' } })
    expect(draft.slides.portada?.estilo).toEqual({ paleta: 'cielo' })
  })

  it('una Ribbly vieja, sin estilo, se ve como siempre', () => {
    for (const slide of config.slides) {
      const style = slideStyle(slide, {})
      for (const value of Object.values(style)) expect(value, slide.key).toBe(ORIGINAL)
    }
  })
})

describe('estilos: los ejes de las pantallas', () => {
  it('cada pantalla de Cumpleaños tiene al menos cuatro formas de variar', () => {
    const config = readThemeConfig(cumpleanos.config)
    expect(config.buyerStyles).toBe(true)
    for (const slide of config.slides) {
      const axes = offeredAxes(styleAxesOf(slide))
      expect(axes.length, slide.key).toBeGreaterThanOrEqual(4)
    }
  })

  it('las opciones por defecto son las del diseño original', () => {
    for (const [kind, axes] of Object.entries(CUMPLE_STYLES)) {
      for (const axis of axes) expect(axis.options[0]?.value, `${kind}.${axis.key}`).toBe(ORIGINAL)
    }
  })

  it('cada eje tiene claves y opciones válidas y sin repetir', () => {
    for (const [kind, axes] of Object.entries(CUMPLE_STYLES)) {
      expect(new Set(axes.map((a) => a.key)).size, kind).toBe(axes.length)
      for (const axis of axes) {
        const values = axis.options.map((o) => o.value)
        expect(new Set(values).size, `${kind}.${axis.key}`).toBe(values.length)
        expect(
          SlideStylesConfigSchema.safeParse({ [axis.key]: { allow: values } }).success,
          `${kind}.${axis.key}`,
        ).toBe(true)
      }
    }
  })

  it('Pareja ofrece estilos con su propio menú (sin piezas de cumpleaños)', () => {
    const config = readThemeConfig(pareja.config)
    expect(config.buyerStyles).toBe(true)
    for (const slide of config.slides) {
      const keys = styleAxesOf(slide).map((a) => a.key)
      expect(keys, slide.key).not.toContain('torta')
      expect(keys, slide.key).not.toContain('globos')
    }
  })

  it('solo las pantallas de Cumpleaños declaran ejes', () => {
    for (const kind of Object.keys(CUMPLE_STYLES)) {
      expect(slideDefinitions[kind as keyof typeof slideDefinitions], kind).toBeTruthy()
    }
  })
})

describe('estilos: cada opción de las escenas se dibuja', () => {
  const cover = {
    variant: 'rosa',
    caption: '',
    title: 'Feliz cumpleaños',
    wish: 'Que todos tus deseos se hagan realidad.',
    age: '27',
  }
  const moments = {
    variant: 'celeste',
    photos: [undefined, undefined, undefined, undefined],
    kicker: 'Hoy es tu día',
    title: 'Feliz cumpleaños',
    phrase: 'Que todos tus deseos se hagan realidad.',
    days: '',
  }
  const base = JSON.stringify(coverScene(cover, roughMeasure))
  const baseMoments = JSON.stringify(cumpleMomentsScene(moments, roughMeasure))

  it.each(['marco', 'globos', 'letra', 'detalles'] as const)('03 · %s', (axis) => {
    const options = CUMPLE_STYLES['cover.age']!.find((a) => a.key === axis)!.options
    for (const option of options.slice(1)) {
      const scene = coverScene({ ...cover, style: { [axis]: option.value } }, roughMeasure)
      expect(JSON.stringify(scene), option.value).not.toBe(base)
    }
  })

  it.each(['sujecion', 'disposicion', 'globos', 'letra'] as const)('05 · %s', (axis) => {
    const options = CUMPLE_STYLES['story.moments']!.find((a) => a.key === axis)!.options
    for (const option of options.slice(1)) {
      const scene = cumpleMomentsScene(
        { ...moments, style: { [axis]: option.value } },
        roughMeasure,
      )
      expect(JSON.stringify(scene), option.value).not.toBe(baseMoments)
    }
  })

  it('con la opción original, la escena es la de siempre', () => {
    const style = { marco: 'original', globos: 'original', letra: 'original', detalles: 'original' }
    expect(JSON.stringify(coverScene({ ...cover, style }, roughMeasure))).toBe(base)
  })
})
