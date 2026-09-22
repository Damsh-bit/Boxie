import { Fredoka, Josefin_Sans, Outfit, Permanent_Marker } from 'next/font/google'

/**
 * Tipografías del prototipo, servidas por next/font (sin pedirle nada a
 * Google en cada visita). El prototipo las importaba con @import dentro de
 * <style> en cada slide.
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

export const fontVariables = [
  outfit.variable,
  josefin.variable,
  fredoka.variable,
  marker.variable,
].join(' ')
