import type { Cents } from './money'

/**
 * Planes: el mismo regalo en distintos niveles de precio. Un plan más caro
 * incluye más pantallas (módulos) de la temática, más días online y extras
 * como la clave del regalo.
 *
 * Cada slide de una temática dice desde qué plan se incluye (`plan` en la
 * configuración, ver src/slides/plans.ts). Los planes se ordenan por `rank`:
 * un plan incluye todo lo de los planes de rango menor.
 */

export const PLAN_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

export interface PlanLimits {
  /** Días online del regalo desde que se bloquea. */
  giftLifetimeDays: number
  /** Fotos que puede subir el comprador. */
  maxPhotos: number
  /** El comprador le puede poner clave al regalo. */
  allowPassword: boolean
}

export interface Plan {
  id: string
  slug: string
  name: string
  /** Una línea para la tarjeta del plan ("Lo justo para emocionar"). */
  tagline: string
  priceCents: Cents
  /** Precio tachado de referencia (anclaje). null = sin tachado. */
  compareAtCents: Cents | null
  /** Orden y nivel: 1 es el más básico. */
  rank: number
  /** Color de la insignia del plan en el panel y en la tienda. */
  color: string
  /** Beneficios que se muestran en la tienda, además de las pantallas incluidas. */
  features: string[]
  limits: PlanLimits
  /** El plan recomendado ("el más elegido"). Uno solo. */
  highlighted: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export function sortPlans<T extends Pick<Plan, 'rank' | 'name'>>(plans: readonly T[]): T[] {
  return [...plans].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
}

export function activePlans<T extends Pick<Plan, 'rank' | 'name' | 'active'>>(
  plans: readonly T[],
): T[] {
  return sortPlans(plans.filter((p) => p.active))
}

/**
 * Rango mínimo desde el que se incluye una slide. Un plan que ya no existe
 * (se borró) se trata como el más básico: la slide queda incluida en todos,
 * que es lo seguro (nunca se le saca algo a un regalo por un dato viejo).
 */
export function minRankOf(
  planSlug: string | null | undefined,
  plans: readonly Pick<Plan, 'slug' | 'rank'>[],
): number {
  if (!planSlug) return Number.NEGATIVE_INFINITY
  const plan = plans.find((p) => p.slug === planSlug)
  return plan ? plan.rank : Number.NEGATIVE_INFINITY
}

export function planIncludes(
  plan: Pick<Plan, 'rank'>,
  slidePlanSlug: string | null | undefined,
  plans: readonly Pick<Plan, 'slug' | 'rank'>[],
): boolean {
  return plan.rank >= minRankOf(slidePlanSlug, plans)
}

/** El plan destacado, o el del medio si ninguno lo está. */
export function recommendedPlan<T extends Pick<Plan, 'rank' | 'name' | 'active' | 'highlighted'>>(
  plans: readonly T[],
): T | null {
  const active = activePlans(plans)
  return active.find((p) => p.highlighted) ?? active[Math.floor(active.length / 2)] ?? null
}

/** Ahorro frente al precio tachado, en porcentaje entero (0 si no hay tachado). */
export function savingsPercent(plan: Pick<Plan, 'priceCents' | 'compareAtCents'>): number {
  if (!plan.compareAtCents || plan.compareAtCents <= plan.priceCents) return 0
  return Math.round((1 - plan.priceCents / plan.compareAtCents) * 100)
}

export interface PlanIssue {
  planId: string
  message: string
}

/** Reglas de consistencia de la grilla de planes (se muestran en el panel). */
export function planIssues(plans: readonly Plan[]): PlanIssue[] {
  const issues: PlanIssue[] = []
  const active = activePlans(plans)
  if (active.length === 0) issues.push({ planId: '', message: 'No hay ningún plan activo.' })
  const highlighted = active.filter((p) => p.highlighted)
  if (highlighted.length > 1)
    issues.push({ planId: highlighted[1]!.id, message: 'Hay más de un plan destacado.' })

  const ranks = new Map<number, Plan>()
  for (const plan of active) {
    const clash = ranks.get(plan.rank)
    if (clash) issues.push({ planId: plan.id, message: `Tiene el mismo nivel que ${clash.name}.` })
    ranks.set(plan.rank, plan)
  }
  for (let i = 1; i < active.length; i++) {
    const lower = active[i - 1]!
    const upper = active[i]!
    if (upper.priceCents <= lower.priceCents)
      issues.push({
        planId: upper.id,
        message: `Cuesta lo mismo o menos que ${lower.name}, que incluye menos.`,
      })
    if (upper.limits.giftLifetimeDays < lower.limits.giftLifetimeDays)
      issues.push({ planId: upper.id, message: `Dura menos días online que ${lower.name}.` })
  }
  for (const plan of plans) {
    if (plan.compareAtCents !== null && plan.compareAtCents <= plan.priceCents)
      issues.push({ planId: plan.id, message: 'El precio tachado no es mayor al precio.' })
  }
  return issues
}
