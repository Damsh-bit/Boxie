/**
 * Las pantallas de Pareja con ondas orgánicas (03 · Love edition y 05 ·
 * Fotos), calcadas del diseño en un lienzo de 360 × 640 (9:16, el formato de
 * una historia de Instagram).
 *
 * Cada pantalla es una escena: una lista de piezas (trazos, textos, fotos,
 * corazones) con sus coordenadas en ese lienzo. La dibujan dos lados con el
 * mismo resultado:
 *
 *  · la pantalla (scene-svg.tsx), como SVG;
 *  · la imagen para compartir (story-image.ts), sobre un canvas de 1080 × 1920.
 *
 * Una escena tiene dos capas: `bg` (fondo y ondas de los bordes), que se
 * estira a lo que mida el escenario para tocar siempre los bordes, y `fg`
 * (todo lo demás), que se escala sin deformarse y queda centrada.
 *
 * Sin React ni DOM: la medida de los textos llega como función.
 */

export const STORY_W = 360
export const STORY_H = 640

// ── Piezas ──────────────────────────────────────────────────────────────────

export type Stops = [number, string][]
export type Paint =
  | string
  | { linear: [number, number, number, number]; stops: Stops }
  | { radial: [number, number, number]; stops: Stops }

export type FontFamily = 'fredoka' | 'caveat' | 'outfit' | 'nunito' | 'dancing' | 'playfair'

export interface Font {
  family: FontFamily
  weight: number
  size: number
  italic?: boolean
}

/** Ancho de un texto en el lienzo (con `spacing` entre letras). */
export type Measure = (text: string, font: Font, spacing?: number) => number

export interface PathNode {
  type: 'path'
  d: string
  fill?: Paint
  stroke?: string
  width?: number
  opacity?: number
}

export interface TextNode {
  type: 'text'
  /** Siempre alineado a la izquierda: el layout ya calculó dónde empieza. */
  x: number
  /** Línea de base. */
  y: number
  text: string
  font: Font
  color: string
  /** Degradé en lugar de `color` (en coordenadas del lienzo). */
  gradient?: Paint
  spacing?: number
  shadow?: boolean
}

export interface HeartNode {
  type: 'heart'
  /** Centro; un degradé de `fill` va en el cuadro de 24 × 24 del corazón. */
  x: number
  y: number
  size: number
  rotate?: number
  fill?: Paint
  stroke?: string
  width?: number
}

export interface RectNode {
  type: 'rect'
  x: number
  y: number
  w: number
  h: number
  fill: Paint
  radius?: number
  opacity?: number
  /** Sombra suave de papel (polaroids). */
  shadow?: boolean
}

export interface PhotoNode {
  type: 'photo'
  x: number
  y: number
  w: number
  h: number
  src?: string
  /** Forma de la foto (un trazo cerrado); sin esto, el rectángulo. */
  clip?: string
}

export interface GroupNode {
  type: 'group'
  /** Para animar la entrada y, si `tap`, para tocarlo. */
  id?: string
  /** En el editor directo: el campo del comprador que se edita tocándolo. */
  edit?: string
  x?: number
  y?: number
  rotate?: number
  tap?: boolean
  children: SceneNode[]
}

export type SceneNode = PathNode | TextNode | HeartNode | RectNode | PhotoNode | GroupNode

export interface Scene {
  bg: SceneNode[]
  fg: SceneNode[]
}

/** Corazón en un cuadro de 24 × 24 (centro en 12, 12.5). */
export const HEART_PATH =
  'M12 21.2s-7.6-4.7-9.8-9.4C.7 8.3 2.8 4.3 6.6 4.3c2.2 0 3.7 1.2 5.4 3.3 1.7-2.1 3.2-3.3 5.4-3.3 3.8 0 5.9 4 4.4 7.5-2.2 4.7-9.8 9.4-9.8 9.4z'

/** Una medida aproximada (sin fuentes: el servidor y el primer render). */
export const roughMeasure: Measure = (text, font, spacing = 0) => {
  const per =
    font.family === 'caveat' || font.family === 'dancing'
      ? 0.42
      : font.family === 'nunito'
        ? 0.5
        : 0.54
  return [...text].length * (font.size * per + spacing)
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

/** Corta un texto en renglones que entren en `max` de ancho. */
export function wrap(measure: Measure, text: string, font: Font, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ').filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (line && measure(next, font) > max) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Achica la letra hasta que el texto entre en `maxLines` renglones de `max`. */
export function fit(
  measure: Measure,
  text: string,
  font: Font,
  max: number,
  maxLines: number,
): { lines: string[]; font: Font } {
  let f = font
  for (;;) {
    const lines = wrap(measure, text, f, max)
    const widest = Math.max(0, ...lines.map((l) => measure(l, f)))
    if ((lines.length <= maxLines && widest <= max) || f.size <= font.size * 0.55) {
      return { lines, font: f }
    }
    f = { ...f, size: f.size - 0.5 }
  }
}

export const path = (d: string, o: Omit<PathNode, 'type' | 'd'>): PathNode => ({
  type: 'path',
  d,
  ...o,
})
export const line = (d: string, stroke: string, width = 1, opacity?: number): PathNode =>
  path(d, { stroke, width, opacity })

/** "ribbly♥" en minúscula, centrado en `cx`. */
export function wordmark(measure: Measure, cx: number, y: number, size: number, color: string) {
  const font: Font = { family: 'fredoka', weight: 600, size }
  const w = measure('ribbly', font)
  const heart = size * 0.42
  const x = cx - (w + heart * 0.7) / 2
  return [
    { type: 'text', x, y, text: 'ribbly', font, color } satisfies TextNode,
    {
      type: 'heart',
      x: x + w + heart * 0.42,
      y: y - size * 0.68,
      size: heart,
      rotate: 14,
      fill: color,
    } satisfies HeartNode,
  ]
}

// ── 03 · Love edition ───────────────────────────────────────────────────────

/** La foto va de arriba hasta acá (las ondas tapan su borde de abajo). */
export const EDITION_PHOTO = { x: 0, y: 0, w: STORY_W, h: 472 }

/**
 * Las ondas de abajo van con la frase (en la capa que no se estira) y se
 * pasan del lienzo hacia los costados y hacia abajo: en un teléfono más ancho
 * o más alto que 9:16 siguen tocando los bordes.
 */
const EDITION_FRAME: SceneNode[] = [
  // El marco de la foto abajo a la derecha: una banda rosa con su filete.
  path(
    'M560 364H360C358 397 345 423 316 436 276 450 226 453 170 456 120 458 80 452 40 440V520H560Z',
    {
      fill: {
        linear: [0, 440, 0, 495],
        stops: [
          [0, '#F2B4CA'],
          [1, '#F9CFDC'],
        ],
      },
    },
  ),
  line('M184 471C232 479 282 475 316 462 336 454 350 446 360 438L560 438', '#E59DB7', 1.1),
  // Abajo a la izquierda: un velo blanco sobre la foto, con su filete rosa.
  path('M-200 391H0C44 393 92 404 132 422 154 432 172 442 196 452L196 500H-200Z', {
    fill: 'rgba(255,255,255,0.6)',
  }),
  line('M-200 391H0C44 393 92 404 132 422 154 432 172 442 196 452', '#EDA9BF', 1.2),
  // La ola crema donde va la frase.
  path(
    'M-200 410H0C42 408 84 418 122 440 160 462 210 480 258 483 300 486 334 472 360 452H560V1000H-200Z',
    { fill: '#FEFAF4' },
  ),
  // Rosados suaves: a la derecha y en las esquinas de abajo.
  path('M250 420H560V580H250Z', {
    fill: {
      radial: [374, 482, 92],
      stops: [
        [0, 'rgba(248,194,210,0.95)'],
        [1, 'rgba(248,194,210,0)'],
      ],
    },
  }),
  path('M-200 520H120V1000H-200Z', {
    fill: {
      radial: [0, 646, 104],
      stops: [
        [0, 'rgba(249,190,207,0.95)'],
        [1, 'rgba(249,190,207,0)'],
      ],
    },
  }),
  path('M200 480H560V1000H200Z', {
    fill: {
      radial: [372, 648, 150],
      stops: [
        [0, 'rgba(250,198,210,0.9)'],
        [1, 'rgba(250,198,210,0)'],
      ],
    },
  }),
  path('M284 640C294 614 324 597 360 594H560V1000H284Z', {
    fill: {
      linear: [290, 600, 360, 640],
      stops: [
        [0, '#FCDCE1'],
        [1, '#F8C3D0'],
      ],
    },
  }),
  // Filetes finos que cruzan la zona de la frase.
  line(
    'M0 517C8 545 18 585 50 604 90 612 150 600 190 600 230 600 270 612 300 640 315 655 325 680 330 720',
    '#ECB4C5',
    1,
  ),
  line('M258 512C285 516 320 505 360 480L560 400', '#DDA2B5', 1),
  line(
    'M226 720C228 690 232 662 238 640 250 615 280 592 310 580 330 573 345 571 360 571H560',
    '#E6AEBF',
    1,
  ),
]

const EDITION_BG: SceneNode[] = [
  // Bruma blanca arriba, para que la marca se lea sobre cualquier foto.
  path('M0 0H360V120H0Z', {
    fill: {
      linear: [0, 0, 0, 120],
      stops: [
        [0, 'rgba(255,255,255,0.62)'],
        [0.55, 'rgba(255,255,255,0.22)'],
        [1, 'rgba(255,255,255,0)'],
      ],
    },
  }),
  // Arriba a la izquierda: una onda rosa con un filete y la esquina más clara.
  path('M0 0H124C108 16 82 36 54 50 34 60 16 66 0 69Z', {
    fill: {
      linear: [0, 0, 110, 70],
      stops: [
        [0, '#F6CED8'],
        [1, '#EDB2C6'],
      ],
    },
    opacity: 0.85,
  }),
  path('M0 0H99C88 17 66 31 40 38 24 42 11 44 0 44Z', {
    fill: {
      radial: [0, 0, 104],
      stops: [
        [0, '#FDF2EE'],
        [0.55, '#F8DDE1'],
        [1, '#EDBDCF'],
      ],
    },
    opacity: 0.9,
  }),
  line('M99 0C88 17 66 31 40 38 24 42 11 44 0 44', '#DD93AE', 1.3),
  // Arriba a la derecha: dos ondas crema.
  path('M360 0H262C272 40 302 70 334 92 346 101 354 112 360 124Z', {
    fill: 'rgba(255,255,255,0.42)',
  }),
  path('M360 0H300C305 28 320 50 340 66 348 74 355 84 360 96Z', {
    fill: {
      linear: [300, 0, 360, 96],
      stops: [
        [0, '#FDF9F1'],
        [1, '#F6F0E2'],
      ],
    },
    opacity: 0.95,
  }),
  line('M318 0C324 22 340 38 360 50', '#FFFFFF', 1, 0.85),
]

export interface EditionData {
  caption: string
  wish: string
  sender: string
}

export function editionScene(data: EditionData, measure: Measure): Scene {
  const fg: SceneNode[] = [...EDITION_FRAME]

  fg.push({ type: 'group', id: 'logo', children: wordmark(measure, 181, 34, 22, '#DB4F7D') })

  // "nosotros" escrito a mano sobre la foto, subrayado, con un corazón.
  if (data.caption) {
    const font: Font = { family: 'caveat', weight: 700, size: 25 }
    const w = Math.min(measure(data.caption, font), 190)
    fg.push({
      type: 'group',
      id: 'caption',
      x: 306,
      y: 172,
      rotate: -8,
      children: [
        { type: 'text', x: -w, y: 0, text: data.caption, font, color: '#FFFFFF', shadow: true },
        line(`M${-w + 16} 11C${-w * 0.5} 8 -18 4 2 1`, '#FFFFFF', 2),
      ],
    })
    fg.push({
      type: 'group',
      id: 'caption-heart',
      children: [
        { type: 'heart', x: 323, y: 160, size: 20, rotate: 10, stroke: '#EC4F84', width: 2.1 },
        line('M335 139L338.5 147.5M341 150.5L349 146.5', '#FFFFFF', 1.8),
      ],
    })
  }

  // La frase: corazón, lo de siempre en gris, lo destacado en rosa y la firma.
  const [plain, accent] = splitAccent(data.wish, 2)
  const left = 35
  const max = 296
  const lightFont: Font = { family: 'nunito', weight: 300, size: 27.5, italic: true }
  const boldFont: Font = { family: 'nunito', weight: 800, size: 33, italic: true }
  const top = plain ? fit(measure, `“ ${plain}`, lightFont, max, 2) : null
  const closing = '”'
  const bottom = fit(measure, `${plain ? '' : '“ '}${accent} ${closing}`, boldFont, max, 2)
  // El cierre de comillas va pegado y en gris: se quita del último renglón.
  bottom.lines[bottom.lines.length - 1] = bottom.lines.at(-1)!.replace(/\s*”$/, '')
  if (bottom.lines.length > 1 && !bottom.lines.at(-1)) bottom.lines.pop()

  const rows: { text: string; font: Font; color: string; y: number }[] = []
  let y = 513
  top?.lines.forEach((text, i) => {
    if (i) y += top.font.size * 1.12
    rows.push({ text, font: top.font, color: '#6A4D50', y })
  })
  bottom.lines.forEach((text, i) => {
    if (top || i) y += i ? bottom.font.size * 1.08 : 33.5
    rows.push({ text, font: bottom.font, color: '#DD5580', y })
  })
  const signY = y + 30
  // Si la frase es larga, el bloque sube para que la firma no se caiga.
  const shift = Math.max(0, signY - 600)

  fg.push({
    type: 'group',
    id: 'quote-heart',
    children: [
      {
        type: 'heart',
        x: 45,
        y: 463 - shift,
        size: 27,
        fill: {
          linear: [0, 4, 0, 21],
          stops: [
            [0, '#FF6390'],
            [1, '#E3245C'],
          ],
        },
      },
    ],
  })
  rows.forEach((row, i) => {
    const children: SceneNode[] = [
      { type: 'text', x: left, y: row.y - shift, text: row.text, font: row.font, color: row.color },
    ]
    if (i === rows.length - 1) {
      children.push({
        type: 'text',
        x: left + measure(row.text, row.font) + 1,
        y: row.y - shift,
        text: closing,
        font: row.font,
        color: '#63474B',
      })
    }
    fg.push({ type: 'group', id: `quote-${i}`, children })
  })
  if (data.sender) {
    fg.push({
      type: 'group',
      id: 'sign',
      children: [
        {
          type: 'text',
          x: left + 2,
          y: signY - shift,
          text: `— ${data.sender}`,
          font: { family: 'nunito', weight: 400, size: 17, italic: true },
          color: '#7E6E6F',
        },
      ],
    })
  }

  fg.push({
    type: 'group',
    id: 'doodles',
    children: [
      { type: 'heart', x: 327, y: 551, size: 14, rotate: 12, stroke: '#D8A2B1', width: 1.1 },
      { type: 'heart', x: 319, y: 563, size: 10, rotate: -12, stroke: '#D8A2B1', width: 1.1 },
    ],
  })

  return { bg: EDITION_BG, fg }
}

// ── 05 · Fotos ──────────────────────────────────────────────────────────────

const MOMENTS_BG: SceneNode[] = [
  path('M0 0H360V640H0Z', {
    fill: {
      linear: [0, 0, 0, 640],
      stops: [
        [0, '#FBEAF0'],
        [0.5, '#FDF4F7'],
        [1, '#FBEEF3'],
      ],
    },
  }),
  // Arriba a la izquierda: rosa fuerte sobre un rosa más claro.
  path('M0 0H96C89 22 71 42 49 56 33 66 15 74 0 78Z', {
    fill: {
      linear: [0, 0, 90, 78],
      stops: [
        [0, '#FFC4D7'],
        [1, '#FFDCE8'],
      ],
    },
  }),
  path('M0 0H82C74 18 58 36 38 46 24 54 10 60 0 63Z', {
    fill: {
      linear: [0, 0, 80, 60],
      stops: [
        [0, '#FB7DA5'],
        [1, '#FD92B5'],
      ],
    },
  }),
  // Arriba a la derecha: un círculo rosa con su borde.
  path('M360 0H296C298 20 312 36 332 43 342 46 352 46 360 45Z', {
    fill: {
      radial: [362, 0, 72],
      stops: [
        [0, '#FF9CBE'],
        [0.65, '#FFBDD3'],
        [1, '#FFDCE8'],
      ],
    },
  }),
  line('M295 0C298 20 312 36 332 43 342 46 352 46 360 45', '#CF6A8E', 1.2),
  // A los costados.
  path('M0 172C20 176 36 192 36 212 36 234 24 250 0 258Z', {
    fill: {
      linear: [0, 172, 30, 258],
      stops: [
        [0, '#FDD2DF'],
        [1, '#F8A7C1'],
      ],
    },
  }),
  path('M360 282C344 288 336 300 337 310 338 322 348 330 360 334Z', {
    fill: {
      linear: [340, 282, 360, 334],
      stops: [
        [0, '#FDCADA'],
        [1, '#FBAEC7'],
      ],
    },
  }),
  // Abajo a la izquierda.
  path('M0 520C30 528 52 556 50 584 48 610 30 628 0 640Z', {
    fill: '#FDD5E2',
    opacity: 0.85,
  }),
  path('M0 535C20 541 36 556 37 572 38 588 24 598 0 602Z', {
    fill: {
      linear: [0, 536, 30, 602],
      stops: [
        [0, '#FFA9C6'],
        [0.45, '#F7598D'],
        [1, '#FB9BBB'],
      ],
    },
  }),
  // A la derecha, un círculo apenas rosado con su borde.
  path('M360 486C342 494 328 510 327 530 326 552 336 572 360 583Z', {
    fill: 'rgba(255,214,229,0.55)',
  }),
  line('M360 486C342 494 328 510 327 530 326 552 336 572 360 583', '#CF6A8E', 1.2),
  // Abajo a la derecha: dos ondas, la de adelante frambuesa.
  path('M208 640C218 614 246 596 282 589 310 584 338 585 360 588V640Z', {
    fill: {
      linear: [210, 640, 360, 588],
      stops: [
        [0, '#FBCADB'],
        [1, '#FFB1CB'],
      ],
    },
  }),
  path('M238 640C246 622 264 610 290 605 314 600 340 602 360 608V640Z', {
    fill: {
      linear: [240, 640, 360, 605],
      stops: [
        [0, '#A9405F'],
        [0.55, '#C44273'],
        [1, '#E04A82'],
      ],
    },
  }),
]

export interface PolaroidSpot {
  x: number
  y: number
  w: number
  h: number
  rotate: number
  /** Giro de la cinta respecto de la polaroid. */
  tape: number
}

/** Dónde va cada polaroid según cuántas fotos haya (de 1 a 4). */
export function polaroidSpots(count: number): PolaroidSpot[] {
  const base = { w: 154, h: 180 }
  if (count <= 1) return [{ x: 180, y: 318, w: 176, h: 206, rotate: -3, tape: -6 }]
  if (count === 2)
    return [
      { ...base, x: 112, y: 282, rotate: -6.5, tape: -6 },
      { ...base, x: 252, y: 362, rotate: 7.5, tape: 7 },
    ]
  if (count === 3)
    return [
      { ...base, x: 118, y: 216, rotate: -6.5, tape: -6 },
      { ...base, x: 268, y: 237, w: 150, h: 178, rotate: 7.5, tape: 7 },
      { ...base, x: 184, y: 408, rotate: -3, tape: 4 },
    ]
  return [
    { ...base, x: 118, y: 215, w: 160, h: 186, rotate: -6.5, tape: -6 },
    { ...base, x: 268, y: 237, w: 154, h: 182, rotate: 7.5, tape: 7 },
    { ...base, x: 112, y: 401, w: 162, h: 188, rotate: -8.5, tape: 3 },
    { ...base, x: 266, y: 417, w: 154, h: 176, rotate: 8.5, tape: 6 },
  ]
}

/** Margen de la foto dentro de la polaroid (abajo queda el resto). */
export const POLAROID_MARGIN = 7

export interface MomentsData {
  photos: (string | undefined)[]
  kicker: string
  title: string
  phrase: string
  days: string
}

const INK = '#2E1A24'

function polaroid(spot: PolaroidSpot, src: string | undefined, i: number): GroupNode {
  const { w, h } = spot
  const m = POLAROID_MARGIN
  const photoW = w - m * 2
  const photoH = Math.round(photoW * 0.92)
  return {
    type: 'group',
    id: `polaroid-${i}`,
    edit: `moments.${i}`,
    x: spot.x,
    y: spot.y,
    rotate: spot.rotate,
    tap: true,
    children: [
      { type: 'rect', x: -w / 2, y: -h / 2, w, h, fill: '#FFFFFF', radius: 1.5, shadow: true },
      { type: 'photo', x: -w / 2 + m, y: -h / 2 + m, w: photoW, h: photoH, src },
      {
        type: 'heart',
        x: -w / 2 + 24,
        y: h / 2 - 19,
        size: 19,
        stroke: '#1C1418',
        width: 1.5,
        rotate: -4,
      },
      {
        type: 'group',
        x: -4,
        y: -h / 2 - 1,
        rotate: spot.tape,
        children: [{ type: 'rect', x: -19, y: -8, w: 38, h: 16, fill: '#F493B2', opacity: 0.86 }],
      },
    ],
  }
}

/** El calendario de los días juntos (20 × 18, arriba a la izquierda en x, y). */
function calendar(x: number, y: number): SceneNode[] {
  const c = '#3A2A32'
  const dots = [0, 1, 2, 3]
    .flatMap((col) => [0, 1].map((row) => [x + 5 + col * 3.4, y + 10 + row * 3.6]))
    .slice(0, 7)
    .map(([dx, dy]) => `M${dx} ${dy}h1.6v1.6h-1.6Z`)
    .join('')
  return [
    path(
      `M${x + 2} ${y + 2}h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z`,
      {
        stroke: c,
        width: 1.5,
      },
    ),
    line(`M${x} ${y + 7}H${x + 19}M${x + 5} ${y}V${y + 4}M${x + 14} ${y}V${y + 4}`, c, 1.5),
    path(dots, { fill: c }),
  ]
}

export function momentsScene(data: MomentsData, measure: Measure): Scene {
  const fg: SceneNode[] = []
  const photos = data.photos.slice(0, 4)

  fg.push({ type: 'group', id: 'logo', children: wordmark(measure, 180, 48, 23, '#D9437A') })

  // Etiqueta con un filete a cada lado.
  const kickerFont: Font = { family: 'outfit', weight: 500, size: 9.6 }
  const spacing = 3
  const kicker = data.kicker.toUpperCase()
  const kw = measure(kicker, kickerFont, spacing) - spacing
  fg.push({
    type: 'group',
    id: 'kicker',
    children: [
      {
        type: 'text',
        x: 180 - kw / 2,
        y: 76,
        text: kicker,
        font: kickerFont,
        color: '#453E41',
        spacing,
      },
      line(`M26 72.5H${Math.max(40, 180 - kw / 2 - 14)}`, '#9A9095', 1),
      line(`M${Math.min(320, 180 + kw / 2 + 14)} 72.5H334`, '#9A9095', 1),
    ],
  })

  // Título en dos colores, lo destacado subrayado.
  const [plain, accent] = splitAccent(data.title, 1)
  let titleFont: Font = { family: 'fredoka', weight: 700, size: 30 }
  const titleWidth = (f: Font) => (plain ? measure(`${plain} `, f) : 0) + measure(accent, f)
  while (titleWidth(titleFont) > 306 && titleFont.size > 16) {
    titleFont = { ...titleFont, size: titleFont.size - 0.5 }
  }
  const tx = 180 - titleWidth(titleFont) / 2
  const ax = tx + (plain ? measure(`${plain} `, titleFont) : 0)
  const aw = measure(accent, titleFont)
  fg.push({
    type: 'group',
    id: 'title',
    children: [
      ...(plain
        ? [
            {
              type: 'text',
              x: tx,
              y: 110,
              text: plain,
              font: titleFont,
              color: '#262229',
            } as TextNode,
          ]
        : []),
      { type: 'text', x: ax, y: 110, text: accent, font: titleFont, color: '#E23A72' },
      line(`M${ax - 4} 116Q${ax + aw * 0.36} 112 ${ax + aw * 0.78} 116`, '#E0407A', 2.6),
    ],
  })

  // Garabatos alrededor de la grilla.
  fg.push({
    type: 'group',
    id: 'doodles',
    children: [
      { type: 'heart', x: 26, y: 146, size: 25, rotate: -10, stroke: '#C9406E', width: 1.6 },
      { type: 'heart', x: 203, y: 146, size: 25, rotate: 4, stroke: '#C9406E', width: 1.6 },
      { type: 'heart', x: 342, y: 327, size: 21, rotate: 12, stroke: '#C9406E', width: 1.6 },
      line(
        [
          'M320.5 132L322 147M330 150L343 132.5M335 157L353 148',
          'M22 255L37 263M17 271L35 272M25 285L37 278',
          'M20 443L37 448M18 460L35 457',
          'M337 435L347 430M335 445L353 443M335 452L347 457',
        ].join(''),
        INK,
        1.6,
      ),
    ],
  })

  // Las polaroids.
  const spots = polaroidSpots(photos.length || 1)
  spots.forEach((spot, i) => fg.push(polaroid(spot, photos[i], i)))

  // La frase dentro de un óvalo dibujado a mano.
  const [phrasePlain, phraseAccent] = splitAccent(data.phrase, 2)
  const l1 = fit(measure, phrasePlain, { family: 'caveat', weight: 700, size: 28 }, 232, 1)
  const l2 = fit(measure, phraseAccent, { family: 'caveat', weight: 700, size: 35 }, 236, 1)
  const l2Text = l2.lines.join(' ')
  const l2w = measure(l2Text, l2.font)
  const l2x = 180 - l2w / 2
  const l2y = phrasePlain ? 567 : 556
  const words = l2Text.split(' ')
  const lastStart = words.length > 1 ? measure(`${words.slice(0, -1).join(' ')} `, l2.font) : 0
  const pill: SceneNode[] = [
    line(
      'M150 512C210 504 290 510 318 528 334 540 326 566 296 576 250 590 150 588 96 580 60 574 52 548 66 532 82 518 112 514 150 512',
      '#D2C0C6',
      1,
    ),
    line(
      'M118 517C188 508 280 512 314 532 329 546 319 570 286 580 236 592 128 590 86 578 58 568 57 540 77 527',
      '#D2C0C6',
      0.9,
      0.8,
    ),
  ]
  if (phrasePlain) {
    const l1Text = l1.lines.join(' ')
    pill.push({
      type: 'text',
      x: 174 - measure(l1Text, l1.font) / 2,
      y: 540,
      text: l1Text,
      font: l1.font,
      color: '#2A2228',
    })
  }
  pill.push(
    { type: 'text', x: l2x, y: l2y, text: l2Text, font: l2.font, color: '#E0397A' },
    line(
      `M${l2x + lastStart - 2} ${l2y + 10.5}Q${l2x + (lastStart + l2w) / 2} ${l2y + 7} ${l2x + l2w + 3} ${l2y + 4.5}`,
      '#3A1328',
      2.6,
    ),
    {
      type: 'heart',
      x: Math.min(312, l2x + l2w + 22),
      y: 550,
      size: 31,
      rotate: 6,
      stroke: '#2A1620',
      width: 1.8,
    },
  )
  fg.push({ type: 'group', id: 'phrase', children: pill })

  // Días juntos, abajo a la izquierda.
  if (data.days) {
    fg.push({
      type: 'group',
      id: 'days',
      children: [
        ...calendar(24, 597),
        line('M49.5 598V615', '#4A4247', 1, 0.5),
        {
          type: 'text',
          x: 56,
          y: 612,
          text: data.days,
          font: { family: 'outfit', weight: 400, size: 12.5 },
          color: '#4A4247',
          spacing: 1,
        },
      ],
    })
  }

  return { bg: MOMENTS_BG, fg }
}
