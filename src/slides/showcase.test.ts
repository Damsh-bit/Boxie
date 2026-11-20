import { describe, expect, it } from 'vitest'
import amistadSeed from '../../supabase/seed/themes/amistad.json'
import cumpleanosSeed from '../../supabase/seed/themes/cumpleanos.json'
import parejaSeed from '../../supabase/seed/themes/pareja.json'
import { readThemeConfig } from './config'
import { buildShowcase, pickHighlights, SHOWCASE_MAX, SHOWCASE_MIX } from './showcase'

const cumpleanos = readThemeConfig(cumpleanosSeed.config)
const pareja = readThemeConfig(parejaSeed.config)
const amistad = readThemeConfig(amistadSeed.config)

const kinds = (config: typeof cumpleanos) => pickHighlights(config).map((h) => h.slide.kind)

describe('vidriera de la portada', () => {
  it('elige las pantallas más vistosas de cada temática, en el orden del regalo', () => {
    expect(kinds(cumpleanos)).toEqual([
      'cover.cake',
      'story.card',
      'story.moments',
      'media.mix',
      'game.slots',
      'game.pinata',
      'outro.finale',
    ])
    // La portada de regalo de Pareja ya la hace la portada de la vidriera.
    expect(kinds(pareja)).not.toContain('cover.gift')
    expect(kinds(pareja)).toContain('game.cookie')
    // Las temáticas con las pantallas anteriores también tienen las suyas.
    expect(kinds(amistad)).toContain('game.trivia')
    for (const config of [cumpleanos, pareja, amistad]) {
      expect(pickHighlights(config).length).toBeLessThanOrEqual(SHOWCASE_MAX)
    }
  })

  it('arma cada pantalla con su contenido de ejemplo y sus fotos', () => {
    const { themes } = buildShowcase([{ slug: 'pareja', config: pareja }])
    const [theme] = themes
    const moments = theme!.slides.find((s) => s.slide.kind === 'story.moments')!
    expect(moments.id).toBe('pareja:momentos')
    expect(moments.label).toBe('Fotos')
    // Las fotos de ejemplo viajan con la temática (solo las que se usan).
    const ids = (moments.content.moments as { photo: { assetId: string } }[]).map(
      (m) => m.photo.assetId,
    )
    for (const id of ids) expect(theme!.media[id]).toMatch(/^https:\/\//)
    // Desde cuándo están juntos sale de la portada de la edición.
    expect(theme!.vars.anios).not.toBe('')
  })

  it('intercala lo mejor de Cumpleaños y Pareja', () => {
    const showcase = buildShowcase([
      { slug: 'pareja', config: pareja },
      { slug: 'cumpleanos', config: cumpleanos },
      { slug: 'amistad', config: amistad },
    ])
    const mixed = showcase.mix.map(({ theme, index }) => {
      const slide = showcase.themes.find((t) => t.slug === theme)!.slides[index]!
      return `${theme}:${slide.slide.kind}`
    })
    expect(mixed).toEqual([
      'cumpleanos:cover.cake',
      'pareja:cover.edition',
      'cumpleanos:game.slots',
      'pareja:story.moments',
      'cumpleanos:story.card',
      'pareja:game.cookie',
      'cumpleanos:game.pinata',
      'pareja:outro.finale',
    ])
    expect(mixed).toHaveLength(SHOWCASE_MIX.length)
  })

  it('sin dos ocasiones no hay mezcla, y una temática sin configuración no aparece', () => {
    const solo = buildShowcase([
      { slug: 'cumpleanos', config: cumpleanos },
      { slug: 'rota', config: null },
    ])
    expect(solo.mix).toEqual([])
    expect(solo.themes.map((t) => t.slug)).toEqual(['cumpleanos'])
  })
})
