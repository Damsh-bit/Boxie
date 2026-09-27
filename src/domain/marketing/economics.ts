import { saleCosts } from '../admin/finance'
import { arDayKey, arStartOfMonth, inRange, type DateRange } from '../admin/range'
import type { AdminAffiliate, AdminOrder, FinanceSettings } from '../admin/types'
import type { Cents } from '../money'

/**
 * Economía unitaria: qué pasa con la plata de UNA Boxie vendida, del precio
 * de lista a la ganancia, y cuánto se puede pagar para conseguir esa venta.
 *
 *   precio de lista
 *   − descuento promedio (cupones)
 *   = cobrado
 *   − comisión de Mercado Pago (con IVA)
 *   − impuestos sobre la venta (Ingresos Brutos)
 *   − costo de entrega (storage, mails)
 *   − comisión de afiliados (promedio por venta)
 *   = margen de contribución  ← lo máximo que se puede pagar por una venta (CPA de equilibrio)
 *   − costo de adquisición (publicidad por venta)
 *   = ganancia por Boxie
 *   − parte de los gastos fijos
 *   = resultado neto por Boxie
 */

export interface UnitInput {
  listPriceCents: Cents
  /** Descuento promedio sobre el precio de lista (0 a 1). */
  discountRate: number
  /** Comisión de afiliados promedio por venta (ya prorrateada entre todas las ventas). */
  affiliateCents: Cents
  settings: FinanceSettings
  /** Costo publicitario por venta (CPA del canal o combinado). */
  acquisitionCents: Cents
  /** Gastos fijos del mes / ventas del mes. */
  fixedPerSaleCents: Cents
}

export type UnitLineKind = 'base' | 'minus' | 'subtotal' | 'result'

export interface UnitLine {
  key: string
  label: string
  cents: Cents
  kind: UnitLineKind
  hint: string
}

export interface UnitEconomics {
  lines: UnitLine[]
  chargedCents: Cents
  contributionCents: Cents
  /** Ganancia por venta después de la publicidad. */
  profitCents: Cents
  /** Después de la parte de gastos fijos. */
  netCents: Cents
  /** Lo máximo que se puede pagar por una venta sin perder (la contribución). */
  maxCpaCents: Cents
  /** ROAS con el que la publicidad se paga justo (cobrado / contribución). */
  breakEvenRoas: number | null
  /** Contribución sobre lo cobrado (0 a 1). */
  contributionMargin: number
}

export function unitEconomics(input: UnitInput): UnitEconomics {
  const s = input.settings
  const discount = Math.round(input.listPriceCents * input.discountRate)
  const charged = input.listPriceCents - discount
  const costs = saleCosts(charged, s)
  const contribution = costs.contributionCents - input.affiliateCents
  const profit = contribution - input.acquisitionCents
  const net = profit - input.fixedPerSaleCents
  const pct = (bps: number) =>
    `${(bps / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`
  const lines: UnitLine[] = [
    {
      key: 'list',
      label: 'Precio de lista',
      cents: input.listPriceCents,
      kind: 'base',
      hint: 'Lo que dice la tienda.',
    },
    {
      key: 'discount',
      label: 'Descuentos (cupones)',
      cents: -discount,
      kind: 'minus',
      hint: `Promedio de lo descontado: ${(input.discountRate * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} % del precio.`,
    },
    {
      key: 'charged',
      label: 'Cobrado',
      cents: charged,
      kind: 'subtotal',
      hint: 'Lo que paga la persona.',
    },
    {
      key: 'gateway',
      label: 'Comisión de Mercado Pago',
      cents: -costs.gatewayCents,
      kind: 'minus',
      hint: `${pct(s.gatewayFeeBps)} + IVA (${pct(s.gatewayVatBps)}) de la comisión${s.gatewayFixedCents ? ' + cargo fijo' : ''}.`,
    },
    {
      key: 'tax',
      label: 'Impuestos sobre la venta',
      cents: -costs.taxCents,
      kind: 'minus',
      hint: `Ingresos Brutos y otros: ${pct(s.taxBps)} de lo cobrado.`,
    },
    {
      key: 'variable',
      label: 'Costo de entrega',
      cents: -costs.variableCents,
      kind: 'minus',
      hint: 'Storage de fotos, mails y ancho de banda de cada Boxie.',
    },
    {
      key: 'affiliate',
      label: 'Comisión de afiliados',
      cents: -input.affiliateCents,
      kind: 'minus',
      hint: 'Promedio por venta: lo que se paga a afiliados, repartido entre todas las ventas.',
    },
    {
      key: 'contribution',
      label: 'Margen de contribución',
      cents: contribution,
      kind: 'subtotal',
      hint: 'Lo que queda antes de pagar la publicidad: es lo máximo que se puede pagar por una venta.',
    },
    {
      key: 'acquisition',
      label: 'Costo de adquisición (publicidad)',
      cents: -input.acquisitionCents,
      kind: 'minus',
      hint: 'Inversión en pauta dividida por las ventas que trajo (CPA).',
    },
    {
      key: 'profit',
      label: 'Ganancia por Boxie',
      cents: profit,
      kind: 'subtotal',
      hint: 'Lo que deja cada venta después de pagar la publicidad.',
    },
    {
      key: 'fixed',
      label: 'Parte de los gastos fijos',
      cents: -input.fixedPerSaleCents,
      kind: 'minus',
      hint: 'Gastos fijos del mes (hosting, herramientas, sueldos) divididos por las ventas del mes.',
    },
    {
      key: 'net',
      label: 'Resultado neto por Boxie',
      cents: net,
      kind: 'result',
      hint: 'Lo que queda de verdad de cada venta.',
    },
  ]
  return {
    lines,
    chargedCents: charged,
    contributionCents: contribution,
    profitCents: profit,
    netCents: net,
    maxCpaCents: Math.max(contribution, 0),
    breakEvenRoas: contribution > 0 ? charged / contribution : null,
    contributionMargin: charged > 0 ? contribution / charged : 0,
  }
}

/**
 * El CPA objetivo: lo que se puede pagar por una venta dejando el margen
 * buscado (en puntos básicos de lo cobrado).
 */
export function targetCpa(
  u: Pick<UnitEconomics, 'contributionCents' | 'chargedCents'>,
  targetMarginBps: number,
): Cents {
  return Math.max(Math.round(u.contributionCents - (u.chargedCents * targetMarginBps) / 10_000), 0)
}

/** ROAS que hay que lograr para dejar el margen buscado. */
export function targetRoas(
  u: Pick<UnitEconomics, 'contributionCents' | 'chargedCents'>,
  targetMarginBps: number,
): number | null {
  const cpa = targetCpa(u, targetMarginBps)
  return cpa > 0 ? u.chargedCents / cpa : null
}

/**
 * Contribución que tiene que devolver cada peso invertido para dejar el
 * margen buscado (POAS objetivo = contribución / CPA objetivo).
 */
export function targetPoas(
  u: Pick<UnitEconomics, 'contributionCents' | 'chargedCents'>,
  targetMarginBps: number,
): number {
  const cpa = targetCpa(u, targetMarginBps)
  return cpa > 0 ? u.contributionCents / cpa : Infinity
}

// ── Lo que se vendió de cada plan ───────────────────────────────────────────

export interface PlanMix {
  planId: string | null
  sales: number
  /** Precio de lista promedio. */
  listPriceCents: Cents
  discountRate: number
  affiliateCents: Cents
  chargedCents: Cents
}

/** Precio, descuento y comisión promedio de lo vendido (en total y por plan). */
export function salesMix(
  orders: readonly AdminOrder[],
  affiliates: readonly AdminAffiliate[],
  range: DateRange,
): { all: PlanMix; byPlan: PlanMix[] } {
  const bps = new Map(affiliates.map((a) => [a.id, a.commissionBps]))
  const groups = new Map<string, AdminOrder[]>()
  const all: AdminOrder[] = []
  for (const o of orders) {
    if (o.status !== 'paid' || !inRange(o.paidAt, range)) continue
    all.push(o)
    const key = o.planId ?? ''
    groups.set(key, [...(groups.get(key) ?? []), o])
  }
  const mix = (planId: string | null, list: AdminOrder[]): PlanMix => {
    const n = list.length
    const listSum = list.reduce((s, o) => s + o.listPriceCents, 0)
    const discount = list.reduce((s, o) => s + o.discountCents, 0)
    const affiliate = list.reduce(
      (s, o) =>
        s +
        (o.affiliateId ? Math.round((o.amountCents * (bps.get(o.affiliateId) ?? 0)) / 10_000) : 0),
      0,
    )
    return {
      planId,
      sales: n,
      listPriceCents: n ? Math.round(listSum / n) : 0,
      discountRate: listSum > 0 ? discount / listSum : 0,
      affiliateCents: n ? Math.round(affiliate / n) : 0,
      chargedCents: n ? Math.round((listSum - discount) / n) : 0,
    }
  }
  return {
    all: mix(null, all),
    byPlan: [...groups.entries()]
      .map(([k, list]) => mix(k || null, list))
      .sort((a, b) => b.sales - a.sales),
  }
}

// ── Valor de vida del cliente (LTV) ─────────────────────────────────────────

const DAY = 86_400_000

export interface LtvPoint {
  days: number
  /** Clientes con al menos `days` días desde la primera compra. */
  customers: number
  revenueCents: Cents
  contributionCents: Cents
  /** Parte de esos clientes que ya compró más de una vez. */
  repeatRate: number
}

interface CustomerHistory {
  first: number
  orders: { at: number; amount: Cents; contribution: Cents }[]
}

function histories(
  orders: readonly AdminOrder[],
  contributionOf: (o: AdminOrder) => Cents,
): CustomerHistory[] {
  const map = new Map<string, CustomerHistory>()
  for (const o of orders) {
    if (o.status !== 'paid' || !o.paidAt) continue
    const email = o.buyerEmail.trim().toLowerCase()
    const at = Date.parse(o.paidAt)
    const h = map.get(email) ?? { first: at, orders: [] }
    h.first = Math.min(h.first, at)
    h.orders.push({ at, amount: o.amountCents, contribution: contributionOf(o) })
    map.set(email, h)
  }
  return [...map.values()]
}

/**
 * Cuánto deja en promedio un cliente a los N días de su primera compra (solo
 * clientes que ya tuvieron esos días para volver).
 */
export function ltvCurve(
  orders: readonly AdminOrder[],
  contributionOf: (o: AdminOrder) => Cents,
  now = new Date(),
  checkpoints = [0, 30, 90, 180, 365],
): LtvPoint[] {
  const hs = histories(orders, contributionOf)
  return checkpoints.map((days) => {
    const eligible = hs.filter((h) => h.first <= now.getTime() - days * DAY)
    let revenue = 0
    let contribution = 0
    let repeat = 0
    for (const h of eligible) {
      const until = days === 0 ? h.first : h.first + days * DAY
      const within = h.orders.filter((o) => o.at <= until)
      revenue += within.reduce((s, o) => s + o.amount, 0)
      contribution += within.reduce((s, o) => s + o.contribution, 0)
      if (within.length > 1) repeat++
    }
    const n = eligible.length
    return {
      days,
      customers: n,
      revenueCents: n ? Math.round(revenue / n) : 0,
      contributionCents: n ? Math.round(contribution / n) : 0,
      repeatRate: n ? repeat / n : 0,
    }
  })
}

/**
 * Cuándo se recupera lo que costó conseguir al cliente: 0 si ya en la
 * primera compra; si no, los días del primer punto de la curva que lo cubre
 * (null si todavía no se recupera en el último).
 */
/**
 * El punto más largo de la curva con clientes suficientes (una tienda con
 * menos de un año no tiene clientes con 365 días: se usa el horizonte que
 * haya, y se dice cuál).
 */
export function longestLtv(curve: readonly LtvPoint[], minCustomers = 20): LtvPoint | null {
  return (
    [...curve].reverse().find((p) => p.customers >= minCustomers) ??
    curve.find((p) => p.customers > 0) ??
    null
  )
}

export function paybackDays(curve: readonly LtvPoint[], cacCents: Cents): number | null {
  if (cacCents <= 0) return 0
  const hit = curve.find((p) => p.customers > 0 && p.contributionCents >= cacCents)
  return hit ? hit.days : null
}

export interface CohortRow {
  month: string
  customers: number
  /** Facturación por cliente hasta hoy. */
  revenueCents: Cents
  contributionCents: Cents
  repeatRate: number
  /** Marketing del mes / clientes nuevos del mes. */
  cacCents: Cents | null
}

/** Clientes por mes de primera compra: lo que dejaron hasta hoy y lo que costaron. */
export function acquisitionCohorts(
  orders: readonly AdminOrder[],
  contributionOf: (o: AdminOrder) => Cents,
  marketingCostOfMonth: (month: string) => Cents,
  now = new Date(),
  months = 12,
): CohortRow[] {
  const hs = histories(orders, contributionOf)
  const rows: CohortRow[] = []
  for (let i = months - 1; i >= 0; i--) {
    const start = arStartOfMonth(now, -i)
    const month = arDayKey(start).slice(0, 7)
    const cohort = hs.filter((h) => arDayKey(h.first).slice(0, 7) === month)
    const n = cohort.length
    const revenue = cohort.reduce((s, h) => s + h.orders.reduce((t, o) => t + o.amount, 0), 0)
    const contribution = cohort.reduce(
      (s, h) => s + h.orders.reduce((t, o) => t + o.contribution, 0),
      0,
    )
    const cost = marketingCostOfMonth(month)
    rows.push({
      month,
      customers: n,
      revenueCents: n ? Math.round(revenue / n) : 0,
      contributionCents: n ? Math.round(contribution / n) : 0,
      repeatRate: n ? cohort.filter((h) => h.orders.length > 1).length / n : 0,
      cacCents: n ? Math.round(cost / n) : null,
    })
  }
  return rows
}

// ── Descuentos ─────────────────────────────────────────────────────────────

/**
 * Cuántas ventas más hacen falta para ganar lo mismo con un descuento: con
 * un margen de contribución m, un descuento d necesita m / (m − d) − 1 más.
 */
export function extraSalesForDiscount(contributionMargin: number, discount: number): number | null {
  if (discount >= contributionMargin) return null
  return contributionMargin / (contributionMargin - discount) - 1
}
