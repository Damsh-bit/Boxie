import { z } from 'zod'
import { parseBoxieCode } from './boxie'

/**
 * Soporte: los tickets que abren los compradores (o cualquiera que visite el
 * sitio) desde el botón de ayuda, y la conversación con el equipo.
 *
 * Reglas puras: quién puede escribir en qué estado, a qué estado pasa el
 * ticket con cada mensaje, cuándo avisar por mail (sin llenar la bandeja de
 * nadie) y las métricas de atención. Leer y guardar es trabajo del servidor.
 */

export const SUPPORT_TOPICS = ['boxie', 'error', 'pago', 'otro'] as const
export type SupportTopic = (typeof SUPPORT_TOPICS)[number]

export const SUPPORT_STATUSES = ['open', 'pending', 'resolved', 'closed'] as const
/**
 * open: le toca al equipo (nuevo, o el cliente volvió a escribir).
 * pending: le toca al cliente (el equipo respondió).
 * resolved: el equipo lo dio por resuelto; si el cliente escribe, se reabre.
 * closed: archivado; para seguir hay que abrir otro.
 */
export type SupportStatus = (typeof SUPPORT_STATUSES)[number]

export const SUPPORT_PRIORITIES = ['baja', 'normal', 'alta', 'urgente'] as const
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number]

export type MessageAuthor = 'customer' | 'agent' | 'system'
export type SupportRating = 'good' | 'bad'

export const TOPIC_INFO: Record<
  SupportTopic,
  { label: string; emoji: string; prompt: string; placeholder: string }
> = {
  boxie: {
    label: 'Mi Boxie',
    emoji: '🎁',
    prompt: 'Tengo un problema con mi Boxie',
    placeholder: 'Contanos qué pasa: por ejemplo, no puedo entrar al editor o el regalo no abre.',
  },
  error: {
    label: 'Un error',
    emoji: '🐞',
    prompt: 'Encontré un error',
    placeholder: 'Qué estabas haciendo y qué pasó. Si aparece un mensaje, copialo tal cual.',
  },
  pago: {
    label: 'Pagos y compras',
    emoji: '💳',
    prompt: 'Pagos y compras',
    placeholder: 'Contanos qué pasó con el pago (fecha, medio de pago y el mail de la compra).',
  },
  otro: {
    label: 'Otra consulta',
    emoji: '💬',
    prompt: 'Otra consulta',
    placeholder: '¿En qué te podemos ayudar?',
  },
}

export const STATUS_INFO: Record<
  SupportStatus,
  { label: string; customerLabel: string; tone: 'brand' | 'warning' | 'good' | 'neutral' }
> = {
  open: { label: 'Abierto', customerLabel: 'Esperando al equipo', tone: 'brand' },
  pending: { label: 'Esperando al cliente', customerLabel: 'Te respondimos', tone: 'warning' },
  resolved: { label: 'Resuelto', customerLabel: 'Resuelta', tone: 'good' },
  closed: { label: 'Cerrado', customerLabel: 'Cerrada', tone: 'neutral' },
}

export const PRIORITY_INFO: Record<
  SupportPriority,
  { label: string; tone: 'neutral' | 'info' | 'warning' | 'critical' }
> = {
  baja: { label: 'Baja', tone: 'neutral' },
  normal: { label: 'Normal', tone: 'info' },
  alta: { label: 'Alta', tone: 'warning' },
  urgente: { label: 'Urgente', tone: 'critical' },
}

/** Datos del navegador que acompañan un reporte de error (con permiso de quien escribe). */
export interface TicketContext {
  url?: string
  userAgent?: string
  viewport?: string
  referrer?: string
}

export interface SupportTicket {
  id: string
  /** Número para hablar del ticket ("#1042"). */
  number: number
  topic: SupportTopic
  status: SupportStatus
  priority: SupportPriority
  subject: string
  customerName: string
  customerEmail: string
  /** Código que escribió el cliente (8 caracteres, sin guion). */
  boxieCode: string | null
  /** La Boxie y la orden, si el código existe (solo lo ve el equipo). */
  boxieId: string | null
  orderId: string | null
  /** Mail del admin que lo tiene asignado. */
  assignee: string | null
  context: TicketContext | null
  rating: SupportRating | null
  firstResponseAt: string | null
  resolvedAt: string | null
  lastMessageAt: string
  lastCustomerMessageAt: string | null
  lastAgentMessageAt: string | null
  customerReadAt: string | null
  agentReadAt: string | null
  customerNotifiedAt: string | null
  teamNotifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface SupportMessage {
  id: string
  ticketId: string
  author: MessageAuthor
  /** "Sofi" (cliente) · "Lean · Boxie" (equipo) · "Boxie" (sistema). */
  authorName: string
  body: string
  /** Nota interna del equipo: el cliente nunca la ve. */
  internal: boolean
  createdAt: string
}

// ── Entradas ────────────────────────────────────────────────────────────────

const trimmed = (min: number, max: number, message?: string) =>
  z
    .string()
    .trim()
    .min(min, message ?? `Tiene que tener al menos ${min} caracteres.`)
    .max(max, `Hasta ${max} caracteres.`)

const ContextSchema = z
  .object({
    url: z.string().max(500).optional(),
    userAgent: z.string().max(400).optional(),
    viewport: z.string().max(40).optional(),
    referrer: z.string().max(500).optional(),
  })
  .strict()

export const NewTicketSchema = z.object({
  topic: z.enum(SUPPORT_TOPICS),
  name: trimmed(2, 80, 'Poné tu nombre.'),
  email: z.email('Revisá el mail: ahí te avisamos cuando respondamos.').max(254),
  /** Opcional: si viene, tiene que ser un código válido ("K7M2-Q9XD"). */
  boxieCode: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v, ctx) => {
      if (!v) return null
      const code = parseBoxieCode(v)
      if (!code) {
        ctx.addIssue({
          code: 'custom',
          message: 'El código tiene 8 letras y números, como K7M2-Q9XD.',
        })
        return z.NEVER
      }
      return code
    }),
  message: trimmed(5, 4000, 'Contanos un poco más (al menos 5 caracteres).'),
  context: ContextSchema.nullish(),
  // Trampa para bots: los humanos no ven este campo.
  website: z.string().max(0).optional(),
})
export type NewTicketInput = z.input<typeof NewTicketSchema>
export type NewTicket = z.output<typeof NewTicketSchema>

export const CustomerMessageSchema = z.object({
  body: trimmed(1, 4000, 'Escribí un mensaje.'),
})

export const AgentReplySchema = z.object({
  ticketId: z.uuid(),
  body: trimmed(1, 4000, 'Escribí un mensaje.'),
  internal: z.boolean().default(false),
  /** Estado en el que queda (por defecto: esperando al cliente, o sin cambio si es nota). */
  status: z.enum(SUPPORT_STATUSES).optional(),
})

export const TicketPatchSchema = z
  .object({
    ticketId: z.uuid(),
    status: z.enum(SUPPORT_STATUSES).optional(),
    priority: z.enum(SUPPORT_PRIORITIES).optional(),
    assignee: z.email().max(254).nullable().optional(),
  })
  .refine((p) => p.status || p.priority || p.assignee !== undefined, 'Nada para cambiar.')

export const RatingSchema = z.object({ rating: z.enum(['good', 'bad']) })

// ── Reglas ──────────────────────────────────────────────────────────────────

/** El asunto: la primera línea del mensaje, corta. */
export function subjectFrom(message: string, topic: SupportTopic): string {
  const first = message.trim().split(/\r?\n/)[0]!.trim().replace(/\s+/g, ' ')
  if (!first) return TOPIC_INFO[topic].prompt
  return first.length > 80 ? `${first.slice(0, 77).trimEnd()}…` : first
}

/** Prioridad con la que entra: los pagos, alta (hay plata de por medio). */
export function initialPriority(topic: SupportTopic): SupportPriority {
  return topic === 'pago' ? 'alta' : 'normal'
}

export class SupportRuleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SupportRuleError'
  }
}

/** Cuando escribe el cliente, el ticket vuelve a quedar del lado del equipo. */
export function statusAfterCustomerMessage(status: SupportStatus): SupportStatus {
  if (status === 'closed')
    throw new SupportRuleError('Esta consulta está cerrada. Abrí una nueva y te ayudamos.')
  return 'open'
}

/** Cuando responde el equipo: esperando al cliente, salvo que elija otro estado. */
export function statusAfterAgentMessage(
  status: SupportStatus,
  internal: boolean,
  chosen?: SupportStatus,
): SupportStatus {
  if (chosen) return chosen
  return internal ? status : 'pending'
}

/** ¿Le avisamos por mail al cliente de esta respuesta? Uno cada 10 minutos, como mucho. */
export function shouldNotifyCustomer(
  ticket: Pick<SupportTicket, 'customerNotifiedAt'>,
  now: Date,
  minutes = 10,
): boolean {
  if (!ticket.customerNotifiedAt) return true
  return now.getTime() - Date.parse(ticket.customerNotifiedAt) >= minutes * 60_000
}

/** ¿Le avisamos al equipo? Siempre por un ticket nuevo; si el cliente vuelve, cada 30 minutos. */
export function shouldNotifyTeam(
  ticket: Pick<SupportTicket, 'teamNotifiedAt'>,
  now: Date,
  minutes = 30,
): boolean {
  if (!ticket.teamNotifiedAt) return true
  return now.getTime() - Date.parse(ticket.teamNotifiedAt) >= minutes * 60_000
}

/** El equipo tiene mensajes del cliente sin leer. */
export function unreadByAgent(
  t: Pick<SupportTicket, 'lastCustomerMessageAt' | 'agentReadAt'>,
): boolean {
  return (
    t.lastCustomerMessageAt !== null &&
    (t.agentReadAt === null || t.agentReadAt < t.lastCustomerMessageAt)
  )
}

/** El cliente tiene respuestas del equipo sin leer. */
export function unreadByCustomer(
  t: Pick<SupportTicket, 'lastAgentMessageAt' | 'customerReadAt'>,
): boolean {
  return (
    t.lastAgentMessageAt !== null &&
    (t.customerReadAt === null || t.customerReadAt < t.lastAgentMessageAt)
  )
}

/** Horas que lleva esperando al equipo (null si no le toca al equipo). */
export function hoursWaiting(
  t: Pick<SupportTicket, 'status' | 'lastCustomerMessageAt' | 'createdAt'>,
  now: Date,
): number | null {
  if (t.status !== 'open') return null
  const since = Date.parse(t.lastCustomerMessageAt ?? t.createdAt)
  return Math.max(0, (now.getTime() - since) / 3_600_000)
}

/** Objetivo de respuesta por prioridad (horas): pasado eso, el ticket se marca atrasado. */
export const RESPONSE_TARGET_HOURS: Record<SupportPriority, number> = {
  urgente: 2,
  alta: 8,
  normal: 24,
  baja: 48,
}

export function isOverdue(
  t: Pick<SupportTicket, 'status' | 'priority' | 'lastCustomerMessageAt' | 'createdAt'>,
  now: Date,
): boolean {
  const waiting = hoursWaiting(t, now)
  return waiting !== null && waiting >= RESPONSE_TARGET_HOURS[t.priority]
}

/** Minutos hasta la primera respuesta (null si todavía no hubo). */
export function firstResponseMinutes(
  t: Pick<SupportTicket, 'createdAt' | 'firstResponseAt'>,
): number | null {
  if (!t.firstResponseAt) return null
  return Math.max(0, Math.round((Date.parse(t.firstResponseAt) - Date.parse(t.createdAt)) / 60_000))
}

/** "#1042". */
export const ticketLabel = (number: number) => `#${number}`

/** Lo que el cliente ve de su ticket: nada del equipo (asignación, notas, contexto). */
export interface CustomerTicket {
  id: string
  number: number
  topic: SupportTopic
  status: SupportStatus
  subject: string
  customerName: string
  customerEmail: string
  boxieCode: string | null
  rating: SupportRating | null
  lastMessageAt: string
  unread: boolean
  createdAt: string
}

export function toCustomerTicket(t: SupportTicket): CustomerTicket {
  return {
    id: t.id,
    number: t.number,
    topic: t.topic,
    status: t.status,
    subject: t.subject,
    customerName: t.customerName,
    customerEmail: t.customerEmail,
    boxieCode: t.boxieCode,
    rating: t.rating,
    lastMessageAt: t.lastMessageAt,
    unread: unreadByCustomer(t),
    createdAt: t.createdAt,
  }
}

/** Los mensajes que ve el cliente: sin notas internas. */
export function customerMessages(messages: SupportMessage[]): SupportMessage[] {
  return messages.filter((m) => !m.internal)
}

/** Resumen de la bandeja para el menú y el tablero. */
export interface SupportCounts {
  open: number
  pending: number
  unassigned: number
  overdue: number
  unread: number
}

export function supportCounts(tickets: SupportTicket[], now: Date): SupportCounts {
  const active = tickets.filter((t) => t.status === 'open' || t.status === 'pending')
  return {
    open: tickets.filter((t) => t.status === 'open').length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    unassigned: active.filter((t) => !t.assignee).length,
    overdue: tickets.filter((t) => isOverdue(t, now)).length,
    unread: tickets.filter((t) => t.status !== 'closed' && unreadByAgent(t)).length,
  }
}

/** "iPhone · Safari 17" · "Windows · Chrome 129": el dispositivo de un reporte, legible. */
const SYSTEMS: [RegExp, string][] = [
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/Linux/, 'Linux'],
]

// El orden importa: Edge y Chrome de iOS también dicen "Safari"; Edge también dice "Chrome".
const BROWSERS: [RegExp, string][] = [
  [/Edg(?:iOS|A)?\/(\d+)/, 'Edge'],
  [/(?:CriOS|Chrome)\/(\d+)/, 'Chrome'],
  [/(?:FxiOS|Firefox)\/(\d+)/, 'Firefox'],
  [/Version\/(\d+).*Safari/, 'Safari'],
]

export function describeDevice(userAgent: string | undefined): string | null {
  if (!userAgent) return null
  const os = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1]
  const browser = BROWSERS.map(([pattern, name]) => {
    const version = userAgent.match(pattern)?.[1]
    return version ? `${name} ${version}` : null
  }).find(Boolean)
  return [os, browser].filter(Boolean).join(' · ') || null
}
