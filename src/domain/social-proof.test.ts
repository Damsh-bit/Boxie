import { describe, expect, it } from 'vitest'
import {
  buildFeed,
  firstNameOf,
  salesToEvents,
  soldMilestone,
  timeAgo,
  type PurchaseEvent,
  type PurchaseExample,
} from './social-proof'

const NOW = new Date('2026-09-26T15:00:00.000Z')
const minutesBefore = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString()
const THEMES = new Set(['pareja', 'cumpleanos', 'amistad'])

const purchaseExamples: PurchaseExample[] = [
  { name: 'María', detail: 'para su mejor amiga', theme: 'amistad' },
  { name: 'Lucas', detail: 'para su novia', theme: 'pareja' },
  { name: 'Florencia', detail: 'para el cumple de su mamá', theme: 'cumpleanos' },
  { name: 'Joaquín', detail: 'para su novia a distancia', theme: 'pareja' },
  { name: 'Camila', detail: 'para su hermana', theme: 'cumpleanos' },
  { name: 'Tomás', detail: 'por su aniversario', theme: 'pareja' },
  { name: 'Nicolás', detail: 'para su mejor amigo', theme: 'amistad' },
  { name: 'Valentina', detail: 'para su novio en Madrid', theme: 'pareja' },
]

/** Un azar fijo, para que el orden de los ejemplos sea reproducible. */
function seeded(seed = 7) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

describe('prueba social', () => {
  it('muestra solo el nombre de pila, prolijo', () => {
    expect(firstNameOf('MARÍA JOSÉ Pérez')).toBe('María')
    expect(firstNameOf('  lucas   gómez ')).toBe('Lucas')
    expect(firstNameOf('Ñandú')).toBe('Ñandú')
  })

  it('descarta lo que no parece un nombre', () => {
    for (const bad of ['', 'x', 'Test', 'PRUEBA', 'asdf', 'aaaa', '123', 'j.p.', 'Admin Boxie'])
      expect(firstNameOf(bad), bad).toBeNull()
  })

  it('las ventas reales van de la más nueva a la más vieja, cada nombre una vez', () => {
    const events = salesToEvents(
      [
        { id: 'a', buyerName: 'Sofía López', paidAt: minutesBefore(90), themeSlug: 'pareja' },
        { id: 'b', buyerName: 'Juan Pérez', paidAt: minutesBefore(5), themeSlug: 'amistad' },
        { id: 'c', buyerName: 'Sofía Díaz', paidAt: minutesBefore(40), themeSlug: 'cumpleanos' },
        { id: 'd', buyerName: 'test', paidAt: minutesBefore(1), themeSlug: 'pareja' },
      ],
      NOW,
    )
    expect(events.map((e) => [e.name, e.minutesAgo])).toEqual([
      ['Juan', 5],
      ['Sofía', 40],
    ])
    // Nunca sale el apellido.
    expect(JSON.stringify(events)).not.toMatch(/López|Pérez|Díaz/)
  })

  it('con pocas ventas, los ejemplos completan la cinta sin repetir nombres', () => {
    const sales: PurchaseEvent[] = [
      { id: 'v1', name: 'María', theme: 'pareja', detail: null, minutesAgo: 8 },
    ]
    const feed = buildFeed({
      sales,
      examples: purchaseExamples,
      examplesUntil: 8,
      themes: THEMES,
      max: 50,
      random: seeded(),
    })
    const names = feed.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
    expect(feed).toContainEqual(sales[0])
    // Un feed de verdad: de la más nueva a la más vieja.
    const minutes = feed.map((e) => e.minutesAgo)
    expect(minutes).toEqual([...minutes].sort((a, b) => a - b))
    expect(minutes[0]).toBeLessThanOrEqual(3)
  })

  it('cada visita ve otro orden', () => {
    const options = {
      sales: [],
      examples: purchaseExamples,
      examplesUntil: 8,
      themes: THEMES,
      max: 50,
    }
    const a = buildFeed({ ...options, random: seeded(1) }).map((e) => e.name)
    const b = buildFeed({ ...options, random: seeded(99) }).map((e) => e.name)
    expect(a).not.toEqual(b)
    expect([...a].sort()).toEqual([...b].sort())
  })

  it('con suficientes ventas reales, los ejemplos dejan de salir', () => {
    const sales = Array.from({ length: 8 }, (_, i) => ({
      id: `v${i}`,
      name: `Nombre${i}`,
      theme: 'pareja',
      detail: null,
      minutesAgo: i * 30,
    }))
    const feed = buildFeed({
      sales,
      examples: purchaseExamples,
      examplesUntil: 8,
      themes: THEMES,
      max: 24,
    })
    expect(feed).toEqual(sales)
  })

  it('no inventa compras de temáticas que no están publicadas', () => {
    const feed = buildFeed({
      sales: [],
      examples: purchaseExamples,
      examplesUntil: 8,
      themes: new Set(['pareja']),
      max: 50,
    })
    expect(feed.length).toBeGreaterThan(0)
    expect(feed.every((e) => e.theme === 'pareja')).toBe(true)
  })

  it('dice hace cuánto en criollo', () => {
    expect(timeAgo(0)).toBe('recién')
    expect(timeAgo(12)).toBe('hace 12 min')
    expect(timeAgo(185)).toBe('hace 3 h')
    expect(timeAgo(30 * 60)).toBe('ayer')
    expect(timeAgo(4 * 24 * 60 + 5)).toBe('hace 4 días')
  })

  it('el contador redondea para abajo y no aparece con pocas ventas', () => {
    expect(soldMilestone(37, 100)).toBeNull()
    expect(soldMilestone(100, 100)).toBe(100)
    expect(soldMilestone(642, 100)).toBe(500)
    expect(soldMilestone(1_234, 100)).toBe(1_000)
    expect(soldMilestone(23_900, 100)).toBe(20_000)
  })
})
