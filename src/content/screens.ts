import type { SlideKind } from '@/slides/schemas'

/**
 * Cómo se llama cada pantalla del regalo para quien compra (la comparación
 * de planes de /precios). Las de apertura y cierre van en todos los planes y
 * no se listan. Un tipo nuevo sin entrada usa el nombre del panel.
 */
export const SCREEN_NAMES: Partial<Record<SlideKind, { emoji: string; label: string }>> = {
  'story.intro': { emoji: '✨', label: 'Stickers de bienvenida' },
  'story.dedication': { emoji: '💌', label: 'Dedicatoria con foto' },
  'media.song': { emoji: '🎵', label: 'Su canción' },
  'story.reasons': { emoji: '💖', label: 'Las razones' },
  'connector.gamer': { emoji: '🎮', label: 'Pantalla de juego' },
  'game.trivia': { emoji: '🧠', label: 'Trivia' },
  'game.jackpot': { emoji: '🎰', label: 'Tragamonedas' },
  'game.coupons': { emoji: '🎟️', label: 'Cuponera' },
  'story.editorial': { emoji: '📰', label: 'Tapa de revista' },
  'story.anecdote': { emoji: '📸', label: 'Anécdota con foto' },
  'outro.summary': { emoji: '🎞️', label: 'Repaso final' },
  'media.playlists': { emoji: '🎧', label: 'Playlists' },
  'connector.cinema': { emoji: '🎬', label: 'Telón de cine' },
  'media.streaming': { emoji: '🍿', label: 'Cine y series' },
  'reflect.gratitude': { emoji: '🙏', label: 'Gratitud' },
  'reflect.journal': { emoji: '📔', label: 'Diario' },
  'game.fortune': { emoji: '🥠', label: 'Galleta de la fortuna' },
}

export function screenName(kind: SlideKind, fallbackLabel: string) {
  return (
    SCREEN_NAMES[kind] ?? {
      emoji: '✦',
      label: fallbackLabel.split('·').pop()?.trim() || fallbackLabel,
    }
  )
}
