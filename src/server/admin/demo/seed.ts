import 'server-only'
import amistad from '../../../../supabase/seed/themes/amistad.json'
import cumpleanos from '../../../../supabase/seed/themes/cumpleanos.json'
import pareja from '../../../../supabase/seed/themes/pareja.json'
import { addDays, arDayKey, arStartOfDay, arWeekdayHour } from '@/domain/admin/range'
import type {
  AdminAffiliate,
  AdminBoxie,
  AdminCoupon,
  AdminOrder,
  AdminSettings,
  AdminTask,
  AdminUser,
  AuditEntry,
  Expense,
  PaymentEvent,
  ThemeOrigin,
  ThemeStatus,
} from '@/domain/admin/types'
import { couponDiscount } from '@/domain/coupons'
import type { Plan } from '@/domain/plans'
import { parseThemeConfig } from '@/slides/config'
import { generateTheme } from '@/slides/generator/generate'
import { planContents, withDefaultPlans } from '@/slides/plans'
import type { ThemeConfigInput } from '@/slides/theme-config'
import { DEFAULT_DEMO_EMAIL } from '../token'

/**
 * Datos de demostración del panel: un año de ventas simuladas, con la forma
 * que tendría el negocio real (crecimiento, fines de semana, San Valentín, Día
 * del Amigo, Día de la Madre, Navidad), clientes que vuelven, cupones,
 * reembolsos y Boxies en todos sus estados.
 *
 * Es determinístico (misma semilla, mismos datos) y termina siempre "ahora".
 * Ningún dato es de una persona real: los mails son @ejemplo.com.
 */

export const DEMO_DB_VERSION = 3

export interface DemoThemeVersion {
  id: string
  version: number
  config: ThemeConfigInput
  publishedAt: string
  createdBy: string | null
}

export interface DemoTheme {
  id: string
  slug: string
  name: string
  category: string
  description: string
  status: ThemeStatus
  priceCents: number | null
  sortOrder: number
  listing: unknown
  draftConfig: ThemeConfigInput
  currentVersionId: string | null
  origin: ThemeOrigin
  createdAt: string
  updatedAt: string
  versions: DemoThemeVersion[]
}

export interface DemoDb {
  version: number
  seededAt: string
  settings: AdminSettings
  plans: Plan[]
  themes: DemoTheme[]
  coupons: AdminCoupon[]
  affiliates: AdminAffiliate[]
  orders: AdminOrder[]
  events: PaymentEvent[]
  boxies: AdminBoxie[]
  expenses: Expense[]
  team: AdminUser[]
  audit: AuditEntry[]
  tasks: AdminTask[]
}

// ── Azar reproducible ───────────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296
  }
}

class Rng {
  private next: () => number
  constructor(seed: number) {
    this.next = mulberry32(seed)
  }
  float() {
    return this.next()
  }
  int(min: number, max: number) {
    return min + Math.floor(this.next() * (max - min + 1))
  }
  chance(p: number) {
    return this.next() < p
  }
  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]!
  }
  weighted<T>(items: readonly (readonly [T, number])[]): T {
    const total = items.reduce((s, [, w]) => s + w, 0)
    let r = this.next() * total
    for (const [item, w] of items) {
      r -= w
      if (r <= 0) return item
    }
    return items[items.length - 1]![0]
  }
  /** Poisson (Knuth): cuántos checkouts en un día. */
  poisson(lambda: number) {
    const l = Math.exp(-lambda)
    let k = 0
    let p = 1
    do {
      k++
      p *= this.next()
    } while (p > l)
    return k - 1
  }
  uuid() {
    const hex = Array.from({ length: 32 }, () => Math.floor(this.next() * 16).toString(16))
    hex[12] = '4'
    hex[16] = ((Number.parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16)
    const h = hex.join('')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  digits(n: number) {
    return Array.from({ length: n }, (_, i) => (i === 0 ? this.int(1, 9) : this.int(0, 9))).join('')
  }
}

// ── Personas ficticias ──────────────────────────────────────────────────────

const FIRST = [
  'Sofía',
  'Martina',
  'Valentina',
  'Camila',
  'Lucía',
  'Julieta',
  'Florencia',
  'Agustina',
  'Micaela',
  'Rocío',
  'Paula',
  'Carolina',
  'Belén',
  'Milagros',
  'Abril',
  'Candela',
  'Victoria',
  'Luz',
  'Brenda',
  'Mateo',
  'Santiago',
  'Tomás',
  'Lucas',
  'Joaquín',
  'Nicolás',
  'Facundo',
  'Martín',
  'Ignacio',
  'Franco',
  'Gonzalo',
  'Bruno',
  'Lautaro',
  'Federico',
  'Matías',
  'Juan',
  'Agustín',
  'Ramiro',
  'Emiliano',
]
const LAST = [
  'González',
  'Rodríguez',
  'Gómez',
  'Fernández',
  'López',
  'Díaz',
  'Martínez',
  'Pérez',
  'García',
  'Sánchez',
  'Romero',
  'Sosa',
  'Torres',
  'Álvarez',
  'Ruiz',
  'Ramírez',
  'Flores',
  'Benítez',
  'Acosta',
  'Medina',
  'Herrera',
  'Suárez',
  'Aguirre',
  'Giménez',
  'Molina',
  'Castro',
  'Ortiz',
  'Silva',
  'Ríos',
]
const RECIPIENTS = [
  'Sofi',
  'Mica',
  'Juli',
  'Cami',
  'Flor',
  'Agus',
  'Vale',
  'Lu',
  'Mati',
  'Tomi',
  'Nico',
  'Juan',
  'Fede',
  'Mamá',
  'Papá',
  'Abu',
  'Mi amor',
  'Gordi',
  'Chula',
  'Bebu',
  'Martu',
  'Rochi',
  'Lolo',
  'Pili',
  'Santi',
]

const ascii = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')

// ── Planes, configuración y catálogo ────────────────────────────────────────

const ISO = (d: Date) => d.toISOString()
const at = (day: string, time = '12:00') => new Date(`${day}T${time}:00.000-03:00`)

function seedPlans(): Plan[] {
  const base = {
    color: '#F44E63',
    active: true,
    createdAt: '2025-09-01T15:00:00.000Z',
    updatedAt: '2026-07-10T15:00:00.000Z',
  }
  return [
    {
      ...base,
      id: 'b0a1e7f4-1c2d-4e5f-8a9b-000000000001',
      slug: 'esencial',
      name: 'Esencial',
      tagline: 'Lo justo para emocionar',
      priceCents: 349_000,
      compareAtCents: 599_000,
      rank: 1,
      color: '#73CFEE',
      features: ['Link para compartir por WhatsApp', 'Editás hasta regalarla'],
      limits: { giftLifetimeDays: 30, maxPhotos: 5, allowPassword: false },
      highlighted: false,
    },
    {
      ...base,
      id: 'b0a1e7f4-1c2d-4e5f-8a9b-000000000002',
      slug: 'clasica',
      name: 'Clásica',
      tagline: 'La experiencia completa, con juegos',
      priceCents: 499_000,
      compareAtCents: 899_000,
      rank: 2,
      features: ['Clave opcional para abrirla', 'Juegos y cuponera', 'Online 60 días'],
      limits: { giftLifetimeDays: 60, maxPhotos: 15, allowPassword: true },
      highlighted: true,
    },
    {
      ...base,
      id: 'b0a1e7f4-1c2d-4e5f-8a9b-000000000003',
      slug: 'premium',
      name: 'Premium',
      tagline: 'Todo, para un regalo inolvidable',
      priceCents: 799_000,
      compareAtCents: 1_299_000,
      rank: 3,
      color: '#C893D7',
      features: ['Todas las pantallas', 'Online 120 días', 'Soporte prioritario por WhatsApp'],
      limits: { giftLifetimeDays: 120, maxPhotos: 30, allowPassword: true },
      highlighted: false,
    },
  ]
}

interface ThemePlan {
  slug: string
  status: ThemeStatus
  origin: ThemeOrigin
  created: string
  /** Fechas de publicación de cada versión. */
  versions: string[]
  archivedAt?: string
  sortOrder: number
  build(plans: Plan[]): {
    name: string
    category: string
    description: string
    listing: unknown
    config: ThemeConfigInput
  }
}

const fromSeed =
  (seed: typeof pareja) =>
  (plans: Plan[]): ReturnType<ThemePlan['build']> => ({
    name: seed.name,
    category: seed.category,
    description: seed.description,
    listing: seed.listing,
    config: {
      ...(seed.config as ThemeConfigInput),
      slides: withDefaultPlans((seed.config as ThemeConfigInput).slides, plans),
    },
  })

const generated =
  (name: string, variant = 0) =>
  (plans: Plan[]): ReturnType<ThemePlan['build']> => {
    const t = generateTheme(name, { plans, variant })
    return {
      name: t.name,
      category: t.category,
      description: t.description,
      listing: t.listing,
      config: t.config,
    }
  }

const THEME_PLANS: (ThemePlan & { weight: number; id: string })[] = [
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000001',
    slug: 'pareja',
    status: 'published',
    origin: 'seed',
    created: '2025-09-01',
    versions: ['2025-09-01', '2026-01-28', '2026-07-10'],
    sortOrder: 1,
    weight: 36,
    build: fromSeed(pareja),
  },
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000002',
    slug: 'cumpleanos',
    status: 'published',
    origin: 'seed',
    created: '2025-09-01',
    versions: ['2025-09-01', '2026-07-10'],
    sortOrder: 2,
    weight: 26,
    build: fromSeed(cumpleanos as typeof pareja),
  },
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000003',
    slug: 'amistad',
    status: 'published',
    origin: 'seed',
    created: '2025-09-01',
    versions: ['2025-09-01', '2026-07-01', '2026-07-10'],
    sortOrder: 3,
    weight: 18,
    build: fromSeed(amistad as typeof pareja),
  },
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000004',
    slug: 'dia-de-la-madre',
    status: 'published',
    origin: 'generator',
    created: '2025-09-25',
    versions: ['2025-09-28', '2026-09-15'],
    sortOrder: 4,
    weight: 6,
    build: generated('Día de la Madre'),
  },
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000005',
    slug: 'mascotas',
    status: 'published',
    origin: 'generator',
    created: '2026-05-28',
    versions: ['2026-06-01'],
    sortOrder: 5,
    weight: 8,
    build: generated('Mascotas'),
  },
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000006',
    slug: 'halloween',
    status: 'archived',
    origin: 'generator',
    created: '2025-10-10',
    versions: ['2025-10-14'],
    archivedAt: '2025-11-03',
    sortOrder: 9,
    weight: 0,
    build: generated('Halloween'),
  },
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000007',
    slug: 'gamer',
    status: 'draft',
    origin: 'generator',
    created: '2026-09-20',
    versions: [],
    sortOrder: 6,
    weight: 0,
    build: generated('Gamer'),
  },
  {
    id: 'c1a1e7f4-1c2d-4e5f-8a9b-000000000008',
    slug: 'navidad',
    status: 'draft',
    origin: 'generator',
    created: '2026-09-22',
    versions: [],
    sortOrder: 7,
    weight: 0,
    build: generated('Navidad en familia'),
  },
]

function seedThemes(plans: Plan[], rng: Rng, now: Date): DemoTheme[] {
  return THEME_PLANS.flatMap((t) => {
    const created = at(t.created)
    if (created > now) return []
    const built = t.build(plans)
    if (!parseThemeConfig(built.config).success) throw new Error(`Semilla inválida: ${t.slug}`)
    const versions: DemoThemeVersion[] = t.versions
      .map((day) => at(day, '10:30'))
      .filter((d) => d <= now)
      .map((d, i) => ({
        id: rng.uuid(),
        version: i + 1,
        config: built.config,
        publishedAt: ISO(d),
        createdBy: DEFAULT_DEMO_EMAIL,
      }))
    const status: ThemeStatus = versions.length === 0 ? 'draft' : t.status
    const last = versions.at(-1)
    return [
      {
        id: t.id,
        slug: t.slug,
        name: built.name,
        category: built.category,
        description: built.description,
        status,
        priceCents: null,
        sortOrder: t.sortOrder,
        listing: built.listing,
        draftConfig: built.config,
        currentVersionId: last?.id ?? null,
        origin: t.origin,
        createdAt: ISO(created),
        updatedAt: ISO(
          t.archivedAt ? at(t.archivedAt) : last ? new Date(last.publishedAt) : created,
        ),
        versions,
      },
    ]
  })
}

function seedCoupons(): (AdminCoupon & { weight: number })[] {
  const c = (
    id: number,
    code: string,
    value: number,
    p: Partial<AdminCoupon> & { weight: number },
  ): AdminCoupon & { weight: number } => ({
    id: `d1a1e7f4-1c2d-4e5f-8a9b-${String(id).padStart(12, '0')}`,
    code,
    kind: 'percent',
    value,
    active: true,
    maxUses: null,
    usedCount: 0,
    startsAt: null,
    expiresAt: null,
    affiliateId: null,
    description: '',
    createdAt: '2025-09-01T15:00:00.000Z',
    updatedAt: '2025-09-01T15:00:00.000Z',
    ...p,
  })
  return [
    c(1, 'BOXIE10', 10, { weight: 30, description: 'Bienvenida: la home lo ofrece a todos.' }),
    c(2, 'PAREJA20', 20, { weight: 8, description: 'Campaña de aniversarios.' }),
    c(3, 'INFLUENCER50', 50, {
      weight: 3,
      maxUses: 150,
      affiliateId: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000001',
      description: 'Sorteos y colaboraciones con creadoras.',
    }),
    c(4, 'LOQUIEROYA25', 25, { weight: 22, description: 'Oferta de urgencia de la ficha.' }),
    c(5, 'PROMO35', 35, {
      weight: 6,
      active: false,
      expiresAt: '2026-03-01T03:00:00.000Z',
      description: 'San Valentín 2026 (terminó).',
    }),
    c(6, 'AMIGO20', 20, {
      weight: 10,
      startsAt: '2026-07-10T03:00:00.000Z',
      expiresAt: '2026-07-21T03:00:00.000Z',
      description: 'Semana del amigo 2026.',
    }),
    c(7, 'SOFI10', 10, {
      weight: 6,
      maxUses: 300,
      affiliateId: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000002',
      description: 'Código de afiliada.',
      createdAt: '2026-04-01T15:00:00.000Z',
    }),
    c(8, 'MAMA15', 15, {
      weight: 0,
      startsAt: '2026-10-01T03:00:00.000Z',
      expiresAt: '2026-10-19T03:00:00.000Z',
      description: 'Día de la Madre 2026 (programado).',
      createdAt: '2026-09-18T15:00:00.000Z',
    }),
    c(9, 'NAVIDAD25', 25, {
      weight: 0,
      active: false,
      description: 'Borrador para diciembre.',
      createdAt: '2026-09-22T15:00:00.000Z',
    }),
  ]
}

function seedAffiliates(): AdminAffiliate[] {
  return [
    {
      id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000001',
      name: 'Colaboraciones con creadoras',
      code: 'INFLUENCERS',
      commissionBps: 0,
      active: true,
      email: 'colaboraciones@ejemplo.com',
      notes: 'Canje: la creadora recibe Boxies gratis a cambio de contenido.',
      createdAt: '2025-11-01T15:00:00.000Z',
    },
    {
      id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000002',
      name: 'Sofi Deco (Instagram)',
      code: 'SOFI',
      commissionBps: 1500,
      active: true,
      email: 'sofideco@ejemplo.com',
      notes: 'Comisión del 15% por venta con su código. Se liquida el 5 de cada mes.',
      createdAt: '2026-04-01T15:00:00.000Z',
    },
    {
      id: 'e1a1e7f4-1c2d-4e5f-8a9b-000000000003',
      name: 'Florería Las Violetas',
      code: 'VIOLETAS',
      commissionBps: 1000,
      active: false,
      email: 'violetas@ejemplo.com',
      notes: 'Prueba piloto (pausada).',
      createdAt: '2026-06-15T15:00:00.000Z',
    },
  ]
}

function seedExpenses(): Expense[] {
  const e = (
    id: number,
    category: Expense['category'],
    description: string,
    vendor: string,
    pesos: number,
    startsOn: string,
    p: Partial<Expense> = {},
  ): Expense => ({
    id: `f1a1e7f4-1c2d-4e5f-8a9b-${String(id).padStart(12, '0')}`,
    category,
    description,
    vendor,
    amountCents: pesos * 100,
    recurrence: 'monthly',
    startsOn,
    endsOn: null,
    createdAt: `${startsOn}T15:00:00.000Z`,
    ...p,
  })
  return [
    e(1, 'infraestructura', 'Hosting y funciones', 'Vercel Pro', 24_000, '2025-09-01'),
    e(2, 'infraestructura', 'Base de datos y storage', 'Supabase Pro', 30_000, '2025-10-01'),
    e(3, 'infraestructura', 'Mails transaccionales', 'Resend', 18_000, '2025-10-01'),
    e(4, 'infraestructura', 'Dominio boxiedigital.com.ar', 'NIC Argentina', 16_000, '2025-09-01', {
      recurrence: 'once',
    }),
    e(5, 'marketing', 'Campañas de Instagram y Facebook', 'Meta Ads', 320_000, '2025-09-01'),
    e(6, 'marketing', 'Búsquedas "regalo digital"', 'Google Ads', 110_000, '2026-02-01'),
    e(7, 'marketing', 'Contenido para redes (freelance)', 'Diseñadora', 180_000, '2026-01-01'),
    e(8, 'herramientas', 'Diseño y edición', 'Canva Pro', 9_500, '2025-09-01'),
    e(9, 'herramientas', 'Monitoreo de errores', 'Sentry', 0, '2025-09-01', {
      description: 'Monitoreo de errores (plan gratis)',
    }),
    e(10, 'impuestos', 'Monotributo', 'ARCA', 62_000, '2025-09-01'),
    e(11, 'equipo', 'Contador', 'Estudio contable', 55_000, '2025-11-01'),
    e(12, 'marketing', 'Sesión de fotos para la tienda', 'Fotógrafo', 240_000, '2026-02-10', {
      recurrence: 'once',
    }),
  ].filter((x) => x.amountCents > 0 || x.vendor === 'Sentry')
}

function seedTeam(): AdminUser[] {
  return [
    {
      id: 'a0a1e7f4-1c2d-4e5f-8a9b-000000000001',
      email: DEFAULT_DEMO_EMAIL,
      name: 'Administrador',
      role: 'owner',
      pending: false,
      lastSeenAt: null,
      createdAt: '2025-09-01T15:00:00.000Z',
    },
    {
      id: 'a0a1e7f4-1c2d-4e5f-8a9b-000000000002',
      email: 'socio@boxie.demo',
      name: 'Socio',
      role: 'admin',
      pending: false,
      lastSeenAt: '2026-09-23T22:10:00.000Z',
      createdAt: '2025-09-01T15:00:00.000Z',
    },
    {
      id: 'a0a1e7f4-1c2d-4e5f-8a9b-000000000003',
      email: 'soporte@boxie.demo',
      name: 'Soporte',
      role: 'support',
      pending: false,
      lastSeenAt: '2026-09-24T13:40:00.000Z',
      createdAt: '2026-03-01T15:00:00.000Z',
    },
    {
      id: 'a0a1e7f4-1c2d-4e5f-8a9b-000000000004',
      email: 'contenido@boxie.demo',
      name: 'Contenido',
      role: 'editor',
      pending: true,
      lastSeenAt: null,
      createdAt: '2026-09-20T15:00:00.000Z',
    },
  ]
}

function seedTasks(now: Date): AdminTask[] {
  const t = (
    id: number,
    title: string,
    status: AdminTask['status'],
    priority: AdminTask['priority'],
    p: Partial<AdminTask> = {},
  ): AdminTask => ({
    id: `a1b1e7f4-1c2d-4e5f-8a9b-${String(id).padStart(12, '0')}`,
    title,
    description: '',
    status,
    priority,
    assignee: null,
    tags: [],
    dueOn: null,
    position: id,
    createdAt: ISO(addDays(now, -20 + id)),
    updatedAt: ISO(addDays(now, -10 + id / 2)),
    ...p,
  })
  const inDays = (d: number) => arDayKey(addDays(now, d))
  return [
    t(1, 'Conectar Supabase al panel', 'todo', 'alta', {
      description:
        'Crear el proyecto, aplicar las migraciones (incluida admin_backoffice) y cargar el primer admin. Ver Sistema → Conexiones.',
      tags: ['infra'],
      assignee: 'socio@boxie.demo',
    }),
    t(2, 'Webhook de Mercado Pago con firma', 'doing', 'alta', {
      description: 'Validar x-signature, consultar el pago y llamar a applyPaymentNotice.',
      tags: ['pagos'],
      assignee: 'socio@boxie.demo',
      dueOn: inDays(7),
    }),
    t(3, 'Campaña Día de la Madre (18/10)', 'doing', 'alta', {
      description:
        'Cupón MAMA15 ya programado. Falta: republicar la temática con fotos nuevas y armar los anuncios.',
      tags: ['marketing'],
      assignee: DEFAULT_DEMO_EMAIL,
      dueOn: inDays(10),
    }),
    t(4, 'Revisar y publicar la temática Gamer', 'todo', 'media', {
      description: 'Salió del generador. Cambiar la trivia por preguntas de Counter-Strike.',
      tags: ['temáticas'],
      assignee: 'contenido@boxie.demo',
    }),
    t(5, 'Navidad lista antes del 1/12', 'todo', 'media', {
      tags: ['temáticas', 'marketing'],
      dueOn: inDays(60),
    }),
    t(6, 'Revisar textos legales con el contador', 'todo', 'baja', { tags: ['legal'] }),
    t(7, 'Responder mails de soporte de la semana', 'done', 'media', {
      tags: ['soporte'],
      assignee: 'soporte@boxie.demo',
    }),
    t(8, 'Subir precio del plan Clásica', 'done', 'media', {
      description: 'De $3.990 a $4.990 (abril).',
      tags: ['precios'],
    }),
    t(9, 'Reseñas reales para la home', 'todo', 'baja', {
      description: 'Pedirles permiso a clientes que dejaron mensajes lindos.',
      tags: ['marketing'],
    }),
  ]
}

// ── Ventas ──────────────────────────────────────────────────────────────────

/** Tercer domingo del mes (Día del Padre, del Niño, de la Madre en Argentina). */
function thirdSunday(year: number, month: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const offset = (7 - first.getUTCDay()) % 7
  return new Date(Date.UTC(year, month - 1, 1 + offset + 14)).toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000)
}

/** Picos del año: [fecha, días de anticipación, multiplicador, temática que empuja]. */
function peaks(year: number): [string, number, number, string | null][] {
  return [
    [`${year}-02-14`, 12, 2.6, 'pareja'],
    [`${year}-07-20`, 8, 2.1, 'amistad'],
    [thirdSunday(year, 6), 7, 1.5, null],
    [thirdSunday(year, 8), 6, 1.35, null],
    [thirdSunday(year, 10), 14, 2.4, 'dia-de-la-madre'],
    [`${year}-10-31`, 10, 1.3, 'halloween'],
    [`${year}-12-24`, 14, 2.2, null],
  ]
}

function dayFactor(day: string) {
  const year = Number(day.slice(0, 4))
  let factor = 1
  let boost: string | null = null
  for (const y of [year, year + 1]) {
    for (const [date, lead, mult, theme] of peaks(y)) {
      const until = daysBetween(date, day)
      if (until >= 0 && until <= lead) {
        const f = 1 + (mult - 1) * (1 - until / (lead + 1))
        if (f > factor) {
          factor = f
          boost = theme
        }
      }
    }
  }
  return { factor, boost }
}

const WEEKDAY = [0.9, 0.9, 1, 1.05, 1.2, 1.12, 1.02]
const HOURS: [number, number][] = [
  [0, 3],
  [1, 1.5],
  [2, 0.6],
  [3, 0.3],
  [4, 0.2],
  [5, 0.2],
  [6, 0.4],
  [7, 1],
  [8, 2],
  [9, 2.6],
  [10, 3],
  [11, 3.4],
  [12, 4],
  [13, 4.2],
  [14, 3.4],
  [15, 3.2],
  [16, 3.4],
  [17, 3.8],
  [18, 4.4],
  [19, 5.2],
  [20, 6],
  [21, 6.6],
  [22, 6],
  [23, 4.4],
]
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

interface Buyer {
  name: string
  email: string
  phone: string | null
}

export function seedDemoDb(now = new Date(), seed = 20260924): DemoDb {
  const rng = new Rng(seed)
  const plans = seedPlans()
  const themes = seedThemes(plans, rng, now)
  const couponsW = seedCoupons()
  const affiliates = seedAffiliates()
  const orders: AdminOrder[] = []
  const events: PaymentEvent[] = []
  const boxies: AdminBoxie[] = []
  const codes = new Set<string>()
  const buyers: Buyer[] = []
  let eventId = 1

  const modulesByTheme = new Map<string, Map<string, number>>()
  for (const theme of themes) {
    const parsed = parseThemeConfig(theme.draftConfig)
    if (!parsed.success) continue
    const map = new Map<string, number>()
    for (const c of planContents(parsed.data, plans)) {
      const plan = plans.find((p) => p.slug === c.planSlug)!
      // +1 por "para quién es"; +1 por la clave, si el plan la permite.
      map.set(plan.id, c.modules + 1 + (plan.limits.allowPassword ? 1 : 0))
    }
    modulesByTheme.set(theme.id, map)
  }

  const start = arStartOfDay(addDays(now, -364))
  const growthStart = 5.5
  const growthEnd = 17
  const priceRaise = at('2026-04-01', '00:00')

  for (let d = 0; d < 365; d++) {
    const dayStart = addDays(start, d)
    const day = arDayKey(dayStart)
    const { factor, boost } = dayFactor(day)
    const weekday = arWeekdayHour(addDays(dayStart, 0.5)).weekday
    const trend = growthStart + ((growthEnd - growthStart) * d) / 364
    let lambda = trend * factor * WEEKDAY[weekday]!
    const isToday = d === 364
    if (isToday) {
      const elapsed = (now.getTime() - dayStart.getTime()) / 86_400_000
      lambda *= Math.min(Math.max(elapsed, 0), 1)
    }
    const checkouts = rng.poisson(lambda)

    const available = THEME_PLANS.filter((t) => {
      const theme = themes.find((x) => x.id === t.id)
      if (!theme || theme.versions.length === 0) return false
      const firstPublished = theme.versions[0]!.publishedAt
      const archived = t.archivedAt ? ISO(at(t.archivedAt)) : null
      return firstPublished <= ISO(dayStart) && (!archived || ISO(dayStart) < archived)
    })
    if (available.length === 0) continue

    for (let i = 0; i < checkouts; i++) {
      const hour = rng.weighted(HOURS)
      const created = new Date(
        dayStart.getTime() + (hour * 60 + rng.int(0, 59)) * 60_000 + rng.int(0, 59_000),
      )
      if (created > now) continue

      const themePlan = rng.weighted(
        available.map((t) => {
          let w = t.weight || 4
          if (boost === t.slug) w *= 6
          return [t, w] as const
        }),
      )
      const theme = themes.find((x) => x.id === themePlan.id)!
      const version =
        [...theme.versions].reverse().find((v) => v.publishedAt <= ISO(created)) ??
        theme.versions[0]!
      const plan = rng.weighted([
        [plans[0]!, 26],
        [plans[1]!, 54],
        [plans[2]!, 20],
      ] as const)
      const listPrice =
        created < priceRaise ? Math.round((plan.priceCents * 0.8) / 1000) * 1000 : plan.priceCents

      // Cupón: uno de cada cinco, entre los vigentes ese día.
      let coupon: (AdminCoupon & { weight: number }) | null = null
      if (rng.chance(0.21)) {
        const valid = couponsW.filter(
          (c) =>
            c.weight > 0 &&
            c.createdAt <= ISO(created) &&
            (!c.startsAt || c.startsAt <= ISO(created)) &&
            (!c.expiresAt || ISO(created) < c.expiresAt) &&
            (c.maxUses === null || c.usedCount < c.maxUses),
        )
        if (valid.length) coupon = rng.weighted(valid.map((c) => [c, c.weight] as const))
      }
      const discount = coupon ? couponDiscount(coupon, listPrice) : 0
      const amount = listPrice - discount

      // Comprador: 13% vuelve a comprar.
      let buyer: Buyer
      if (buyers.length > 20 && rng.chance(0.13)) buyer = rng.pick(buyers)
      else {
        const first = rng.pick(FIRST)
        const last = rng.pick(LAST)
        buyer = {
          name: `${first} ${last}`,
          email: `${ascii(first)}.${ascii(last)}${rng.int(1, 999)}@ejemplo.com`,
          phone: rng.chance(0.55) ? `+54 9 11 ${rng.digits(4)}-${rng.digits(4)}` : null,
        }
        buyers.push(buyer)
      }

      const outcome = rng.weighted([
        ['paid', 67],
        ['pending', 24],
        ['cancelled', 7],
        ['rejected', 2],
      ] as const)
      const minutesToPay = rng.int(1, 14)
      let paidAt: Date | null =
        outcome === 'paid' ? new Date(created.getTime() + minutesToPay * 60_000) : null
      if (paidAt && paidAt > now) paidAt = null
      const status: AdminOrder['status'] = paidAt
        ? 'paid'
        : outcome === 'cancelled'
          ? 'cancelled'
          : 'pending'
      const orderId = rng.uuid()
      const paymentId = rng.digits(11)

      const order: AdminOrder = {
        id: orderId,
        status,
        themeId: theme.id,
        themeVersionId: version.id,
        planId: plan.id,
        currency: 'ARS',
        listPriceCents: listPrice,
        discountCents: discount,
        amountCents: amount,
        couponId: coupon?.id ?? null,
        couponCode: coupon?.code ?? null,
        affiliateId: coupon?.affiliateId ?? null,
        buyerName: buyer.name,
        buyerEmail: buyer.email,
        buyerPhone: buyer.phone,
        paymentProvider: 'mercadopago',
        mpPaymentId: paidAt ? paymentId : null,
        providerStatus: paidAt
          ? 'approved'
          : outcome === 'rejected'
            ? 'rejected'
            : outcome === 'cancelled'
              ? 'cancelled'
              : rng.chance(0.3)
                ? 'pending'
                : null,
        paidAt: paidAt ? ISO(paidAt) : null,
        refundedAt: null,
        createdAt: ISO(created),
        updatedAt: ISO(paidAt ?? created),
      }

      if (order.providerStatus && order.providerStatus !== 'approved') {
        events.push({
          id: eventId++,
          orderId,
          provider: 'mercadopago',
          providerPaymentId: paymentId,
          status: order.providerStatus,
          source: 'webhook',
          outcome: 'recorded',
          receivedAt: ISO(new Date(created.getTime() + rng.int(2, 20) * 60_000)),
        })
      }

      if (paidAt) {
        if (coupon) coupon.usedCount++
        events.push({
          id: eventId++,
          orderId,
          provider: 'mercadopago',
          providerPaymentId: paymentId,
          status: 'approved',
          source: rng.chance(0.6) ? 'return' : 'webhook',
          outcome: 'paid',
          receivedAt: ISO(paidAt),
        })

        // Reembolsos: 1,4% de las ventas.
        if (rng.chance(0.014)) {
          const refundedAt = new Date(paidAt.getTime() + rng.int(1, 9) * 86_400_000)
          if (refundedAt <= now) {
            order.status = 'refunded'
            order.refundedAt = ISO(refundedAt)
            order.updatedAt = ISO(refundedAt)
            events.push({
              id: eventId++,
              orderId,
              provider: 'admin',
              providerPaymentId: orderId,
              status: 'refunded',
              source: 'admin',
              outcome: 'refunded',
              receivedAt: ISO(refundedAt),
            })
          }
        }

        let code: string
        do {
          code = Array.from({ length: 8 }, () => ALPHABET[rng.int(0, 31)]).join('')
        } while (codes.has(code))
        codes.add(code)

        const edited = rng.chance(0.93)
        const lastEditedAt = edited
          ? new Date(paidAt.getTime() + rng.int(3, 60 * 36) * 60_000)
          : null
        const locked = edited && rng.chance(0.82)
        let lockedAt =
          locked && lastEditedAt
            ? new Date(lastEditedAt.getTime() + rng.int(5, 60 * 48) * 60_000)
            : null
        if (lockedAt && lockedAt > now) lockedAt = null
        const opened = lockedAt && rng.chance(0.9)
        let firstOpenedAt =
          opened && lockedAt ? new Date(lockedAt.getTime() + rng.int(1, 60 * 30) * 60_000) : null
        if (firstOpenedAt && firstOpenedAt > now) firstOpenedAt = null
        const total = modulesByTheme.get(theme.id)?.get(plan.id) ?? 6
        const done = lockedAt ? total : edited ? rng.int(1, Math.max(total - 1, 1)) : 0
        const expiresAt = lockedAt
          ? addDays(lockedAt, plan.limits.giftLifetimeDays)
          : addDays(paidAt, 60)

        boxies.push({
          id: rng.uuid(),
          code,
          orderId,
          themeVersionId: version.id,
          status: order.status === 'refunded' ? 'refunded' : 'active',
          recipientName: edited ? rng.pick(RECIPIENTS) : '',
          senderName: buyer.name.split(' ')[0]!,
          lockedAt: lockedAt ? ISO(lockedAt) : null,
          expiresAt: ISO(expiresAt),
          accessEmailSentAt: ISO(new Date(paidAt.getTime() + 8_000)),
          giftEmailSentAt: lockedAt ? ISO(new Date(lockedAt.getTime() + 30_000)) : null,
          firstOpenedAt: firstOpenedAt ? ISO(firstOpenedAt) : null,
          openCount: firstOpenedAt ? rng.int(1, 14) : 0,
          lastEditedAt: lastEditedAt && lastEditedAt <= now ? ISO(lastEditedAt) : null,
          modulesDone: done,
          modulesTotal: total,
          photos: edited ? rng.int(1, Math.min(plan.limits.maxPhotos, 6)) : 0,
          createdAt: ISO(paidAt),
          updatedAt: ISO(lockedAt ?? lastEditedAt ?? paidAt),
        })
      }
      orders.push(order)
    }
  }

  // Dos pagos con monto distinto (para mostrar la alerta): quedan pendientes.
  const recentPending = orders
    .filter(
      (o) => o.status === 'pending' && now.getTime() - Date.parse(o.createdAt) < 6 * 86_400_000,
    )
    .slice(-2)
  for (const o of recentPending) {
    o.providerStatus = 'amount_mismatch'
    const paymentId = rng.digits(11)
    events.push({
      id: eventId++,
      orderId: o.id,
      provider: 'mercadopago',
      providerPaymentId: paymentId,
      status: 'approved',
      source: 'webhook',
      outcome: 'amount_mismatch',
      receivedAt: ISO(new Date(Date.parse(o.createdAt) + 6 * 60_000)),
    })
  }

  const coupons: AdminCoupon[] = couponsW.map(({ weight: _weight, ...c }) => c)
  const settings: AdminSettings = {
    basePriceCents: 499_000,
    currency: 'ARS',
    giftLifetimeDays: 60,
    offerCouponId: coupons.find((c) => c.code === 'LOQUIEROYA25')!.id,
    offerDelaySeconds: 15,
    gatewayFeeBps: 629,
    gatewayVatBps: 2100,
    gatewayFixedCents: 0,
    taxBps: 350,
    variableCostCents: 2_500,
    monthlyGoalCents: 250_000_000,
    businessName: 'Boxie Digital',
    supportEmail: 'ayuda@boxiedigital.com.ar',
    whatsapp: '+54 9 11 0000-0000',
    instagram: '@boxie.app',
    salesPaused: false,
    updatedAt: '2026-07-10T15:00:00.000Z',
  }

  return {
    version: DEMO_DB_VERSION,
    seededAt: ISO(now),
    settings,
    plans,
    themes,
    coupons,
    affiliates,
    orders,
    events,
    boxies,
    expenses: seedExpenses(),
    team: seedTeam(),
    audit: seedAudit(now, rng, themes),
    tasks: seedTasks(now),
  }
}

function seedAudit(now: Date, rng: Rng, themes: DemoTheme[]): AuditEntry[] {
  const entry = (
    hoursAgo: number,
    actor: string,
    action: string,
    entity: string,
    entityId: string | null,
    summary: string,
  ): AuditEntry => ({
    id: rng.uuid(),
    at: ISO(new Date(now.getTime() - hoursAgo * 3_600_000)),
    actor,
    action,
    entity,
    entityId,
    summary,
  })
  const theme = (slug: string) => themes.find((t) => t.slug === slug)?.id ?? null
  return [
    entry(
      2,
      'soporte@boxie.demo',
      'boxie.resend',
      'boxie',
      null,
      'Reenvió el link del editor a un comprador',
    ),
    entry(
      5,
      DEFAULT_DEMO_EMAIL,
      'coupon.update',
      'coupon',
      null,
      'Subió el tope de INFLUENCER50 a 150 usos',
    ),
    entry(
      28,
      'contenido@boxie.demo',
      'theme.generate',
      'theme',
      theme('navidad'),
      'Generó "Navidad en familia" con el generador',
    ),
    entry(
      52,
      DEFAULT_DEMO_EMAIL,
      'coupon.create',
      'coupon',
      null,
      'Creó el cupón MAMA15 (1 al 19 de octubre)',
    ),
    entry(
      74,
      'contenido@boxie.demo',
      'theme.generate',
      'theme',
      theme('gamer'),
      'Generó "Gamer" con el generador',
    ),
    entry(
      96,
      'socio@boxie.demo',
      'settings.update',
      'settings',
      null,
      'Cambió la meta mensual a $2.500.000',
    ),
    entry(
      220,
      DEFAULT_DEMO_EMAIL,
      'theme.publish',
      'theme',
      theme('dia-de-la-madre'),
      'Publicó "Día de la Madre" v2',
    ),
    entry(
      260,
      'soporte@boxie.demo',
      'boxie.extend',
      'boxie',
      null,
      'Extendió 15 días una Boxie a pedido del comprador',
    ),
    entry(
      410,
      'socio@boxie.demo',
      'order.refund',
      'order',
      null,
      'Reembolsó una orden por pago duplicado',
    ),
    entry(
      600,
      DEFAULT_DEMO_EMAIL,
      'plan.update',
      'plan',
      null,
      'Ajustó los beneficios del plan Premium',
    ),
  ]
}
