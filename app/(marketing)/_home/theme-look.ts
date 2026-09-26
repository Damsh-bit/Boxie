import { Cake, Heart, Users, type LucideIcon } from 'lucide-react'

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
  /** El emoji de la temática: el de la home, el de su guía en el panel o un regalo. */
  emoji: string
  /** Precio ya formateado ("$ 4.990"). */
  price: string
  /** Cómo se anuncia: "Desde $ 3.490" si hay planes, si no el precio. */
  priceLabel: string
}

interface ThemeLook {
  emoji: string
  /** Lo que flota en la portada de muestra. */
  particle: string
  /** El ícono grande de la portada. Sin ícono, va el emoji de la temática. */
  icon?: LucideIcon
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
  names: ['Sofía', 'Mamá', 'Lucas'],
}

/**
 * Cómo se ve cada temática en la home. Las que se crean en el panel (el
 * generador, una temática nueva) no tienen entrada: usan su emoji y el resto
 * del look general, así la home las muestra bien sin tocar código.
 */
export const lookOf = (slug: string): ThemeLook => LOOKS[slug] ?? FALLBACK

/** El emoji de una temática: el de la home, el de su guía (panel) o un regalo. */
export function themeEmoji(slug: string, guideEmoji?: string | null): string {
  return LOOKS[slug]?.emoji ?? (guideEmoji?.trim() || FALLBACK.emoji)
}

/**
 * El fondo de la inicial de quien compró (la cinta de compras de la portada):
 * el color de la temática oscurecido, para que la letra blanca se lea aunque
 * el color sea claro.
 */
export const avatarGradient = (color: string) =>
  `linear-gradient(140deg, color-mix(in srgb, ${color} 88%, #2a2433), color-mix(in srgb, ${color} 58%, #2a2433))`

/** El degradé de la portada, a partir del color de la tarjeta. */
export const themeGradient = (color: string) =>
  `linear-gradient(160deg, color-mix(in srgb, ${color} 72%, #2a2433) 0%, color-mix(in srgb, ${color} 88%, #2a2433) 50%, color-mix(in srgb, ${color} 70%, #ffffff) 100%)`
