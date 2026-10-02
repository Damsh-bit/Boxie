import type { IconName } from '@/domain/icons'
import type { SummaryIcon } from './types'

/** El ícono propio de cada pantalla en el repaso final y en los módulos del editor. */
export const SUMMARY_ICONS: Record<SummaryIcon, IconName> = {
  gift: 'regalo',
  heart: 'corazon',
  music: 'musica',
  headphones: 'auriculares',
  smile: 'trivia',
  sun: 'tragamonedas',
  ticket: 'entrada',
  camera: 'camara',
  'check-circle': 'corazon-brillo',
  'pen-tool': 'diario',
  moon: 'galletita',
  film: 'pelicula',
  sparkles: 'destellos',
  gamepad: 'juego',
  party: 'cotillon',
}
