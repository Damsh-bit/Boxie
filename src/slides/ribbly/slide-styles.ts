import type { StyleAxis } from '../styles'
import {
  CAKE_CANDLES,
  CAKE_FLAVORS,
  CAPSULE_VESSELS,
  CARD_PAPERS,
  CARD_SEALS,
  COVER_BALLOONS,
  COVER_DETAILS,
  COVER_FRAMES,
  COVER_HANDS,
  FINALE_BOXES,
  FINALE_ENDINGS,
  INTRO_BALLOONS,
  MOMENTS_BALLOONS,
  MOMENTS_FASTENERS,
  MOMENTS_LAYOUTS,
  PINATA_COLORS,
  PINATA_SHAPES,
  MAGAZINE_COVERS,
  MAGAZINE_FRAMES,
  MEMORY_CARDS,
  MEMORY_FRAMES,
  MIX_COVERS,
  POSTER_SCENES,
  PREMIERE_CURTAINS,
  PREMIERE_SNACKS,
  QUIZ_CARDS,
  RECAP_CARDS,
  RECAP_PHOTOS,
  SLOTS_MACHINES,
  SLOTS_SYMBOLS,
  THREAD_HANDS,
  THREAD_RIBBONS,
  VIDEO_FILTERS,
  VOUCHER_COLORS,
  VOUCHER_STAMPS,
  WISH_FASTENERS,
  WISH_NOTES,
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

/** El hilo de la historia: la cinta, la letra de la nota, colores y tipografía (sin decoración: es una pausa). */
const THREAD_PIECES: StyleAxis[] = [
  pieceAxis('cinta', 'Cinta', THREAD_RIBBONS),
  pieceAxis('letra', 'Letra de la nota', THREAD_HANDS),
]
const THREAD_AXES: StyleAxis[] = [...THREAD_PIECES, PALETTE_AXIS, TYPE_AXIS]

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
  'game.slots': [
    pieceAxis('maquina', 'Máquina', SLOTS_MACHINES),
    pieceAxis('simbolos', 'Símbolos', SLOTS_SYMBOLS),
    ...common(['confeti']),
  ],
  'game.vouchers': [
    pieceAxis('vales', 'Colores de los vales', VOUCHER_COLORS),
    pieceAxis('sello', 'Sello', VOUCHER_STAMPS),
    ...common(['confeti']),
  ],
  'story.magazine': [
    pieceAxis('tapa', 'Tapa', MAGAZINE_COVERS),
    pieceAxis('marco', 'Marco de la foto', MAGAZINE_FRAMES, 'photo'),
    ...common(),
  ],
  'story.wishes': [
    pieceAxis('notas', 'Notas', WISH_NOTES),
    pieceAxis('sujecion', 'Cómo se sostienen', WISH_FASTENERS),
    TYPE_AXIS,
    decoAxis(),
  ],
  'reflect.candles': [...cake, ...common()],
  'reflect.capsule': [
    pieceAxis('recipiente', 'Dónde se guarda', CAPSULE_VESSELS),
    ...common(['estrellas']),
  ],
  'game.pinata': [
    pieceAxis('forma', 'Forma', PINATA_SHAPES),
    pieceAxis('colores', 'Colores', PINATA_COLORS),
    ...common(['banderines']),
  ],
  'story.memory': [
    pieceAxis('tarjeta', 'Tarjeta', MEMORY_CARDS),
    pieceAxis('marco', 'Forma de la foto', MEMORY_FRAMES, 'photo'),
    ...common(),
  ],
  'outro.recap': [
    pieceAxis('resumen', 'Resumen', RECAP_CARDS),
    pieceAxis('fotos', 'Fotos', RECAP_PHOTOS),
    ...common(['banderines', 'confeti']),
  ],
  'outro.finale': [
    pieceAxis('remate', 'Remate', FINALE_ENDINGS),
    pieceAxis('caja', 'Caja del regalo', FINALE_BOXES),
    ...common(['globos', 'confeti', 'estrellas']),
  ],
  // El hilo: la cinta y, como en todas, colores y letra.
  'story.bond': THREAD_AXES,
  'story.bond-love': THREAD_AXES,
  'story.thread': THREAD_AXES,
}

// ── Pareja ──────────────────────────────────────────────────────────────────

/** En Pareja la decoración es romántica: sin globos ni banderines de cumpleaños. */
const loveDeco = (skip: Parameters<typeof decoAxis>[0] = []) =>
  decoAxis(['globos', 'banderines', ...skip])
const loveCommon = (skip: Parameters<typeof decoAxis>[0] = []): StyleAxis[] => [
  PALETTE_AXIS,
  TYPE_AXIS,
  loveDeco(skip),
]

/**
 * Lo que se puede variar en cada pantalla de Pareja: las piezas que comparte
 * con Cumpleaños (se dibujan igual con el look de Pareja) y, en las pantallas
 * con fondo propio (la mesa del diario, la noche de la cartelera), solo la
 * letra y la decoración, para no pisar el dibujo. Las escenas (03 y 05) no
 * tienen ejes, como en Cumpleaños: ahí se mueven y agrandan las piezas.
 */
export const PAREJA_STYLES: Record<string, readonly StyleAxis[]> = {
  'intro.brand': [TYPE_AXIS, loveDeco(['corazones'])],
  'cover.gift': [TYPE_AXIS, loveDeco(['corazones'])],
  'story.card': CUMPLE_STYLES['story.card']!.slice(0, 2).concat(loveCommon(['confeti'])),
  'media.video': [pieceAxis('filtro', 'Filtro', VIDEO_FILTERS), ...loveCommon(['confeti'])],
  'media.mix': [pieceAxis('portada', 'Portada', MIX_COVERS), ...loveCommon()],
  'game.quiz': [pieceAxis('tarjetas', 'Tarjetas', QUIZ_CARDS), ...loveCommon(['confeti'])],
  'connector.premiere': CUMPLE_STYLES['connector.premiere']!.slice(0, 2).concat(
    loveCommon(['estrellas']),
  ),
  'media.poster': [TYPE_AXIS, loveDeco(['confeti'])],
  'game.slots': CUMPLE_STYLES['game.slots']!.slice(0, 2).concat(loveCommon(['confeti'])),
  'game.vouchers': CUMPLE_STYLES['game.vouchers']!.slice(0, 2).concat(loveCommon(['confeti'])),
  'story.magazine-love': CUMPLE_STYLES['story.magazine']!.slice(0, 2).concat(loveCommon()),
  'story.wishes': [
    pieceAxis('notas', 'Notas', WISH_NOTES),
    pieceAxis('sujecion', 'Cómo se sostienen', WISH_FASTENERS),
    TYPE_AXIS,
    loveDeco(),
  ],
  'reflect.pause': [TYPE_AXIS, loveDeco()],
  'reflect.diary': [TYPE_AXIS, loveDeco()],
  'game.cookie': [TYPE_AXIS, loveDeco()],
  'story.memory': CUMPLE_STYLES['story.memory']!.slice(0, 2).concat(loveCommon()),
  'outro.recap': CUMPLE_STYLES['outro.recap']!.slice(0, 2).concat(loveCommon(['confeti'])),
  'outro.finale': CUMPLE_STYLES['outro.finale']!.slice(0, 2).concat(
    loveCommon(['confeti', 'estrellas']),
  ),
  'story.bond': [...THREAD_PIECES, TYPE_AXIS],
  'story.bond-love': [...THREAD_PIECES, TYPE_AXIS],
  'story.thread': [...THREAD_PIECES, TYPE_AXIS],
}

/** Las pantallas que son solo de Pareja (no tienen el campo `look`). */
const PAREJA_ONLY = new Set([
  'cover.gift',
  'cover.edition',
  'story.magazine-love',
  'reflect.pause',
  'reflect.diary',
  'game.cookie',
])

/** Los ejes de una pantalla según el estilo de la ocasión (Cumpleaños o Pareja). */
export function cumpleStyleAxes(
  kind: string,
  props: Record<string, unknown>,
): readonly StyleAxis[] {
  if (props.look === 'pareja' || PAREJA_ONLY.has(kind)) return PAREJA_STYLES[kind] ?? []
  return CUMPLE_STYLES[kind] ?? []
}
