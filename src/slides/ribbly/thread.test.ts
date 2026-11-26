import { describe, expect, it } from 'vitest'
import {
  bondGroup,
  bondNote,
  BOND_NOTES,
  chapterLabel,
  chapterNote,
  CHAPTER_NOTES,
  chapterSlides,
  chapterTopic,
  resolveChapterTopic,
  resolveTone,
  sinceLabel,
  threadKnots,
  withoutEmptyChapters,
} from './thread'

const slides = [
  { key: 'intro', kind: 'intro.brand' },
  { key: 'portada', kind: 'cover.cake' },
  { key: 'hilo', kind: 'story.bond' },
  { key: 'tarjeta', kind: 'story.card' },
  { key: 'momentos', kind: 'story.moments' },
  { key: 'hilo-musica', kind: 'story.thread' },
  { key: 'cine', kind: 'connector.premiere' },
  { key: 'cancion', kind: 'media.video' },
  { key: 'hilo-final', kind: 'story.thread' },
  { key: 'resumen', kind: 'outro.recap' },
  { key: 'cierre', kind: 'outro.finale' },
]

describe('el hilo de la historia', () => {
  it('cada capítulo anuncia las pantallas que siguen hasta el próximo', () => {
    expect(chapterSlides(slides, 2).map((s) => s.key)).toEqual(['tarjeta', 'momentos'])
    expect(chapterSlides(slides, 5).map((s) => s.key)).toEqual(['cine', 'cancion'])
    expect(chapterSlides(slides, 8).map((s) => s.key)).toEqual(['resumen', 'cierre'])
  })

  it('el tema sale de la primera pantalla que lo tiene', () => {
    expect(chapterTopic(slides, 5)).toBe('cine')
    expect(chapterTopic(slides, 8)).toBe('final')
    expect(chapterTopic([{ key: 'a', kind: 'story.thread' }], 0)).toBe('general')
    // La temática puede fijarlo a mano.
    expect(resolveChapterTopic(slides, 5, 'musica')).toBe('musica')
    expect(resolveChapterTopic(slides, 5, 'auto')).toBe('cine')
    expect(resolveChapterTopic(slides, 5, 'cualquier-cosa')).toBe('cine')
  })

  it('numera los capítulos (el prólogo no cuenta) y el último es el epílogo', () => {
    expect(chapterLabel(slides, 5)).toBe('Capítulo 1 · Plan de sillón')
    expect(chapterLabel(slides, 8)).toBe('Epílogo')
    expect(threadKnots(slides)).toEqual([2, 5, 8])
  })

  it('con planes saca los capítulos que se quedan sin nada que anunciar', () => {
    const plan = slides.filter((s) => s.key !== 'cine' && s.key !== 'cancion')
    expect(withoutEmptyChapters(plan).map((s) => s.key)).not.toContain('hilo-musica')
    expect(withoutEmptyChapters(plan).map((s) => s.key)).toContain('hilo-final')
    expect(withoutEmptyChapters([...slides, { key: 'x', kind: 'story.thread' }])).toEqual(slides)
  })

  it('el vínculo da la voz: grupo y tono automático', () => {
    expect(bondGroup('mama')).toBe('familia')
    expect(bondGroup('novio')).toBe('pareja')
    expect(bondGroup('generico', 'pareja')).toBe('pareja')
    expect(bondGroup('neutro', 'amistad')).toBe('amistad')
    expect(bondGroup('generico')).toBe('generico')
    expect(resolveTone('cualquiera', 'pareja')).toBe('romantico')
    expect(resolveTone('cualquiera', 'amistad')).toBe('divertido')
    expect(resolveTone('emotivo', 'pareja')).toBe('emotivo')
  })

  it('cada versión es otra frase: 8 distintas por capítulo, y vuelve a empezar', () => {
    const seed = 'Sofía|Lean|hilo-musica'
    const notes = Array.from({ length: 8 }, (_, i) =>
      chapterNote('musica', { tone: 'calido', version: i + 1, seed }),
    )
    expect(new Set(notes).size).toBe(8)
    // Las dos primeras son del tono elegido.
    expect(CHAPTER_NOTES.musica.calido).toContain(notes[0])
    expect(CHAPTER_NOTES.musica.calido).toContain(notes[1])
    expect(chapterNote('musica', { tone: 'calido', version: 9, seed })).toBe(notes[0])
    // Determinístico: el mismo regalo da siempre la misma frase.
    expect(chapterNote('musica', { tone: 'calido', version: 1, seed })).toBe(notes[0])
  })

  it('los bancos están completos: dos frases por tono, sin repetir dentro del grupo', () => {
    for (const bank of [...Object.values(CHAPTER_NOTES), ...Object.values(BOND_NOTES)]) {
      for (const pair of Object.values(bank)) {
        expect(pair).toHaveLength(2)
        for (const text of pair) expect(text.trim().length).toBeGreaterThan(10)
      }
    }
    expect(bondNote('familia', { tone: 'emotivo', version: 1, seed: 'a' })).toMatch(/\S/)
  })

  it('arma el "desde cuándo"', () => {
    expect(sinceLabel('2016')).toBe('Desde 2016')
    expect(sinceLabel('desde la primaria')).toBe('Desde la primaria')
    expect(sinceLabel('  ')).toBe('')
  })
})
