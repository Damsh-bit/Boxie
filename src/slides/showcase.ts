import type { IconName } from '@/domain/icons'
import { buyerStyle, type ParsedSlide, type ParsedThemeConfig } from './config'
import { buildVars } from './ribbly/vars'
import { sampleGift } from './sample'
import type { SlideKind } from './schemas'
import type { StyleValues } from './styles'
import type { Palette } from './theme-config'
import type { SlideVars } from './types'

/**
 * La vidriera del celular de la portada: las pantallas más vistosas de cada
 * temática, de verdad (los mismos componentes del regalo) y con el contenido
 * de ejemplo de la Ribbly de muestra. El servidor elige y arma todo; el
 * celular solo las pasa (app/(marketing)/_home/HeroPreview.tsx).
 *
 * Sin React: se arma en el servidor con lo que ya trae el catálogo.
 */

type Look = 'cumple' | 'pareja'

/** Una pantalla que vale la pena mostrar en la portada y cómo se presenta. */
export interface ShowcasePick {
  kind: SlideKind
  /** Solo con este estilo de ocasión (las pantallas nuevas). Sin look: cualquiera. */
  look?: Look
  /** La etiqueta que flota al lado del celular. */
  label: string
  icon: IconName
  /** Cuánto se queda en pantalla cuando pasa sola. */
  seconds: number
  /**
   * Si nadie la toca, el juego se juega solo: qué tocar (selector dentro de
   * la pantalla) y a los cuántos segundos. Un selector que ya no está (la
   * piñata rota, la tarjeta abierta) no hace nada.
   */
  taps?: readonly (readonly [selector: string, at: number])[]
}

/**
 * Las pantallas candidatas, de la más vistosa a la menos. De cada temática
 * se muestran las primeras que tenga (hasta SHOWCASE_MAX), en el orden del
 * regalo. Las de Pareja y Cumpleaños son las pantallas nuevas; al final, las
 * de las temáticas que todavía usan las anteriores.
 */
export const SHOWCASE_PICKS: readonly ShowcasePick[] = [
  {
    kind: 'cover.cake',
    label: 'Torta',
    icon: 'torta',
    seconds: 5.4,
    taps: [['.rb-cake-tap', 2.1]],
  },
  { kind: 'cover.edition', label: 'Portada', icon: 'revista', seconds: 4.6 },
  { kind: 'story.moments', label: 'Fotos', icon: 'camara', seconds: 4.8 },
  {
    kind: 'game.slots',
    label: 'Tragamonedas',
    icon: 'tragamonedas',
    seconds: 7.2,
    taps: [['.rb-btn-yellow', 1.4]],
  },
  {
    kind: 'story.card',
    label: 'Tarjeta',
    icon: 'carta-de-amor',
    seconds: 6,
    taps: [['.rb-seal', 1.9]],
  },
  {
    kind: 'game.cookie',
    label: 'Galletita',
    icon: 'galletita',
    seconds: 6.2,
    taps: [['.rb-cookie.is-hint', 1.9]],
  },
  {
    kind: 'game.pinata',
    label: 'Piñata',
    icon: 'cotillon',
    seconds: 6.6,
    taps: [
      ['.rb-pinata', 1.5],
      ['.rb-pinata', 2.2],
      ['.rb-pinata', 2.9],
      ['.rb-pinata', 3.6],
    ],
  },
  { kind: 'media.mix', label: 'Su playlist', icon: 'musica', seconds: 4.6 },
  {
    kind: 'outro.finale',
    label: 'Sorpresa',
    icon: 'regalo',
    seconds: 6.4,
    taps: [['.rb-actions .rb-btn-primary', 2.2]],
  },
  { kind: 'game.quiz', label: 'Trivia', icon: 'trivia', seconds: 5.2 },
  { kind: 'reflect.candles', label: 'Velitas', icon: 'destellos', seconds: 5 },
  // Las temáticas con las pantallas anteriores.
  { kind: 'cover.recipient', label: 'Portada', icon: 'regalo', seconds: 4.4 },
  { kind: 'cover.friends', label: 'Portada', icon: 'regalo', seconds: 4.4 },
  { kind: 'cover.birthday', label: 'Portada', icon: 'torta', seconds: 4.4 },
  { kind: 'story.dedication', label: 'Dedicatoria', icon: 'carta-de-amor', seconds: 5.6 },
  { kind: 'game.trivia', label: 'Trivia', icon: 'trivia', seconds: 5.4 },
  { kind: 'game.jackpot', label: 'Tragamonedas', icon: 'tragamonedas', seconds: 5.4 },
  { kind: 'game.fortune', label: 'Galletita', icon: 'galletita', seconds: 5.2 },
  { kind: 'game.coupons', label: 'Vales', icon: 'entrada', seconds: 5 },
  { kind: 'story.reasons', label: 'Razones', icon: 'corazon', seconds: 5 },
  { kind: 'outro.thanks', label: 'Final', icon: 'cotillon', seconds: 4.6 },
]

/** Cuántas pantallas de cada temática (más la portada de la vidriera). */
export const SHOWCASE_MAX = 7

/**
 * "Lo mejor de cada Ribbly": mientras no se elige temática en el armador, el
 * celular intercala las pantallas nuevas de Cumpleaños y de Pareja.
 */
export const SHOWCASE_MIX: readonly (readonly [Look, SlideKind])[] = [
  ['cumple', 'cover.cake'],
  ['pareja', 'cover.edition'],
  ['cumple', 'game.slots'],
  ['pareja', 'story.moments'],
  ['cumple', 'story.card'],
  ['pareja', 'game.cookie'],
  ['cumple', 'game.pinata'],
  ['pareja', 'outro.finale'],
]

/** Cuántas pantallas tiene la mezcla, como máximo. */
export const SHOWCASE_MIX_MAX = 8

/**
 * Una pantalla de la vidriera, lista para dibujar: el celular solo importa
 * los tipos de este archivo (los schemas no viajan al navegador).
 */
export interface ShowcaseSlide extends Omit<ShowcasePick, 'kind' | 'look'> {
  /** Única en toda la vidriera: `{temática}:{clave}`. */
  id: string
  slide: ParsedSlide
  /** El contenido de ejemplo de esta pantalla (lo que cargaría quien regala). */
  content: Record<string, unknown>
  style: StyleValues
  /** Pantalla clara: la barrita de arriba va oscura. */
  light: boolean
}

export interface ShowcaseTheme {
  slug: string
  palette: Palette
  senderName: string
  /**
   * Las {{variables}} del regalo de ejemplo (la edad, el trato, desde cuándo
   * están juntos). {{nombre}} la pone el celular: la que escriban en el armador.
   */
  vars: SlideVars
  /** Fotos de ejemplo: assetId → URL. */
  media: Record<string, string>
  slides: ShowcaseSlide[]
}

export interface Showcase {
  themes: ShowcaseTheme[]
  /** Lo mejor de cada Ribbly intercalado: temática y lugar en su lista. */
  mix: { theme: string; index: number }[]
}

function lookOf(slide: ParsedSlide): string | undefined {
  const look = (slide.props as { look?: unknown }).look
  return typeof look === 'string' ? look : undefined
}

/** Qué candidata es esta pantalla (-1: ninguna). */
export function pickIndex(slide: ParsedSlide): number {
  const look = lookOf(slide)
  return SHOWCASE_PICKS.findIndex((p) => p.kind === slide.kind && (!p.look || p.look === look))
}

/** Las pantallas que se muestran de una temática: las más vistosas, en el orden del regalo. */
export function pickHighlights(config: Pick<ParsedThemeConfig, 'slides'>, max = SHOWCASE_MAX) {
  const ranked = config.slides
    .map((slide, order) => ({ slide, order, pick: pickIndex(slide) }))
    .filter((s) => s.pick >= 0)
  // Cada candidata una sola vez (una temática puede repetir un tipo de pantalla).
  const seen = new Set<number>()
  const unique = ranked
    .sort((a, b) => a.pick - b.pick || a.order - b.order)
    .filter((s) => {
      if (seen.has(s.pick)) return false
      seen.add(s.pick)
      return true
    })
  return unique.slice(0, max).sort((a, b) => a.order - b.order)
}

export function buildShowcase(
  themes: { slug: string; config: ParsedThemeConfig | null }[],
  now: Date = new Date(),
): Showcase {
  const built: ShowcaseTheme[] = []
  for (const { slug, config } of themes) {
    if (!config) continue
    const sample = sampleGift(config)
    const highlights = pickHighlights(config)
    if (!highlights.length) continue
    const media: Record<string, string> = {}
    const slides = highlights.map(({ slide, pick }): ShowcaseSlide => {
      const content = sample.content[slide.key] ?? {}
      for (const id of assetIds(content)) {
        const url = sample.media[id]
        if (url) media[id] = url
      }
      const { label, icon, seconds, taps } = SHOWCASE_PICKS[pick]!
      return {
        id: `${slug}:${slide.key}`,
        slide,
        content,
        style: buyerStyle(config, slide, content),
        light: slide.frame.chrome === 'dark',
        label,
        icon,
        seconds,
        ...(taps && { taps }),
      }
    })
    built.push({
      slug,
      palette: config.palette,
      senderName: sample.senderName,
      vars: buildVars(config, sample, now),
      media,
      slides,
    })
  }

  // La mezcla: una pantalla de cada ocasión por vez, en el orden de SHOWCASE_MIX,
  // de la primera temática que la tenga. Si sale de una sola temática, no hay mezcla.
  const mix: Showcase['mix'] = []
  for (const [look, kind] of SHOWCASE_MIX) {
    for (const theme of built) {
      const index = theme.slides.findIndex((s) => s.slide.kind === kind && lookOf(s.slide) === look)
      if (index >= 0) {
        mix.push({ theme: theme.slug, index })
        break
      }
    }
    if (mix.length === SHOWCASE_MIX_MAX) break
  }
  return { themes: built, mix: new Set(mix.map((m) => m.theme)).size > 1 ? mix : [] }
}

/** Los assetId de las fotos que hay en el contenido de una pantalla. */
function assetIds(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(assetIds)
  const record = value as Record<string, unknown>
  if (typeof record.assetId === 'string') return [record.assetId]
  return Object.values(record).flatMap(assetIds)
}
