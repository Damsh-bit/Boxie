import type { SlideKind } from '@/slides/schemas'

/**
 * Textos del cotizador de /precios: cómo se agrupan los módulos y qué hace
 * cada uno, en una línea. Las pantallas de apertura, cierre y transición no
 * se eligen (van solas con el regalo) y no figuran acá. Un módulo nuevo sin
 * grupo va a "Más sorpresas" con el nombre del panel.
 */

export interface ModuleGroup {
  id: string
  label: string
  emoji: string
  kinds: SlideKind[]
}

export const moduleGroups: ModuleGroup[] = [
  {
    id: 'esencia',
    label: 'Lo que la hace única',
    emoji: '💌',
    kinds: ['story.intro', 'story.dedication', 'media.song', 'story.reasons'],
  },
  {
    id: 'juegos',
    label: 'Juegos',
    emoji: '🎮',
    kinds: ['game.trivia', 'game.jackpot', 'game.coupons', 'game.fortune'],
  },
  {
    id: 'recuerdos',
    label: 'Recuerdos',
    emoji: '📸',
    kinds: ['story.anecdote', 'story.editorial', 'outro.summary'],
  },
  {
    id: 'pantalla',
    label: 'Música y pantalla',
    emoji: '🎬',
    kinds: ['media.playlists', 'media.streaming'],
  },
  {
    id: 'sentir',
    label: 'Para sentir',
    emoji: '🙏',
    kinds: ['reflect.gratitude', 'reflect.journal'],
  },
]

export const OTHER_GROUP = { id: 'otros', label: 'Más sorpresas', emoji: '✨' }

/** Qué hace cada módulo, para quien está armando su Boxie. */
export const moduleBlurbs: Partial<Record<SlideKind, string>> = {
  'story.intro': 'Stickers animados que la reciben al abrirla.',
  'story.dedication': 'Tu carta, con foto, que se abre como un sobre.',
  'media.song': 'La canción de ustedes sonando mientras la recorre.',
  'story.reasons': 'Las razones por las que es tan especial.',
  'game.trivia': 'Preguntas sobre ustedes: si acierta, gana un premio.',
  'game.jackpot': 'Un tragamonedas que siempre gana el premio que elegís.',
  'game.coupons': 'Vales para canjear: un desayuno, elegir la peli…',
  'game.fortune': 'Una galleta de la fortuna con tu mensaje.',
  'story.anecdote': 'Esa anécdota que siempre cuentan, con su foto.',
  'story.editorial': 'Su foto en la tapa de una revista.',
  'outro.summary': 'Un repaso final con todo lo que vivió.',
  'media.playlists': 'Las playlists que armaste para ella o él.',
  'media.streaming': 'Las pelis y series que ven juntos.',
  'reflect.gratitude': 'Todo lo que le agradecés, en una pantalla.',
  'reflect.journal': 'Un diario con momentos para recordar.',
}
