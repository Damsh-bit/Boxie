import { describe, expect, it } from 'vitest'
import cumpleanos from '../../../supabase/seed/themes/cumpleanos.json'
import parejaSeed from '../../../supabase/seed/themes/pareja.json'
import { missingForLock, parseBuyerContent, readThemeConfig } from '../config'
import { slideEditorInfo, slideSummary } from '../labels'
import { initialBuyerProps } from '../schemas'
import { magazinePool, pickMagazine } from './magazine'
import { CUMPLE_MAGAZINE } from './magazine-bank'
import { PAREJA_MAGAZINE } from './magazine-bank-pareja'
import { splitAccent } from './love-art'
import { buildVars, fill, parseDayMonth, parseFullDate } from './vars'

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

describe('Pareja', () => {
  const pareja = readThemeConfig(parejaSeed.config)

  it('la revista de Pareja sale de su banco, con sus vínculos', () => {
    expect(PAREJA_MAGAZINE).toHaveLength(100)
    const text = pickMagazine({
      bank: 'pareja',
      relation: 'novia',
      tone: 'tierno',
      version: 1,
      seed: 'Sofía|Lean',
    })
    expect(PAREJA_MAGAZINE.find((row) => row[0] === text.id)?.[1]).toBe('novia')
    // Un vínculo de otra ocasión cae en los textos para cualquiera.
    expect(
      magazinePool('amiga', 'cualquiera', PAREJA_MAGAZINE).every((r) => r[1] === 'neutro'),
    ).toBe(true)
  })

  it('cada temática nombra sus pantallas: la de notas es "10 razones" en Pareja', () => {
    const notes = pareja.slides.find((s) => s.kind === 'story.wishes')!
    expect(slideSummary(notes)?.title).toBe('10 razones')
    expect(slideEditorInfo(notes).title).toBe('10 razones')
    const birthdayNotes = config.slides.find((s) => s.kind === 'story.wishes')!
    expect(slideSummary(birthdayNotes)?.title).toBe('10 deseos')
  })

  it('para regalar hacen falta la carta, una foto de sus momentos y la de la anécdota', () => {
    const initial = Object.fromEntries(
      pareja.slides.map((s) => [
        s.key,
        initialBuyerProps(s.kind, s.props as Record<string, unknown>),
      ]),
    )
    const parsed = parseBuyerContent(pareja, {
      recipientName: 'Sofía',
      senderName: 'Lean',
      slides: initial,
    })
    if (!parsed.success) throw new Error(parsed.issues.join('\n'))
    expect(missingForLock(pareja, parsed.data).map((m) => m.path)).toEqual([
      'dedicatoria.text',
      'momentos.moments',
      'anecdota.photo',
    ])
  })
})

describe('pareja: días juntos', () => {
  const love = readThemeConfig(parejaSeed.config)

  it('la Love edition presta la fecha de inicio y sale {{dias_juntos}} con separador de miles', () => {
    const vars = buildVars(love, gift({ edicion: { since: '14/02/2022' } }), NOW)
    // Del 14/02/2022 al 14/05/2026: 1550 días, 4 años cumplidos.
    expect(vars.dias_juntos).toBe('1.550')
    expect(vars.anios).toBe('4')
  })

  it('acepta año corto e ISO; una fecha inválida o futura no cuenta', () => {
    expect(parseFullDate('14-2-22')?.getFullYear()).toBe(2022)
    expect(parseFullDate('2022-02-14')?.getMonth()).toBe(1)
    expect(parseFullDate('31/02/2022')).toBeNull()
    expect(parseFullDate('14/02')).toBeNull()
    expect(buildVars(love, gift({ edicion: { since: '01/01/2030' } }), NOW).dias_juntos).toBe('')
    expect(buildVars(love, gift(), NOW).dias_juntos).toBe('')
  })

  it('el aniversario todavía no llegó: los años no se adelantan', () => {
    expect(buildVars(love, gift({ edicion: { since: '20/05/2020' } }), NOW).anios).toBe('5')
  })
})

describe('pareja: palabras destacadas', () => {
  it('sin marcas destaca las últimas palabras (los emojis no cuentan)', () => {
    expect(splitAccent('Sus mejores momentos')).toEqual(['Sus mejores', 'momentos'])
    expect(splitAccent('Porque sos mi persona favorita.', 2)).toEqual([
      'Porque sos mi',
      'persona favorita.',
    ])
    expect(splitAccent('Cada foto, un recuerdo nuestro 💕', 2)).toEqual([
      'Cada foto, un',
      'recuerdo nuestro 💕',
    ])
  })

  it('con *asteriscos* destaca lo marcado', () => {
    expect(splitAccent('Te *amo* mucho')).toEqual(['Te', 'amo mucho'])
    expect(splitAccent('*Siempre*')).toEqual(['', 'Siempre'])
    expect(splitAccent('Hola')).toEqual(['', 'Hola'])
  })
})
