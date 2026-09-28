/**
 * La lógica de la galería (/galeria): buscar, filtrar por categoría, ordenar
 * y leer y escribir el estado en la URL. Sin React ni servidor, así se prueba
 * sola y la usan igual la página (para el primer render) y el cliente.
 */

/** Sin tildes ni mayúsculas: "Cumpleaños" se encuentra escribiendo "cumpleanos". */
export const foldText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

export const GALLERY_SORTS = ['recomendadas', 'fecha', 'az'] as const
export type GallerySort = (typeof GALLERY_SORTS)[number]

export const GALLERY_VIEWS = ['grande', 'compacta'] as const
export type GalleryView = (typeof GALLERY_VIEWS)[number]

/** Lo que la galería necesita de cada temática para buscarla, filtrarla y ordenarla. */
export interface GalleryIndexItem {
  slug: string
  name: string
  category: string
  /** Posición en el catálogo (la decide el panel). */
  order: number
  /** Todo lo que se puede buscar, ya plegado con `foldText`. */
  search: string
  /** Días hasta su próxima fecha fuerte (Día de la Madre, San Valentín…). null: todo el año. */
  daysUntil: number | null
}

export interface GalleryFilters {
  query: string
  /** La categoría elegida. null: todas. */
  category: string | null
}

/** Cada palabra de la búsqueda tiene que aparecer (en cualquier orden). */
export function matchesQuery(item: Pick<GalleryIndexItem, 'search'>, query: string): boolean {
  const words = foldText(query).split(/\s+/).filter(Boolean)
  return words.every((w) => item.search.includes(w))
}

export function filterGallery<T extends GalleryIndexItem>(
  items: T[],
  filters: GalleryFilters,
): T[] {
  return items.filter(
    (item) =>
      (filters.category === null || item.category === filters.category) &&
      matchesQuery(item, filters.query),
  )
}

export function sortGallery<T extends GalleryIndexItem>(items: T[], sort: GallerySort): T[] {
  const sorted = [...items]
  if (sort === 'az') return sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  if (sort === 'fecha')
    // Las que tienen fecha, de la más cercana a la más lejana; después las de todo el año.
    return sorted.sort(
      (a, b) =>
        (a.daysUntil ?? Number.POSITIVE_INFINITY) - (b.daysUntil ?? Number.POSITIVE_INFINITY) ||
        a.order - b.order,
    )
  return sorted.sort((a, b) => a.order - b.order)
}

/** Las categorías del catálogo en el orden en que aparecen, con cuántas temáticas tiene cada una. */
export function galleryCategories(items: Pick<GalleryIndexItem, 'category'>[]) {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
  return [...counts].map(([name, count]) => ({ name, count }))
}

export interface GalleryState extends GalleryFilters {
  sort: GallerySort
  view: GalleryView
  /** Slug del plan elegido. null: sin plan (se muestra el "desde"). */
  plan: string | null
}

export const DEFAULT_GALLERY_STATE: GalleryState = {
  query: '',
  category: null,
  sort: 'recomendadas',
  view: 'grande',
  plan: null,
}

type Params = Record<string, string | string[] | undefined>

const one = (value: string | string[] | undefined) =>
  (Array.isArray(value) ? value[0] : value)?.trim() ?? ''

/**
 * El estado a partir de la URL (`?q=mama&categoria=Familia&orden=fecha`).
 * Lo que no existe en el catálogo (una categoría o un plan viejos) se ignora.
 */
export function readGalleryParams(
  params: Params,
  known: { categories: string[]; plans: string[] },
): GalleryState {
  const category = one(params.categoria)
  const plan = one(params.plan)
  const sort = one(params.orden) as GallerySort
  const view = one(params.vista) as GalleryView
  return {
    query: one(params.q).slice(0, 60),
    category: known.categories.includes(category) ? category : null,
    sort: GALLERY_SORTS.includes(sort) ? sort : DEFAULT_GALLERY_STATE.sort,
    view: GALLERY_VIEWS.includes(view) ? view : DEFAULT_GALLERY_STATE.view,
    plan: known.plans.includes(plan) ? plan : null,
  }
}

/** La URL del estado, sin lo que está por defecto ("?q=mama&plan=clasica" o ""). */
export function galleryQueryString(state: GalleryState): string {
  const params = new URLSearchParams()
  if (state.query.trim()) params.set('q', state.query.trim())
  if (state.category) params.set('categoria', state.category)
  if (state.plan) params.set('plan', state.plan)
  if (state.sort !== DEFAULT_GALLERY_STATE.sort) params.set('orden', state.sort)
  if (state.view !== DEFAULT_GALLERY_STATE.view) params.set('vista', state.view)
  const text = params.toString()
  return text ? `?${text}` : ''
}

/** "hoy" · "mañana" · "faltan 20 días". */
export function describeDaysUntil(days: number): string {
  if (days <= 0) return 'es hoy'
  if (days === 1) return 'es mañana'
  return `faltan ${days} días`
}
