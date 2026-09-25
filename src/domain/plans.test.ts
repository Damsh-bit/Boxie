import { describe, expect, it } from 'vitest'
import {
  activePlans,
  minRankOf,
  planIncludes,
  planIssues,
  recommendedPlan,
  savingsPercent,
  type Plan,
} from './plans'

function plan(p: Partial<Plan>): Plan {
  return {
    id: p.slug ?? 'x',
    slug: 'x',
    name: 'X',
    tagline: '',
    priceCents: 100_000,
    compareAtCents: null,
    rank: 1,
    color: '#F44E63',
    features: [],
    limits: { giftLifetimeDays: 60, maxPhotos: 30, allowPassword: true },
    highlighted: false,
    active: true,
    createdAt: '',
    updatedAt: '',
    ...p,
  }
}

const esencial = plan({ slug: 'esencial', name: 'Esencial', rank: 1, priceCents: 349_000 })
const clasica = plan({
  slug: 'clasica',
  name: 'Clásica',
  rank: 2,
  priceCents: 499_000,
  highlighted: true,
})
const premium = plan({ slug: 'premium', name: 'Premium', rank: 3, priceCents: 799_000 })
const plans = [premium, esencial, clasica]

describe('planes', () => {
  it('ordena por nivel y deja afuera los inactivos', () => {
    expect(
      activePlans([...plans, plan({ slug: 'viejo', active: false })]).map((p) => p.slug),
    ).toEqual(['esencial', 'clasica', 'premium'])
  })

  it('un plan incluye las slides de su nivel y de los de abajo', () => {
    expect(planIncludes(clasica, 'esencial', plans)).toBe(true)
    expect(planIncludes(clasica, 'clasica', plans)).toBe(true)
    expect(planIncludes(clasica, 'premium', plans)).toBe(false)
    expect(planIncludes(esencial, 'premium', plans)).toBe(false)
  })

  it('una slide sin plan o con un plan que ya no existe va en todos', () => {
    expect(planIncludes(esencial, undefined, plans)).toBe(true)
    expect(minRankOf('borrado', plans)).toBe(Number.NEGATIVE_INFINITY)
  })

  it('recomienda el destacado', () => {
    expect(recommendedPlan(plans)?.slug).toBe('clasica')
    expect(recommendedPlan(plans.map((p) => ({ ...p, highlighted: false })))?.slug).toBe('clasica')
  })

  it('calcula el ahorro contra el precio tachado', () => {
    expect(savingsPercent({ priceCents: 499_000, compareAtCents: 999_000 })).toBe(50)
    expect(savingsPercent({ priceCents: 499_000, compareAtCents: null })).toBe(0)
  })

  it('detecta una grilla inconsistente', () => {
    expect(planIssues(plans)).toEqual([])
    const cheapPremium = { ...premium, priceCents: 100_000 }
    expect(planIssues([esencial, clasica, cheapPremium]).map((i) => i.planId)).toContain('premium')
    const twoHighlighted = [esencial, clasica, { ...premium, highlighted: true }]
    expect(planIssues(twoHighlighted)[0]?.message).toMatch(/más de un plan destacado/)
  })
})
