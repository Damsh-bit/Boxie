import { describe, expect, it } from 'vitest'
import {
  SponsorInputSchema,
  SponsorLeadSchema,
  isLive,
  leadToInput,
  liveSponsors,
  sponsorFor,
  toPublic,
  type Sponsor,
} from './sponsors'

// 28/09/2026 a las 10:00 en Argentina.
const NOW = new Date('2026-09-28T13:00:00Z')

function sponsor(overrides: Partial<Sponsor> = {}): Sponsor {
  return {
    id: 's1',
    name: 'Café Martina',
    kind: 'local',
    stage: 'activo',
    tagline: 'El café de la esquina',
    offer: 'Con tu café, una Boxie de regalo',
    description: '',
    emoji: '☕',
    logoUrl: null,
    color: '#8B5E3C',
    url: null,
    city: 'Palermo',
    couponCode: 'MARTINA10',
    placements: ['galeria', 'home'],
    startsOn: null,
    endsOn: null,
    sortOrder: 0,
    contactName: 'Martina',
    contactEmail: 'martina@cafe.com',
    contactPhone: '+54 9 11 5555-5555',
    interests: ['sponsor'],
    notes: 'Paga por mes',
    source: 'panel',
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    ...overrides,
  }
}

describe('isLive', () => {
  it('solo los activos se muestran', () => {
    expect(isLive(sponsor(), NOW)).toBe(true)
    expect(isLive(sponsor({ stage: 'conversacion' }), NOW)).toBe(false)
    expect(isLive(sponsor({ stage: 'pausado' }), NOW)).toBe(false)
  })

  it('respeta las fechas (días de Argentina, con el último día incluido)', () => {
    expect(isLive(sponsor({ startsOn: '2026-09-29' }), NOW)).toBe(false)
    expect(isLive(sponsor({ endsOn: '2026-09-27' }), NOW)).toBe(false)
    expect(isLive(sponsor({ startsOn: '2026-09-28', endsOn: '2026-09-28' }), NOW)).toBe(true)
  })

  it('a las 23:30 de Argentina todavía es el mismo día', () => {
    const lateNight = new Date('2026-09-29T02:30:00Z')
    expect(isLive(sponsor({ endsOn: '2026-09-28' }), lateNight)).toBe(true)
  })
})

describe('lo público', () => {
  it('nunca lleva contacto ni notas', () => {
    const shown = toPublic(sponsor()) as unknown as Record<string, unknown>
    for (const key of ['contactName', 'contactEmail', 'contactPhone', 'notes', 'stage']) {
      expect(shown).not.toHaveProperty(key)
    }
  })

  it('liveSponsors filtra y ordena como el panel', () => {
    const list = [
      sponsor({ id: 'b', name: 'Bici', sortOrder: 2 }),
      sponsor({ id: 'a', name: 'Arte', sortOrder: 1 }),
      sponsor({ id: 'x', name: 'Apagado', stage: 'finalizado' }),
    ]
    expect(liveSponsors(list, NOW).map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('sponsorFor', () => {
  const list = [
    toPublic(sponsor({ id: 'a', placements: ['galeria'] })),
    toPublic(sponsor({ id: 'b', placements: ['galeria', 'home'] })),
  ]

  it('solo los de ese lugar', () => {
    expect(sponsorFor(list, 'home', NOW)?.id).toBe('b')
    expect(sponsorFor(list, 'precios', NOW)).toBeNull()
  })

  it('rotan de un día al otro y no cambian en el mismo día', () => {
    const today = sponsorFor(list, 'galeria', NOW)?.id
    const laterToday = sponsorFor(list, 'galeria', new Date('2026-09-28T20:00:00Z'))?.id
    const tomorrow = sponsorFor(list, 'galeria', new Date('2026-09-29T13:00:00Z'))?.id
    expect(laterToday).toBe(today)
    expect(tomorrow).not.toBe(today)
  })
})

describe('formularios', () => {
  const valid = {
    name: 'Café Martina',
    kind: 'local',
    stage: 'activo',
    tagline: '',
    offer: '',
    description: '',
    emoji: '☕',
    logoUrl: '',
    color: '#8B5E3C',
    url: '',
    city: '',
    couponCode: ' martina10 ',
    placements: ['galeria'],
    startsOn: null,
    endsOn: null,
    sortOrder: 0,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    interests: [],
    notes: '',
  }

  it('normaliza el cupón y deja vacíos como null', () => {
    const parsed = SponsorInputSchema.parse(valid)
    expect(parsed.couponCode).toBe('MARTINA10')
    expect(parsed.logoUrl).toBeNull()
    expect(parsed.url).toBeNull()
  })

  it('el link tiene que ser https y el logo https o una ruta del sitio', () => {
    expect(SponsorInputSchema.safeParse({ ...valid, url: 'http://cafe.com' }).success).toBe(false)
    expect(SponsorInputSchema.safeParse({ ...valid, logoUrl: '/brand/cafe.png' }).success).toBe(
      true,
    )
    expect(SponsorInputSchema.safeParse({ ...valid, logoUrl: 'javascript:alert(1)' }).success).toBe(
      false,
    )
    expect(SponsorInputSchema.safeParse({ ...valid, logoUrl: '//otro.com/x.png' }).success).toBe(
      false,
    )
  })

  it('un activo sin lugares no se puede guardar', () => {
    expect(SponsorInputSchema.safeParse({ ...valid, placements: [] }).success).toBe(false)
    expect(SponsorInputSchema.safeParse({ ...valid, stage: 'lead', placements: [] }).success).toBe(
      true,
    )
  })

  it('las fechas van en orden', () => {
    expect(
      SponsorInputSchema.safeParse({ ...valid, startsOn: '2026-10-10', endsOn: '2026-10-01' })
        .success,
    ).toBe(false)
  })

  it('un contacto desde la web entra como nuevo y sin publicar', () => {
    const lead = SponsorLeadSchema.parse({
      name: 'Martina',
      business: 'Café Martina',
      kind: 'local',
      city: 'Palermo',
      email: 'martina@cafe.com',
      phone: '',
      interests: ['sponsor', 'cobranding'],
      message: 'Abrimos en octubre',
    })
    const input = leadToInput(lead)
    expect(input.stage).toBe('lead')
    expect(input.placements).toEqual([])
    expect(SponsorInputSchema.safeParse(input).success).toBe(true)
  })

  it('el campo trampa frena a los bots', () => {
    expect(
      SponsorLeadSchema.safeParse({
        name: 'Bot',
        business: 'Spam SA',
        kind: 'marca',
        city: '',
        email: 'bot@spam.com',
        phone: '',
        interests: [],
        message: '',
        website: 'http://spam',
      }).success,
    ).toBe(false)
  })
})
