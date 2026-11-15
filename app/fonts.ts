import {
  Caveat,
  Fredoka,
  Josefin_Sans,
  Outfit,
  Permanent_Marker,
  Playfair_Display,
} from 'next/font/google'

/**
 * Tipografías del prototipo, servidas por next/font (sin pedirle nada a
 * Google en cada visita). El prototipo las importaba con @import dentro de
 * <style> en cada slide.
 *
 * Caveat (notas, cartas y respuestas) y Playfair Display (títulos editoriales)
 * son de las pantallas nuevas de Ribbly (src/slides/ribbly).
 */

export const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', display: 'swap' })

export const josefin = Josefin_Sans({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-josefin',
  display: 'swap',
})

export const fredoka = Fredoka({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-fredoka',
  display: 'swap',
})

export const marker = Permanent_Marker({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-marker',
  display: 'swap',
})

export const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
})

export const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

export const fontVariables = [
  outfit.variable,
  josefin.variable,
  fredoka.variable,
  marker.variable,
  caveat.variable,
  playfair.variable,
].join(' ')
