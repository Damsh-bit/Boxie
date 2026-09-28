import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GALLERY_STATE,
  describeDaysUntil,
  filterGallery,
  foldText,
  galleryCategories,
  galleryQueryString,
  matchesQuery,
  readGalleryParams,
  sortGallery,
  type GalleryIndexItem,
} from './gallery'

const item = (overrides: Partial<GalleryIndexItem> & { slug: string }): GalleryIndexItem => ({
  name: overrides.slug,
  category: 'Amor',
  order: 0,
  search: foldText(overrides.slug),
  daysUntil: null,
  ...overrides,
})

const CATALOG = [
  item({
    slug: 'pareja',
    name: 'Pareja',
    order: 1,
    daysUntil: 139,
    search: foldText('Pareja Amor aniversario San Valentín'),
  }),
  item({
    slug: 'cumpleanos',
    name: 'Cumpleaños',
    category: 'Cumpleaños',
    order: 2,
    search: foldText('Cumpleaños fiesta saludo grupal'),
  }),
  item({
    slug: 'dia-de-la-madre',
    name: 'Día de la Madre',
    category: 'Familia',
    order: 3,
    daysUntil: 20,
    search: foldText('Día de la Madre mamá Familia'),
  }),
]

describe('buscar', () => {
  it('no distingue tildes ni mayúsculas', () => {
    expect(matchesQuery(CATALOG[1]!, 'CUMPLEANOS')).toBe(true)
    expect(matchesQuery(CATALOG[2]!, 'mama')).toBe(true)
  })

  it('cada palabra tiene que aparecer, en cualquier orden', () => {
    expect(matchesQuery(CATALOG[0]!, 'valentin san')).toBe(true)
    expect(matchesQuery(CATALOG[0]!, 'san cumple')).toBe(false)
  })

  it('una búsqueda vacía encuentra todo', () => {
    expect(filterGallery(CATALOG, { query: '   ', category: null })).toHaveLength(3)
  })

  it('combina la búsqueda con la categoría', () => {
    expect(filterGallery(CATALOG, { query: 'mama', category: 'Familia' })).toHaveLength(1)
    expect(filterGallery(CATALOG, { query: 'mama', category: 'Amor' })).toHaveLength(0)
  })
})

describe('ordenar', () => {
  it('recomendadas respeta el orden del panel', () => {
    const shuffled = [CATALOG[2]!, CATALOG[0]!, CATALOG[1]!]
    expect(sortGallery(shuffled, 'recomendadas').map((t) => t.slug)).toEqual([
      'pareja',
      'cumpleanos',
      'dia-de-la-madre',
    ])
  })

  it('por fecha: la más cercana primero y las de todo el año al final', () => {
    expect(sortGallery(CATALOG, 'fecha').map((t) => t.slug)).toEqual([
      'dia-de-la-madre',
      'pareja',
      'cumpleanos',
    ])
  })

  it('A-Z ordena en castellano (la tilde no manda al final)', () => {
    expect(sortGallery(CATALOG, 'az').map((t) => t.slug)).toEqual([
      'cumpleanos',
      'dia-de-la-madre',
      'pareja',
    ])
  })

  it('no toca la lista original', () => {
    const before = CATALOG.map((t) => t.slug)
    sortGallery(CATALOG, 'az')
    expect(CATALOG.map((t) => t.slug)).toEqual(before)
  })
})

describe('categorías', () => {
  it('en el orden del catálogo y con cuántas hay', () => {
    expect(galleryCategories([...CATALOG, item({ slug: 'otra', category: 'Amor' })])).toEqual([
      { name: 'Amor', count: 2 },
      { name: 'Cumpleaños', count: 1 },
      { name: 'Familia', count: 1 },
    ])
  })
})

describe('estado en la URL', () => {
  const known = { categories: ['Amor', 'Familia'], plans: ['esencial', 'clasica'] }

  it('lee lo que existe e ignora lo que no', () => {
    expect(
      readGalleryParams(
        { q: ' mamá ', categoria: 'Familia', plan: 'premium', orden: 'fecha', vista: 'x' },
        known,
      ),
    ).toEqual({
      query: 'mamá',
      category: 'Familia',
      plan: null,
      sort: 'fecha',
      view: 'grande',
    })
  })

  it('sin parámetros, el estado por defecto', () => {
    expect(readGalleryParams({}, known)).toEqual(DEFAULT_GALLERY_STATE)
  })

  it('escribe solo lo que cambió', () => {
    expect(galleryQueryString(DEFAULT_GALLERY_STATE)).toBe('')
    expect(
      galleryQueryString({
        ...DEFAULT_GALLERY_STATE,
        query: 'día del amigo',
        plan: 'clasica',
        view: 'compacta',
      }),
    ).toBe('?q=d%C3%ADa+del+amigo&plan=clasica&vista=compacta')
  })

  it('ida y vuelta: lo que se escribe se vuelve a leer igual', () => {
    const state = {
      ...DEFAULT_GALLERY_STATE,
      query: 'mamá',
      category: 'Familia',
      sort: 'az' as const,
    }
    const params = Object.fromEntries(new URLSearchParams(galleryQueryString(state)))
    expect(readGalleryParams(params, known)).toEqual(state)
  })
})

describe('describeDaysUntil', () => {
  it('habla como una persona', () => {
    expect(describeDaysUntil(0)).toBe('es hoy')
    expect(describeDaysUntil(1)).toBe('es mañana')
    expect(describeDaysUntil(20)).toBe('faltan 20 días')
  })
})
