import { activePlans, planIncludes, type Plan } from '@/domain/plans'
import type { ParsedSlide, ParsedThemeConfig } from './config'
import { slideDefinitions, type SlideKind } from './schemas'
import type { SlideInstanceSchema } from './theme-config'
import type { z } from 'zod'

/**
 * Planes dentro de una temática: cada slide dice desde qué plan se incluye.
 * El regalo de un plan es la temática con las slides de su nivel y las de los
 * planes de abajo, en el mismo orden (el repaso final se arma con esas).
 */

type PlanRef = Pick<Plan, 'slug' | 'rank' | 'name' | 'active'>

/**
 * Nivel por defecto de cada tipo de slide (1 = el plan más básico). Lo usan
 * el generador de temáticas y las temáticas que todavía no tienen planes
 * asignados. Lo esencial del regalo (portada, dedicatoria, canción, razones)
 * va en todos; los juegos desde el segundo; lo más elaborado, en el último.
 */
export const DEFAULT_KIND_TIER: Record<SlideKind, 1 | 2 | 3> = {
  'intro.logo': 1,
  'cover.recipient': 1,
  'cover.friends': 1,
  'cover.birthday': 1,
  'story.intro': 1,
  'story.dedication': 1,
  'media.song': 1,
  'story.reasons': 1,
  'outro.thanks': 1,
  'game.coupons': 2,
  'connector.gamer': 2,
  'game.trivia': 2,
  'game.jackpot': 2,
  'story.editorial': 2,
  'story.anecdote': 2,
  'outro.summary': 2,
  'media.playlists': 3,
  'connector.cinema': 3,
  'media.streaming': 3,
  'reflect.gratitude': 3,
  'reflect.journal': 3,
  'game.fortune': 3,
}

/** Las slides que no pueden faltar en ningún plan (sin ellas no hay regalo). */
export function isStructural(kind: SlideKind): boolean {
  const category = slideDefinitions[kind].category
  return category === 'intro' || kind === 'outro.thanks'
}

/** El plan que corresponde a un nivel (1, 2, 3…) entre los planes activos. */
export function planForTier(tier: number, plans: readonly PlanRef[]): PlanRef | null {
  const active = activePlans(plans)
  if (active.length === 0) return null
  return active[Math.min(Math.max(tier, 1), active.length) - 1] ?? null
}

export function defaultPlanFor(kind: SlideKind, plans: readonly PlanRef[]): string | undefined {
  return planForTier(DEFAULT_KIND_TIER[kind], plans)?.slug
}

type SlideInput = z.input<typeof SlideInstanceSchema>

/** Completa el plan de las slides que no lo tienen, con el nivel por defecto de su tipo. */
export function withDefaultPlans<T extends SlideInput>(
  slides: readonly T[],
  plans: readonly PlanRef[],
): T[] {
  return slides.map((slide) => {
    if (slide.plan) return slide
    const kind = slide.kind as SlideKind
    if (!(kind in DEFAULT_KIND_TIER)) return slide
    const plan = isStructural(kind) ? planForTier(1, plans)?.slug : defaultPlanFor(kind, plans)
    return plan ? { ...slide, plan } : slide
  })
}

/** La temática tal como la recibe quien compró ese plan. */
export function configForPlan(
  config: ParsedThemeConfig,
  plan: Pick<Plan, 'rank'>,
  plans: readonly Pick<Plan, 'slug' | 'rank'>[],
): ParsedThemeConfig {
  const slides = config.slides.filter(
    (s) => isStructural(s.kind) || planIncludes(plan, s.plan, plans),
  )
  return { ...config, slides }
}

export interface PlanContents {
  planSlug: string
  screens: number
  /** Módulos que completa el comprador (dedicatoria, canción, cuponera…). */
  modules: number
  games: number
  slides: ParsedSlide[]
}

/** Qué incluye cada plan de una temática (para la grilla y la tienda). */
export function planContents(config: ParsedThemeConfig, plans: readonly Plan[]): PlanContents[] {
  return activePlans(plans).map((plan) => {
    const { slides } = configForPlan(config, plan, plans)
    return {
      planSlug: plan.slug,
      screens: slides.length,
      modules: slides.filter((s) => slideDefinitions[s.kind].buyerSchema !== null).length,
      games: slides.filter(
        (s) => slideDefinitions[s.kind].category === 'game' && s.kind !== 'connector.gamer',
      ).length,
      slides,
    }
  })
}

/** "12 pantallas · 4 para personalizar · 3 juegos". */
export function describePlanContents(c: Pick<PlanContents, 'screens' | 'modules' | 'games'>) {
  const parts = [`${c.screens} pantallas`, `${c.modules} para personalizar`]
  if (c.games > 0) parts.push(`${c.games} ${c.games === 1 ? 'juego' : 'juegos'}`)
  return parts.join(' · ')
}
