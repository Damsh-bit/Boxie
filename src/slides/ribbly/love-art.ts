/**
 * Geometría de las pantallas de Pareja con ondas orgánicas (03 · Love edition
 * y 05 · Fotos). Todo está dibujado en un lienzo de 360 × 640 (9:16, el
 * formato de una historia de Instagram) y lo usan dos lados:
 *
 *  · la pantalla, como <path> de un SVG que cubre el escenario;
 *  · la imagen para compartir (story-image.ts), como Path2D sobre un canvas
 *    de 1080 × 1920 (el mismo dibujo, por 3).
 *
 * Así lo que se ve y lo que se comparte salen del mismo trazo. Sin React.
 */

export const STORY_W = 360
export const STORY_H = 640

export interface Wave {
  d: string
  fill?: string
  /** Degradé vertical [arriba, abajo] en lugar de `fill`. */
  gradient?: [string, string]
  stroke?: string
  strokeWidth?: number
  opacity?: number
}

/** Corazón en un cuadro de 24 × 24. */
export const HEART_PATH =
  'M12 21.2s-7.6-4.7-9.8-9.4C.7 8.3 2.8 4.3 6.6 4.3c2.2 0 3.7 1.2 5.4 3.3 1.7-2.1 3.2-3.3 5.4-3.3 3.8 0 5.9 4 4.4 7.5-2.2 4.7-9.8 9.4-9.8 9.4z'

// ── 03 · Love edition ───────────────────────────────────────────────────────

/** Hasta dónde baja la foto (en el lienzo de 640 de alto). */
export const EDITION_PHOTO_BOTTOM = 480

/** Ondas que enmarcan la foto: arriba en las esquinas y la ola crema de abajo. */
export const EDITION_WAVES: Wave[] = [
  // Esquina de arriba a la izquierda: dos capas rosas.
  { d: 'M0 0H168C138 26 102 46 62 56 36 62 14 72 0 86Z', gradient: ['#F8C5D6', '#FBD9E4'] },
  { d: 'M0 0H118C96 18 70 30 42 36 24 40 10 46 0 54Z', fill: '#FBD9E4', opacity: 0.9 },
  {
    d: 'M0 100C22 78 62 66 100 58 136 50 164 28 182 0',
    stroke: '#FFFFFF',
    strokeWidth: 1.4,
    opacity: 0.8,
  },
  // Esquina de arriba a la derecha: crema con un filete rosa.
  { d: 'M360 0H290C294 34 314 58 338 74 348 81 355 90 360 100Z', gradient: ['#FFFFFF', '#FDF4E8'] },
  { d: 'M266 0C272 38 298 66 330 86 346 96 355 108 360 122', stroke: '#F8C5D6', strokeWidth: 1.4 },
  // La ola de abajo: rosa atrás, crema adelante y un filete entre las dos.
  {
    d: 'M0 412C64 394 124 412 184 436 244 460 304 462 360 428V640H0Z',
    fill: '#FBD9E4',
    opacity: 0.92,
  },
  {
    d: 'M0 430C70 416 130 438 192 460 252 482 312 478 360 448V640H0Z',
    gradient: ['#FFFDFB', '#FDF0F4'],
  },
  {
    d: 'M0 446C70 432 132 454 198 476 258 496 314 490 360 462',
    stroke: '#F3B3C8',
    strokeWidth: 1.3,
  },
  // Rulos finitos que cruzan la zona de la frase.
  { d: 'M214 552C262 546 312 526 360 504', stroke: '#F3B3C8', strokeWidth: 1, opacity: 0.8 },
  { d: 'M0 572C70 560 140 590 196 640', stroke: '#F3B3C8', strokeWidth: 1, opacity: 0.8 },
  // Abajo: una ola rosa a cada lado.
  { d: 'M0 594C52 584 112 604 150 640H0Z', gradient: ['#FBD9E4', '#F8C5D6'], opacity: 0.85 },
  { d: 'M360 556C326 570 298 600 290 640H360Z', gradient: ['#F8C5D6', '#F4A9C2'] },
]

/** Los corazoncitos dibujados abajo a la derecha. */
export const EDITION_DOODLES = [
  { x: 316, y: 532, size: 15, rotate: 12 },
  { x: 300, y: 552, size: 10, rotate: -14 },
]

// ── 05 · Fotos ──────────────────────────────────────────────────────────────

export const MOMENTS_BG: [string, string, string] = ['#FDF4F7', '#FBE3EC', '#F9D7E4']

/** Las ondas de los bordes. */
export const MOMENTS_WAVES: Wave[] = [
  { d: 'M0 0H96C76 30 44 52 0 62Z', gradient: ['#F7B2C8', '#FAD0DE'], opacity: 0.9 },
  { d: 'M360 0H296C300 30 326 50 360 56Z', gradient: ['#FAD0DE', '#F7B2C8'], opacity: 0.85 },
  {
    d: 'M0 190C30 196 46 232 34 266 24 292 8 300 0 302Z',
    gradient: ['#F9C2D4', '#F7A8C2'],
    opacity: 0.75,
  },
  { d: 'M360 270C338 286 334 330 360 350Z', gradient: ['#F9C2D4', '#F7A8C2'], opacity: 0.75 },
  { d: 'M0 500C34 520 52 566 40 640H0Z', gradient: ['#F9C2D4', '#F28AAE'], opacity: 0.8 },
  { d: 'M360 548C318 566 280 600 256 640H360Z', gradient: ['#F48FB1', '#E8487E'] },
  { d: 'M360 520C312 540 272 584 244 640', stroke: '#FFFFFF', strokeWidth: 1.2, opacity: 0.7 },
]

export interface PolaroidSpot {
  /** Centro y giro de la polaroid, en el lienzo de 360 × 640. */
  x: number
  y: number
  rotate: number
}

/** Dónde va cada polaroid según cuántas fotos haya (de 1 a 4). */
export function polaroidSpots(count: number): PolaroidSpot[] {
  if (count <= 1) return [{ x: 180, y: 322, rotate: -2.5 }]
  if (count === 2)
    return [
      { x: 104, y: 300, rotate: -4.5 },
      { x: 256, y: 348, rotate: 4 },
    ]
  if (count === 3)
    return [
      { x: 102, y: 236, rotate: -4.5 },
      { x: 260, y: 252, rotate: 4 },
      { x: 180, y: 412, rotate: -2 },
    ]
  return [
    { x: 102, y: 230, rotate: -4.5 },
    { x: 260, y: 248, rotate: 4 },
    { x: 98, y: 410, rotate: -3 },
    { x: 262, y: 424, rotate: 4.5 },
  ]
}

/** Medidas de una polaroid: ancho total, foto y margen de abajo. */
export const POLAROID = { w: 146, pad: 9, foot: 34 }

/** Corazones y rayitas dibujadas alrededor de la grilla. */
export const MOMENTS_DOODLES = {
  hearts: [
    { x: 26, y: 140, size: 18, rotate: -10 },
    { x: 196, y: 140, size: 18, rotate: 8 },
    { x: 338, y: 326, size: 14, rotate: 10 },
  ],
  /** Rayitas de movimiento: `flip` las da vuelta (miran a la izquierda). */
  dashes: [
    { x: 328, y: 140, flip: false },
    { x: 24, y: 262, flip: true },
    { x: 24, y: 446, flip: true },
    { x: 338, y: 434, flip: false },
  ],
}

// ── Textos ──────────────────────────────────────────────────────────────────

/**
 * Parte un texto en lo de siempre y lo destacado (en otro color). Si el
 * texto marca lo destacado con *asteriscos*, va eso; si no, las últimas
 * `tail` palabras (los emojis y signos sueltos no cuentan como palabra).
 *
 *   splitAccent('Sus mejores *momentos*')        → ['Sus mejores', 'momentos']
 *   splitAccent('Porque sos mi persona favorita.', 2) → ['Porque sos mi', 'persona favorita.']
 */
export function splitAccent(text: string, tail = 1): [string, string] {
  const clean = text.replace(/\s+/g, ' ').trim()
  const marked = clean.match(/^(.*?)\*([^*]+)\*(.*)$/)
  if (marked) {
    const after = marked[3]!.trim()
    return [marked[1]!.trim(), `${marked[2]!.trim()}${after ? ` ${after}` : ''}`]
  }
  const words = clean.split(' ').filter(Boolean)
  let start = words.length
  let counted = 0
  while (start > 0 && counted < tail) {
    start--
    if (/\p{L}|\p{N}/u.test(words[start]!)) counted++
  }
  if (start <= 0) return ['', clean]
  return [words.slice(0, start).join(' '), words.slice(start).join(' ')]
}

/** El texto sin las marcas de destacado (para leerlo de corrido). */
export function stripAsterisks(text: string): string {
  return text.replace(/\*/g, '')
}
