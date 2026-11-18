import type { StyleAxis } from '../styles'
import { decoAxis, PALETTE_AXIS, TYPE_AXIS } from './style-kit'

/**
 * Lo que se puede variar en cada pantalla de Cumpleaños
 * (docs/PLAN-VARIACIONES.md, "Los cuatro ejes de cada pantalla"). Primero lo
 * propio de la pantalla y después los ejes comunes. La decoración no ofrece
 * lo que la pantalla ya trae (para no repetir banderines sobre banderines).
 */

const common = (skip: Parameters<typeof decoAxis>[0] = []): StyleAxis[] => [
  PALETTE_AXIS,
  TYPE_AXIS,
  decoAxis(skip),
]

export const CUMPLE_STYLES: Record<string, readonly StyleAxis[]> = {
  'intro.brand': common(['globos', 'banderines', 'confeti']),
  'cover.cake': common(['banderines', 'confeti']),
  'story.card': common(['confeti']),
  'media.video': common(['confeti']),
  'media.mix': common(),
  'game.quiz': common(['confeti']),
  'connector.premiere': common(['estrellas']),
  'media.poster': common(['confeti', 'globos']),
  'game.slots': common(['confeti']),
  'game.vouchers': common(['confeti']),
  'story.magazine': common(),
  'story.wishes': [TYPE_AXIS, decoAxis()],
  'reflect.candles': common(),
  'reflect.capsule': common(['estrellas']),
  'game.pinata': common(['banderines']),
  'story.memory': common(),
  'outro.recap': common(['banderines', 'confeti']),
  'outro.finale': common(['globos', 'confeti', 'estrellas']),
}

/** Los ejes de una pantalla según el estilo de la ocasión (solo Cumpleaños, por ahora). */
export function cumpleStyleAxes(
  kind: string,
  props: Record<string, unknown>,
): readonly StyleAxis[] {
  if (props.look === 'pareja') return []
  return CUMPLE_STYLES[kind] ?? []
}
