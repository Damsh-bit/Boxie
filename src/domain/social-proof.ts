/**
 * Prueba social de la portada: la cinta de "María acaba de comprar una Boxie"
 * y el contador de regalos. Todo sale de ventas reales (solo el nombre de
 * pila, la temática y hace cuánto); los ejemplos de `content/social-proof`
 * solo completan la cinta mientras las ventas recientes son pocas.
 */

/** Una compra de la cinta, ya lista para mostrar. */
export interface PurchaseEvent {
  id: string
  /** Nombre de pila, nunca el apellido. */
  name: string
  /** Slug de la temática: da el emoji, el color y la bajada. */
  theme: string
  /** "para su mejor amiga". null: la bajada sale de la temática. */
  detail: string | null
  /** Minutos desde la compra al armar la página. */
  minutesAgo: number
}

/** Lo que la portada muestra para dar confianza. */
export interface SocialProof {
  /** La cinta de compras, de la más nueva a la más vieja. */
  events: PurchaseEvent[]
  /** Boxies vendidas, redondeado a un número redondo ("+500"). null mientras sean pocas. */
  sold: number | null
}

/** Una venta pagada, con lo mínimo que hace falta (ni mail ni teléfono). */
export interface SaleRow {
  id: string
  buyerName: string
  paidAt: string
  themeSlug: string
}

/** Un ejemplo de relleno: quién, para quién y de qué temática. */
export interface PurchaseExample {
  name: string
  detail: string
  theme: string
}

// Lo que la gente escribe cuando prueba el checkout: no es un nombre para mostrar.
const NOT_NAMES = new Set([
  'test',
  'testing',
  'prueba',
  'pruebas',
  'probando',
  'admin',
  'demo',
  'boxie',
  'asd',
  'asdf',
  'asdasd',
  'qwe',
  'qwerty',
  'xxx',
  'aaa',
  'hola',
  'fake',
  'user',
  'usuario',
  'cliente',
  'comprador',
  'nombre',
  'ejemplo',
  'apro',
  'cont',
  'othe',
])

/**
 * El nombre de pila de quien compró, prolijo ("MARÍA JOSÉ" → "María"), o null
 * si no parece un nombre (vacío, números, "test").
 */
export function firstNameOf(fullName: string): string | null {
  const first = fullName.trim().split(/\s+/)[0] ?? ''
  if (!/^\p{L}{2,14}$/u.test(first)) return null
  const lower = first.toLocaleLowerCase('es-AR')
  if (NOT_NAMES.has(lower.normalize('NFD').replace(/\p{M}/gu, ''))) return null
  if (/^(.)\1+$/u.test(lower)) return null
  return lower.charAt(0).toLocaleUpperCase('es-AR') + lower.slice(1)
}

/** Las ventas reales como compras de la cinta: la más nueva primero y cada nombre una vez. */
export function salesToEvents(sales: SaleRow[], now: Date): PurchaseEvent[] {
  const seen = new Set<string>()
  return [...sales]
    .sort((a, b) => b.paidAt.localeCompare(a.paidAt))
    .flatMap((sale) => {
      const name = firstNameOf(sale.buyerName)
      if (!name || seen.has(name)) return []
      seen.add(name)
      const minutesAgo = Math.max(0, Math.floor((now.getTime() - Date.parse(sale.paidAt)) / 60_000))
      return [{ id: sale.id, name, theme: sale.themeSlug, detail: null, minutesAgo }]
    })
}

interface FeedOptions {
  sales: PurchaseEvent[]
  examples: readonly PurchaseExample[]
  /** Con esta cantidad de ventas recientes, la cinta es solo de ventas reales. */
  examplesUntil: number
  /** Temáticas publicadas: los ejemplos de una temática que no está no se muestran. */
  themes: ReadonlySet<string>
  max: number
  random?: () => number
}

/**
 * La cinta: las ventas reales y, si todavía son pocas, ejemplos mezclados con
 * horarios escalonados, todo de la compra más nueva a la más vieja (como un
 * feed de verdad).
 */
export function buildFeed({
  sales,
  examples,
  examplesUntil,
  themes,
  max,
  random = Math.random,
}: FeedOptions): PurchaseEvent[] {
  if (sales.length >= examplesUntil) return sales.slice(0, max)

  const taken = new Set(sales.map((s) => s.name))
  const pool = examples.filter((e) => themes.has(e.theme) && !taken.has(e.name))
  // Fisher–Yates: cada visita ve otro orden.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }

  let minutes = 1 + Math.floor(random() * 3)
  const filler = pool.map((e, i) => {
    const event: PurchaseEvent = {
      id: `ejemplo-${i}`,
      name: e.name,
      theme: e.theme,
      detail: e.detail,
      minutesAgo: minutes,
    }
    minutes += 3 + Math.floor(random() * 10)
    return event
  })

  return [...sales, ...filler].sort((a, b) => a.minutesAgo - b.minutesAgo).slice(0, max)
}

/** Recién comprada: la cinta dice "acaba de comprar" en vez de la hora. */
export const isFresh = (minutesAgo: number) => minutesAgo < 30

/** "hace 5 min", "hace 3 h", "ayer", "hace 4 días". */
export function timeAgo(minutes: number): string {
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`
  if (minutes < 24 * 60) return `hace ${Math.floor(minutes / 60)} h`
  if (minutes < 48 * 60) return 'ayer'
  return `hace ${Math.floor(minutes / (24 * 60))} días`
}

const MILESTONES = [100, 200, 300, 500, 750, 1_000, 1_500, 2_000, 3_000, 5_000, 7_500, 10_000]

/**
 * Cuántas Boxies se regalaron, redondeado para abajo a un número redondo
 * ("+500"). null mientras sean menos de `from`: un contador chico resta.
 */
export function soldMilestone(total: number, from: number): number | null {
  if (total < from) return null
  // Más allá de la tabla, de a 5.000.
  if (total >= MILESTONES[MILESTONES.length - 1]!) return Math.floor(total / 5_000) * 5_000
  return MILESTONES.filter((m) => m <= total).pop() ?? from
}
