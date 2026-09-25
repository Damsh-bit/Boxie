import { Cake, Gift, Heart, Users, type LucideIcon } from 'lucide-react'

/** Lo que la home necesita de cada temática (lo arma la página con el catálogo). */
export interface HomeTheme {
  slug: string
  name: string
  description: string
  /** Color de la tarjeta (#rrggbb) y si lleva texto claro u oscuro encima. */
  color: string
  tone: 'light' | 'dark'
  images: string[]
  features: string[]
  /** Precio ya formateado ("$ 4.990"). */
  price: string
}

interface ThemeLook {
  emoji: string
  /** Lo que flota en la portada de muestra. */
  particle: string
  icon: LucideIcon
  /** Nombres que van pasando en la portada mientras no escribas uno. */
  names: string[]
}

const LOOKS: Record<string, ThemeLook> = {
  pareja: {
    emoji: '💘',
    particle: '❤',
    icon: Heart,
    names: ['Sofía', 'Martu', 'Lucas', 'mi amor'],
  },
  cumpleanos: {
    emoji: '🎂',
    particle: '🎈',
    icon: Cake,
    names: ['Mamá', 'la Abu', 'Tomi', 'Juli'],
  },
  amistad: { emoji: '🤝', particle: '✦', icon: Users, names: ['Cami', 'Nico', 'Flor', 'mi team'] },
}

const FALLBACK: ThemeLook = {
  emoji: '🎁',
  particle: '✦',
  icon: Gift,
  names: ['Sofía', 'Mamá', 'Lucas'],
}

/** Cómo se ve cada temática en la home. Una temática nueva sin entrada usa la de regalo. */
export const lookOf = (slug: string): ThemeLook => LOOKS[slug] ?? FALLBACK

/** El degradé de la portada, a partir del color de la tarjeta. */
export const themeGradient = (color: string) =>
  `linear-gradient(160deg, color-mix(in srgb, ${color} 72%, #2a2433) 0%, color-mix(in srgb, ${color} 88%, #2a2433) 50%, color-mix(in srgb, ${color} 70%, #ffffff) 100%)`
