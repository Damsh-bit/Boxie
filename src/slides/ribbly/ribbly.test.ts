import { describe, expect, it } from 'vitest'
import cumpleanos from '../../../supabase/seed/themes/cumpleanos.json'
import { missingForLock, parseBuyerContent, readThemeConfig } from '../config'
import { initialBuyerProps } from '../schemas'
import { magazinePool, pickMagazine } from './magazine'
import { CUMPLE_MAGAZINE } from './magazine-bank'
import { buildVars, fill, parseDayMonth } from './vars'

const config = readThemeConfig(cumpleanos.config)
const NOW = new Date(2026, 4, 14)

const gift = (content: Record<string, Record<string, unknown>> = {}) => ({
  recipientName: 'Martu',
  senderName: 'Juli',
  content,
})

describe('variables de los textos', () => {
  it('la portada presta la edad, el trato y la fecha a todo el regalo', () => {
    const vars = buildVars(
      config,
      gift({ portada: { age: '28', treatment: 'ella', birthday: '14/5' } }),
      NOW,
    )
    expect(vars).toMatchObject({
      nombre: 'Martu',
      de: 'Juli',
      edad: '28',
      edad_siguiente: '29',
      anio: '2026',
      anio_anterior: '2025',
      rol: 'Cumpleañera',
      titulo_cumple: 'La cumpleañera',
      querida: 'Querida',
      a_la: 'a la',
      fecha: '14/05',
      fecha_proximo_cumple: '14/05/2027',
    })
    expect(fill('Escribile {{a_la}} {{nombre}} de {{edad_siguiente}}.', vars)).toBe(
      'Escribile a la Martu de 29.',
    )
  })

  it('sin datos cargados no inventa nada: queda vacío y sin género', () => {
    const vars = buildVars(config, gift(), NOW)
    expect(vars.edad).toBe('')
    expect(vars.edad_siguiente).toBe('')
    expect(vars.fecha_proximo_cumple).toBe('')
    expect(vars.rol).toBe('Estrella')
    expect(fill('👑 {{rol}} del año', vars)).toBe('👑 Estrella del año')
  })

  it('una edad que no es un número se descarta', () => {
    expect(buildVars(config, gift({ portada: { age: 'muchos' } }), NOW).edad).toBe('')
    expect(buildVars(config, gift({ portada: { age: ' 30 ' } }), NOW).edad).toBe('30')
  })

  it('las variables locales pisan a las del regalo y las desconocidas se borran', () => {
    const vars = buildVars(config, gift(), NOW)
    expect(fill('{{n}} de {{total}} · {{nombre}}{{no_existe}}', vars, { n: '1', total: '3' })).toBe(
      '1 de 3 · Martu',
    )
  })

  it('entiende la fecha del cumple escrita de varias formas', () => {
    expect(parseDayMonth('14/05')).toEqual({ day: 14, month: 5 })
    expect(parseDayMonth('3-11')).toEqual({ day: 3, month: 11 })
    expect(parseDayMonth('14/05/1998')).toEqual({ day: 14, month: 5 })
    expect(parseDayMonth('40/05')).toBeNull()
    expect(parseDayMonth('mayo')).toBeNull()
  })
})

describe('banco de textos de la revista', () => {
  it('trae las 100 variaciones del documento, con ids únicos', () => {
    expect(CUMPLE_MAGAZINE).toHaveLength(100)
    expect(new Set(CUMPLE_MAGAZINE.map((row) => row[0])).size).toBe(100)
  })

  it('filtra por vínculo y tono, y nunca se queda sin texto', () => {
    expect(
      magazinePool('amiga', 'calido').every((r) => r[1] === 'amiga' && r[2] === 'calido'),
    ).toBe(true)
    // Un vínculo con un solo texto ignora el tono si no coincide.
    expect(magazinePool('abuela', 'romantico').length).toBeGreaterThan(0)
    // Un vínculo desconocido cae en los genéricos.
    expect(magazinePool('vecino', 'cualquiera').every((r) => r[1] === 'generico')).toBe(true)
  })

  it('el mismo regalo recibe siempre el mismo texto, y la versión lo cambia', () => {
    const options = { relation: 'amiga', tone: 'cualquiera', version: 1, seed: 'Martu|Juli' }
    expect(pickMagazine(options)).toEqual(pickMagazine(options))
    expect(pickMagazine({ ...options, version: 2 }).id).not.toBe(pickMagazine(options).id)
  })

  it('dos regalos de la misma ocasión no comparten texto', () => {
    const ids = ['Martu|Juli', 'Sofi|Lean', 'Caro|Nico', 'Agus|Fede'].map(
      (seed) => pickMagazine({ relation: 'amiga', tone: 'cualquiera', version: 1, seed }).id,
    )
    expect(new Set(ids).size).toBeGreaterThan(1)
  })
})

describe('contenido del comprador en Cumpleaños', () => {
  const initial = Object.fromEntries(
    config.slides.map((s) => [
      s.key,
      initialBuyerProps(s.kind, s.props as Record<string, unknown>),
    ]),
  )

  it('el editor arranca con ejemplos válidos (trivia, vales, deseos, premios, recomendaciones)', () => {
    const parsed = parseBuyerContent(config, {
      recipientName: 'Martu',
      senderName: 'Juli',
      slides: initial,
    })
    expect(parsed.success ? [] : parsed.issues).toEqual([])
    if (!parsed.success) return
    expect(parsed.data.slides.trivia!.questions).toHaveLength(3)
    expect(parsed.data.slides.vales!.vouchers).toHaveLength(8)
    expect(parsed.data.slides.deseos!.wishes).toHaveLength(10)
    expect(parsed.data.slides.tragamonedas!.prizes).toHaveLength(3)
    expect(parsed.data.slides.recomendado!.picks).toHaveLength(3)
  })

  it('para regalar hacen falta la edad, la carta, una foto de momentos y la de la anécdota', () => {
    const parsed = parseBuyerContent(config, {
      recipientName: 'Martu',
      senderName: 'Juli',
      slides: initial,
    })
    if (!parsed.success) throw new Error(parsed.issues.join('\n'))
    expect(missingForLock(config, parsed.data).map((m) => m.path)).toEqual([
      'portada.age',
      'tarjeta.text',
      'momentos.moments',
      'anecdota.photo',
    ])
  })
})
