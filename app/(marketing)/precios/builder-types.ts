import type { BuilderModule, BuilderPlan } from '@/domain/quote-builder'

/** Un plan como lo usa el cotizador (lo arma la página con la vidriera). */
export interface QuotePlan extends BuilderPlan {
  tagline: string
  color: string
  highlighted: boolean
}

/** Un módulo que se puede elegir, con su nombre para la gente. */
export interface QuoteModule extends BuilderModule {
  emoji: string
  label: string
  blurb: string
  group: string
}

export interface QuoteTheme {
  slug: string
  name: string
  emoji: string
  color: string
  image: string
  /** Precio propio (solo cuenta sin planes). */
  priceCents: number
  modules: QuoteModule[]
  /** Pantallas y juegos en cada plan (mismo orden que los planes). */
  screens: number[]
  games: number[]
}

export interface QuoteGroup {
  id: string
  label: string
  emoji: string
}
