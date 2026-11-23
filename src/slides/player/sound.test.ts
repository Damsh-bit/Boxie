import { describe, expect, it } from 'vitest'
import amistad from '../../../supabase/seed/themes/amistad.json'
import cumpleanos from '../../../supabase/seed/themes/cumpleanos.json'
import pareja from '../../../supabase/seed/themes/pareja.json'
import { readThemeConfig } from '../config'
import { musicScore, startMusic } from './music'
import { playSound, themeSounds } from './sound'

describe('sonidos', () => {
  it('suena solo la Ribbly de cumpleaños', () => {
    expect(themeSounds(readThemeConfig(cumpleanos.config))).toBe(true)
    expect(themeSounds(readThemeConfig(pareja.config))).toBe(false)
    expect(themeSounds(readThemeConfig(amistad.config))).toBe(false)
  })

  it('sin navegador (servidor) no hace nada ni falla', () => {
    const stop = playSound('fanfare')
    expect(() => stop()).not.toThrow()
    const stopMusic = startMusic()
    expect(() => stopMusic()).not.toThrow()
  })
})

describe('música de fondo', () => {
  const { notes, loop } = musicScore
  const melody = notes.filter((n) => n.part === 'melody')

  it('la vuelta entra justa: todo dentro de los 32 compases y ordenado', () => {
    expect(loop).toBe(96)
    for (const note of notes) {
      expect(note.beat).toBeGreaterThanOrEqual(0)
      expect(note.beat + note.beats).toBeLessThanOrEqual(loop + 0.001)
    }
    expect(notes.map((n) => n.beat)).toEqual([...notes.map((n) => n.beat)].sort((a, b) => a - b))
  })

  it('canta dos veces el "Cumpleaños feliz", cada una con su levare', () => {
    // El "Que los" de cada vuelta de la canción cierra la parte anterior.
    expect(melody.at(-2)).toMatchObject({ beat: 95, midi: [67] })
    expect(melody.at(-1)).toMatchObject({ beat: 95.75, midi: [67] })
    expect(melody.filter((n) => n.beat === 47 || n.beat === 47.75)).toHaveLength(2)
    expect(melody.slice(0, 3).map((n) => n.midi[0])).toEqual([69, 67, 72])
    expect(melody.filter((n) => n.beat < 24)).toHaveLength(23)
    expect(melody.filter((n) => n.beat >= 48 && n.beat < 72)).toHaveLength(23)
    // Entre una y otra, el riff (sin melodía).
    expect(melody.filter((n) => n.beat >= 24 && n.beat < 47)).toHaveLength(0)
    expect(notes.filter((n) => n.part === 'riff').length).toBeGreaterThan(40)
  })

  it('cada compás tiene su bombo y su bajo en el 1', () => {
    const downbeats = Array.from({ length: 32 }, (_, i) => i * 3)
    expect(notes.filter((n) => n.part === 'kick').map((n) => n.beat)).toEqual(downbeats)
    const bass = notes.filter((n) => n.part === 'bass' && n.beat % 3 === 0).map((n) => n.beat)
    expect(bass).toEqual(downbeats)
  })
})
