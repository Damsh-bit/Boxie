import { describe, expect, it } from 'vitest'
import { parseThemeConfig } from '../config'
import { configForPlan, planContents } from '../plans'
import {
  ARCHETYPES,
  detectArchetype,
  generateBatch,
  generateTheme,
  parseThemeList,
  slugify,
} from './generate'

const plans = [
  { id: 'p1', slug: 'esencial', name: 'Esencial', rank: 1, active: true },
  { id: 'p2', slug: 'clasica', name: 'Clásica', rank: 2, active: true },
  { id: 'p3', slug: 'premium', name: 'Premium', rank: 3, active: true },
]
const fullPlans = plans.map((p) => ({
  ...p,
  tagline: '',
  priceCents: p.rank * 100_000,
  compareAtCents: null,
  color: '#F44E63',
  features: [],
  limits: { giftLifetimeDays: 60, maxPhotos: 30, allowPassword: true },
  highlighted: p.rank === 2,
  createdAt: '',
  updatedAt: '',
}))

describe('lista de temáticas', () => {
  it('acepta una por línea, con viñetas o numeradas, y saca repetidos', () => {
    expect(
      parseThemeList('1. Día de la Madre\n- mascotas\n• Gamer\n\nmascotas\nDía de la madre'),
    ).toEqual(['Día de la Madre', 'Mascotas', 'Gamer'])
  })

  it('en una sola línea separa por comas', () => {
    expect(parseThemeList('Navidad, Graduación; Viajes')).toEqual([
      'Navidad',
      'Graduación',
      'Viajes',
    ])
  })

  it('arma slugs válidos sin tildes', () => {
    expect(slugify('Día de la Madre ❤️')).toBe('dia-de-la-madre')
    expect(slugify('¡Egresados 2026!')).toBe('egresados-2026')
  })
})

describe('detección de la ocasión', () => {
  const cases: [string, string][] = [
    ['Día de la Madre', 'madre'],
    ['Para papá', 'padre'],
    ['San Valentín', 'amor'],
    ['Aniversario de novios', 'amor'],
    ['Mejores amigas', 'amistad'],
    ['Despedida de soltera', 'amistad'],
    ['Cumple de 15', 'cumpleanos'],
    ['Egresados 2026', 'graduacion'],
    ['Navidad en familia', 'navidad'],
    ['Papá Noel', 'navidad'],
    ['Amantes de los perros', 'mascotas'],
    ['Counter-Strike', 'gamer'],
    ['Hinchas de Boca', 'futbol'],
    ['Día del Maestro', 'docentes'],
    ['Compañeros de trabajo', 'gracias'],
    ['Pronta mejoría', 'animo'],
    ['Perdón', 'perdon'],
    ['Viaje de egresados a Bariloche', 'graduacion'],
    ['Abuela', 'abuelos'],
    ['Baby shower', 'bebe'],
  ]
  it.each(cases)('"%s" → %s', (name, id) => {
    expect(detectArchetype(name).archetype.id).toBe(id)
  })

  it('lo que no reconoce va a la ocasión general', () => {
    const d = detectArchetype('Xyzzy')
    expect(d.archetype.id).toBe('general')
    expect(d.score).toBe(0)
  })
})

describe('generador', () => {
  it('cada arquetipo genera una temática válida, en las dos estructuras', () => {
    for (const a of ARCHETYPES) {
      const name = a.keywords.find((k) => !k.startsWith('=')) ?? a.label
      for (const structure of ['completa', 'compacta'] as const) {
        const theme = generateTheme(name, { plans, structure })
        expect(parseThemeConfig(theme.config).success, `${a.id} ${structure}`).toBe(true)
        expect(theme.listing.images.length).toBeGreaterThan(0)
      }
    }
  })

  it('es determinístico y la variante cambia la paleta cuando hay más de una', () => {
    const a = generateTheme('Mascotas', { plans })
    const b = generateTheme('Mascotas', { plans })
    expect(a).toEqual(b)
    const other = generateTheme('Mascotas', { plans, variant: 1 })
    expect(other.palette.name).not.toBe(a.palette.name)
  })

  it('reparte las slides en planes: el más caro incluye todo', () => {
    const theme = generateTheme('Día de la Madre', { plans: fullPlans })
    const parsed = parseThemeConfig(theme.config)
    if (!parsed.success) throw new Error(parsed.issues.join('\n'))
    const contents = planContents(parsed.data, fullPlans)
    expect(contents.map((c) => c.screens)).toEqual(
      [...contents.map((c) => c.screens)].sort((x, y) => x - y),
    )
    expect(contents.at(-1)!.screens).toBe(parsed.data.slides.length)
    const basic = configForPlan(parsed.data, fullPlans[0]!, fullPlans)
    expect(basic.slides.map((s) => s.kind)).toContain('story.dedication')
    expect(basic.slides.map((s) => s.kind)).not.toContain('media.streaming')
  })

  it('no repite slugs dentro del lote ni con los existentes', () => {
    const batch = generateBatch(['Mascotas', 'mascotas!', 'Gamer'], {
      plans,
      existingSlugs: ['gamer'],
    })
    expect(batch.map((t) => t.slug)).toEqual(['mascotas', 'mascotas-2', 'gamer-2'])
  })
})
