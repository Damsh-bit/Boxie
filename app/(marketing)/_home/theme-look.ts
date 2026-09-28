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

/** Lo que cuenta la Boxie de muestra del celular de la portada, pantalla por pantalla. */
export interface ThemeStory {
  /** El pie de las dos fotos. */
  captions: [string, string]
  /** La carta, después del "{nombre}:". */
  letter: string[]
  song: { title: string; artist: string }
  /** Una pregunta de la trivia; `answer` es la opción correcta. */
  trivia: { question: string; options: string[]; answer: number }
  /** El regalo del final. */
  surprise: { emoji: string; title: string; detail: string }
}

interface ThemeLook {
  emoji: string
  /** Lo que flota en la portada de muestra. */
  particle: string
  /** El ícono grande de la portada. Sin ícono, va el emoji de la temática. */
  icon?: LucideIcon
  /** Nombres que van pasando en la portada mientras no escribas uno. */
  names: string[]
  story: ThemeStory
}

const LOOKS: Record<string, ThemeLook> = {
  pareja: {
    emoji: '💘',
    particle: '❤',
    icon: Heart,
    names: ['Sofía', 'Martu', 'Lucas', 'mi amor'],
    story: {
      captions: ['Nuestro primer viaje ✈️', 'Esa tarde 🌅'],
      letter: [
        'Hay días en los que no alcanzan las palabras, así que te hice esto.',
        'Gracias por cada risa, cada viaje y cada abrazo.',
        'Te elijo todos los días ❤️',
      ],
      song: { title: 'All of Me', artist: 'John Legend' },
      trivia: {
        question: '¿Dónde fue nuestra primera cita?',
        options: ['En el cine 🍿', 'En la costanera 🌊', 'En una plaza 🌳'],
        answer: 1,
      },
      surprise: {
        emoji: '🍝',
        title: 'Una cena a elección',
        detail: 'Vos elegís el lugar, yo invito',
      },
    },
  },
  cumpleanos: {
    emoji: '🎂',
    particle: '🎈',
    icon: Cake,
    names: ['Mamá', 'la Abu', 'Tomi', 'Juli'],
    story: {
      captions: ['Tu cumple pasado 🎈', 'La mejor noche 🪩'],
      letter: [
        'Que este año te traiga todo lo que te merecés (y un poquito más).',
        'Gracias por hacer todo más lindo.',
        '¡Feliz cumple! 🎂',
      ],
      song: { title: 'Happy', artist: 'Pharrell Williams' },
      trivia: {
        question: '¿Qué torta pedís siempre?',
        options: ['Chocotorta 🍫', 'Rogel 🍯', 'Frutillas 🍓'],
        answer: 0,
      },
      surprise: {
        emoji: '🎟️',
        title: 'Dos entradas al recital',
        detail: 'Guardá la fecha: vamos juntos',
      },
    },
  },
  amistad: {
    emoji: '🤝',
    particle: '✦',
    icon: Users,
    names: ['Cami', 'Nico', 'Flor', 'mi team'],
    story: {
      captions: ['Ese viaje juntos 🚐', 'Los de siempre 📸'],
      letter: [
        'No sé qué haría sin vos.',
        'Gracias por estar en todas, en las buenas y en las otras.',
        'Amistad así hay una sola 🤝',
      ],
      song: { title: 'Count on Me', artist: 'Bruno Mars' },
      trivia: {
        question: '¿Cuál fue nuestro peor plan?',
        options: ['Acampar con lluvia ⛺', 'Karaoke a las 4 AM 🎤', 'Perdernos en Mendoza 🗺️'],
        answer: 2,
      },
      surprise: {
        emoji: '🍕',
        title: 'Noche de pizza y pelis',
        detail: 'Yo pongo la pizza, vos la peli',
      },
    },
  },
}

const FALLBACK: ThemeLook = {
  emoji: '🎁',
  particle: '✦',
  names: ['Sofía', 'Mamá', 'Lucas'],
  story: {
    captions: ['Un día para recordar ✨', 'Nosotros 📸'],
    letter: [
      'Te hice este regalo para recordarte lo importante que sos.',
      'Gracias por estar siempre.',
      'Con todo mi cariño 💖',
    ],
    song: { title: 'Here Comes the Sun', artist: 'The Beatles' },
    trivia: {
      question: '¿Cuál es mi comida favorita?',
      options: ['Pizza 🍕', 'Sushi 🍣', 'Asado 🥩'],
      answer: 2,
    },
    surprise: { emoji: '☕', title: 'Un desayuno juntos', detail: 'Cuando quieras, yo invito' },
  },
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
