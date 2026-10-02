import type { SlideKind } from '@/slides/schemas'

/**
 * Cómo se llama cada pantalla del regalo para quien compra (la comparación
 * de planes de /precios). Las de apertura y cierre van en todos los planes y
 * no se listan. Un tipo nuevo sin entrada usa el nombre del panel.
 */
export const SCREEN_NAMES: Partial<Record<SlideKind, { emoji: string; label: string }>> = {
  'story.intro': { emoji: 'destellos', label: 'Stickers de bienvenida' },
  'story.dedication': { emoji: 'carta-de-amor', label: 'Dedicatoria con foto' },
  'media.song': { emoji: 'musica', label: 'Su canción' },
  'story.reasons': { emoji: 'corazon-brillo', label: 'Las razones' },
  'connector.gamer': { emoji: 'juego', label: 'Pantalla de juego' },
  'game.trivia': { emoji: 'trivia', label: 'Trivia' },
  'game.jackpot': { emoji: 'tragamonedas', label: 'Tragamonedas' },
  'game.coupons': { emoji: 'entrada', label: 'Cuponera' },
  'story.editorial': { emoji: 'revista', label: 'Tapa de revista' },
  'story.anecdote': { emoji: 'camara', label: 'Anécdota con foto' },
  'outro.summary': { emoji: 'pelicula', label: 'Repaso final' },
  'media.playlists': { emoji: 'auriculares', label: 'Playlists' },
  'connector.cinema': { emoji: 'claqueta', label: 'Telón de cine' },
  'media.streaming': { emoji: 'pochoclos', label: 'Cine y series' },
  'reflect.gratitude': { emoji: 'gracias', label: 'Gratitud' },
  'reflect.journal': { emoji: 'diario', label: 'Diario' },
  'game.fortune': { emoji: 'galletita', label: 'Galleta de la fortuna' },
}

export function screenName(kind: SlideKind, fallbackLabel: string) {
  return (
    SCREEN_NAMES[kind] ?? {
      emoji: '✦',
      label: fallbackLabel.split('·').pop()?.trim() || fallbackLabel,
    }
  )
}
