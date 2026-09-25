import {
  BookOpen,
  Clapperboard,
  Flag,
  Gamepad2,
  Heart,
  Music,
  PartyPopper,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import { createElement } from 'react'
import type { z } from 'zod'
import { DEFAULT_KIND_TIER, defaultPlanFor, isStructural } from '@/slides/plans'
import { isSlideKind, slideDefinitions, SLIDE_KINDS, type SlideKind } from '@/slides/schemas'
import { SLIDE_KEY_PATTERN, type ThemeConfigInput } from '@/slides/theme-config'
import type { SlideCategory } from '@/slides/types'
import type { Plan } from '@/domain/plans'

/**
 * Estado del editor de temáticas y ayudas para manipular la configuración
 * (lo que el panel guarda como borrador y congela al publicar).
 */

export type EditorSlide = ThemeConfigInput['slides'][number]
export type EditorConfig = ThemeConfigInput

export const CATEGORY: Record<SlideCategory, { label: string; icon: LucideIcon; tone: string }> = {
  intro: { label: 'Apertura', icon: Flag, tone: 'bg-[#e6f0fb] text-series-2' },
  story: { label: 'Historia', icon: BookOpen, tone: 'bg-brand-soft text-brand' },
  media: { label: 'Música y pantallas', icon: Music, tone: 'bg-[#f1ebfb] text-series-5' },
  game: { label: 'Juegos', icon: Gamepad2, tone: 'bg-[#e4f6ee] text-[#137a55]' },
  reflect: { label: 'Reflexión', icon: Heart, tone: 'bg-[#fff4d6] text-[#8a6300]' },
  outro: { label: 'Cierre', icon: PartyPopper, tone: 'bg-neutral-100 text-neutral-700' },
}

export function kindOf(slide: EditorSlide): SlideKind | null {
  return isSlideKind(slide.kind) ? slide.kind : null
}

export function definitionOf(slide: EditorSlide) {
  const kind = kindOf(slide)
  return kind ? slideDefinitions[kind] : null
}

export function slideIcon(slide: EditorSlide): LucideIcon {
  const def = definitionOf(slide)
  if (!def) return Sparkles
  if (slide.kind === 'connector.cinema') return Clapperboard
  return CATEGORY[def.category].icon
}

/** El ícono de una slide, ya dibujado (un componente fijo: no se crea en cada render). */
export function SlideIcon({ slide, className }: { slide: EditorSlide; className?: string }) {
  return createElement(slideIcon(slide), { className, 'aria-hidden': true })
}

/** Las props con todos los valores por defecto (lo que el formulario muestra). */
export function resolvedProps(slide: EditorSlide): Record<string, unknown> {
  const def = definitionOf(slide)
  if (!def) return (slide.props as Record<string, unknown>) ?? {}
  const parsed = (def.themeSchema as z.ZodType).safeParse(slide.props ?? {})
  return parsed.success
    ? (parsed.data as Record<string, unknown>)
    : ((slide.props as Record<string, unknown>) ?? {})
}

/** La configuración con las props de cada slide completas (se hace una vez al abrir). */
export function hydrate(config: EditorConfig): EditorConfig {
  return {
    palette: config.palette,
    slides: config.slides.map((s) => ({ ...s, props: resolvedProps(s) })),
  }
}

export function uniqueKey(base: string, slides: readonly EditorSlide[]): string {
  const clean =
    base
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/^[^a-z0-9]+/, '')
      .slice(0, 36) || 'slide'
  const taken = new Set(slides.map((s) => s.key))
  if (!taken.has(clean)) return clean
  for (let i = 2; ; i++) if (!taken.has(`${clean}-${i}`)) return `${clean}-${i}`
}

const KEY_BASE: Partial<Record<SlideKind, string>> = {
  'intro.logo': 'intro',
  'cover.recipient': 'portada',
  'cover.friends': 'portada',
  'cover.birthday': 'portada',
  'story.intro': 'bienvenida',
  'story.dedication': 'dedicatoria',
  'story.editorial': 'revista',
  'story.reasons': 'razones',
  'story.anecdote': 'anecdota',
  'media.song': 'cancion',
  'media.playlists': 'playlists',
  'media.streaming': 'streaming',
  'connector.gamer': 'game-start',
  'connector.cinema': 'cine',
  'game.trivia': 'trivia',
  'game.jackpot': 'jackpot',
  'game.coupons': 'cuponera',
  'game.fortune': 'fortuna',
  'reflect.gratitude': 'gratitud',
  'reflect.journal': 'diario',
  'outro.summary': 'repaso',
  'outro.thanks': 'gracias',
}

export function newSlide(
  kind: SlideKind,
  slides: readonly EditorSlide[],
  plans: readonly Pick<Plan, 'slug' | 'rank' | 'name' | 'active'>[],
): EditorSlide {
  const def = slideDefinitions[kind]
  const plan = defaultPlanFor(kind, plans)
  return {
    key: uniqueKey(KEY_BASE[kind] ?? kind.split('.')[1] ?? 'slide', slides),
    kind,
    props: (def.themeSchema as z.ZodType).parse({}) as Record<string, unknown>,
    ...(plan ? { plan } : {}),
  }
}

/** Tipos de slide agrupados por categoría (para "Agregar pantalla"). */
export function kindCatalog() {
  const groups = new Map<SlideCategory, SlideKind[]>()
  for (const kind of SLIDE_KINDS) {
    const cat = slideDefinitions[kind].category
    groups.set(cat, [...(groups.get(cat) ?? []), kind])
  }
  return [...groups.entries()].map(([category, kinds]) => ({ category, kinds }))
}

export function isValidKey(key: string) {
  return SLIDE_KEY_PATTERN.test(key)
}

export { DEFAULT_KIND_TIER, isStructural }

/** Problemas de la validación agrupados por clave de slide ("Slide 3 (trivia): …"). */
export function issuesBySlide(issues: string[]): {
  bySlide: Map<string, string[]>
  general: string[]
} {
  const bySlide = new Map<string, string[]>()
  const general: string[] = []
  for (const issue of issues) {
    const match = issue.match(/^Slide \d+ \(([^)]+)\): (.*)$/)
    if (match) bySlide.set(match[1]!, [...(bySlide.get(match[1]!) ?? []), match[2]!])
    else general.push(issue)
  }
  return { bySlide, general }
}
