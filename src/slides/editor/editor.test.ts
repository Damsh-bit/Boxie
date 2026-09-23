import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { readThemeConfig } from '../config'
import { arrayElement, objectShape } from '../fields'
import { slideDefinitions } from '../schemas'
import { getIn, initialDraft, moveItem, setIn } from './draft'
import { editorModules, moduleProgress, progressSummary } from './modules'
import { defaultFor, issuesByPath, lengthLimits, numberLimits } from './schema-info'
import { giftShareMessage, whatsappShareUrl } from './share'

const seed = (slug: string) =>
  JSON.parse(
    readFileSync(
      join(import.meta.dirname, '..', '..', '..', 'supabase', 'seed', 'themes', `${slug}.json`),
      'utf8',
    ),
  )
const pareja = readThemeConfig(seed('pareja').config)
const PHOTO = { assetId: '5a5a5a5a-1111-4111-8111-111111111111' }

describe('módulos del editor', () => {
  it('salen de la temática: portada, una por slide con contenido del comprador y la clave', () => {
    const modules = editorModules(pareja)
    expect(modules.map((m) => m.id)).toEqual([
      'destinatario',
      'dedicatoria',
      'cancion',
      'cuponera',
      'razones',
      'anecdota',
      'clave',
    ])
    expect(modules.map((m) => m.title)).toEqual([
      'Para quién es',
      'Dedicatoria',
      'Nuestra canción',
      'Cuponera',
      '10 Razones',
      'Anécdota',
      'Clave para abrirla',
    ])
  })

  it('cada módulo muestra su propia slide en la vista previa', () => {
    const modules = editorModules(pareja)
    const keyAt = (i: number) => pareja.slides[i]!.key
    expect(keyAt(modules[0]!.previewIndex)).toBe('portada')
    for (const m of modules.filter((m) => m.kind === 'slide')) {
      expect(keyAt(m.previewIndex)).toBe(m.slideKey)
    }
  })

  it('la clave se puede dejar afuera', () => {
    expect(editorModules(pareja, { password: false }).some((m) => m.kind === 'password')).toBe(
      false,
    )
  })
})

describe('avance de cada módulo', () => {
  const modules = editorModules(pareja)
  const byId = (id: string) => modules.find((m) => m.id === id)!

  it('la portada pide los dos nombres', () => {
    const draft = initialDraft(pareja)
    expect(moduleProgress(byId('destinatario'), draft)).toMatchObject({
      state: 'incomplete',
      missing: [{ path: 'recipientName' }, { path: 'senderName' }],
    })
    const done = { ...draft, recipientName: 'Sofía', senderName: 'Lean' }
    expect(moduleProgress(byId('destinatario'), done).state).toBe('complete')
  })

  it('la dedicatoria está incompleta sin foto, aunque tenga mensaje', () => {
    const draft = initialDraft(pareja, { slides: { dedicatoria: { text: 'Te quiero' } } })
    expect(moduleProgress(byId('dedicatoria'), draft)).toMatchObject({
      state: 'incomplete',
      missing: [{ label: 'Foto de la dedicatoria' }],
    })
    const withPhoto = initialDraft(pareja, { slides: { dedicatoria: { text: '', photo: PHOTO } } })
    expect(moduleProgress(byId('dedicatoria'), withPhoto).state).toBe('complete')
  })

  it('la canción es opcional hasta que se carga', () => {
    const draft = initialDraft(pareja)
    expect(moduleProgress(byId('cancion'), draft).state).toBe('optional')
    const withSong = initialDraft(pareja, {
      slides: { cancion: { youtubeUrl: 'https://youtu.be/450p7goxZqg' } },
    })
    expect(moduleProgress(byId('cancion'), withSong).state).toBe('complete')
  })

  it('la clave cuenta como lista si está activada', () => {
    const draft = initialDraft(pareja)
    expect(moduleProgress(byId('clave'), draft).state).toBe('optional')
    expect(moduleProgress(byId('clave'), draft, { hasPassword: true }).state).toBe('complete')
  })

  it('el resumen lista lo que falta para regalar, con su módulo', () => {
    const summary = progressSummary(modules, initialDraft(pareja))
    expect(summary.total).toBe(6)
    expect(summary.missing.map((m) => `${m.module}: ${m.label}`)).toEqual([
      'Para quién es: Para (destinatario)',
      'Para quién es: De parte de',
      'Dedicatoria: Foto de la dedicatoria',
      'Anécdota: Foto de la anécdota',
    ])
  })
})

describe('borrador', () => {
  it('arranca con las sugerencias de la temática (10 razones y los vales)', () => {
    const draft = initialDraft(pareja)
    expect(draft.slides.razones!.reasons).toHaveLength(10)
    expect(draft.slides.cuponera!.coupons).toHaveLength(8)
    expect((draft.slides.cuponera!.coupons as { title: string }[])[0]!.title).toBe('Cena Romántica')
    expect(draft.slides.dedicatoria).toEqual({ text: '', photo: null })
  })

  it('lo guardado gana sobre las sugerencias, y lo inválido vuelve al valor por defecto', () => {
    const draft = initialDraft(pareja, {
      recipientName: 'Sofía',
      slides: {
        razones: { reasons: ['Porque sí'] },
        dedicatoria: { text: 'x'.repeat(999) },
      },
    })
    expect(draft.recipientName).toBe('Sofía')
    expect(draft.slides.razones).toEqual({ reasons: ['Porque sí'] })
    expect(draft.slides.dedicatoria).toEqual({ text: '', photo: null })
  })

  it('setIn copia sin mutar y getIn lee rutas con índices', () => {
    const original = { coupons: [{ title: 'Cena', detail: '' }] }
    const next = setIn(original, ['coupons', 0, 'detail'], 'Yo cocino')
    expect(original.coupons[0]!.detail).toBe('')
    expect(getIn(next, ['coupons', 0, 'detail'])).toBe('Yo cocino')
    expect(next.coupons).not.toBe(original.coupons)
    expect(getIn(next, ['coupons', 5, 'title'])).toBeUndefined()
  })

  it('moveItem reordena y no se sale de la lista', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveItem(['a', 'b'], 1, 5)).toEqual(['a', 'b'])
  })
})

describe('introspección de schemas', () => {
  const coupons = slideDefinitions['game.coupons'].buyerSchema
  const song = slideDefinitions['media.song'].buyerSchema

  it('lee los límites de largo de textos y listas', () => {
    const shape = coupons.shape
    expect(lengthLimits(shape.coupons)).toEqual({ min: 0, max: 8 })
    expect(lengthLimits(song.shape.songTitle)).toEqual({ max: 80 })
  })

  it('lee los límites de un número', () => {
    const question = arrayElement(slideDefinitions['game.trivia'].themeSchema.shape.questions)!
    expect(numberLimits(objectShape(question)!.correct!)).toEqual({ min: 1, max: 4, int: true })
  })

  it('un ítem nuevo arranca con los valores por defecto de sus campos', () => {
    expect(defaultFor(arrayElement(coupons.shape.coupons)!)).toEqual({ title: '', detail: '' })
    expect(
      defaultFor(arrayElement(slideDefinitions['story.reasons'].buyerSchema.shape.reasons)!),
    ).toBe('')
  })

  it('los errores llegan en castellano y por ruta', () => {
    expect(issuesByPath(song, { youtubeUrl: 'hola', songTitle: 'x'.repeat(81) })).toEqual({
      youtubeUrl: 'No parece un link de YouTube',
      songTitle: 'Máximo 80 caracteres',
    })
    expect(issuesByPath(song, { youtubeUrl: 'https://youtu.be/450p7goxZqg' })).toEqual({})
  })
})

describe('mensaje para mandar el regalo', () => {
  it('lleva el link y, si hay clave, avisa que va aparte', () => {
    const url = 'https://boxiedigital.com.ar/g/abc'
    const plain = giftShareMessage({ recipientName: 'Sofía', url, hasPassword: false })
    expect(plain).toContain('¡Hola Sofía! ✨')
    expect(plain).toContain(url)
    expect(plain).not.toContain('clave')
    expect(giftShareMessage({ recipientName: '', url, hasPassword: true })).toContain(
      'La clave te la paso por acá aparte',
    )
  })

  it('el link de WhatsApp codifica el texto', () => {
    expect(whatsappShareUrl('Hola & chau\n🎁')).toBe(
      'https://wa.me/?text=Hola%20%26%20chau%0A%F0%9F%8E%81',
    )
  })
})
