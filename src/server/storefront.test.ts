import { describe, expect, it } from 'vitest'
import type { Plan } from '@/domain/plans'
import { readThemeConfig } from '@/slides/config'
import { withDefaultPlans } from '@/slides/plans'
import amistad from '../../supabase/seed/themes/amistad.json'
import pareja from '../../supabase/seed/themes/pareja.json'
import { kindTiers, summarizePlans } from './storefront'

function plan(slug: string, rank: number, days: number, overrides: Partial<Plan> = {}): Plan {
  return {
    id: slug,
    slug,
    name: slug[0]!.toUpperCase() + slug.slice(1),
    tagline: '',
    priceCents: rank * 100_000,
    compareAtCents: rank * 150_000,
    rank,
    color: '#F44E63',
    features: [],
    limits: { giftLifetimeDays: days, maxPhotos: rank * 10, allowPassword: rank > 1 },
    highlighted: rank === 2,
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const plans = [plan('esencial', 1, 30), plan('clasica', 2, 60), plan('premium', 3, 120)]
const configOf = (seed: { config: { slides: { key: string; kind: string }[] } }) =>
  readThemeConfig({ slides: withDefaultPlans(seed.config.slides, plans) })
const configs = [configOf(pareja), configOf(amistad)]

describe('vidriera', () => {
  it('cada plan dice lo que incluye en la temática más completa', () => {
    const summary = summarizePlans(plans, configs)
    expect(summary.map((p) => p.slug)).toEqual(['esencial', 'clasica', 'premium'])
    // Un plan incluye todo lo de abajo: nunca menos pantallas ni juegos.
    for (let i = 1; i < summary.length; i++) {
      expect(summary[i]!.screens).toBeGreaterThan(summary[i - 1]!.screens)
      expect(summary[i]!.games).toBeGreaterThanOrEqual(summary[i - 1]!.games)
    }
    // El más completo trae todas las pantallas de la temática más larga.
    expect(summary[2]!.screens).toBe(Math.max(...configs.map((c) => c.slides.length)))
    expect(summary[0]!.games).toBe(0)
    expect(summary.map((p) => p.days)).toEqual([30, 60, 120])
    expect(summary[1]!.savingsPercent).toBe(33)
  })

  it('las pantallas de los juegos se etiquetan con el plan desde el que entran', () => {
    const tiers = kindTiers(plans, configs)
    expect(tiers['game.trivia']).toBe('Clasica')
    expect(tiers['game.coupons']).toBe('Clasica')
    expect(tiers['game.fortune']).toBe('Premium')
    // Lo que va en todos los planes no lleva etiqueta.
    expect(tiers['story.dedication']).toBeUndefined()
    expect(tiers['media.song']).toBeUndefined()
    expect(tiers['intro.logo']).toBeUndefined()
  })

  it('sin planes no hay etiquetas ni resumen', () => {
    expect(summarizePlans([], configs)).toEqual([])
    expect(kindTiers([], configs)).toEqual({})
  })
})
