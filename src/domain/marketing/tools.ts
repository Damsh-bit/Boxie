import type { Cents } from '../money'
import type { ChannelId } from './channels'

/**
 * Herramientas del día a día de marketing: links con UTM, pruebas A/B y el
 * planificador de presupuesto. Todo cálculo puro (lo usan los componentes de
 * cliente y los tests).
 */

// ── Links con UTM ──────────────────────────────────────────────────────────

/** "Día de la Madre 2026 · Video" → "dia-de-la-madre-2026-video". */
export function slugify(value: string, max = 60): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '')
}

/**
 * Un valor de UTM normalizado: minúsculas, sin acentos, sin espacios. A
 * diferencia de slugify, respeta el guion bajo ("paid_social").
 */
export function utmValue(value: string, max = 80): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9_@.-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, max)
}

export interface UtmParams {
  source: string
  medium: string
  campaign: string
  content?: string
  term?: string
}

/**
 * Un link con sus UTM. Respeta los parámetros que ya tenga la URL (un
 * cupón, un plan) y pisa solo los utm_*.
 */
export function buildUtmUrl(base: string, utm: UtmParams): string | null {
  let url: URL
  try {
    url = new URL(base)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const set = (key: string, value: string | undefined) => {
    const v = value ? utmValue(value) : ''
    if (v) url.searchParams.set(key, v)
    else url.searchParams.delete(key)
  }
  set('utm_source', utm.source)
  set('utm_medium', utm.medium)
  set('utm_campaign', utm.campaign)
  set('utm_content', utm.content)
  set('utm_term', utm.term)
  return url.toString()
}

export interface UtmPreset {
  id: string
  label: string
  channel: ChannelId
  source: string
  medium: string
  /**
   * Parámetros para pegar en la plataforma (Meta: "Parámetros de URL";
   * Google: "Sufijo de URL final"): así cada anuncio se etiqueta solo.
   */
  platformTemplate?: string
  tip: string
}

export const UTM_PRESETS: UtmPreset[] = [
  {
    id: 'meta',
    label: 'Meta Ads (Instagram / Facebook)',
    channel: 'meta',
    source: 'meta',
    medium: 'paid_social',
    platformTemplate:
      'utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}',
    tip: 'Pegalo en "Parámetros de URL" de cada anuncio. Poné en utm_campaign el mismo nombre (en minúsculas y con guiones) que le das a la campaña acá.',
  },
  {
    id: 'google',
    label: 'Google Ads',
    channel: 'google',
    source: 'google',
    medium: 'cpc',
    platformTemplate:
      'utm_source=google&utm_medium=cpc&utm_campaign=NOMBRE-DE-LA-CAMPANA&utm_term={keyword}',
    tip: 'Va en "Sufijo de URL final" de la campaña. El etiquetado automático (gclid) también se reconoce, pero sin el nombre de la campaña.',
  },
  {
    id: 'tiktok',
    label: 'TikTok Ads',
    channel: 'tiktok',
    source: 'tiktok',
    medium: 'paid_social',
    platformTemplate:
      'utm_source=tiktok&utm_medium=paid_social&utm_campaign=__CAMPAIGN_NAME__&utm_content=__CID_NAME__',
    tip: 'En el anuncio, "Parámetros de URL" → personalizado.',
  },
  {
    id: 'influencer',
    label: 'Influencer / creadora',
    channel: 'influencers',
    source: 'instagram',
    medium: 'influencer',
    tip: 'Un link por creadora (utm_content = su usuario) y, si podés, también un cupón propio: así se cuentan las ventas aunque no toquen el link.',
  },
  {
    id: 'bio',
    label: 'Bio de Instagram',
    channel: 'social',
    source: 'instagram',
    medium: 'bio',
    tip: 'El link de la bio: separa lo que llega del perfil de lo que llega por anuncios.',
  },
  {
    id: 'stories',
    label: 'Historias con link',
    channel: 'social',
    source: 'instagram',
    medium: 'social',
    tip: 'Usá utm_content para distinguir cada historia (por ejemplo, "reaccion-mama").',
  },
  {
    id: 'email',
    label: 'Newsletter / mail',
    channel: 'email',
    source: 'newsletter',
    medium: 'email',
    tip: 'Un utm_campaign por envío ("newsletter-octubre") y utm_content por botón.',
  },
  {
    id: 'whatsapp',
    label: 'Difusión de WhatsApp',
    channel: 'whatsapp',
    source: 'whatsapp',
    medium: 'social',
    tip: 'Los links que se comparten por WhatsApp llegan como "Directo" si no llevan UTM.',
  },
]

// ── Pruebas A/B ────────────────────────────────────────────────────────────

/** Función de distribución de la normal estándar (Abramowitz y Stegun 7.1.26). */
export function normalCdf(z: number): number {
  const t = 1 / (1 + (0.3275911 * Math.abs(z)) / Math.SQRT2)
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-(z * z) / 2)
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2
}

export interface AbResult {
  rateA: number
  rateB: number
  /** Mejora relativa de B sobre A. */
  uplift: number | null
  z: number
  /** p-valor a dos colas. */
  pValue: number
  /** 1 − p. */
  confidence: number
  significant: boolean
  winner: 'A' | 'B' | null
}

/** Test de dos proporciones (¿B convierte distinto que A?). */
export function abTest(
  a: { visitors: number; conversions: number },
  b: { visitors: number; conversions: number },
  alpha = 0.05,
): AbResult | null {
  if (a.visitors <= 0 || b.visitors <= 0) return null
  if (a.conversions > a.visitors || b.conversions > b.visitors) return null
  const rateA = a.conversions / a.visitors
  const rateB = b.conversions / b.visitors
  const pooled = (a.conversions + b.conversions) / (a.visitors + b.visitors)
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / a.visitors + 1 / b.visitors))
  const z = se > 0 ? (rateB - rateA) / se : 0
  const pValue = Math.min(1, 2 * (1 - normalCdf(Math.abs(z))))
  const significant = pValue < alpha
  return {
    rateA,
    rateB,
    uplift: rateA > 0 ? rateB / rateA - 1 : null,
    z,
    pValue,
    confidence: 1 - pValue,
    significant,
    winner: significant ? (rateB > rateA ? 'B' : 'A') : null,
  }
}

/**
 * Visitas por variante para detectar una mejora relativa `mde` sobre una
 * conversión `baseRate` (95 % de confianza, 80 % de potencia).
 */
export function sampleSizePerVariant(baseRate: number, mde: number): number | null {
  if (baseRate <= 0 || baseRate >= 1 || mde <= 0) return null
  const p2 = baseRate * (1 + mde)
  if (p2 >= 1) return null
  const zAlpha = 1.959964
  const zBeta = 0.841621
  const pBar = (baseRate + p2) / 2
  const n =
    (zAlpha * Math.sqrt(2 * pBar * (1 - pBar)) +
      zBeta * Math.sqrt(baseRate * (1 - baseRate) + p2 * (1 - p2))) **
      2 /
    (p2 - baseRate) ** 2
  return Math.ceil(n)
}

// ── Planificador de presupuesto ────────────────────────────────────────────

/**
 * Cuánto rinde invertir más. En pauta, cada peso extra rinde un poco menos
 * (se llega a gente menos interesada): el CPA sube con la inversión según
 * CPA(x) = CPA₀ · (x / x₀)^e. Con e = 0,35 (un valor habitual en e-commerce),
 * duplicar la inversión sube el CPA ~27 %.
 */
export const DEFAULT_ELASTICITY = 0.35

export function cpaAt(
  spendCents: Cents,
  base: { spendCents: Cents; cpaCents: Cents },
  e = DEFAULT_ELASTICITY,
): Cents {
  if (base.spendCents <= 0 || spendCents <= 0) return base.cpaCents
  return Math.round(base.cpaCents * (spendCents / base.spendCents) ** e)
}

export function salesForSpend(
  spendCents: Cents,
  base: { spendCents: Cents; cpaCents: Cents },
  e = DEFAULT_ELASTICITY,
): number {
  if (spendCents <= 0 || base.cpaCents <= 0) return 0
  return spendCents / cpaAt(spendCents, base, e)
}

/** La inversión que hace falta para `sales` ventas pagas (búsqueda binaria sobre la curva). */
export function spendForSales(
  sales: number,
  base: { spendCents: Cents; cpaCents: Cents },
  e = DEFAULT_ELASTICITY,
): Cents | null {
  if (sales <= 0) return 0
  if (base.cpaCents <= 0) return null
  let lo = 0
  let hi = Math.max(base.spendCents, base.cpaCents) * 2
  while (salesForSpend(hi, base, e) < sales) {
    hi *= 2
    if (hi > 1e13) return null
  }
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2
    if (salesForSpend(mid, base, e) < sales) lo = mid
    else hi = mid
  }
  return Math.round(hi)
}

export interface PlanScenario {
  spendCents: Cents
  paidSales: number
  organicSales: number
  sales: number
  cpaCents: Cents
  revenueCents: Cents
  contributionCents: Cents
  /** Contribución menos inversión menos gastos fijos. */
  resultCents: Cents
  roas: number | null
}

export function scenario(opts: {
  spendCents: Cents
  base: { spendCents: Cents; cpaCents: Cents }
  organicSales: number
  ticketCents: Cents
  contributionPerSaleCents: Cents
  fixedCents: Cents
  elasticity?: number
}): PlanScenario {
  const paid = salesForSpend(opts.spendCents, opts.base, opts.elasticity)
  const sales = paid + opts.organicSales
  const revenue = Math.round(sales * opts.ticketCents)
  const contribution = Math.round(sales * opts.contributionPerSaleCents)
  return {
    spendCents: opts.spendCents,
    paidSales: paid,
    organicSales: opts.organicSales,
    sales,
    cpaCents: cpaAt(opts.spendCents, opts.base, opts.elasticity),
    revenueCents: revenue,
    contributionCents: contribution,
    resultCents: contribution - opts.spendCents - opts.fixedCents,
    roas: opts.spendCents > 0 ? (paid * opts.ticketCents) / opts.spendCents : null,
  }
}

/**
 * La inversión que maximiza el resultado: donde la última venta paga cuesta
 * lo mismo que deja (costo marginal = contribución). Con la curva de arriba,
 * el costo marginal es CPA(x)·(1 + e)… se busca numéricamente.
 */
export function optimalSpend(opts: {
  base: { spendCents: Cents; cpaCents: Cents }
  contributionPerSaleCents: Cents
  elasticity?: number
  maxCents?: Cents
}): Cents {
  const e = opts.elasticity ?? DEFAULT_ELASTICITY
  const max = opts.maxCents ?? Math.max(opts.base.spendCents * 8, opts.base.cpaCents * 50)
  let best = 0
  let bestValue = 0
  const steps = 200
  for (let i = 1; i <= steps; i++) {
    const x = (max * i) / steps
    const value = salesForSpend(x, opts.base, e) * opts.contributionPerSaleCents - x
    if (value > bestValue) {
      bestValue = value
      best = x
    }
  }
  return Math.round(best)
}
