import { describe, expect, it } from 'vitest'
import type { Expense } from '../admin/types'
import { likelyDuplicatedAdSpend, marketingInsights } from './insights'
import type { Blended, Pacing, SiteFunnel } from './performance'

const blended = (p: Partial<Blended> = {}): Blended => ({
  adSpendCents: 1_000_000,
  otherMarketingCents: 0,
  totalMarketingCents: 1_000_000,
  revenueCents: 5_000_000,
  contributionCents: 4_400_000,
  sales: 100,
  newCustomers: 90,
  mer: 5,
  blendedCacCents: 11_111,
  paidSales: 50,
  paidRevenueCents: 2_500_000,
  paidRoas: 2.5,
  paidCpaCents: 20_000,
  coverage: 0.95,
  profitAfterMarketingCents: 3_400_000,
  ...p,
})
const pacing: Pacing = {
  budgetCents: 0,
  spentCents: 0,
  expectedCents: 0,
  projectedCents: 0,
  dayOfMonth: 10,
  daysInMonth: 30,
}
const funnel: SiteFunnel = {
  sessions: 0,
  themeViews: 0,
  checkoutViews: 0,
  paymentStarts: 0,
  sales: 0,
}
const base = {
  blended: blended(),
  channels: [],
  campaigns: [],
  maxCpaCents: 400_000,
  targetCpaCents: 250_000,
  pacing,
  funnel,
  upcoming: [],
  duplicated: [],
  available: true,
}

describe('recomendaciones de marketing', () => {
  it('el CPA contra el máximo y el objetivo', () => {
    const ids = (p: Partial<Blended>) =>
      marketingInsights({ ...base, blended: blended(p) }).map((i) => i.id)
    expect(ids({ paidCpaCents: 500_000 })).toContain('cpa-over')
    expect(ids({ paidCpaCents: 300_000 })).toContain('cpa-target')
    expect(ids({ paidCpaCents: 100_000 })).toContain('cpa-good')
  })

  it('avisa la falta de datos, la migración y la pauta cargada dos veces, primero lo urgente', () => {
    const expense: Expense = {
      id: 'e1',
      category: 'marketing',
      description: 'Campañas de Instagram',
      vendor: 'Meta Ads',
      amountCents: 100,
      recurrence: 'monthly',
      startsOn: '2026-01-01',
      endsOn: null,
      createdAt: '',
    }
    const dup = likelyDuplicatedAdSpend(
      [expense, { ...expense, id: 'e2', vendor: 'Diseñadora', description: 'Contenido' }],
      1,
    )
    expect(dup.map((e) => e.id)).toEqual(['e1'])
    const list = marketingInsights({
      ...base,
      available: false,
      duplicated: dup,
      blended: blended({ coverage: 0.4 }),
    })
    expect(list[0]!.tone).toBe('critical')
    expect(list.map((i) => i.id)).toEqual(
      expect.arrayContaining(['no-schema', 'double-count', 'coverage']),
    )
  })

  it('el embudo: poca gente que paga después de ver el checkout', () => {
    const list = marketingInsights({
      ...base,
      funnel: {
        sessions: 2000,
        themeViews: 1500,
        checkoutViews: 200,
        paymentStarts: 40,
        sales: 20,
      },
    })
    expect(list.map((i) => i.id)).toEqual(expect.arrayContaining(['checkout-drop', 'payment-drop']))
  })

  it('el ritmo de gasto del mes', () => {
    const over = marketingInsights({
      ...base,
      pacing: { ...pacing, budgetCents: 1_000_000, projectedCents: 1_300_000 },
    })
    expect(over.map((i) => i.id)).toContain('pacing-over')
    const under = marketingInsights({
      ...base,
      pacing: { ...pacing, budgetCents: 1_000_000, projectedCents: 500_000 },
    })
    expect(under.map((i) => i.id)).toContain('pacing-under')
  })
})
