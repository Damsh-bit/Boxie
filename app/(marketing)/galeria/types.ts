import type { GalleryIndexItem } from '@/domain/gallery'

/** Una pantalla del regalo como la cuenta la galería (ícono de trivia + "Trivia"). */
export interface GalleryScreen {
  kind: string
  /** Nombre de ícono o emoji (src/domain/icons.ts). */
  emoji: string
  label: string
  game: boolean
}

/** Lo que trae una temática en un plan. */
export interface GalleryContents {
  /** Pantallas en total (con la portada y el cierre). */
  screens: number
  games: number
  /** Las pantallas que se venden (sin apertura ni cierre), en su orden. */
  items: GalleryScreen[]
}

/** Su próxima fecha fuerte del calendario (Día de la Madre, San Valentín…). */
export interface GalleryDate {
  name: string
  /** "2026-10-18" */
  date: string
  daysUntil: number
  /** Ya empezó la temporada: la gente la está buscando. */
  hot: boolean
}

/** Una temática como la muestra la galería (la arma la página con el catálogo). */
export interface GalleryTheme extends GalleryIndexItem {
  id: string
  description: string
  subtitle: string
  images: string[]
  /** Color de la tarjeta (#rrggbb) y si lleva texto claro u oscuro encima. */
  color: string
  tone: 'light' | 'dark'
  emoji: string
  features: string[]
  guide: { emoji: string; title: string; text: string } | null
  /** Para qué ocasiones va ("Aniversario", "San Valentín"…). */
  occasions: string[]
  /** Su precio cuando no hay planes. */
  priceCents: number
  /** Qué trae según el plan (clave: slug del plan; '' si no hay planes). */
  contents: Record<string, GalleryContents>
  next: GalleryDate | null
}

export interface GalleryPlan {
  slug: string
  name: string
  tagline: string
  priceCents: number
  compareAtCents: number | null
  highlighted: boolean
}

/** La fecha que se viene y la temática que le va (el destacado de arriba). */
export interface GallerySeason extends GalleryDate {
  slug: string
}
