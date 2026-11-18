import type { StyleAxis } from '../styles'
import {
  CAKE_CANDLES,
  CAKE_FLAVORS,
  CARD_PAPERS,
  CARD_SEALS,
  COVER_BALLOONS,
  COVER_DETAILS,
  COVER_FRAMES,
  COVER_HANDS,
  INTRO_BALLOONS,
  MOMENTS_BALLOONS,
  MOMENTS_FASTENERS,
  MOMENTS_LAYOUTS,
  MIX_COVERS,
  POSTER_SCENES,
  PREMIERE_CURTAINS,
  PREMIERE_SNACKS,
  QUIZ_CARDS,
  VIDEO_FILTERS,
} from './piece-options'
import { decoAxis, PALETTE_AXIS, pieceAxis, TYPE_AXIS } from './style-kit'

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

const cake = [pieceAxis('torta', 'Torta', CAKE_FLAVORS), pieceAxis('velas', 'Velas', CAKE_CANDLES)]

export const CUMPLE_STYLES: Record<string, readonly StyleAxis[]> = {
  'intro.brand': [
    pieceAxis('globos', 'Globos', INTRO_BALLOONS),
    ...common(['globos', 'banderines', 'confeti']),
  ],
  'cover.cake': [...cake, ...common(['banderines', 'confeti'])],
  'cover.age': [
    pieceAxis('marco', 'Marco de la foto', COVER_FRAMES, 'photo'),
    pieceAxis('globos', 'Globos', COVER_BALLOONS),
    pieceAxis('letra', 'Letra del deseo', COVER_HANDS),
    pieceAxis('detalles', 'Detalles', COVER_DETAILS),
  ],
  'story.card': [
    pieceAxis('papel', 'Papel', CARD_PAPERS),
    pieceAxis('sello', 'Sticker del sobre', CARD_SEALS),
    ...common(['confeti']),
  ],
  'story.moments': [
    pieceAxis('sujecion', 'Cómo se sostienen', MOMENTS_FASTENERS),
    pieceAxis('disposicion', 'Cómo se acomodan', MOMENTS_LAYOUTS),
    pieceAxis('globos', 'Globos', MOMENTS_BALLOONS),
    pieceAxis('letra', 'Letra de la frase', COVER_HANDS),
  ],
  'media.video': [pieceAxis('filtro', 'Filtro', VIDEO_FILTERS), ...common(['confeti'])],
  'media.mix': [pieceAxis('portada', 'Portada', MIX_COVERS), ...common()],
  'game.quiz': [pieceAxis('tarjetas', 'Tarjetas', QUIZ_CARDS), ...common(['confeti'])],
  'connector.premiere': [
    pieceAxis('telon', 'Telón', PREMIERE_CURTAINS),
    pieceAxis('snack', 'Para comer', PREMIERE_SNACKS),
    ...common(['estrellas']),
  ],
  'media.poster': [pieceAxis('escena', 'Escena', POSTER_SCENES), ...common(['confeti', 'globos'])],
  'game.slots': common(['confeti']),
  'game.vouchers': common(['confeti']),
  'story.magazine': common(),
  'story.wishes': [TYPE_AXIS, decoAxis()],
  'reflect.candles': [...cake, ...common()],
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
