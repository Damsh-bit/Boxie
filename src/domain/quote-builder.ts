/**
 * El cotizador de /precios: a partir de lo que alguien quiere que tenga su
 * Boxie (módulos, fotos, días online, clave) calcula el plan más barato que lo
 * trae y por qué. No inventa precios: el plan es uno de los que se venden y
 * el checkout cobra ese plan (con el cupón, calculado en el servidor).
 *
 * Los planes van del más básico al más completo (el índice es el nivel).
 */

export interface BuilderPlan {
  slug: string
  name: string
  priceCents: number
  compareAtCents: number | null
  days: number
  maxPhotos: number
  allowPassword: boolean
}

/** Un módulo de la temática y el primer plan (índice) que lo incluye. */
export interface BuilderModule {
  kind: string
  from: number
}

export interface Needs {
  /** Los módulos elegidos (kinds). */
  modules: string[]
  photos: number
  days: number
  password: boolean
}

export type Reason =
  | { type: 'module'; kind: string }
  | { type: 'photos'; photos: number }
  | { type: 'days'; days: number }
  | { type: 'password' }

export interface PlanChoice {
  /** Índice del plan que alcanza. */
  index: number
  /** Lo que obliga a ese plan (vacío si es el más básico). */
  reasons: Reason[]
}

/** El primer plan que cumple una condición (o -1 si ninguno). */
const firstPlan = (plans: BuilderPlan[], ok: (p: BuilderPlan) => boolean) => plans.findIndex(ok)

/**
 * El plan más barato que trae todo lo pedido. null si nada alcanza (más fotos
 * o días de los que da el plan más completo, o un módulo que la temática no
 * tiene).
 */
export function pickPlan(
  plans: BuilderPlan[],
  modules: BuilderModule[],
  needs: Needs,
): PlanChoice | null {
  if (plans.length === 0) return null
  const required: { index: number; reason: Reason }[] = []

  for (const kind of needs.modules) {
    const found = modules.find((m) => m.kind === kind)
    if (!found || found.from < 0 || found.from >= plans.length) return null
    required.push({ index: found.from, reason: { type: 'module', kind } })
  }
  if (needs.photos > 0) {
    const index = firstPlan(plans, (p) => p.maxPhotos >= needs.photos)
    if (index < 0) return null
    required.push({ index, reason: { type: 'photos', photos: needs.photos } })
  }
  if (needs.days > 0) {
    const index = firstPlan(plans, (p) => p.days >= needs.days)
    if (index < 0) return null
    required.push({ index, reason: { type: 'days', days: needs.days } })
  }
  if (needs.password) {
    const index = firstPlan(plans, (p) => p.allowPassword)
    if (index < 0) return null
    required.push({ index, reason: { type: 'password' } })
  }

  const index = Math.max(0, ...required.map((r) => r.index))
  return {
    index,
    reasons: index === 0 ? [] : required.filter((r) => r.index === index).map((r) => r.reason),
  }
}

/** Los módulos que trae un plan (todo lo de su nivel y los de abajo). */
export function modulesOf(modules: BuilderModule[], index: number): string[] {
  return modules.filter((m) => m.from <= index).map((m) => m.kind)
}

/** Lo que suma pasar al plan siguiente: cuánto más sale y qué trae de nuevo. */
export function nextStep(
  plans: BuilderPlan[],
  modules: BuilderModule[],
  index: number,
): { plan: BuilderPlan; index: number; extraCents: number; adds: string[] } | null {
  const next = plans[index + 1]
  const current = plans[index]
  if (!next || !current) return null
  return {
    plan: next,
    index: index + 1,
    extraCents: next.priceCents - current.priceCents,
    adds: modules.filter((m) => m.from === index + 1).map((m) => m.kind),
  }
}

/** Ahorro frente al precio tachado (0 si no hay). */
export function savingsOf(plan: Pick<BuilderPlan, 'priceCents' | 'compareAtCents'>): number {
  if (!plan.compareAtCents || plan.compareAtCents <= plan.priceCents) return 0
  return Math.round((1 - plan.priceCents / plan.compareAtCents) * 100)
}
