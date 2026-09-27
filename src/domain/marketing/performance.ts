import { expenseInRange, saleCosts } from '../admin/finance'
import {
  addDays,
  arDayKey,
  arStartOfMonth,
  bucketKey,
  bucketKeys,
  inRange,
  type Bucket,
  type DateRange,
} from '../admin/range'
import type { AdminAffiliate, AdminOrder, Expense, FinanceSettings } from '../admin/types'
import type { Cents } from '../money'
import type { OrderAttribution, Touch } from './attribution'
import { channelInfo, classifyChannel, type ChannelId } from './channels'
import type { AttributionModel, Campaign, CampaignState, SpendEntry, TrafficRow } from './types'

/**
 * Métricas de performance: lo que mira todos los días quien maneja la pauta.
 *
 * - Inversión (spend), impresiones, clics, CTR, CPC y CPM salen de lo que se
 *   carga de cada campaña (el administrador de anuncios).
 * - Visitas y embudo salen de la medición propia del sitio.
 * - Ventas, facturación y contribución salen de las órdenes, atribuidas a un
 *   canal y a una campaña con el modelo elegido.
 *
 * Con eso: CPA (costo por venta), CAC (costo por cliente nuevo), ROAS
 * (facturación por peso invertido), POAS (contribución por peso invertido) y
 * la ganancia que dejó cada canal después de pagar la publicidad.
 */

const DAY = 86_400_000

export interface MarketingInput {
  orders: readonly AdminOrder[]
  affiliates: readonly AdminAffiliate[]
  expenses: readonly Expense[]
  settings: FinanceSettings
  campaigns: readonly Campaign[]
  spend: readonly SpendEntry[]
  traffic: readonly TrafficRow[]
  attributions: readonly OrderAttribution[]
}

export interface Credit {
  channel: ChannelId
  campaignId: string | null
}

export interface MarketingIndex {
  byUtm: Map<string, Campaign>
  byCoupon: Map<string, Campaign>
  byId: Map<string, Campaign>
  attribution: Map<string, OrderAttribution>
  affiliateBps: Map<string, number>
  /** Orden de la primera compra pagada de cada mail. */
  firstOrderOf: Map<string, string>
}

export function buildIndex(input: MarketingInput): MarketingIndex {
  const byUtm = new Map<string, Campaign>()
  const byCoupon = new Map<string, Campaign>()
  for (const c of input.campaigns) {
    if (c.utmCampaign) byUtm.set(c.utmCampaign.toLowerCase(), c)
    if (c.couponId) byCoupon.set(c.couponId, c)
  }
  const firstOrderOf = new Map<string, string>()
  const firstAt = new Map<string, string>()
  for (const o of input.orders) {
    if ((o.status !== 'paid' && o.status !== 'refunded') || !o.paidAt) continue
    const email = o.buyerEmail.trim().toLowerCase()
    const prev = firstAt.get(email)
    if (prev === undefined || o.paidAt < prev) {
      firstAt.set(email, o.paidAt)
      firstOrderOf.set(email, o.id)
    }
  }
  return {
    byUtm,
    byCoupon,
    byId: new Map(input.campaigns.map((c) => [c.id, c])),
    attribution: new Map(input.attributions.map((a) => [a.orderId, a])),
    affiliateBps: new Map(input.affiliates.map((a) => [a.id, a.commissionBps])),
    firstOrderOf,
  }
}

/** Canal y campaña de un origen (una campaña cargada con ese utm_campaign manda). */
export function creditOfSource(
  src: { source: string; medium: string; campaign: string },
  idx: MarketingIndex,
): Credit {
  const campaign = src.campaign ? idx.byUtm.get(src.campaign.toLowerCase()) : undefined
  if (campaign) return { channel: campaign.channel, campaignId: campaign.id }
  return { channel: classifyChannel(src), campaignId: null }
}

const creditOfTouch = (t: Touch | null, idx: MarketingIndex): Credit =>
  t ? creditOfSource(t, idx) : { channel: 'sin-datos', campaignId: null }

/**
 * De dónde vino una orden: el primer y el último toque. Un cupón de campaña
 * (o de afiliado) es una prueba más fuerte que un clic, así que manda sobre
 * el último toque: la persona escribió el código de esa campaña.
 */
export function orderCredits(
  order: AdminOrder,
  idx: MarketingIndex,
): { first: Credit; last: Credit } {
  const attr = idx.attribution.get(order.id)
  let last = creditOfTouch(attr?.last ?? null, idx)
  let first = creditOfTouch(attr?.first ?? attr?.last ?? null, idx)
  const byCoupon = order.couponId ? idx.byCoupon.get(order.couponId) : undefined
  if (byCoupon) last = { channel: byCoupon.channel, campaignId: byCoupon.id }
  else if (order.affiliateId) last = { channel: 'afiliados', campaignId: null }
  if (!attr) first = last
  return { first, last }
}

export function modelCredits(
  credits: { first: Credit; last: Credit },
  model: AttributionModel,
): (Credit & { weight: number })[] {
  if (model === 'last') return [{ ...credits.last, weight: 1 }]
  if (model === 'first') return [{ ...credits.first, weight: 1 }]
  const same =
    credits.first.channel === credits.last.channel &&
    credits.first.campaignId === credits.last.campaignId
  if (same) return [{ ...credits.last, weight: 1 }]
  return [
    { ...credits.first, weight: 0.5 },
    { ...credits.last, weight: 0.5 },
  ]
}

/** Contribución de una venta: lo cobrado menos pasarela, impuestos, entrega y comisión de afiliado. */
export function orderContribution(
  order: AdminOrder,
  settings: FinanceSettings,
  idx: Pick<MarketingIndex, 'affiliateBps'>,
): Cents {
  const base = saleCosts(order.amountCents, settings).contributionCents
  const bps = order.affiliateId ? (idx.affiliateBps.get(order.affiliateId) ?? 0) : 0
  return base - Math.round((order.amountCents * bps) / 10_000)
}

export const isNetSale = (o: AdminOrder) => o.status === 'paid' && o.paidAt !== null

export function isNewCustomerOrder(order: AdminOrder, idx: MarketingIndex): boolean {
  return idx.firstOrderOf.get(order.buyerEmail.trim().toLowerCase()) === order.id
}

// ── Filas de performance ────────────────────────────────────────────────────

export interface PerfTotals {
  sessions: number
  themeViews: number
  checkoutViews: number
  /** Órdenes creadas (se abrió el pago). */
  paymentStarts: number
  /** Ventas atribuidas (con el modelo repartido pueden ser medias ventas). */
  sales: number
  newCustomers: number
  revenueCents: Cents
  contributionCents: Cents
  spendCents: Cents
  impressions: number
  clicks: number
  platformConversions: number
}

export interface PerfMetrics extends PerfTotals {
  /** Ventas / visitas. */
  cvr: number | null
  /** Inversión / ventas. */
  cpaCents: Cents | null
  /** Inversión / clientes nuevos. */
  cacCents: Cents | null
  /** Facturación / inversión. */
  roas: number | null
  /** Contribución / inversión (profit on ad spend). */
  poas: number | null
  /** Contribución menos inversión: lo que dejó el canal. */
  profitCents: Cents
  aovCents: Cents | null
  ctr: number | null
  cpcCents: Cents | null
  cpmCents: Cents | null
}

const empty = (): PerfTotals => ({
  sessions: 0,
  themeViews: 0,
  checkoutViews: 0,
  paymentStarts: 0,
  sales: 0,
  newCustomers: 0,
  revenueCents: 0,
  contributionCents: 0,
  spendCents: 0,
  impressions: 0,
  clicks: 0,
  platformConversions: 0,
})

const ratio = (a: number, b: number) => (b > 0 ? a / b : null)

export function derive(t: PerfTotals): PerfMetrics {
  // Sin inversión no hay costo por venta (no es $ 0: no se pagó por esas ventas).
  const paid = t.spendCents > 0
  const cpa = paid ? ratio(t.spendCents, t.sales) : null
  const cac = paid ? ratio(t.spendCents, t.newCustomers) : null
  const aov = ratio(t.revenueCents, t.sales)
  const cpc = paid ? ratio(t.spendCents, t.clicks) : null
  const cpm = paid ? ratio(t.spendCents * 1000, t.impressions) : null
  return {
    ...t,
    cvr: ratio(t.sales, t.sessions),
    cpaCents: cpa === null ? null : Math.round(cpa),
    cacCents: cac === null ? null : Math.round(cac),
    roas: ratio(t.revenueCents, t.spendCents),
    poas: ratio(t.contributionCents, t.spendCents),
    profitCents: t.contributionCents - t.spendCents,
    aovCents: aov === null ? null : Math.round(aov),
    ctr: ratio(t.clicks, t.impressions),
    cpcCents: cpc === null ? null : Math.round(cpc),
    cpmCents: cpm === null ? null : Math.round(cpm),
  }
}

function add(into: PerfTotals, from: Partial<PerfTotals>) {
  for (const [k, v] of Object.entries(from) as [keyof PerfTotals, number][]) into[k] += v
}

interface Accumulated {
  channels: Map<ChannelId, PerfTotals>
  campaigns: Map<string, PerfTotals>
  total: PerfTotals
}

/** Todo lo del período, sumado por canal y por campaña con el modelo elegido. */
export function accumulate(
  input: MarketingInput,
  range: DateRange,
  model: AttributionModel,
  idx = buildIndex(input),
): Accumulated {
  const channels = new Map<ChannelId, PerfTotals>()
  const campaigns = new Map<string, PerfTotals>()
  const total = empty()
  const bump = (credit: Credit, values: Partial<PerfTotals>, weight = 1) => {
    const scaled = Object.fromEntries(
      Object.entries(values).map(([k, v]) => [k, (v as number) * weight]),
    ) as Partial<PerfTotals>
    const ch = channels.get(credit.channel) ?? empty()
    add(ch, scaled)
    channels.set(credit.channel, ch)
    if (credit.campaignId) {
      const c = campaigns.get(credit.campaignId) ?? empty()
      add(c, scaled)
      campaigns.set(credit.campaignId, c)
    }
  }

  const from = arDayKey(range.from)
  const to = arDayKey(range.to.getTime() - 1)
  const inDays = (day: string) => day >= from && day <= to

  for (const row of input.traffic) {
    if (!inDays(row.day)) continue
    const values = {
      sessions: row.sessions,
      themeViews: row.themeViews,
      checkoutViews: row.checkouts,
    }
    bump(creditOfSource(row, idx), values)
    add(total, values)
  }

  for (const entry of input.spend) {
    if (!inDays(entry.day)) continue
    const campaign = idx.byId.get(entry.campaignId)
    if (!campaign) continue
    const values = {
      spendCents: entry.spendCents,
      impressions: entry.impressions,
      clicks: entry.clicks,
      platformConversions: entry.platformConversions,
    }
    bump({ channel: campaign.channel, campaignId: campaign.id }, values)
    add(total, values)
  }

  for (const order of input.orders) {
    const started = inRange(order.createdAt, range)
    const sold = isNetSale(order) && inRange(order.paidAt, range)
    if (!started && !sold) continue
    const credits = modelCredits(orderCredits(order, idx), model)
    const values: Partial<PerfTotals> = {}
    if (started) values.paymentStarts = 1
    if (sold) {
      values.sales = 1
      values.revenueCents = order.amountCents
      values.contributionCents = orderContribution(order, input.settings, idx)
      if (isNewCustomerOrder(order, idx)) values.newCustomers = 1
    }
    for (const credit of credits) bump(credit, values, credit.weight)
    add(total, values)
  }

  return { channels, campaigns, total }
}

export interface ChannelRow extends PerfMetrics {
  channel: ChannelId
}

export function channelPerformance(
  input: MarketingInput,
  range: DateRange,
  model: AttributionModel,
  idx = buildIndex(input),
): { rows: ChannelRow[]; total: PerfMetrics } {
  const acc = accumulate(input, range, model, idx)
  const rows = [...acc.channels.entries()]
    .map(([channel, t]) => ({ channel, ...derive(t) }))
    .sort(
      (a, b) =>
        b.revenueCents - a.revenueCents || b.spendCents - a.spendCents || b.sessions - a.sessions,
    )
  return { rows, total: derive(acc.total) }
}

// ── Campañas ────────────────────────────────────────────────────────────────

export function campaignState(c: Campaign, today: string): CampaignState {
  if (c.status === 'draft') return 'draft'
  if (c.endsOn && c.endsOn < today) return 'ended'
  if (c.startsOn > today) return 'scheduled'
  return c.status
}

export const CAMPAIGN_STATE_LABEL: Record<CampaignState, string> = {
  draft: 'Borrador',
  active: 'Activa',
  paused: 'Pausada',
  scheduled: 'Programada',
  ended: 'Terminada',
}

export type Verdict =
  'escalar' | 'mantener' | 'optimizar' | 'pausar' | 'aprendiendo' | 'sin-inversion'

export const VERDICT_LABEL: Record<Verdict, string> = {
  escalar: 'Escalar',
  mantener: 'Mantener',
  optimizar: 'Optimizar',
  pausar: 'Pausar',
  aprendiendo: 'Aprendiendo',
  'sin-inversion': 'Sin inversión',
}

export const VERDICT_HINT: Record<Verdict, string> = {
  escalar: 'Deja más que el objetivo: probá subir el presupuesto de a 20 % cada 3 o 4 días.',
  mantener: 'Gana plata y cumple el objetivo. Seguí así y renová los anuncios cuando se gasten.',
  optimizar:
    'Gana menos que el objetivo: probá otros anuncios, públicos o la página de destino antes de subirle plata.',
  pausar: 'Pierde plata con lo que invirtió: pausala o cambiala de raíz.',
  aprendiendo:
    'Todavía no hay datos suficientes para decidir (menos de 3 ventas o poca inversión).',
  'sin-inversion': 'No tiene inversión cargada en el período.',
}

/**
 * Qué hacer con una campaña, comparando lo que deja cada peso invertido
 * (POAS) contra el objetivo de ganancia. `targetPoas` = contribución que
 * tiene que devolver cada peso para dejar el margen buscado (ver
 * `targetPoas` en economics.ts).
 */
export function verdict(m: PerfMetrics, opts: { maxCpaCents: Cents; targetPoas: number }): Verdict {
  if (m.spendCents <= 0) return 'sin-inversion'
  const enoughSpend = m.spendCents >= opts.maxCpaCents * 2
  if (m.sales < 3 && !enoughSpend) return 'aprendiendo'
  const poas = m.poas ?? 0
  if (poas < 0.85 && enoughSpend) return 'pausar'
  if (poas < 0.85) return 'aprendiendo'
  if (poas < opts.targetPoas) return 'optimizar'
  if (poas >= opts.targetPoas * 1.35 && m.sales >= 5) return 'escalar'
  return 'mantener'
}

export interface CampaignRow extends PerfMetrics {
  campaign: Campaign
  state: CampaignState
  /** Días con inversión dentro del período. */
  activeDays: number
  /** Presupuesto que correspondía al período (diario × días activos del rango). */
  budgetCents: Cents
  /** CTR de los últimos 7 días contra los 21 anteriores (fatiga de los anuncios). */
  ctrTrend: number | null
}

export function campaignPerformance(
  input: MarketingInput,
  range: DateRange,
  model: AttributionModel,
  now = new Date(),
  idx = buildIndex(input),
): CampaignRow[] {
  const acc = accumulate(input, range, model, idx)
  const today = arDayKey(now)
  const from = arDayKey(range.from)
  const to = arDayKey(range.to.getTime() - 1)
  const spendDays = new Map<string, Set<string>>()
  for (const e of input.spend) {
    if (e.day < from || e.day > to || e.spendCents <= 0) continue
    const set = spendDays.get(e.campaignId) ?? new Set<string>()
    set.add(e.day)
    spendDays.set(e.campaignId, set)
  }
  return input.campaigns
    .map((campaign) => {
      const totals = acc.campaigns.get(campaign.id) ?? empty()
      const startDay = campaign.startsOn > from ? campaign.startsOn : from
      const endCap = campaign.endsOn && campaign.endsOn < to ? campaign.endsOn : to
      const endDay = endCap < today ? endCap : today
      const plannedDays =
        campaign.status === 'draft' || endDay < startDay
          ? 0
          : Math.round((Date.parse(endDay) - Date.parse(startDay)) / DAY) + 1
      return {
        campaign,
        state: campaignState(campaign, today),
        ...derive(totals),
        activeDays: spendDays.get(campaign.id)?.size ?? 0,
        budgetCents: campaign.dailyBudgetCents * plannedDays,
        ctrTrend: ctrTrend(input.spend, campaign.id, now),
      }
    })
    .filter(
      (r) =>
        r.spendCents > 0 ||
        r.sales > 0 ||
        r.sessions > 0 ||
        r.state === 'active' ||
        r.state === 'scheduled' ||
        r.state === 'draft',
    )
    .sort((a, b) => b.spendCents - a.spendCents || b.revenueCents - a.revenueCents)
}

/** Variación del CTR de los últimos 7 días contra los 21 anteriores (null sin datos). */
export function ctrTrend(
  spend: readonly SpendEntry[],
  campaignId: string,
  now = new Date(),
): number | null {
  const today = arDayKey(now)
  const d7 = arDayKey(now.getTime() - 7 * DAY)
  const d28 = arDayKey(now.getTime() - 28 * DAY)
  let recentI = 0
  let recentC = 0
  let prevI = 0
  let prevC = 0
  for (const e of spend) {
    if (e.campaignId !== campaignId || e.day > today || e.day <= d28) continue
    if (e.day > d7) {
      recentI += e.impressions
      recentC += e.clicks
    } else {
      prevI += e.impressions
      prevC += e.clicks
    }
  }
  if (recentI < 1000 || prevI < 1000 || prevC === 0) return null
  return recentC / recentI / (prevC / prevI) - 1
}

// ── Combinado (todo el marketing) ───────────────────────────────────────────

export interface Blended {
  adSpendCents: Cents
  /** Otros gastos de marketing (Finanzas › gastos de la categoría Marketing). */
  otherMarketingCents: Cents
  totalMarketingCents: Cents
  revenueCents: Cents
  contributionCents: Cents
  sales: number
  newCustomers: number
  /** Facturación / todo el marketing (Marketing Efficiency Ratio). */
  mer: number | null
  /** Todo el marketing / clientes nuevos. */
  blendedCacCents: Cents | null
  /** Ventas atribuidas a pauta y socios (canales con inversión). */
  paidSales: number
  paidRevenueCents: Cents
  paidRoas: number | null
  paidCpaCents: Cents | null
  /** Parte de las ventas con datos de origen (0 a 1). */
  coverage: number
  /** Contribución menos todo el marketing. */
  profitAfterMarketingCents: Cents
}

export function blended(
  input: MarketingInput,
  range: DateRange,
  model: AttributionModel,
  idx = buildIndex(input),
): Blended {
  const { rows, total } = channelPerformance(input, range, model, idx)
  const other = input.expenses
    .filter((e) => e.category === 'marketing')
    .reduce((s, e) => s + expenseInRange(e, range), 0)
  const paid = rows.filter((r) => {
    const kind = channelInfo(r.channel).kind
    return kind === 'paid' || kind === 'partner' || r.spendCents > 0
  })
  const paidSales = paid.reduce((s, r) => s + r.sales, 0)
  const paidRevenue = paid.reduce((s, r) => s + r.revenueCents, 0)
  const unknown = rows.find((r) => r.channel === 'sin-datos')?.sales ?? 0
  const totalMarketing = total.spendCents + other
  return {
    adSpendCents: total.spendCents,
    otherMarketingCents: other,
    totalMarketingCents: totalMarketing,
    revenueCents: total.revenueCents,
    contributionCents: total.contributionCents,
    sales: total.sales,
    newCustomers: total.newCustomers,
    mer: ratio(total.revenueCents, totalMarketing),
    blendedCacCents:
      total.newCustomers > 0 ? Math.round(totalMarketing / total.newCustomers) : null,
    paidSales,
    paidRevenueCents: paidRevenue,
    paidRoas: ratio(paidRevenue, total.spendCents),
    paidCpaCents: paidSales > 0 ? Math.round(total.spendCents / paidSales) : null,
    coverage: total.sales > 0 ? 1 - unknown / total.sales : 0,
    profitAfterMarketingCents: total.contributionCents - totalMarketing,
  }
}

// ── Series ──────────────────────────────────────────────────────────────────

export interface MarketingPoint {
  key: string
  spendCents: Cents
  revenueCents: Cents
  paidRevenueCents: Cents
  contributionCents: Cents
  sales: number
  paidSales: number
  newCustomers: number
  sessions: number
}

/** Inversión, facturación y ventas por día, semana o mes (último clic). */
export function marketingSeries(
  input: MarketingInput,
  range: DateRange,
  bucket: Bucket,
  idx = buildIndex(input),
): MarketingPoint[] {
  const points = new Map<string, MarketingPoint>(
    bucketKeys(range, bucket).map((key) => [
      key,
      {
        key,
        spendCents: 0,
        revenueCents: 0,
        paidRevenueCents: 0,
        contributionCents: 0,
        sales: 0,
        paidSales: 0,
        newCustomers: 0,
        sessions: 0,
      },
    ]),
  )
  const dayKey = (day: string) => bucketKey(new Date(`${day}T12:00:00-03:00`), bucket)
  const from = arDayKey(range.from)
  const to = arDayKey(range.to.getTime() - 1)
  for (const e of input.spend) {
    if (e.day < from || e.day > to) continue
    const p = points.get(dayKey(e.day))
    if (p) p.spendCents += e.spendCents
  }
  for (const t of input.traffic) {
    if (t.day < from || t.day > to) continue
    const p = points.get(dayKey(t.day))
    if (p) p.sessions += t.sessions
  }
  for (const o of input.orders) {
    if (!isNetSale(o) || !inRange(o.paidAt, range)) continue
    const p = points.get(bucketKey(o.paidAt!, bucket))
    if (!p) continue
    const { last } = orderCredits(o, idx)
    const kind = channelInfo(last.channel).kind
    p.sales++
    p.revenueCents += o.amountCents
    p.contributionCents += orderContribution(o, input.settings, idx)
    if (isNewCustomerOrder(o, idx)) p.newCustomers++
    if (kind === 'paid' || kind === 'partner' || last.campaignId) {
      p.paidSales++
      p.paidRevenueCents += o.amountCents
    }
  }
  return [...points.values()]
}

/** Resultados por día de una campaña (para su detalle). */
export function campaignDaily(
  input: MarketingInput,
  campaignId: string,
  range: DateRange,
  model: AttributionModel,
  idx = buildIndex(input),
) {
  const points = new Map(
    bucketKeys(range, 'day').map((key) => [
      key,
      { key, spendCents: 0, impressions: 0, clicks: 0, sales: 0, revenueCents: 0, sessions: 0 },
    ]),
  )
  const campaign = idx.byId.get(campaignId)
  for (const e of input.spend) {
    if (e.campaignId !== campaignId) continue
    const p = points.get(e.day)
    if (!p) continue
    p.spendCents += e.spendCents
    p.impressions += e.impressions
    p.clicks += e.clicks
  }
  if (campaign) {
    for (const t of input.traffic) {
      if (t.campaign.toLowerCase() !== campaign.utmCampaign.toLowerCase()) continue
      const p = points.get(t.day)
      if (p) p.sessions += t.sessions
    }
  }
  for (const o of input.orders) {
    if (!isNetSale(o) || !inRange(o.paidAt, range)) continue
    for (const c of modelCredits(orderCredits(o, idx), model)) {
      if (c.campaignId !== campaignId) continue
      const p = points.get(arDayKey(o.paidAt!))
      if (!p) continue
      p.sales += c.weight
      p.revenueCents += o.amountCents * c.weight
    }
  }
  return [...points.values()]
}

// ── Embudo del sitio ────────────────────────────────────────────────────────

export interface SiteFunnel {
  sessions: number
  themeViews: number
  checkoutViews: number
  paymentStarts: number
  sales: number
}

export function siteFunnel(input: MarketingInput, range: DateRange): SiteFunnel {
  const from = arDayKey(range.from)
  const to = arDayKey(range.to.getTime() - 1)
  let sessions = 0
  let themeViews = 0
  let checkoutViews = 0
  for (const t of input.traffic) {
    if (t.day < from || t.day > to) continue
    sessions += t.sessions
    themeViews += t.themeViews
    checkoutViews += t.checkouts
  }
  let paymentStarts = 0
  let sales = 0
  for (const o of input.orders) {
    if (inRange(o.createdAt, range)) paymentStarts++
    if (isNetSale(o) && inRange(o.paidAt, range)) sales++
  }
  return { sessions, themeViews, checkoutViews, paymentStarts, sales }
}

// ── Ritmo de gasto del mes ──────────────────────────────────────────────────

export interface Pacing {
  budgetCents: Cents
  spentCents: Cents
  /** Lo que se debería llevar gastado a hoy si se gasta parejo. */
  expectedCents: Cents
  projectedCents: Cents
  dayOfMonth: number
  daysInMonth: number
}

export function monthPacing(
  spend: readonly SpendEntry[],
  budgetCents: Cents,
  now = new Date(),
): Pacing {
  const start = arStartOfMonth(now)
  const next = arStartOfMonth(now, 1)
  const days = Math.round((next.getTime() - start.getTime()) / DAY)
  const first = arDayKey(start)
  const today = arDayKey(now)
  const spent = spend
    .filter((e) => e.day >= first && e.day <= today)
    .reduce((s, e) => s + e.spendCents, 0)
  const elapsed = Math.max((now.getTime() - start.getTime()) / DAY, 0.5)
  return {
    budgetCents,
    spentCents: spent,
    expectedCents: Math.round((budgetCents * Math.min(elapsed, days)) / days),
    projectedCents: Math.round((spent / elapsed) * days),
    dayOfMonth: Math.min(Math.ceil(elapsed), days),
    daysInMonth: days,
  }
}

// ── Tiempo hasta la compra y ventas asistidas ───────────────────────────────

/** Días entre el primer toque y la compra (ventas con datos de origen). */
export function daysToPurchase(input: MarketingInput, range: DateRange, idx = buildIndex(input)) {
  const buckets = [
    { label: 'El mismo día', max: 1, count: 0 },
    { label: '1 a 3 días', max: 4, count: 0 },
    { label: '4 a 7 días', max: 8, count: 0 },
    { label: '8 a 14 días', max: 15, count: 0 },
    { label: '15 a 30 días', max: 31, count: 0 },
    { label: 'Más de 30 días', max: Infinity, count: 0 },
  ]
  for (const o of input.orders) {
    if (!isNetSale(o) || !inRange(o.paidAt, range)) continue
    const first = idx.attribution.get(o.id)?.first
    if (!first) continue
    const days = (Date.parse(o.paidAt!) - Date.parse(first.at)) / DAY
    const b = buckets.find((x) => days < x.max)
    if (b) b.count++
  }
  return buckets.map(({ label, count }) => ({ label, count }))
}

/**
 * Ventas en las que cada canal participó sin cerrar: fue el primer toque y
 * la venta la cerró otro. Muestra el valor de los canales que "presentan"
 * Boxie (la prospección, las redes) y que el último clic no ve.
 */
export function assistedByChannel(
  input: MarketingInput,
  range: DateRange,
  idx = buildIndex(input),
) {
  const out = new Map<ChannelId, { closed: number; assisted: number }>()
  for (const o of input.orders) {
    if (!isNetSale(o) || !inRange(o.paidAt, range)) continue
    const { first, last } = orderCredits(o, idx)
    const l = out.get(last.channel) ?? { closed: 0, assisted: 0 }
    l.closed++
    out.set(last.channel, l)
    if (first.channel !== last.channel) {
      const f = out.get(first.channel) ?? { closed: 0, assisted: 0 }
      f.assisted++
      out.set(first.channel, f)
    }
  }
  return [...out.entries()]
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.closed + b.assisted - (a.closed + a.assisted))
}

/** Cortes de un rango en días calendario (para comparar ventanas). */
export function lastDays(now: Date, days: number): DateRange {
  const to = addDays(new Date(`${arDayKey(now)}T00:00:00.000-03:00`), 1)
  return { from: addDays(to, -days), to, preset: 'custom' }
}

// ── Desgloses de visitas y ventas ───────────────────────────────────────────

/** Ventas por período de cada canal pedido (con el modelo elegido). */
export function channelSeries(
  input: MarketingInput,
  range: DateRange,
  bucket: Bucket,
  model: AttributionModel,
  channels: readonly ChannelId[],
  idx = buildIndex(input),
): { key: string; values: number[] }[] {
  const points = new Map(
    bucketKeys(range, bucket).map((key) => [key, channels.map(() => 0)] as const),
  )
  for (const o of input.orders) {
    if (!isNetSale(o) || !inRange(o.paidAt, range)) continue
    const values = points.get(bucketKey(o.paidAt!, bucket))
    if (!values) continue
    for (const c of modelCredits(orderCredits(o, idx), model)) {
      const i = channels.indexOf(c.channel)
      if (i >= 0) values[i]! += c.weight
    }
  }
  return [...points.entries()].map(([key, values]) => ({ key, values }))
}

export interface BreakdownRow {
  key: string
  sessions: number
  themeViews: number
  checkoutViews: number
  sales: number
  revenueCents: Cents
  /** Ventas / visitas. */
  cvr: number | null
}

function breakdown(
  input: MarketingInput,
  range: DateRange,
  keyOfTraffic: (t: TrafficRow) => string,
  keyOfOrder: (a: OrderAttribution) => string | null,
): BreakdownRow[] {
  const from = arDayKey(range.from)
  const to = arDayKey(range.to.getTime() - 1)
  const rows = new Map<string, BreakdownRow>()
  const row = (key: string) => {
    let r = rows.get(key)
    if (!r) {
      r = {
        key,
        sessions: 0,
        themeViews: 0,
        checkoutViews: 0,
        sales: 0,
        revenueCents: 0,
        cvr: null,
      }
      rows.set(key, r)
    }
    return r
  }
  for (const t of input.traffic) {
    if (t.day < from || t.day > to) continue
    const r = row(keyOfTraffic(t))
    r.sessions += t.sessions
    r.themeViews += t.themeViews
    r.checkoutViews += t.checkouts
  }
  const attr = new Map(input.attributions.map((a) => [a.orderId, a]))
  for (const o of input.orders) {
    if (!isNetSale(o) || !inRange(o.paidAt, range)) continue
    const a = attr.get(o.id)
    const key = a ? keyOfOrder(a) : null
    if (key === null) continue
    const r = row(key)
    r.sales++
    r.revenueCents += o.amountCents
  }
  return [...rows.values()]
    .map((r) => ({ ...r, cvr: r.sessions > 0 ? r.sales / r.sessions : null }))
    .sort((a, b) => b.sessions - a.sessions || b.sales - a.sales)
}

/** Visitas y ventas por dispositivo. */
export function deviceStats(input: MarketingInput, range: DateRange): BreakdownRow[] {
  return breakdown(
    input,
    range,
    (t) => t.device,
    (a) => a.device,
  )
}

/** Visitas y ventas por página de entrada (la de la visita que terminó en compra). */
export function landingStats(input: MarketingInput, range: DateRange): BreakdownRow[] {
  return breakdown(
    input,
    range,
    (t) => t.landing,
    (a) => a.last?.landing ?? null,
  )
}

/** Visitas y ventas por origen / medio / campaña (como el informe de Google Analytics). */
export function sourceMediumStats(input: MarketingInput, range: DateRange): BreakdownRow[] {
  const key = (s: { source: string; medium: string; campaign: string }) =>
    `${s.source}\u0000${s.medium}\u0000${s.campaign}`
  return breakdown(input, range, key, (a) => (a.last ? key(a.last) : null))
}
