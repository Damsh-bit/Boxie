import type { Route } from 'next'
import type { GalleryContents, GalleryPlan, GalleryTheme } from './types'

/**
 * Cuentas chicas que comparten la grilla, la vista rápida y el destacado:
 * qué precio se muestra, qué trae según el plan y a dónde lleva cada link.
 */

const EMPTY: GalleryContents = { screens: 0, games: 0, items: [] }

/** Con más de un plan, el precio depende del plan (y sin elegir, se anuncia "desde"). */
export const isTiered = (plans: GalleryPlan[]) => plans.length > 1

export function priceOf(
  theme: Pick<GalleryTheme, 'priceCents'>,
  plans: GalleryPlan[],
  plan: string | null,
  priceFromCents: number,
): { cents: number; from: boolean } {
  if (!isTiered(plans)) return { cents: theme.priceCents, from: false }
  const chosen = plans.find((p) => p.slug === plan)
  return chosen ? { cents: chosen.priceCents, from: false } : { cents: priceFromCents, from: true }
}

/**
 * Qué trae la temática en el plan elegido. Sin elegir, lo del plan más
 * completo (y se anuncia como "hasta").
 */
export function contentsOf(
  theme: Pick<GalleryTheme, 'contents'>,
  plans: GalleryPlan[],
  plan: string | null,
): { contents: GalleryContents; upTo: boolean } {
  if (plans.length === 0) return { contents: theme.contents[''] ?? EMPTY, upTo: false }
  const key = plan ?? plans.at(-1)!.slug
  return {
    contents: theme.contents[key] ?? EMPTY,
    upTo: plan === null && isTiered(plans),
  }
}

const withPlan = (path: string, plan: string | null) =>
  (plan ? `${path}?plan=${encodeURIComponent(plan)}` : path) as Route

export const themeHref = (slug: string, plan: string | null) => withPlan(`/tematicas/${slug}`, plan)
export const exampleHref = (slug: string, plan: string | null) => withPlan(`/ejemplo/${slug}`, plan)

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * "domingo 18 de octubre". A mano (sin Intl) para que el servidor y el
 * navegador escriban exactamente lo mismo.
 */
export function longDate(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number)
  const date = new Date(Date.UTC(y!, m! - 1, d!))
  return `${WEEKDAYS[date.getUTCDay()]} ${d} de ${MONTHS[m! - 1]}`
}

/** "18 oct" */
export function shortDate(isoDay: string): string {
  const [, m, d] = isoDay.split('-').map(Number)
  return `${d} ${MONTHS[m! - 1]!.slice(0, 3)}`
}
