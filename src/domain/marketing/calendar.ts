import { addDays, arDayKey, type DateRange } from '../admin/range'
import type { AdminOrder } from '../admin/types'

/**
 * El calendario comercial de un regalo en Argentina: las fechas en que la
 * gente sale a buscar qué regalar. Cada una trae cuántos días antes empieza
 * a moverse la búsqueda (la ventana en la que conviene tener la pauta
 * prendida), la temática que le va y una idea para comunicarla.
 */

export type EventImportance = 1 | 2 | 3

export interface GiftEvent {
  id: string
  name: string
  /** Día del evento ("2026-10-18"). */
  date: string
  /** Días antes en los que empieza la demanda. */
  leadDays: number
  importance: EventImportance
  /** Temática de la tienda que le va (slug), si hay. */
  theme: string | null
  idea: string
}

interface EventRule {
  id: string
  name: string
  on(year: number): string
  leadDays: number
  importance: EventImportance
  theme: string | null
  idea: string
}

const pad = (n: number) => String(n).padStart(2, '0')
const fixed = (month: number, day: number) => (year: number) => `${year}-${pad(month)}-${pad(day)}`

/** El n-ésimo día de la semana del mes (weekday: 0 = domingo). */
function nth(year: number, month: number, weekday: number, n: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1))
  const offset = (7 + weekday - first.getUTCDay()) % 7
  return new Date(Date.UTC(year, month - 1, 1 + offset + (n - 1) * 7)).toISOString().slice(0, 10)
}

/** Cuarto viernes de noviembre (Black Friday). */
const blackFriday = (year: number) => nth(year, 11, 5, 4)

const RULES: EventRule[] = [
  {
    id: 'reyes',
    name: 'Reyes',
    on: fixed(1, 6),
    leadDays: 5,
    importance: 1,
    theme: null,
    idea: 'Regalo de último momento para los chicos de la familia: llega al instante.',
  },
  {
    id: 'san-valentin',
    name: 'San Valentín',
    on: fixed(2, 14),
    leadDays: 21,
    importance: 3,
    theme: 'pareja',
    idea: 'La fecha más fuerte del año para pareja: mostrá la reacción al abrirla y el "llega en 1 minuto".',
  },
  {
    id: 'mujer',
    name: 'Día de la Mujer',
    on: fixed(3, 8),
    leadDays: 5,
    importance: 1,
    theme: 'amistad',
    idea: 'Mensajes entre amigas y compañeras de trabajo; mejor desde lo emocional que desde el descuento.',
  },
  {
    id: 'hot-sale',
    name: 'Hot Sale',
    on: (y) => nth(y, 5, 1, 2),
    leadDays: 7,
    importance: 2,
    theme: null,
    idea: 'Tres días de descuentos en todo el país: la gente compra con cupón aunque no haya fecha.',
  },
  {
    id: 'padre',
    name: 'Día del Padre',
    on: (y) => nth(y, 6, 0, 3),
    leadDays: 14,
    importance: 2,
    theme: null,
    idea: 'Trivia con anécdotas del papá y playlist de su música: lo que más se comparte.',
  },
  {
    id: 'amigo',
    name: 'Día del Amigo',
    on: fixed(7, 20),
    leadDays: 12,
    importance: 3,
    theme: 'amistad',
    idea: 'Se regala a varios amigos: empujá el "comprá una y regalala en el grupo".',
  },
  {
    id: 'ninez',
    name: 'Día de las Infancias',
    on: (y) => nth(y, 8, 0, 3),
    leadDays: 10,
    importance: 1,
    theme: null,
    idea: 'Para tíos y padrinos a distancia: juegos y fotos en un solo link.',
  },
  {
    id: 'maestro',
    name: 'Día del Maestro',
    on: fixed(9, 11),
    leadDays: 7,
    importance: 1,
    theme: null,
    idea: 'Regalo grupal del curso: una Boxie con fotos y mensajes de todos.',
  },
  {
    id: 'primavera',
    name: 'Primavera y Día del Estudiante',
    on: fixed(9, 21),
    leadDays: 7,
    importance: 1,
    theme: 'amistad',
    idea: 'Público joven: formato TikTok y reels con la reacción de los amigos.',
  },
  {
    id: 'madre',
    name: 'Día de la Madre',
    on: (y) => nth(y, 10, 0, 3),
    leadDays: 21,
    importance: 3,
    theme: 'dia-de-la-madre',
    idea: 'La segunda fecha más fuerte: hijos que viven lejos, fotos de toda la vida y un mensaje grabado.',
  },
  {
    id: 'halloween',
    name: 'Halloween',
    on: fixed(10, 31),
    leadDays: 7,
    importance: 1,
    theme: 'halloween',
    idea: 'Una temática divertida para amigos y parejas; sirve para probar creatividades nuevas.',
  },
  {
    id: 'cybermonday',
    name: 'CyberMonday',
    on: (y) => nth(y, 11, 1, 1),
    leadDays: 7,
    importance: 2,
    theme: null,
    idea: 'Evento oficial de descuentos online: tené el cupón y los anuncios listos antes del lunes.',
  },
  {
    id: 'black-friday',
    name: 'Black Friday',
    on: blackFriday,
    leadDays: 5,
    importance: 1,
    theme: null,
    idea: 'Cada vez más marcas argentinas lo usan: buena excusa para una oferta corta.',
  },
  {
    id: 'navidad',
    name: 'Navidad',
    on: fixed(12, 24),
    leadDays: 21,
    importance: 3,
    theme: 'navidad',
    idea: 'Regalo para toda la familia y para quien está lejos; el envío instantáneo gana en los últimos días.',
  },
]

/** Los eventos de un año. */
export function eventsOfYear(year: number): GiftEvent[] {
  return RULES.map((r) => ({
    id: r.id,
    name: r.name,
    date: r.on(year),
    leadDays: r.leadDays,
    importance: r.importance,
    theme: r.theme,
    idea: r.idea,
  })).sort((a, b) => a.date.localeCompare(b.date))
}

export interface UpcomingEvent extends GiftEvent {
  daysUntil: number
  /** Cuándo prender la pauta (la ventana de demanda). */
  rampStart: string
  /** Cuándo tener listos anuncios, cupón y temática (una semana antes). */
  prepareBy: string
  /** El mismo evento el año pasado. */
  lastYear: GiftEvent
}

/** Los eventos de los próximos `days` días, con sus fechas de preparación. */
export function upcomingEvents(now: Date, days = 365): UpcomingEvent[] {
  const today = arDayKey(now)
  const year = Number(today.slice(0, 4))
  const limit = arDayKey(addDays(now, days))
  const out: UpcomingEvent[] = []
  for (const y of [year, year + 1]) {
    for (const e of eventsOfYear(y)) {
      if (e.date < today || e.date > limit) continue
      const date = new Date(`${e.date}T12:00:00-03:00`)
      const lastYear = eventsOfYear(y - 1).find((x) => x.id === e.id)!
      out.push({
        ...e,
        daysUntil: Math.round(
          (date.getTime() - Date.parse(`${today}T12:00:00-03:00`)) / 86_400_000,
        ),
        rampStart: arDayKey(addDays(date, -e.leadDays)),
        prepareBy: arDayKey(addDays(date, -e.leadDays - 7)),
        lastYear,
      })
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export interface EventLift {
  /** Ventas por día en la ventana del evento. */
  perDay: number
  /** Ventas por día en las 4 semanas anteriores a la ventana. */
  baselinePerDay: number
  /** Cuántas veces más se vendió (1 = igual). */
  lift: number | null
  sales: number
  revenueCents: number
  window: DateRange
}

/** Cuánto movió un evento las ventas (de su ventana contra las 4 semanas previas). */
export function eventLift(orders: readonly AdminOrder[], event: GiftEvent): EventLift {
  const end = addDays(new Date(`${event.date}T00:00:00.000-03:00`), 1)
  const start = addDays(end, -(event.leadDays + 1))
  const baseStart = addDays(start, -28)
  const afterEnd = addDays(end, 28)
  let sales = 0
  let revenue = 0
  let before = 0
  let after = 0
  let first = Infinity
  for (const o of orders) {
    if ((o.status !== 'paid' && o.status !== 'refunded') || !o.paidAt) continue
    const t = Date.parse(o.paidAt)
    first = Math.min(first, t)
    if (t >= start.getTime() && t < end.getTime()) {
      sales++
      revenue += o.amountCents
    } else if (t >= baseStart.getTime() && t < start.getTime()) before++
    else if (t >= end.getTime() && t < afterEnd.getTime()) after++
  }
  const days = event.leadDays + 1
  const perDay = sales / days
  // Sin historial antes de la fecha (la tienda es más nueva), se compara con las 4 semanas de después.
  // (con una semana de tolerancia: tres semanas de historial alcanzan).
  const baselinePerDay = first <= addDays(baseStart, 7).getTime() ? before / 28 : after / 28
  return {
    perDay,
    baselinePerDay,
    lift: baselinePerDay > 0 ? perDay / baselinePerDay : null,
    sales,
    revenueCents: revenue,
    window: { from: start, to: end, preset: 'custom' },
  }
}
