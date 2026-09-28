import { z } from 'zod'
import { COUPON_CODE_PATTERN } from './coupons'
import { arDayKey } from './admin/range'

/**
 * Sponsors: marcas y comercios aliados de Boxie (una cafetería que regala una
 * Boxie con su café, una marca que arma una campaña, un evento). Cada uno pasa
 * por un recorrido (contacto → conversación → activo) y, mientras está
 * activo y dentro de sus fechas, aparece en los lugares del sitio que eligió.
 *
 * Lo que se ve en el sitio (`PublicSponsor`) nunca lleva los datos de
 * contacto ni las notas internas.
 */

export const SPONSOR_KINDS = ['local', 'marca', 'evento', 'creador', 'medio'] as const
export type SponsorKind = (typeof SPONSOR_KINDS)[number]

export const SPONSOR_KIND_LABELS: Record<SponsorKind, string> = {
  local: 'Comercio local',
  marca: 'Marca',
  evento: 'Evento',
  creador: 'Creador/a',
  medio: 'Medio',
}

export const SPONSOR_STAGES = ['lead', 'conversacion', 'activo', 'pausado', 'finalizado'] as const
export type SponsorStage = (typeof SPONSOR_STAGES)[number]

export const SPONSOR_STAGE_LABELS: Record<SponsorStage, string> = {
  lead: 'Nuevo contacto',
  conversacion: 'En conversación',
  activo: 'Activo',
  pausado: 'Pausado',
  finalizado: 'Finalizado',
}

/** Dónde puede aparecer un sponsor en el sitio. */
export const SPONSOR_PLACEMENTS = ['home', 'galeria', 'precios', 'marcas'] as const
export type SponsorPlacement = (typeof SPONSOR_PLACEMENTS)[number]

export const SPONSOR_PLACEMENT_LABELS: Record<SponsorPlacement, string> = {
  home: 'Portada',
  galeria: 'Galería (tarjeta entre las temáticas)',
  precios: 'Precios',
  marcas: 'Boxie para marcas (aliados)',
}

/** Qué le interesa a quien escribe desde /marcas (y lo que se anota en el panel). */
export const SPONSOR_INTERESTS = ['sponsor', 'cobranding', 'campana', 'corporativo'] as const
export type SponsorInterest = (typeof SPONSOR_INTERESTS)[number]

export const SPONSOR_INTEREST_LABELS: Record<SponsorInterest, string> = {
  sponsor: 'Ser sponsor en la web',
  cobranding: 'Una Boxie con mi marca',
  campana: 'Una campaña o una fecha',
  corporativo: 'Regalos para clientes o equipo',
}

export interface PublicSponsor {
  id: string
  name: string
  kind: SponsorKind
  /** Frase corta ("El café de la esquina, ahora con Boxie"). */
  tagline: string
  /** La propuesta para quien compra ("Con tu café, una Boxie de regalo"). */
  offer: string
  description: string
  emoji: string
  /** Logo cuadrado (https o una ruta del sitio). null: emoji sobre su color. */
  logoUrl: string | null
  color: string
  url: string | null
  city: string
  couponCode: string | null
  placements: SponsorPlacement[]
}

export interface Sponsor extends PublicSponsor {
  stage: SponsorStage
  /** "AAAA-MM-DD" (días de Argentina). null: sin límite. */
  startsOn: string | null
  endsOn: string | null
  sortOrder: number
  contactName: string
  contactEmail: string
  contactPhone: string
  interests: SponsorInterest[]
  notes: string
  source: 'panel' | 'web'
  createdAt: string
  updatedAt: string
}

/** ¿Se muestra hoy en el sitio? Activo y dentro de sus fechas (días de Argentina). */
export function isLive(
  s: Pick<Sponsor, 'stage' | 'startsOn' | 'endsOn'>,
  now: Date = new Date(),
): boolean {
  if (s.stage !== 'activo') return false
  const today = arDayKey(now)
  if (s.startsOn && today < s.startsOn) return false
  if (s.endsOn && today > s.endsOn) return false
  return true
}

/** Solo lo que puede ver cualquiera. */
export function toPublic(s: Sponsor): PublicSponsor {
  return {
    id: s.id,
    name: s.name,
    kind: s.kind,
    tagline: s.tagline,
    offer: s.offer,
    description: s.description,
    emoji: s.emoji,
    logoUrl: s.logoUrl,
    color: s.color,
    url: s.url,
    city: s.city,
    couponCode: s.couponCode,
    placements: s.placements,
  }
}

/** Los que se muestran hoy, en el orden del panel. */
export function liveSponsors(list: Sponsor[], now: Date = new Date()): PublicSponsor[] {
  return list
    .filter((s) => isLive(s, now))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'))
    .map(toPublic)
}

/**
 * El de un lugar del sitio. Si hay varios, rotan por día (todos tienen su
 * turno y en un mismo día la página no cambia entre visitas).
 */
export function sponsorFor(
  list: PublicSponsor[],
  placement: SponsorPlacement,
  now: Date = new Date(),
): PublicSponsor | null {
  const here = list.filter((s) => s.placements.includes(placement))
  if (here.length === 0) return null
  const day = Math.floor(Date.parse(`${arDayKey(now)}T12:00:00Z`) / 86_400_000)
  return here[day % here.length]!
}

// ── Formularios ─────────────────────────────────────────────────────────────

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .nullable()
/** Texto opcional: vacío (o null) queda en null; el panel y el formulario mandan cualquiera de los dos. */
const blankToNull = (v: unknown) => (typeof v === 'string' ? v.trim() || null : (v ?? null))
const optionalUrl = z.preprocess(
  blankToNull,
  z
    .url({ protocol: /^https$/, error: 'Tiene que empezar con https://' })
    .max(300)
    .nullable(),
)
const logo = z.preprocess(
  blankToNull,
  z
    .string()
    .max(300)
    // https://… o una ruta del sitio (/brand/x.png); nunca //otro-sitio.com.
    .regex(
      /^(https:\/\/[^\s]+|\/(?!\/)[^\s]+)$/,
      'Un link https:// o una ruta del sitio (/brand/logo.png)',
    )
    .nullable(),
)
const couponCode = z.preprocess(
  (v) => (typeof v === 'string' ? v.toUpperCase().replace(/\s+/g, '') || null : (v ?? null)),
  z.string().regex(COUPON_CODE_PATTERN, 'De 3 a 32 letras, números, - o _').nullable(),
)
const email = z.union([z.email('Mail inválido').max(254), z.literal('')])

/** Lo que carga el panel. */
export const SponsorInputSchema = z
  .object({
    id: z.string().min(1).max(64).optional(),
    name: z.string().trim().min(2, 'Muy corto').max(80),
    kind: z.enum(SPONSOR_KINDS),
    stage: z.enum(SPONSOR_STAGES),
    tagline: z.string().trim().max(90),
    offer: z.string().trim().max(140),
    description: z.string().trim().max(400),
    emoji: z.string().trim().min(1, 'Elegí un emoji').max(16),
    logoUrl: logo,
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB'),
    url: optionalUrl,
    city: z.string().trim().max(80),
    couponCode,
    placements: z.array(z.enum(SPONSOR_PLACEMENTS)).max(SPONSOR_PLACEMENTS.length),
    startsOn: day,
    endsOn: day,
    sortOrder: z.number().int().min(0).max(999),
    contactName: z.string().trim().max(120),
    contactEmail: email,
    contactPhone: z.string().trim().max(40),
    interests: z.array(z.enum(SPONSOR_INTERESTS)).max(SPONSOR_INTERESTS.length),
    notes: z.string().trim().max(2000),
  })
  .refine((s) => !s.startsOn || !s.endsOn || s.endsOn >= s.startsOn, {
    message: 'Tiene que terminar después de empezar',
    path: ['endsOn'],
  })
  .refine((s) => s.stage !== 'activo' || s.placements.length > 0, {
    message: 'Un sponsor activo tiene que aparecer en algún lugar',
    path: ['placements'],
  })
export type SponsorInput = z.infer<typeof SponsorInputSchema>

/** Lo que manda un negocio desde /marcas ("Quiero ser aliado"). */
export const SponsorLeadSchema = z.object({
  name: z.string().trim().min(2, 'Contanos tu nombre').max(120),
  business: z.string().trim().min(2, 'Contanos el nombre del negocio o la marca').max(80),
  kind: z.enum(SPONSOR_KINDS),
  city: z.string().trim().max(80),
  email: z.email('Revisá el mail').max(254),
  phone: z.string().trim().max(40),
  interests: z.array(z.enum(SPONSOR_INTERESTS)).max(SPONSOR_INTERESTS.length),
  message: z.string().trim().max(2000),
  /** Campo trampa para bots: tiene que llegar vacío. */
  website: z.string().max(0).optional(),
})
export type SponsorLead = z.infer<typeof SponsorLeadSchema>

/** Un contacto nuevo como sponsor en el panel (etapa "nuevo contacto", sin publicar). */
export function leadToInput(lead: SponsorLead): SponsorInput {
  return {
    name: lead.business,
    kind: lead.kind,
    stage: 'lead',
    tagline: '',
    offer: '',
    description: '',
    emoji: lead.kind === 'local' ? '☕' : '🤝',
    logoUrl: null,
    color: '#F44E63',
    url: null,
    city: lead.city,
    couponCode: null,
    placements: [],
    startsOn: null,
    endsOn: null,
    sortOrder: 0,
    contactName: lead.name,
    contactEmail: lead.email,
    contactPhone: lead.phone,
    interests: lead.interests,
    notes: lead.message,
  }
}
