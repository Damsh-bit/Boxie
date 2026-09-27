import 'server-only'
import { monthlyFixedCents } from '@/domain/admin/finance'
import { inRange, rangeFromPreset } from '@/domain/admin/range'
import {
  salesMix,
  targetCpa,
  targetPoas,
  targetRoas,
  unitEconomics,
  type PlanMix,
} from '@/domain/marketing/economics'
import { buildIndex, type MarketingInput } from '@/domain/marketing/performance'
import type { AttributionModel } from '@/domain/marketing/types'
import { adminRepo } from '@/server/admin/repo'
import { marketingRepo } from '@/server/marketing/repo'
import { one, rangeFromParams } from '../../../_lib/range'

/**
 * Lo que comparten todas las páginas de Marketing: las ventas del panel, los
 * datos de marketing, el período y el modelo de atribución de la URL, y la
 * economía de una venta promedio (de ahí salen el CPA máximo, el objetivo y
 * los ROAS de referencia).
 */

type Params = Record<string, string | string[] | undefined>

export const MODEL_FROM_SLUG: Record<string, AttributionModel> = {
  ultimo: 'last',
  primer: 'first',
  repartido: 'linear',
}
export const MODEL_SLUG: Record<AttributionModel, string> = {
  last: 'ultimo',
  first: 'primer',
  linear: 'repartido',
}

export async function loadMarketing(
  params: Params,
  fallback: Parameters<typeof rangeFromParams>[1] = '30d',
) {
  const [repo, mrepo] = await Promise.all([adminRepo(), marketingRepo()])
  const [data, m] = await Promise.all([repo.dataset(), mrepo.dataset()])
  const now = new Date()
  const { range, bucket, picker, label } = rangeFromParams(params, fallback)
  const model = MODEL_FROM_SLUG[one(params.modelo)] ?? m.settings.defaultModel

  const input: MarketingInput = {
    orders: data.orders,
    affiliates: data.affiliates,
    expenses: data.expenses,
    settings: data.settings,
    campaigns: m.campaigns,
    spend: m.spend,
    traffic: m.traffic,
    attributions: m.attributions,
  }
  const idx = buildIndex(input)

  // La venta promedio del período (o de los últimos 90 días, o el plan destacado).
  let mix: PlanMix = salesMix(data.orders, data.affiliates, range).all
  if (!mix.sales) mix = salesMix(data.orders, data.affiliates, rangeFromPreset('90d', now)).all
  if (!mix.sales) {
    const plan = data.plans.find((p) => p.highlighted && p.active) ?? data.plans[0]
    const price = plan?.priceCents ?? data.settings.basePriceCents
    mix = {
      planId: plan?.id ?? null,
      sales: 0,
      listPriceCents: price,
      discountRate: 0,
      affiliateCents: 0,
      chargedCents: price,
    }
  }

  // Gastos fijos por venta: lo fijo del mes repartido en las ventas de los últimos 30 días.
  const fixedMonthly = monthlyFixedCents(data.expenses, now)
  const last30 = rangeFromPreset('30d', now)
  const sales30 = data.orders.filter((o) => o.status === 'paid' && inRange(o.paidAt, last30)).length
  const fixedPerSale = sales30 ? Math.round(fixedMonthly / sales30) : 0

  const base = unitEconomics({
    listPriceCents: mix.listPriceCents,
    discountRate: mix.discountRate,
    affiliateCents: mix.affiliateCents,
    settings: data.settings,
    acquisitionCents: 0,
    fixedPerSaleCents: fixedPerSale,
  })
  const margin = m.settings.targetMarginBps
  const targets = {
    maxCpaCents: base.maxCpaCents,
    targetCpaCents: targetCpa(base, margin),
    breakEvenRoas: base.breakEvenRoas,
    targetRoas: targetRoas(base, margin),
    targetPoas: targetPoas(base, margin),
  }

  return {
    mode: repo.mode,
    data,
    m,
    now,
    range,
    bucket,
    picker,
    label,
    model,
    input,
    idx,
    mix,
    base,
    targets,
    fixedMonthly,
    fixedPerSale,
  }
}

export type MarketingContext = Awaited<ReturnType<typeof loadMarketing>>
