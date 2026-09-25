import type { Cents } from '../money'
import { addDays, arDayKey, arStartOfMonth, inRange, rangeDays, type DateRange } from './range'
import type { AdminOrder, Expense, ExpenseCategory, FinanceSettings } from './types'

/**
 * Rentabilidad. Cada venta deja el monto cobrado menos la comisión de la
 * pasarela (con su IVA), los impuestos sobre la facturación y un costo
 * variable por Boxie. Lo que queda es la contribución; de ahí salen los gastos
 * fijos (hosting, publicidad, herramientas) y el resultado.
 *
 * Todo en centavos enteros: los porcentajes se aplican y se redondean por venta.
 */

export interface SaleCosts {
  gatewayCents: Cents
  taxCents: Cents
  variableCents: Cents
  /** Lo que queda de la venta después de sus costos directos. */
  contributionCents: Cents
}

const bps = (amount: number, basisPoints: number) => Math.round((amount * basisPoints) / 10_000)

export function saleCosts(amountCents: Cents, s: FinanceSettings): SaleCosts {
  if (amountCents <= 0) {
    // Una orden gratis (cupón del 100%) igual cuesta entregarla.
    return {
      gatewayCents: 0,
      taxCents: 0,
      variableCents: s.variableCostCents,
      contributionCents: -s.variableCostCents,
    }
  }
  const fee = bps(amountCents, s.gatewayFeeBps) + s.gatewayFixedCents
  const gatewayCents = fee + bps(fee, s.gatewayVatBps)
  const taxCents = bps(amountCents, s.taxBps)
  const variableCents = s.variableCostCents
  return {
    gatewayCents,
    taxCents,
    variableCents,
    contributionCents: amountCents - gatewayCents - taxCents - variableCents,
  }
}

/** Porcentaje efectivo que se lleva la pasarela sobre un monto (con IVA). */
export function effectiveGatewayRate(s: FinanceSettings, amountCents: Cents): number {
  if (amountCents <= 0) return 0
  return saleCosts(amountCents, s).gatewayCents / amountCents
}

// ── Gastos fijos ────────────────────────────────────────────────────────────

const DAY = 86_400_000

function daysInMonth(monthStart: Date): number {
  const next = arStartOfMonth(monthStart, 1)
  return Math.round((next.getTime() - monthStart.getTime()) / DAY)
}

/**
 * Cuánto de un gasto cae dentro del período. Los mensuales se prorratean por
 * día dentro de cada mes (un rango de 15 días de septiembre lleva la mitad del
 * gasto de septiembre); los únicos cuentan entero si su fecha cae adentro.
 */
export function expenseInRange(expense: Expense, range: DateRange): Cents {
  const start = new Date(`${expense.startsOn}T00:00:00.000-03:00`)
  if (expense.recurrence === 'once') return inRange(start, range) ? expense.amountCents : 0

  const end = expense.endsOn
    ? addDays(new Date(`${expense.endsOn}T00:00:00.000-03:00`), 1)
    : new Date(8_640_000_000_000_000)
  const from = Math.max(range.from.getTime(), start.getTime())
  const to = Math.min(range.to.getTime(), end.getTime())
  if (to <= from) return 0

  let total = 0
  let month = arStartOfMonth(from)
  while (month.getTime() < to) {
    const next = arStartOfMonth(month, 1)
    const overlap = Math.min(to, next.getTime()) - Math.max(from, month.getTime())
    if (overlap > 0) total += (expense.amountCents * overlap) / (daysInMonth(month) * DAY)
    month = next
  }
  return Math.round(total)
}

/** Gasto fijo mensual vigente hoy (para el punto de equilibrio). */
export function monthlyFixedCents(expenses: readonly Expense[], now = new Date()): Cents {
  const today = arDayKey(now)
  return expenses
    .filter(
      (e) => e.recurrence === 'monthly' && e.startsOn <= today && (!e.endsOn || e.endsOn >= today),
    )
    .reduce((sum, e) => sum + e.amountCents, 0)
}

// ── Estado de resultados ────────────────────────────────────────────────────

export interface ProfitAndLoss {
  /** Suma de precios de lista de lo vendido (antes de descuentos). */
  grossCents: Cents
  discountCents: Cents
  /** Lo efectivamente cobrado. */
  revenueCents: Cents
  refundsCents: Cents
  gatewayCents: Cents
  taxCents: Cents
  variableCents: Cents
  contributionCents: Cents
  fixedCents: Cents
  fixedByCategory: Partial<Record<ExpenseCategory, Cents>>
  netCents: Cents
  /** Resultado sobre lo cobrado (0 a 1, puede ser negativo). */
  netMargin: number
  contributionMargin: number
  sales: number
  refunds: number
}

/**
 * Estado de resultados del período. Las ventas cuentan por fecha de pago; los
 * reembolsos, por fecha de reembolso (restan en el período en que se
 * devolvieron, aunque la venta haya sido antes). La comisión de una venta
 * reembolsada no se recupera: Mercado Pago no la devuelve.
 */
export function profitAndLoss(
  orders: readonly AdminOrder[],
  expenses: readonly Expense[],
  s: FinanceSettings,
  range: DateRange,
): ProfitAndLoss {
  let grossCents = 0
  let discountCents = 0
  let revenueCents = 0
  let gatewayCents = 0
  let taxCents = 0
  let variableCents = 0
  let sales = 0
  let refundsCents = 0
  let refunds = 0

  for (const order of orders) {
    if ((order.status === 'paid' || order.status === 'refunded') && inRange(order.paidAt, range)) {
      const costs = saleCosts(order.amountCents, s)
      grossCents += order.listPriceCents
      discountCents += order.discountCents
      revenueCents += order.amountCents
      gatewayCents += costs.gatewayCents
      taxCents += costs.taxCents
      variableCents += costs.variableCents
      sales++
    }
    if (order.status === 'refunded' && inRange(order.refundedAt ?? order.updatedAt, range)) {
      refundsCents += order.amountCents
      refunds++
      // El impuesto de una venta devuelta se recupera (nota de crédito).
      taxCents -= saleCosts(order.amountCents, s).taxCents
    }
  }

  const fixedByCategory: Partial<Record<ExpenseCategory, Cents>> = {}
  let fixedCents = 0
  for (const expense of expenses) {
    const amount = expenseInRange(expense, range)
    if (amount === 0) continue
    fixedByCategory[expense.category] = (fixedByCategory[expense.category] ?? 0) + amount
    fixedCents += amount
  }

  const contributionCents = revenueCents - refundsCents - gatewayCents - taxCents - variableCents
  const netCents = contributionCents - fixedCents
  const netRevenue = revenueCents - refundsCents
  return {
    grossCents,
    discountCents,
    revenueCents,
    refundsCents,
    gatewayCents,
    taxCents,
    variableCents,
    contributionCents,
    fixedCents,
    fixedByCategory,
    netCents,
    netMargin: netRevenue > 0 ? netCents / netRevenue : 0,
    contributionMargin: netRevenue > 0 ? contributionCents / netRevenue : 0,
    sales,
    refunds,
  }
}

export interface BreakEven {
  /** Ventas por mes necesarias para cubrir los gastos fijos. null = cada venta pierde plata. */
  salesPerMonth: number | null
  avgContributionCents: Cents
  monthlyFixedCents: Cents
}

export function breakEven(pnl: ProfitAndLoss, monthlyFixed: Cents): BreakEven {
  const avg = pnl.sales > 0 ? Math.round(pnl.contributionCents / pnl.sales) : 0
  return {
    salesPerMonth: avg > 0 ? Math.ceil(monthlyFixed / avg) : null,
    avgContributionCents: avg,
    monthlyFixedCents: monthlyFixed,
  }
}

export interface ProfitRow {
  key: string
  sales: number
  revenueCents: Cents
  costsCents: Cents
  contributionCents: Cents
  margin: number
}

/** Contribución agrupada (por temática, por plan, por cupón…). */
export function profitabilityBy(
  orders: readonly AdminOrder[],
  s: FinanceSettings,
  range: DateRange,
  keyOf: (order: AdminOrder) => string | null,
): ProfitRow[] {
  const rows = new Map<string, ProfitRow>()
  for (const order of orders) {
    if (order.status !== 'paid' || !inRange(order.paidAt, range)) continue
    const key = keyOf(order)
    if (key === null) continue
    const costs = saleCosts(order.amountCents, s)
    const row = rows.get(key) ?? {
      key,
      sales: 0,
      revenueCents: 0,
      costsCents: 0,
      contributionCents: 0,
      margin: 0,
    }
    row.sales++
    row.revenueCents += order.amountCents
    row.costsCents += costs.gatewayCents + costs.taxCents + costs.variableCents
    row.contributionCents += costs.contributionCents
    rows.set(key, row)
  }
  return [...rows.values()]
    .map((r) => ({ ...r, margin: r.revenueCents > 0 ? r.contributionCents / r.revenueCents : 0 }))
    .sort((a, b) => b.contributionCents - a.contributionCents)
}

export interface MonthResult {
  key: string
  from: Date
  to: Date
  revenueCents: Cents
  costsCents: Cents
  netCents: Cents
  sales: number
}

/** Resultado mes a mes (los últimos `months`, incluido el actual). */
export function monthlyResults(
  orders: readonly AdminOrder[],
  expenses: readonly Expense[],
  s: FinanceSettings,
  months: number,
  now = new Date(),
): MonthResult[] {
  const out: MonthResult[] = []
  for (let i = months - 1; i >= 0; i--) {
    const from = arStartOfMonth(now, -i)
    const to = i === 0 ? addDays(now, 1) : arStartOfMonth(now, -i + 1)
    const range: DateRange = { from, to, preset: 'custom' }
    const pnl = profitAndLoss(orders, expenses, s, range)
    out.push({
      key: arDayKey(from).slice(0, 7),
      from,
      to,
      revenueCents: pnl.revenueCents - pnl.refundsCents,
      costsCents: pnl.gatewayCents + pnl.taxCents + pnl.variableCents + pnl.fixedCents,
      netCents: pnl.netCents,
      sales: pnl.sales,
    })
  }
  return out
}

export interface MonthProjection {
  /** Facturado en lo que va del mes. */
  soFarCents: Cents
  /** Proyección a fin de mes al ritmo actual. */
  projectedCents: Cents
  goalCents: Cents
  /** Avance hacia la meta (0 a 1+). */
  progress: number
  dayOfMonth: number
  daysInMonth: number
}

export function monthProjection(
  orders: readonly AdminOrder[],
  goalCents: Cents,
  now = new Date(),
): MonthProjection {
  const from = arStartOfMonth(now)
  const range: DateRange = { from, to: addDays(now, 1), preset: 'mtd' }
  const soFar = orders
    .filter((o) => o.status === 'paid' && inRange(o.paidAt, { ...range, to: now }))
    .reduce((sum, o) => sum + o.amountCents, 0)
  const total = daysInMonth(from)
  const elapsed = Math.max((now.getTime() - from.getTime()) / DAY, 0.5)
  return {
    soFarCents: soFar,
    projectedCents: Math.round((soFar / elapsed) * total),
    goalCents,
    progress: goalCents > 0 ? soFar / goalCents : 0,
    dayOfMonth: Math.min(Math.ceil(elapsed), total),
    daysInMonth: total,
  }
}

/** Días del período, para promedios diarios. */
export function perDay(cents: Cents, range: DateRange): Cents {
  return Math.round(cents / Math.max(rangeDays(range), 1))
}
