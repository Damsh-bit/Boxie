import type { Cents } from '../money'
import {
  arDayKey,
  arWeekdayHour,
  bucketKey,
  bucketKeys,
  inRange,
  previousRange,
  type Bucket,
  type DateRange,
} from './range'
import type { AdminBoxie, AdminCoupon, AdminOrder } from './types'

/**
 * Analítica del panel: lo mismo que calculan las funciones admin_* de la base
 * (admin_kpis, admin_sales_by_day, admin_theme_ranking…) pero sobre listas en
 * memoria. Con la base conectada, el servidor puede resolver lo pesado en SQL;
 * las reglas (qué cuenta como venta, en qué día cae) son las mismas.
 */

const isSale = (o: AdminOrder) => o.status === 'paid' || o.status === 'refunded'

export interface Kpis {
  revenueCents: Cents
  sales: number
  checkouts: number
  /** Checkouts del período que terminaron pagos (0 a 1). */
  conversion: number
  avgTicketCents: Cents
  discountCents: Cents
  refunds: number
  refundsCents: Cents
  boxiesCreated: number
  boxiesLocked: number
  giftsOpened: number
  /** Regalos abiertos sobre bloqueados en el período. */
  openRate: number
  customers: number
  newCustomers: number
}

export function kpis(
  orders: readonly AdminOrder[],
  boxies: readonly AdminBoxie[],
  range: DateRange,
): Kpis {
  let revenueCents = 0
  let sales = 0
  let discountCents = 0
  let checkouts = 0
  let converted = 0
  let refunds = 0
  let refundsCents = 0
  const buyers = new Set<string>()
  const firstPurchase = new Map<string, number>()

  for (const o of orders) {
    const email = o.buyerEmail.toLowerCase()
    if (isSale(o) && o.paidAt) {
      const t = new Date(o.paidAt).getTime()
      const prev = firstPurchase.get(email)
      if (prev === undefined || t < prev) firstPurchase.set(email, t)
    }
    if (isSale(o) && inRange(o.paidAt, range)) {
      revenueCents += o.amountCents
      discountCents += o.discountCents
      sales++
      buyers.add(email)
    }
    if (inRange(o.createdAt, range)) {
      checkouts++
      if (isSale(o)) converted++
    }
    if (o.status === 'refunded' && inRange(o.refundedAt ?? o.updatedAt, range)) {
      refunds++
      refundsCents += o.amountCents
    }
  }

  let newCustomers = 0
  for (const email of buyers) {
    const first = firstPurchase.get(email)
    if (first !== undefined && first >= range.from.getTime()) newCustomers++
  }

  const boxiesCreated = boxies.filter((b) => inRange(b.createdAt, range)).length
  const boxiesLocked = boxies.filter((b) => inRange(b.lockedAt, range)).length
  const giftsOpened = boxies.filter((b) => inRange(b.firstOpenedAt, range)).length

  return {
    revenueCents,
    sales,
    checkouts,
    conversion: checkouts > 0 ? converted / checkouts : 0,
    avgTicketCents: sales > 0 ? Math.round(revenueCents / sales) : 0,
    discountCents,
    refunds,
    refundsCents,
    boxiesCreated,
    boxiesLocked,
    giftsOpened,
    openRate: boxiesLocked > 0 ? Math.min(giftsOpened / boxiesLocked, 1) : 0,
    customers: buyers.size,
    newCustomers,
  }
}

/** Variación relativa contra el período anterior. null si no hay base para comparar. */
export function delta(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return (current - previous) / Math.abs(previous)
}

export function kpisWithPrevious(
  orders: readonly AdminOrder[],
  boxies: readonly AdminBoxie[],
  range: DateRange,
) {
  const current = kpis(orders, boxies, range)
  const previous = kpis(orders, boxies, previousRange(range))
  return { current, previous }
}

export interface SeriesPoint {
  key: string
  revenueCents: Cents
  sales: number
  checkouts: number
}

export function salesSeries(
  orders: readonly AdminOrder[],
  range: DateRange,
  bucket: Bucket,
): SeriesPoint[] {
  const points = new Map<string, SeriesPoint>(
    bucketKeys(range, bucket).map((key) => [key, { key, revenueCents: 0, sales: 0, checkouts: 0 }]),
  )
  for (const o of orders) {
    if (isSale(o) && inRange(o.paidAt, range)) {
      const p = points.get(bucketKey(o.paidAt!, bucket))
      if (p) {
        p.revenueCents += o.amountCents
        p.sales++
      }
    }
    if (inRange(o.createdAt, range)) {
      const p = points.get(bucketKey(o.createdAt, bucket))
      if (p) p.checkouts++
    }
  }
  return [...points.values()]
}

export interface MixRow {
  key: string
  sales: number
  revenueCents: Cents
  /** Participación en la facturación (0 a 1). */
  share: number
}

export function mixBy(
  orders: readonly AdminOrder[],
  range: DateRange,
  keyOf: (o: AdminOrder) => string | null,
): MixRow[] {
  const rows = new Map<string, MixRow>()
  let total = 0
  for (const o of orders) {
    if (!isSale(o) || !inRange(o.paidAt, range)) continue
    const key = keyOf(o)
    if (key === null) continue
    const row = rows.get(key) ?? { key, sales: 0, revenueCents: 0, share: 0 }
    row.sales++
    row.revenueCents += o.amountCents
    total += o.amountCents
    rows.set(key, row)
  }
  return [...rows.values()]
    .map((r) => ({ ...r, share: total > 0 ? r.revenueCents / total : 0 }))
    .sort((a, b) => b.revenueCents - a.revenueCents || b.sales - a.sales)
}

export interface CouponStat {
  couponId: string
  code: string
  uses: number
  discountCents: Cents
  revenueCents: Cents
}

export function couponRanking(orders: readonly AdminOrder[], range: DateRange): CouponStat[] {
  const rows = new Map<string, CouponStat>()
  for (const o of orders) {
    if (!isSale(o) || !o.couponId || !inRange(o.paidAt, range)) continue
    const row = rows.get(o.couponId) ?? {
      couponId: o.couponId,
      code: o.couponCode ?? '—',
      uses: 0,
      discountCents: 0,
      revenueCents: 0,
    }
    row.uses++
    row.discountCents += o.discountCents
    row.revenueCents += o.amountCents
    rows.set(o.couponId, row)
  }
  return [...rows.values()].sort((a, b) => b.uses - a.uses)
}

export interface FunnelStep {
  key: 'checkout' | 'paid' | 'edited' | 'locked' | 'opened'
  label: string
  count: number
  /** Sobre el primer paso. */
  ofTotal: number
  /** Sobre el paso anterior. */
  ofPrevious: number
}

/**
 * Embudo por cohorte: de los checkouts que se abrieron en el período, cuántos
 * se pagaron, se editaron, se bloquearon para regalar y se abrieron.
 */
export function funnel(
  orders: readonly AdminOrder[],
  boxies: readonly AdminBoxie[],
  range: DateRange,
): FunnelStep[] {
  const cohort = orders.filter((o) => inRange(o.createdAt, range))
  const paid = cohort.filter(isSale)
  const byOrder = new Map(boxies.map((b) => [b.orderId, b]))
  const cohortBoxies = paid.flatMap((o) => byOrder.get(o.id) ?? [])
  const edited = cohortBoxies.filter((b) => b.lastEditedAt !== null)
  const locked = cohortBoxies.filter((b) => b.lockedAt !== null)
  const opened = cohortBoxies.filter((b) => b.firstOpenedAt !== null)

  const steps: [FunnelStep['key'], string, number][] = [
    ['checkout', 'Iniciaron la compra', cohort.length],
    ['paid', 'Pagaron', paid.length],
    ['edited', 'Personalizaron', edited.length],
    ['locked', 'Bloquearon y regalaron', locked.length],
    ['opened', 'El regalo se abrió', opened.length],
  ]
  const first = steps[0]![2]
  return steps.map(([key, label, count], i) => {
    const prev = i === 0 ? count : steps[i - 1]![2]
    return {
      key,
      label,
      count,
      ofTotal: first > 0 ? count / first : 0,
      ofPrevious: prev > 0 ? count / prev : 0,
    }
  })
}

/** Ventas por día de la semana (0 = lunes) y hora, en hora argentina. */
export function weekdayHourMatrix(orders: readonly AdminOrder[], range: DateRange): number[][] {
  const matrix = Array.from({ length: 7 }, () => Array<number>(24).fill(0))
  for (const o of orders) {
    if (!isSale(o) || !inRange(o.paidAt, range)) continue
    const { weekday, hour } = arWeekdayHour(o.paidAt!)
    matrix[weekday]![hour]!++
  }
  return matrix
}

export interface CustomerRow {
  email: string
  name: string
  phone: string | null
  orders: number
  sales: number
  spentCents: Cents
  firstPurchaseAt: string | null
  lastPurchaseAt: string | null
  lastActivityAt: string
  themes: string[]
  couponsUsed: string[]
  refunds: number
}

/** Clientes: las órdenes agrupadas por email (normalizado). */
export function customers(orders: readonly AdminOrder[]): CustomerRow[] {
  const rows = new Map<string, CustomerRow>()
  const sorted = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const o of sorted) {
    const email = o.buyerEmail.trim().toLowerCase()
    const row = rows.get(email) ?? {
      email,
      name: o.buyerName,
      phone: o.buyerPhone,
      orders: 0,
      sales: 0,
      spentCents: 0,
      firstPurchaseAt: null,
      lastPurchaseAt: null,
      lastActivityAt: o.createdAt,
      themes: [],
      couponsUsed: [],
      refunds: 0,
    }
    row.orders++
    row.name = o.buyerName || row.name
    row.phone = o.buyerPhone ?? row.phone
    row.lastActivityAt = o.createdAt
    if (isSale(o) && o.paidAt) {
      row.sales++
      if (o.status === 'paid') row.spentCents += o.amountCents
      row.firstPurchaseAt ??= o.paidAt
      row.lastPurchaseAt = o.paidAt
      if (!row.themes.includes(o.themeId)) row.themes.push(o.themeId)
      if (o.couponCode && !row.couponsUsed.includes(o.couponCode))
        row.couponsUsed.push(o.couponCode)
    }
    if (o.status === 'refunded') row.refunds++
    rows.set(email, row)
  }
  return [...rows.values()].sort(
    (a, b) => b.spentCents - a.spentCents || b.lastActivityAt.localeCompare(a.lastActivityAt),
  )
}

export interface CustomerSummary {
  total: number
  buyers: number
  repeatBuyers: number
  /** Compradores con más de una compra (0 a 1). */
  repeatRate: number
  avgLifetimeCents: Cents
  /** Iniciaron la compra y nunca pagaron: a quién escribirle. */
  abandoned: number
}

export function customerSummary(rows: readonly CustomerRow[]): CustomerSummary {
  const buyers = rows.filter((r) => r.sales > 0)
  const repeat = buyers.filter((r) => r.sales > 1)
  const spent = buyers.reduce((s, r) => s + r.spentCents, 0)
  return {
    total: rows.length,
    buyers: buyers.length,
    repeatBuyers: repeat.length,
    repeatRate: buyers.length > 0 ? repeat.length / buyers.length : 0,
    avgLifetimeCents: buyers.length > 0 ? Math.round(spent / buyers.length) : 0,
    abandoned: rows.length - buyers.length,
  }
}

export type AlertLevel = 'critical' | 'serious' | 'warning' | 'info'

export interface Alert {
  id: string
  level: AlertLevel
  title: string
  detail: string
  /** Ruta del panel donde se resuelve. */
  href: string
}

/**
 * Lo que necesita atención hoy: pagos con problemas, regalos por vencer sin
 * bloquear, cupones por agotarse.
 */
export function alerts(input: {
  orders: readonly AdminOrder[]
  boxies: readonly AdminBoxie[]
  coupons: readonly AdminCoupon[]
  draftThemes: number
  now?: Date
}): Alert[] {
  const now = input.now ?? new Date()
  const out: Alert[] = []

  const mismatch = input.orders.filter((o) => o.providerStatus === 'amount_mismatch')
  if (mismatch.length)
    out.push({
      id: 'amount-mismatch',
      level: 'critical',
      title: `${mismatch.length} ${mismatch.length === 1 ? 'pago' : 'pagos'} con monto distinto`,
      detail: 'Se cobró un monto que no coincide con la orden: la Boxie no se creó. Revisalos.',
      href: '/admin/ventas?estado=revisar',
    })

  const soon = now.getTime() + 5 * 86_400_000
  const closing = input.boxies.filter(
    (b) =>
      b.status === 'active' &&
      !b.lockedAt &&
      new Date(b.expiresAt).getTime() > now.getTime() &&
      new Date(b.expiresAt).getTime() <= soon,
  )
  if (closing.length)
    out.push({
      id: 'closing-editors',
      level: 'serious',
      title: `${closing.length} ${closing.length === 1 ? 'Boxie vence' : 'Boxies vencen'} sin regalarse`,
      detail: 'Se pagaron pero nunca se bloquearon, y la ventana de edición cierra en 5 días.',
      href: '/admin/boxies?estado=por-vencer',
    })

  const pendingToday = input.orders.filter(
    (o) =>
      o.status === 'pending' &&
      now.getTime() - new Date(o.createdAt).getTime() < 86_400_000 &&
      now.getTime() - new Date(o.createdAt).getTime() > 30 * 60_000,
  )
  if (pendingToday.length >= 3)
    out.push({
      id: 'abandoned-today',
      level: 'warning',
      title: `${pendingToday.length} compras abandonadas hoy`,
      detail: 'Iniciaron el pago y no volvieron. Un mail con un cupón suele recuperar algunas.',
      href: '/admin/clientes?segmento=abandonaron',
    })

  for (const c of input.coupons) {
    if (!c.active || c.maxUses === null) continue
    const left = c.maxUses - c.usedCount
    if (left <= 0)
      out.push({
        id: `coupon-${c.id}`,
        level: 'warning',
        title: `El cupón ${c.code} se agotó`,
        detail: `Usó sus ${c.maxUses} usos. Si la campaña sigue, subile el tope.`,
        href: '/admin/cupones',
      })
    else if (left / c.maxUses <= 0.1)
      out.push({
        id: `coupon-${c.id}`,
        level: 'info',
        title: `Al cupón ${c.code} le quedan ${left} usos`,
        detail: `Lleva ${c.usedCount} de ${c.maxUses}.`,
        href: '/admin/cupones',
      })
  }

  if (input.draftThemes > 0)
    out.push({
      id: 'draft-themes',
      level: 'info',
      title: `${input.draftThemes} ${input.draftThemes === 1 ? 'temática en borrador' : 'temáticas en borrador'}`,
      detail: 'Están listas para revisar y publicar.',
      href: '/admin/tematicas?estado=draft',
    })

  const order: Record<AlertLevel, number> = { critical: 0, serious: 1, warning: 2, info: 3 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}

/** Ventas de hoy y de ayer (hora argentina), para el saludo del tablero. */
export function todayVsYesterday(orders: readonly AdminOrder[], now = new Date()) {
  const today = arDayKey(now)
  const yesterday = arDayKey(now.getTime() - 86_400_000)
  let t = 0
  let y = 0
  let tCents = 0
  for (const o of orders) {
    if (!isSale(o) || !o.paidAt) continue
    const key = arDayKey(o.paidAt)
    if (key === today) {
      t++
      tCents += o.amountCents
    } else if (key === yesterday) y++
  }
  return { today: t, todayCents: tCents, yesterday: y }
}
