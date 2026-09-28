import 'server-only'
import { randomUUID } from 'node:crypto'
import type { AuditEntry } from '@/domain/admin/types'
import type { Sponsor, SponsorInput } from '@/domain/sponsors'
import type { Actor } from '../admin/repo'
import type { DemoDb } from '../admin/demo/seed'
import { demoDb, mutateDemoDb } from '../admin/demo/store'
import { SponsorsError, type SponsorsRepo } from './repo'

/**
 * Sponsors sobre la base de demo (en memoria). La primera vez se siembran
 * ejemplos para ver cómo queda el sitio con un aliado activo, uno pausado y
 * contactos nuevos. Son inventados: en producción no aparece nada de esto.
 */

const now = () => new Date().toISOString()

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

function example(input: Partial<Sponsor> & Pick<Sponsor, 'name'>): Sponsor {
  return {
    id: randomUUID(),
    kind: 'local',
    stage: 'lead',
    tagline: '',
    offer: '',
    description: '',
    emoji: '🤝',
    logoUrl: null,
    color: '#F44E63',
    url: null,
    city: '',
    couponCode: null,
    placements: [],
    startsOn: null,
    endsOn: null,
    sortOrder: 0,
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    interests: [],
    notes: '',
    source: 'panel',
    createdAt: daysAgo(20),
    updatedAt: daysAgo(3),
    ...input,
  }
}

function seedSponsors(): Sponsor[] {
  return [
    example({
      name: 'Café Martina',
      kind: 'local',
      stage: 'activo',
      tagline: 'Especialidad en Palermo, desde 2019',
      offer: 'Con tu flat white, una Boxie de regalo para quien quieras',
      description:
        'Cada café para llevar trae un código: la persona arma una Boxie gratis para regalarle a alguien.',
      emoji: '☕',
      color: '#8B5E3C',
      url: 'https://instagram.com',
      city: 'Palermo, CABA',
      couponCode: 'BOXIE10',
      placements: ['home', 'galeria', 'marcas'],
      sortOrder: 1,
      contactName: 'Martina Ruiz',
      contactEmail: 'martina@cafemartina.com',
      contactPhone: '+54 9 11 5555-0101',
      interests: ['sponsor', 'cobranding'],
      notes: 'Arrancamos con 300 vasos con QR. Revisar resultados a fin de mes.',
      source: 'web',
      createdAt: daysAgo(40),
    }),
    example({
      name: 'Florería Las Violetas',
      kind: 'local',
      stage: 'pausado',
      tagline: 'Flores que llegan, Boxies que quedan',
      offer: 'Con cada ramo, una Boxie con la dedicatoria',
      emoji: '💐',
      color: '#7A4FC4',
      city: 'Caballito, CABA',
      placements: ['galeria'],
      contactName: 'Lucía',
      contactEmail: 'hola@lasvioletas.com',
      interests: ['campana'],
      notes: 'Pausado hasta el Día de la Madre.',
      createdAt: daysAgo(60),
    }),
    example({
      name: 'Arena Gaming Bar',
      kind: 'local',
      stage: 'conversacion',
      emoji: '🎮',
      color: '#2A78D6',
      city: 'Córdoba',
      contactName: 'Nico',
      contactEmail: 'nico@arenabar.com',
      contactPhone: '+54 9 351 555-0199',
      interests: ['cobranding', 'campana'],
      notes: 'Quieren una Boxie gamer para los cumpleaños que festejan en el bar.',
      source: 'web',
      createdAt: daysAgo(9),
    }),
    example({
      name: 'Cine Club Norte',
      kind: 'evento',
      stage: 'lead',
      emoji: '🎬',
      color: '#D03B3B',
      city: 'Rosario',
      contactName: 'Paula',
      contactEmail: 'paula@cineclubnorte.org',
      interests: ['sponsor'],
      notes: 'Escribieron desde /marcas: ciclo de cine de verano.',
      source: 'web',
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    }),
  ]
}

function sponsors(db: DemoDb): Sponsor[] {
  db.sponsors ??= seedSponsors()
  return db.sponsors
}

function audit(db: DemoDb, actor: Actor, action: string, entityId: string, summary: string) {
  const entry: AuditEntry = {
    id: randomUUID(),
    at: now(),
    actor: actor.email,
    action,
    entity: 'sponsor',
    entityId,
    summary,
  }
  db.audit.unshift(entry)
  if (db.audit.length > 500) db.audit.length = 500
}

function create(db: DemoDb, input: SponsorInput, source: Sponsor['source']): Sponsor {
  const at = now()
  const sponsor: Sponsor = { ...input, id: randomUUID(), source, createdAt: at, updatedAt: at }
  sponsors(db).unshift(sponsor)
  return sponsor
}

export const demoSponsorsRepo: SponsorsRepo = {
  mode: 'demo',

  async list() {
    const db = demoDb()
    // La primera lectura siembra (y guarda) los ejemplos.
    const list = db.sponsors ?? mutateDemoDb((d) => sponsors(d))
    return { available: true, sponsors: list }
  },

  async save(input, actor) {
    return mutateDemoDb((db) => {
      if (input.id) {
        const current = sponsors(db).find((s) => s.id === input.id)
        if (!current) throw new SponsorsError('El sponsor no existe.', 'not_found')
        Object.assign(current, { ...input, updatedAt: now() })
        audit(db, actor, 'sponsor.update', current.id, `Editó el sponsor "${current.name}"`)
        return current
      }
      const sponsor = create(db, input, 'panel')
      audit(db, actor, 'sponsor.create', sponsor.id, `Sumó el sponsor "${sponsor.name}"`)
      return sponsor
    })
  },

  async delete(id, actor) {
    mutateDemoDb((db) => {
      const current = sponsors(db).find((s) => s.id === id)
      if (!current) throw new SponsorsError('El sponsor no existe.', 'not_found')
      db.sponsors = sponsors(db).filter((s) => s.id !== id)
      audit(db, actor, 'sponsor.delete', id, `Borró el sponsor "${current.name}"`)
    })
  },

  async createLead(input) {
    return mutateDemoDb((db) => create(db, input, 'web'))
  },
}
