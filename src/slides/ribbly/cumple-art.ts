import {
  fit,
  line,
  path,
  splitAccent,
  wordmark,
  type Font,
  type GroupNode,
  type Measure,
  type Paint,
  type Scene,
  type SceneNode,
  type TextNode,
} from './love-art'

/**
 * Las pantallas 03 (Edición cumple) y 05 (Recorrido) de Cumpleaños, calcadas
 * del diseño en el lienzo de 360 × 640, cada una con sus dos variantes. Son
 * escenas como las de Pareja (love-art.ts): las dibuja la pantalla (SVG) y la
 * imagen para compartir en Instagram (canvas).
 *
 * Los grupos con `edit` son lo que el editor directo deja tocar para editar.
 */

// ── Piezas sueltas ──────────────────────────────────────────────────────────

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`

/** Mezcla un color hex con blanco (t > 0) o con negro (t < 0). */
function shade(hex: string, t: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(t >= 0 ? c + (255 - c) * t : c * (1 + t)),
  )
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Un globo brillante con su nudo y su hilo. */
function balloon(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  string = '#C9B08A',
) {
  const body: Paint = {
    radial: [cx - rx * 0.38, cy - ry * 0.42, Math.max(rx, ry) * 1.55],
    stops: [
      [0, shade(color, 0.72)],
      [0.35, shade(color, 0.2)],
      [0.8, color],
      [1, shade(color, -0.18)],
    ],
  }
  const knotY = cy + ry
  return [
    line(
      `M${cx} ${knotY + 3}C${cx - 6} ${knotY + 22} ${cx + 7} ${knotY + 38} ${cx - 2} ${knotY + 60}`,
      string,
      0.8,
      0.85,
    ),
    path(`M${cx - 3.5} ${knotY + 4}L${cx} ${knotY - 1}L${cx + 3.5} ${knotY + 4}Z`, {
      fill: shade(color, -0.12),
    }),
    path(ellipse(cx, cy, rx, ry), { fill: body }),
    path(ellipse(cx - rx * 0.4, cy - ry * 0.45, rx * 0.16, ry * 0.24), {
      fill: 'rgba(255,255,255,0.55)',
    }),
  ] satisfies SceneNode[]
}

/** Moño de cinta dorada (o crema), centrado en x, y. */
function bow(x: number, y: number, rotate: number, color: string, deep: string): GroupNode {
  const ribbon: Paint = {
    linear: [-22, -12, 22, 12],
    stops: [
      [0, shade(color, 0.35)],
      [0.5, color],
      [1, deep],
    ],
  }
  return {
    type: 'group',
    x,
    y,
    rotate,
    children: [
      // Las colas.
      path('M-2 2C-8 10-12 18-16 26L-10 24-7 30C-4 20-1 10 1 3Z', { fill: ribbon }),
      path('M2 2C8 10 13 17 18 24L12 23 10 29C6 20 3 10 0 3Z', { fill: ribbon }),
      // Los dos lazos.
      path('M-1 0C-8-12-22-14-23-5-24 3-12 6-1 1Z', { fill: ribbon }),
      path('M1 0C8-12 22-14 23-5 24 3 12 6 1 1Z', { fill: ribbon }),
      line('M-3-1C-10-7-17-8-19-5M3-1C10-7 17-8 19-5', shade(deep, -0.2), 0.7, 0.6),
      // El nudo.
      path(ellipse(0, 0.5, 4.2, 3.6), { fill: deep }),
    ],
  }
}

/** Estrellita de cuatro puntas (destello). */
const sparkle = (x: number, y: number, r: number, fill: string, opacity = 1) =>
  path(
    `M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}Z`,
    { fill, opacity },
  )

/** Estrella de cinco puntas delineada. */
function star(x: number, y: number, r: number, stroke: string, width = 1.1) {
  const pts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    pts.push(`${(x + Math.cos(a) * rr).toFixed(2)} ${(y + Math.sin(a) * rr).toFixed(2)}`)
  }
  return path(`M${pts.join('L')}Z`, { stroke, width })
}

/** Papelitos de confeti: [x, y, giro]. */
function confetti(spots: [number, number, number][], color: string): SceneNode[] {
  return spots.map(([x, y, r]) => ({
    type: 'group',
    x,
    y,
    rotate: r,
    children: [
      path('M-1.6-3.6H1.6V3.6H-1.6Z', {
        fill: {
          linear: [-2, -4, 2, 4],
          stops: [
            [0, shade(color, 0.35)],
            [1, shade(color, -0.15)],
          ],
        },
      }),
    ],
  }))
}

/** Una torta dibujada con velitas (garabato), arriba a la izquierda en x, y. */
function cakeDoodle(x: number, y: number, color: string): SceneNode {
  return line(
    [
      `M${x} ${y + 34}H${x + 36}`,
      `M${x + 4} ${y + 34}V${y + 19}H${x + 32}V${y + 34}`,
      `M${x + 4} ${y + 23}C${x + 8} ${y + 27} ${x + 12} ${y + 20} ${x + 16} ${y + 24}C${x + 20} ${y + 28} ${x + 24} ${y + 20} ${x + 28} ${y + 24}C${x + 30} ${y + 26} ${x + 32} ${y + 24} ${x + 32} ${y + 23}`,
      `M${x + 9} ${y + 19}V${y + 10}H${x + 27}V${y + 19}`,
      `M${x + 13} ${y + 10}V${y + 4}M${x + 18} ${y + 10}V${y + 2}M${x + 23} ${y + 10}V${y + 4}`,
      `M${x + 13} ${y + 1}q1 -2.5 0 -4q-1 1.5 0 4M${x + 18} ${y - 1}q1 -2.5 0 -4q-1 1.5 0 4M${x + 23} ${y + 1}q1 -2.5 0 -4q-1 1.5 0 4`,
    ].join(''),
    color,
    1.1,
  )
}

/** Una vela con rayitas de luz, arriba a la izquierda en x, y (12 × 44). */
function candleDoodle(x: number, y: number, color: string, flame: string): SceneNode[] {
  return [
    line(
      [
        `M${x + 2} ${y + 44}V${y + 16}H${x + 10}V${y + 44}`,
        `M${x + 2} ${y + 22}L${x + 10} ${y + 18}M${x + 2} ${y + 29}L${x + 10} ${y + 25}M${x + 2} ${y + 36}L${x + 10} ${y + 32}M${x + 2} ${y + 43}L${x + 10} ${y + 39}`,
        `M${x + 6} ${y + 16}V${y + 12}`,
        `M${x - 3} ${y + 3}L${x - 6} ${y}M${x + 15} ${y + 3}L${x + 18} ${y}M${x + 6} ${y - 4}V${y - 8}`,
      ].join(''),
      color,
      1,
    ),
    path(
      `M${x + 6} ${y + 2}C${x + 9} ${y + 6} ${x + 9} ${y + 10} ${x + 6} ${y + 11}C${x + 3} ${y + 10} ${x + 3} ${y + 6} ${x + 6} ${y + 2}Z`,
      { fill: flame, stroke: color, width: 0.8 },
    ),
  ]
}

/** Gorrito de fiesta delineado, con la punta en x, y. */
function partyHat(x: number, y: number, rotate: number, color: string): GroupNode {
  return {
    type: 'group',
    x,
    y,
    rotate,
    children: [
      line('M0 0L-9 22H9Z M-5 12L5 9M-7 17L7 14M-2 5L3 4', color, 1),
      path(ellipse(0, -2, 2.4, 2.4), { stroke: color, width: 1 }),
    ],
  }
}

/** Corta un saludo en dos renglones parejos (como en el diseño). */
function balanced(
  measure: Measure,
  text: string,
  font: Font,
  max: number,
): { lines: string[]; font: Font } {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const total = measure(words.join(' '), font)
  if (words.length < 2 || total <= max * 0.62) return fit(measure, words.join(' '), font, max, 1)
  let best: string[] = []
  let bestWidth = Infinity
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ')
    const b = words.slice(i).join(' ')
    const w = Math.max(measure(a, font), measure(b, font))
    if (w < bestWidth) {
      bestWidth = w
      best = [a, b]
    }
  }
  if (bestWidth <= max) return { lines: best, font }
  return fit(measure, words.join(' '), font, max, 3)
}

const centered = (
  measure: Measure,
  text: string,
  font: Font,
  cx: number,
  y: number,
  color: string,
): TextNode => ({
  type: 'text',
  x: cx - measure(text, font) / 2,
  y,
  text,
  font,
  color,
})

// ── 03 · Edición cumple ─────────────────────────────────────────────────────

export const COVER_VARIANTS = ['rosa', 'celeste'] as const
export type CoverVariant = (typeof COVER_VARIANTS)[number]

interface CoverPalette {
  bg: string
  logo: string
  ink: string
  title1: string
  title2: Paint
  gold: string
  goldLight: string
  /** Onda de las esquinas de arriba (izquierda) y su filete. */
  corner: [string, string]
  cornerLine: string
  /** Crema de la esquina de arriba a la derecha. */
  cornerRight: [string, string]
  band: [string, string]
  bandLine: string
  tint: string
  lines: string
  blob: [string, string]
  balloons: { a: string; b: string; c: string }
  doodle: string
  heart: string
  flame: string
}

const COVER: Record<CoverVariant, CoverPalette> = {
  rosa: {
    bg: '#FDF8F0',
    logo: '#E4557B',
    ink: '#241917',
    title1: '#6D4F51',
    title2: '#E7507D',
    gold: '#D9B98C',
    goldLight: '#F1E2C6',
    corner: ['#F6CED8', '#EDB2C6'],
    cornerLine: '#DD93AE',
    cornerRight: ['#FDF9F1', '#F6EEDF'],
    band: ['#F2B4CA', '#F9CFDC'],
    bandLine: '#E59DB7',
    tint: '249,190,207',
    lines: '#E9B3C3',
    blob: ['#FCDCE1', '#F8C3D0'],
    balloons: { a: '#E89AA6', b: '#FBF0DC', c: '#F6E4CC' },
    doodle: '#A28C7C',
    heart: '#C25B7E',
    flame: '#F5D39A',
  },
  celeste: {
    bg: '#E3F2FC',
    logo: '#3B84C5',
    ink: '#081F2F',
    title1: '#2D648F',
    title2: {
      linear: [0, 500, 0, 522],
      stops: [
        [0, '#D7B884'],
        [1, '#B48C55'],
      ],
    },
    gold: '#BF9964',
    goldLight: '#E7D3AE',
    corner: ['#CBE6F8', '#A9D3F2'],
    cornerLine: '#C9A574',
    cornerRight: ['#EDF8F4', '#CFEDE6'],
    band: ['#A9D2F2', '#C9E5F8'],
    bandLine: '#8FC0E8',
    tint: '170,212,244',
    lines: '#B9A27E',
    blob: ['#CDE9F7', '#A9D7F1'],
    balloons: { a: '#5FA1D1', b: '#9FD8CE', c: '#FBF0DC' },
    doodle: '#3E8E86',
    heart: '#3E9A8E',
    flame: '#F5D39A',
  },
}

/** La foto: de arriba con forma de onda hasta abajo (la tapan las ondas). */
export const COVER_PHOTO_CLIP =
  'M20 470L20 300C18 250 20 192 30 152C40 112 70 84 110 74C150 64 200 61 240 67C275 72 300 85 318 104C336 124 341 160 339 200C337 250 343 300 339 350C337 390 333 420 331 470Z'

export interface CoverData {
  variant: string
  photo?: string
  caption: string
  title: string
  wish: string
  /** La edad (para los globos de número). */
  age?: string
  /** Lo que eligió el comprador (ejes de piece-options.ts). Sin esto, el diseño. */
  style?: { marco?: string; globos?: string; letra?: string; detalles?: string }
}

/** El marco de la foto (eje `marco`): onda orgánica, arco, círculo o polaroid. */
function coverPhoto(
  marco: string | undefined,
  c: CoverPalette,
  src: string | undefined,
): GroupNode {
  if (marco === 'arco') {
    return {
      type: 'group',
      id: 'photo',
      edit: 'photo',
      children: [
        {
          type: 'photo',
          x: 14,
          y: 52,
          w: 334,
          h: 420,
          src,
          clip: 'M28 470L28 214A152 152 0 0 1 332 214L332 470Z',
        },
        line('M22 420L22 214A158 158 0 0 1 338 214L338 420', c.gold, 5),
        line('M23 420L23 214A157 157 0 0 1 180 57', c.goldLight, 1.2, 0.8),
        line('M346 200C352 240 340 268 348 306', c.gold, 1.6),
      ],
    }
  }
  if (marco === 'circulo') {
    return {
      type: 'group',
      id: 'photo',
      edit: 'photo',
      children: [
        { type: 'photo', x: 14, y: 52, w: 334, h: 420, src, clip: ellipse(180, 252, 152, 152) },
        path(ellipse(180, 252, 158, 158), { stroke: c.gold, width: 5 }),
        path(ellipse(180, 252, 166, 166), { stroke: c.goldLight, width: 1.2, opacity: 0.9 }),
        sparkle(46, 150, 5, c.gold),
        sparkle(318, 352, 4, c.gold),
      ],
    }
  }
  if (marco === 'polaroid') {
    return {
      type: 'group',
      id: 'photo',
      edit: 'photo',
      x: 180,
      y: 238,
      rotate: -3,
      children: [
        {
          type: 'rect',
          x: -148,
          y: -176,
          w: 296,
          h: 352,
          fill: '#FFFFFF',
          radius: 3,
          shadow: true,
        },
        { type: 'photo', x: -134, y: -162, w: 268, h: 286, src },
        line('M-40 152H40', c.goldLight, 1.4, 0.9),
        bow(0, -176, 0, c.gold, shade(c.gold, -0.3)),
      ],
    }
  }
  return {
    type: 'group',
    id: 'photo',
    edit: 'photo',
    children: [
      { type: 'photo', x: 14, y: 52, w: 334, h: 420, src, clip: COVER_PHOTO_CLIP },
      line(
        'M14 405C12 340 13 262 15 206C17 152 30 112 62 87 100 58 150 51 200 53 250 55 292 71 318 97 340 119 349 160 347 205 345 250 351 300 347 350 344 385 343 405 342 420',
        c.gold,
        5,
      ),
      line(
        'M15 405C13 340 14 262 16 206C18 152 31 112 63 87 101 58 151 51 201 53',
        c.goldLight,
        1.2,
        0.8,
      ),
      line('M352 186C359 228 343 258 353 298 361 334 345 362 353 404', c.gold, 1.8),
    ],
  }
}

/** Un globo con forma de corazón, con su hilo. */
function heartBalloon(cx: number, cy: number, size: number, color: string): SceneNode[] {
  return [
    line(
      `M${cx} ${cy + size * 0.36}C${cx - 6} ${cy + size * 0.36 + 20} ${cx + 7} ${cy + size * 0.36 + 36} ${cx - 2} ${cy + size * 0.36 + 58}`,
      '#C9B08A',
      0.8,
      0.85,
    ),
    {
      type: 'heart',
      x: cx,
      y: cy,
      size,
      rotate: (cx % 7) - 3,
      fill: {
        radial: [8, 8, 18],
        stops: [
          [0, shade(color, 0.7)],
          [0.4, shade(color, 0.15)],
          [1, shade(color, -0.12)],
        ],
      },
    },
  ]
}

/** El número de la edad en globos metalizados dorados, arriba a la derecha. */
function foilNumber(age: string, x: number, y: number, size: number): SceneNode[] {
  const digits = age.slice(0, 2).split('')
  const step = size * 0.62
  return digits.flatMap((digit, i) => {
    const dx = x + i * step - ((digits.length - 1) * step) / 2
    return [
      line(
        `M${dx} ${y + 4}C${dx - 5} ${y + 22} ${dx + 6} ${y + 36} ${dx - 2} ${y + 56}`,
        '#C9B08A',
        0.8,
        0.85,
      ),
      {
        type: 'text',
        x: dx - size * 0.3,
        y,
        text: digit,
        font: { family: 'fredoka', weight: 700, size },
        color: '#E2B04A',
        gradient: {
          linear: [dx - size * 0.3, y - size * 0.8, dx + size * 0.3, y],
          stops: [
            [0, '#FFF4C2'],
            [0.4, '#F5C451'],
            [0.75, '#C98A1B'],
            [1, '#F5C451'],
          ],
        },
        shadow: true,
      } satisfies TextNode,
    ]
  })
}

/** Los globos (eje `globos`): redondos, corazones, el número de la edad o ninguno. */
function coverBalloons(
  globos: string | undefined,
  c: CoverPalette,
  age: string | undefined,
): GroupNode[] {
  const b = c.balloons
  if (globos === 'sin') return []
  if (globos === 'corazones') {
    return [
      {
        type: 'group',
        id: 'balloons-right',
        children: [
          ...heartBalloon(318, 62, 60, b.a),
          ...heartBalloon(340, 138, 54, b.c),
          ...heartBalloon(282, 96, 56, b.b),
        ],
      },
      {
        type: 'group',
        id: 'balloons-left',
        children: [
          ...heartBalloon(4, 334, 44, b.c),
          ...heartBalloon(24, 272, 52, b.a),
          ...heartBalloon(46, 362, 56, b.b),
        ],
      },
    ]
  }
  const left: GroupNode = {
    type: 'group',
    id: 'balloons-left',
    children: [
      ...balloon(2, 332, 20, 28, b.c),
      ...balloon(23, 272, 25, 31, b.a),
      ...balloon(46, 360, 28, 33, b.b),
    ],
  }
  if (globos === 'numero' && age) {
    return [{ type: 'group', id: 'balloons-right', children: foilNumber(age, 304, 132, 92) }, left]
  }
  return [
    {
      type: 'group',
      id: 'balloons-right',
      children: [
        ...balloon(320, 60, 27, 33, b.a),
        ...balloon(341, 136, 26, 32, b.c),
        ...balloon(285, 92, 27, 32, b.b),
      ],
    },
    left,
  ]
}

/** Confeti, serpentinas y garabatos (eje `detalles`). */
function coverDetails(detalles: string | undefined, c: CoverPalette): SceneNode[] {
  const whiteSparkles = [
    sparkle(276, 155, 4, '#FFFFFF', 0.9),
    sparkle(246, 140, 2.8, '#FFFFFF', 0.85),
    sparkle(88, 368, 3.4, '#FFFFFF', 0.9),
    sparkle(58, 238, 2.8, '#FFFFFF', 0.8),
  ]
  if (detalles === 'limpio') return [...whiteSparkles, sparkle(330, 520, 3, c.gold)]
  if (detalles === 'estrellas') {
    return [
      ...whiteSparkles,
      sparkle(30, 72, 5, c.gold),
      sparkle(254, 64, 4, c.gold),
      sparkle(330, 520, 5, c.gold),
      sparkle(40, 470, 4, c.gold),
      sparkle(130, 34, 3.5, c.gold),
      star(72, 64, 7, c.gold),
      star(44, 196, 6, c.gold),
      star(330, 214, 7, c.gold),
      star(318, 302, 5, c.gold),
      star(60, 430, 8, c.heart, 1.2),
      star(318, 560, 9, c.heart, 1.2),
      star(232, 60, 5, c.gold),
    ]
  }
  if (detalles === 'corazones') {
    const hearts: [number, number, number, number][] = [
      [266, 32, 10, -10],
      [228, 62, 8, 12],
      [72, 64, 11, -8],
      [44, 192, 9, 10],
      [330, 214, 10, -6],
      [318, 300, 8, 14],
      [56, 300, 9, -12],
      [128, 30, 8, 6],
    ]
    return [
      ...whiteSparkles,
      ...hearts.map(
        ([x, y, size, rotate]) =>
          ({ type: 'heart', x, y, size, rotate, fill: c.gold }) satisfies SceneNode,
      ),
      { type: 'heart', x: 267, y: 182, size: 15, rotate: -8, stroke: '#FFFFFF', width: 1.3 },
      { type: 'heart', x: 74, y: 399, size: 16, rotate: -6, fill: c.heart },
      { type: 'heart', x: 314, y: 557, size: 20, rotate: -10, fill: c.heart },
      { type: 'heart', x: 44, y: 560, size: 14, rotate: 8, stroke: c.heart, width: 1.3 },
    ]
  }
  return [
    ...confetti(
      [
        [266, 32, 30],
        [228, 62, 70],
        [254, 58, -20],
        [345, 92, 15],
        [72, 64, -30],
        [44, 192, 40],
        [330, 214, 60],
        [318, 300, -40],
        [56, 300, 25],
        [64, 436, -50],
        [344, 330, 10],
        [128, 30, 70],
      ],
      c.gold,
    ),
    line('M106 36C118 46 92 60 104 72 114 82 94 94 106 104', c.gold, 1.1, 0.9),
    line('M14 80C26 88 6 102 18 112 28 122 10 132 22 140', c.gold, 1, 0.8),
    line('M300 286C310 296 290 306 300 316', c.gold, 1, 0.8),
    sparkle(30, 72, 3.5, c.gold),
    sparkle(254, 64, 3, c.gold),
    ...whiteSparkles,
    sparkle(330, 520, 3, c.gold),
    { type: 'heart', x: 267, y: 182, size: 15, rotate: -8, stroke: '#FFFFFF', width: 1.3 },
    { type: 'heart', x: 280, y: 202, size: 10, rotate: 10, stroke: '#FFFFFF', width: 1.2 },
    { type: 'heart', x: 74, y: 399, size: 14, rotate: -6, stroke: c.heart, width: 1.2 },
    cakeDoodle(31, 444, c.doodle),
    { type: 'heart', x: 314, y: 557, size: 18, rotate: -10, stroke: c.heart, width: 1.4 },
    ...candleDoodle(327, 538, c.doodle, c.flame),
  ]
}

/** La letra del deseo (eje `letra`). */
function wishFontFor(letra: string | undefined): Font {
  if (letra === 'caveat') return { family: 'caveat', weight: 600, size: 29 }
  if (letra === 'serif') return { family: 'playfair', weight: 700, size: 21, italic: true }
  if (letra === 'moderna') return { family: 'outfit', weight: 400, size: 21 }
  return { family: 'dancing', weight: 500, size: 25.5 }
}

export function coverScene(data: CoverData, measure: Measure): Scene {
  const variant: CoverVariant = data.variant === 'celeste' ? 'celeste' : 'rosa'
  const c = COVER[variant]
  const tint = (a: number) => `rgba(${c.tint},${a})`

  const bg: SceneNode[] = [
    path('M0 0H360V640H0Z', {
      fill: {
        linear: [0, 0, 0, 640],
        stops: [
          [0, c.bg],
          [1, shade(c.bg, -0.02)],
        ],
      },
    }),
    // Arriba a la izquierda: la onda con su filete (en celeste, dorado).
    path('M0 0H124C108 16 82 36 54 50 34 60 16 66 0 69Z', {
      fill: {
        linear: [0, 0, 110, 70],
        stops: [
          [0, c.corner[0]],
          [1, c.corner[1]],
        ],
      },
      opacity: 0.85,
    }),
    path('M0 0H99C88 17 66 31 40 38 24 42 11 44 0 44Z', {
      fill: {
        radial: [0, 0, 104],
        stops: [
          [0, shade(c.bg, 0.5)],
          [0.55, shade(c.corner[0], 0.35)],
          [1, c.corner[0]],
        ],
      },
      opacity: 0.9,
    }),
    line('M99 0C88 17 66 31 40 38 24 42 11 44 0 44', c.cornerLine, 1.2),
    // Arriba a la derecha: crema detrás de los globos.
    path('M360 0H262C272 40 302 70 334 92 346 101 354 112 360 124Z', {
      fill: 'rgba(255,255,255,0.4)',
    }),
    path('M360 0H300C305 28 320 50 340 66 348 74 355 84 360 96Z', {
      fill: {
        linear: [300, 0, 360, 96],
        stops: [
          [0, c.cornerRight[0]],
          [1, c.cornerRight[1]],
        ],
      },
    }),
  ]

  const fg: SceneNode[] = []
  const style = data.style ?? {}

  // La foto, con su marco dorado.
  fg.push(coverPhoto(style.marco, c, data.photo))

  // Las ondas de abajo (con la frase): se pasan del lienzo hacia los bordes.
  fg.push(
    path(
      'M560 374H346C344 407 331 433 302 446 262 460 212 463 156 466 106 468 66 462 26 450V530H560Z',
      {
        fill: {
          linear: [0, 450, 0, 505],
          stops: [
            [0, c.band[0]],
            [1, c.band[1]],
          ],
        },
      },
    ),
    line('M184 481C232 489 282 485 316 472 336 464 350 456 360 448L560 448', c.bandLine, 1.1),
    path('M-200 401H0C44 403 92 414 132 432 154 442 172 452 196 462L196 510H-200Z', {
      fill: 'rgba(255,255,255,0.6)',
    }),
    line('M-200 401H0C44 403 92 414 132 432 154 442 172 452 196 462', c.bandLine, 1.1),
    path(
      'M-200 420H0C42 418 84 428 122 450 160 472 210 490 258 493 300 496 334 482 360 462H560V1000H-200Z',
      { fill: c.bg },
    ),
    path('M250 430H560V590H250Z', {
      fill: {
        radial: [374, 492, 92],
        stops: [
          [0, tint(0.9)],
          [1, tint(0)],
        ],
      },
    }),
    path('M-200 530H120V1000H-200Z', {
      fill: {
        radial: [0, 650, 108],
        stops: [
          [0, tint(0.95)],
          [1, tint(0)],
        ],
      },
    }),
    path('M200 490H560V1000H200Z', {
      fill: {
        radial: [372, 650, 150],
        stops: [
          [0, tint(0.85)],
          [1, tint(0)],
        ],
      },
    }),
    path('M284 640C294 614 324 597 360 594H560V1000H284Z', {
      fill: {
        linear: [290, 600, 360, 640],
        stops: [
          [0, c.blob[0]],
          [1, c.blob[1]],
        ],
      },
    }),
    line(
      'M0 527C8 555 18 590 50 606 90 616 150 604 190 604 230 604 270 616 300 640 315 655 325 680 330 720',
      c.lines,
      1,
    ),
    line('M258 524C285 528 320 516 360 492L560 410', c.lines, 1),
    line(
      'M226 720C228 690 232 662 238 640 250 617 280 596 310 584 330 577 345 575 360 575H560',
      c.lines,
      1,
    ),
  )

  // Globos.
  fg.push(...coverBalloons(style.globos, c, data.age))

  // Confeti dorado, serpentinas y garabatos.
  fg.push({ type: 'group', id: 'confetti', children: coverDetails(style.detalles, c) })

  // La marca.
  fg.push({ type: 'group', id: 'logo', children: wordmark(measure, 183, 33, 22, c.logo) })

  // Texto a mano sobre la foto (opcional).
  if (data.caption) {
    const font: Font = { family: 'caveat', weight: 700, size: 24 }
    const w = Math.min(measure(data.caption, font), 170)
    fg.push({
      type: 'group',
      id: 'caption',
      edit: 'caption',
      x: 300,
      y: 176,
      rotate: -7,
      children: [
        { type: 'text', x: -w, y: 0, text: data.caption, font, color: '#FFFFFF', shadow: true },
        line(`M${-w + 12} 10C${-w * 0.5} 7 -16 4 2 1`, '#FFFFFF', 1.8),
      ],
    })
  }

  // "Feliz cumpleaños": lo de siempre en itálica fina, lo destacado en negrita.
  const [plain, accent] = splitAccent(data.title, 1)
  let size = 37
  const f1 = (s: number): Font => ({ family: 'nunito', weight: 300, size: s, italic: true })
  const f2 = (s: number): Font => ({ family: 'fredoka', weight: 600, size: s })
  const widthAt = (s: number) => (plain ? measure(`${plain} `, f1(s)) : 0) + measure(accent, f2(s))
  while (widthAt(size) > 296 && size > 20) size -= 0.5
  const tx = 180 - widthAt(size) / 2
  fg.push({
    type: 'group',
    id: 'title',
    edit: 'title',
    children: [
      ...(plain
        ? [
            {
              type: 'text',
              x: tx,
              y: 520,
              text: plain,
              font: f1(size),
              color: c.title1,
            } as TextNode,
          ]
        : []),
      {
        type: 'text',
        x: tx + (plain ? measure(`${plain} `, f1(size)) : 0),
        y: 520,
        text: accent,
        font: f2(size),
        color: typeof c.title2 === 'string' ? c.title2 : '#BF9964',
        ...(typeof c.title2 === 'string' ? {} : { gradient: c.title2 }),
      } as TextNode,
    ],
  })

  // El deseo, a mano, en dos renglones.
  const wishFont = wishFontFor(style.letra)
  const wish = balanced(measure, data.wish, wishFont, 250)
  fg.push({
    type: 'group',
    id: 'wish',
    edit: 'wish',
    children: wish.lines.map((text, i) =>
      centered(measure, text, wish.font, 180, 559 + i * wish.font.size * 1.08, c.ink),
    ),
  })

  return { bg, fg }
}

// ── 05 · Recorrido (grilla de polaroids) ────────────────────────────────────

export const MOMENTS_VARIANTS = ['celeste', 'crema'] as const
export type MomentsVariant = (typeof MOMENTS_VARIANTS)[number]

interface MomentsPalette {
  bg: [string, string, string]
  logo: string
  kicker: string
  kickerLine: string
  title1: string
  title2: string
  underline: string
  frame: string
  frameBorder?: string
  bow: [string, string]
  foot: 'stars' | 'hearts'
  footColor: string
  balloons: { a: string; b: string }
  gold: string
  doodle: string
  pillFill?: string
  pillStroke: string
  script1: string
  script2: string
  scriptLine: string
  days: string
}

const MOMENTS: Record<MomentsVariant, MomentsPalette> = {
  celeste: {
    bg: ['#E6F4FB', '#EAF6FD', '#DCEFF8'],
    logo: '#131C39',
    kicker: '#AE9A6D',
    kickerLine: '#C8A257',
    title1: '#151E3A',
    title2: '#151E3A',
    underline: '#C8A257',
    frame: '#F8F2E3',
    frameBorder: '#D9BE86',
    bow: ['#E2C27C', '#B08A3E'],
    foot: 'stars',
    footColor: '#C9A454',
    balloons: { a: '#F7F0DE', b: '#B6D6EE' },
    gold: '#C8A257',
    doodle: '#151E3A',
    pillFill: 'rgba(196,224,243,0.85)',
    pillStroke: '#A9CBE6',
    script1: '#111E3D',
    script2: '#111E3D',
    scriptLine: '#C8A257',
    days: '#151E3A',
  },
  crema: {
    bg: ['#FBF6EC', '#F8F2E6', '#F6EEDF'],
    logo: '#D83972',
    kicker: '#2B2023',
    kickerLine: '#6E6264',
    title1: '#311F2B',
    title2: '#E33A75',
    underline: '#E33A75',
    frame: '#FFFFFF',
    bow: ['#F2E6D4', '#D8C2A0'],
    foot: 'hearts',
    footColor: '#2D252A',
    balloons: { a: '#F8F0E1', b: '#F4BFD0' },
    gold: '#D9B98C',
    doodle: '#2D252A',
    pillStroke: '#E9A8C2',
    script1: '#32232D',
    script2: '#E33A75',
    scriptLine: '#3A1328',
    days: '#2D252A',
  },
}

function momentsBackground(v: MomentsVariant): SceneNode[] {
  const c = MOMENTS[v]
  const base = path('M0 0H360V640H0Z', {
    fill: {
      linear: [0, 0, 0, 640],
      stops: [
        [0, c.bg[0]],
        [0.5, c.bg[1]],
        [1, c.bg[2]],
      ],
    },
  })
  if (v === 'celeste') {
    return [
      base,
      path('M0 0H96C89 22 71 42 49 56 33 66 15 74 0 78Z', {
        fill: {
          linear: [0, 0, 90, 78],
          stops: [
            [0, '#C9E2F4'],
            [1, '#DDEEF9'],
          ],
        },
      }),
      path('M360 0H300C302 22 318 38 338 44 346 47 354 47 360 46Z', {
        fill: {
          radial: [362, 0, 70],
          stops: [
            [0, '#B2D3EE'],
            [1, '#D5E9F7'],
          ],
        },
      }),
      line('M294 0C298 22 314 40 336 47 346 50 354 50 360 49', '#C8A257', 1),
      path('M0 180C22 186 36 204 34 226 32 250 20 266 0 274Z', {
        fill: {
          linear: [0, 180, 30, 274],
          stops: [
            [0, '#D3E7F6'],
            [1, '#B4D4EE'],
          ],
        },
      }),
      path('M360 254C342 262 333 280 334 300 335 322 346 338 360 346Z', {
        fill: {
          linear: [334, 254, 360, 346],
          stops: [
            [0, '#D3E7F6'],
            [1, '#BCD9EF'],
          ],
        },
      }),
      path('M0 380C14 390 20 420 14 446 10 462 4 470 0 472Z', { fill: '#CFE4F4', opacity: 0.8 }),
      // Abajo: dorado a la izquierda, celeste y dorado a la derecha.
      path('M0 540C40 548 92 566 128 594 150 612 166 628 176 640H0Z', {
        fill: {
          linear: [0, 548, 150, 640],
          stops: [
            [0, '#F0DBA6'],
            [0.5, '#D7B46A'],
            [1, '#B68E40'],
          ],
        },
      }),
      line('M0 552C46 562 96 580 130 606 148 620 160 632 168 640', '#F7E8C4', 1.2, 0.8),
      path('M214 640C232 612 270 594 312 590 334 588 350 590 360 592V640Z', {
        fill: {
          linear: [214, 640, 360, 590],
          stops: [
            [0, '#B8D7EE'],
            [1, '#9EC6E6'],
          ],
        },
      }),
      path('M284 640C300 622 326 612 360 610V640Z', {
        fill: {
          linear: [284, 640, 360, 610],
          stops: [
            [0, '#D8B66F'],
            [1, '#B68E40'],
          ],
        },
      }),
    ]
  }
  return [
    base,
    path('M0 0H104C96 24 76 46 52 60 34 70 16 76 0 80Z', {
      fill: {
        linear: [0, 0, 100, 80],
        stops: [
          [0, '#E9D6B4'],
          [1, '#F4E9D4'],
        ],
      },
    }),
    path('M360 0H284C288 24 306 42 330 50 342 54 352 54 360 53Z', {
      fill: {
        radial: [362, 0, 80],
        stops: [
          [0, '#F4CFD9'],
          [1, '#F9E6EA'],
        ],
      },
    }),
    path('M0 186C20 192 32 208 31 228 30 248 18 262 0 268Z', {
      fill: {
        linear: [0, 186, 30, 268],
        stops: [
          [0, '#F8D9E2'],
          [1, '#F2BCCC'],
        ],
      },
    }),
    path('M360 278C344 286 336 302 337 318 338 334 348 344 360 348Z', {
      fill: {
        linear: [337, 278, 360, 348],
        stops: [
          [0, '#F8D2DE'],
          [1, '#F2B4C8'],
        ],
      },
    }),
    path('M0 470C20 480 30 506 24 534 20 552 10 562 0 566Z', { fill: '#F6C9D6', opacity: 0.8 }),
    path('M0 540C36 548 80 566 112 594 132 612 146 628 154 640H0Z', {
      fill: {
        linear: [0, 548, 140, 640],
        stops: [
          [0, '#F1E4CB'],
          [0.55, '#DCC39A'],
          [1, '#C8A774'],
        ],
      },
    }),
    path('M220 640C238 612 274 596 314 592 336 590 350 592 360 594V640Z', {
      fill: {
        linear: [220, 640, 360, 592],
        stops: [
          [0, '#F7C3D3'],
          [1, '#F2A5BE'],
        ],
      },
    }),
    path('M286 640C302 622 328 612 360 610V640Z', {
      fill: {
        linear: [286, 640, 360, 610],
        stops: [
          [0, '#F08CB0'],
          [1, '#E76F9C'],
        ],
      },
    }),
  ]
}

export interface CumplePolaroidSpot {
  x: number
  y: number
  w: number
  h: number
  rotate: number
  bow: number
}

/** Dónde va cada polaroid según cuántas fotos haya (de 1 a 4). */
export function cumpleSpots(count: number): CumplePolaroidSpot[] {
  if (count <= 1) return [{ x: 180, y: 318, w: 180, h: 200, rotate: -3, bow: -4 }]
  if (count === 2)
    return [
      { x: 112, y: 284, w: 158, h: 176, rotate: -6, bow: -6 },
      { x: 252, y: 364, w: 158, h: 176, rotate: 6.5, bow: 6 },
    ]
  if (count === 3)
    return [
      { x: 118, y: 214, w: 160, h: 176, rotate: -6, bow: -6 },
      { x: 268, y: 236, w: 154, h: 172, rotate: 6.5, bow: 6 },
      { x: 184, y: 410, w: 160, h: 178, rotate: -3, bow: 4 },
    ]
  return [
    { x: 118, y: 214, w: 170, h: 182, rotate: -6, bow: -6 },
    { x: 268, y: 238, w: 162, h: 178, rotate: 6.5, bow: 6 },
    { x: 114, y: 404, w: 172, h: 188, rotate: -7.5, bow: 4 },
    { x: 268, y: 420, w: 160, h: 176, rotate: 7.5, bow: 6 },
  ]
}

export interface CumpleMomentsData {
  variant: string
  photos: (string | undefined)[]
  kicker: string
  title: string
  phrase: string
  days: string
  /** Lo que eligió el comprador (ejes de piece-options.ts). Sin esto, el diseño. */
  style?: { sujecion?: string; disposicion?: string; globos?: string; letra?: string }
}

/** Cómo se acomodan las fotos (eje `disposicion`): rectas, en collage o como vienen. */
function arrangeSpots(spots: CumplePolaroidSpot[], disposicion: string | undefined) {
  if (disposicion === 'derecha') {
    const cols = spots.length >= 2 ? [104, 256] : [180]
    return spots.map((s, i) => ({
      ...s,
      w: Math.min(s.w, 148),
      h: Math.min(s.h, 164),
      x: spots.length === 3 && i === 2 ? 180 : cols[i % cols.length]!,
      y: spots.length <= 2 ? 300 : i < 2 ? 222 : 414,
      rotate: 0,
      bow: 0,
    }))
  }
  if (disposicion === 'collage') {
    const nudge: [number, number][] = [
      [10, 12],
      [-12, 4],
      [14, -10],
      [-10, -8],
    ]
    return spots.map((s, i) => ({
      ...s,
      x: s.x + nudge[i]![0],
      y: s.y + nudge[i]![1],
      rotate: s.rotate * 1.9,
      bow: s.bow * 1.5,
    }))
  }
  return spots
}

/** Lo que sostiene la polaroid arriba (eje `sujecion`). */
function fastener(
  kind: string | undefined,
  w: number,
  h: number,
  tilt: number,
  c: MomentsPalette,
): SceneNode[] {
  if (kind === 'washi') {
    return [
      {
        type: 'group',
        x: 0,
        y: -h / 2 + 1,
        rotate: tilt * 0.8 - 3,
        children: [
          { type: 'rect', x: -26, y: -9, w: 52, h: 18, fill: 'rgba(255,221,140,0.82)', radius: 1 },
          line('M-26 -9V9M26 -9V9', 'rgba(255,255,255,0.5)', 1, 0.8),
        ],
      },
    ]
  }
  if (kind === 'chinche') {
    return [
      path(ellipse(2, -h / 2 + 11, 7.5, 3.4), { fill: 'rgba(40,30,30,0.18)' }),
      path(ellipse(0, -h / 2 + 7, 7.5, 7.5), {
        fill: {
          radial: [-2, -h / 2 + 4, 10],
          stops: [
            [0, '#FFB3BF'],
            [0.45, '#F2506B'],
            [1, '#B8233F'],
          ],
        },
      }),
      path(ellipse(-2.5, -h / 2 + 4.5, 2, 1.4), { fill: 'rgba(255,255,255,0.7)' }),
    ]
  }
  if (kind === 'clip') {
    const x = -w / 2 + 24
    const y = -h / 2 - 12
    return [
      line(
        `M${x} ${y + 30}V${y + 4}A5 5 0 0 1 ${x + 10} ${y + 4}V${y + 34}A7 7 0 0 1 ${x - 4} ${y + 34}V${y + 10}`,
        '#8E98AC',
        2.2,
      ),
    ]
  }
  return [bow(-2, -h / 2 + 2, tilt, c.bow[0], c.bow[1])]
}

/** La letra de la frase (eje `letra`): las dos líneas, la común y la destacada. */
function phraseFonts(letra: string | undefined): [Font, Font] {
  if (letra === 'caveat')
    return [
      { family: 'caveat', weight: 600, size: 28 },
      { family: 'caveat', weight: 700, size: 35 },
    ]
  if (letra === 'serif')
    return [
      { family: 'playfair', weight: 700, size: 20, italic: true },
      { family: 'playfair', weight: 900, size: 25, italic: true },
    ]
  if (letra === 'moderna')
    return [
      { family: 'outfit', weight: 400, size: 20 },
      { family: 'fredoka', weight: 600, size: 26 },
    ]
  return [
    { family: 'dancing', weight: 500, size: 25 },
    { family: 'dancing', weight: 700, size: 31 },
  ]
}

function cumplePolaroid(
  spot: CumplePolaroidSpot,
  src: string | undefined,
  i: number,
  c: MomentsPalette,
  sujecion?: string,
): GroupNode {
  const { w, h } = spot
  const m = 8
  const photoW = w - m * 2
  const photoH = Math.round(photoW * 0.86)
  const feet: SceneNode[] =
    c.foot === 'stars'
      ? [
          star(-w / 2 + 22, h / 2 - 16, 6.5, c.footColor),
          star(w / 2 - 34, h / 2 - 14, 4.5, c.footColor),
          star(w / 2 - 20, h / 2 - 18, 6.5, c.footColor),
        ]
      : [
          {
            type: 'heart',
            x: -w / 2 + 22,
            y: h / 2 - 17,
            size: 17,
            stroke: c.footColor,
            width: 1.4,
            rotate: -6,
          },
          {
            type: 'heart',
            x: w / 2 - 22,
            y: h / 2 - 17,
            size: 15,
            stroke: c.footColor,
            width: 1.4,
            rotate: 8,
          },
        ]
  return {
    type: 'group',
    id: `polaroid-${i}`,
    edit: `moments.${i}`,
    x: spot.x,
    y: spot.y,
    rotate: spot.rotate,
    tap: true,
    children: [
      { type: 'rect', x: -w / 2, y: -h / 2, w, h, fill: c.frame, radius: 1.5, shadow: true },
      ...(c.frameBorder
        ? [
            path(`M${-w / 2 + 3} ${-h / 2 + 3}H${w / 2 - 3}V${h / 2 - 3}H${-w / 2 + 3}Z`, {
              stroke: c.frameBorder,
              width: 0.9,
            }),
          ]
        : []),
      { type: 'photo', x: -w / 2 + m, y: -h / 2 + m, w: photoW, h: photoH, src },
      ...feet,
      ...fastener(sujecion, w, h, spot.bow, c),
    ],
  }
}

export function cumpleMomentsScene(data: CumpleMomentsData, measure: Measure): Scene {
  const variant: MomentsVariant = data.variant === 'crema' ? 'crema' : 'celeste'
  const c = MOMENTS[variant]
  const fg: SceneNode[] = []
  const photos = data.photos.slice(0, 4)
  const style = data.style ?? {}

  // Globos de los costados (detrás de las polaroids) y confeti.
  if (style.globos !== 'sin') {
    fg.push({
      type: 'group',
      id: 'balloons',
      children:
        style.globos === 'corazones'
          ? [
              ...heartBalloon(18, 330, 46, c.balloons.b),
              ...heartBalloon(40, 252, 56, c.balloons.a),
              ...heartBalloon(346, 440, 44, c.balloons.b),
              ...heartBalloon(330, 404, 52, c.balloons.a),
            ]
          : [
              ...balloon(17, 328, 23, 31, c.balloons.b),
              ...balloon(40, 250, 29, 36, c.balloons.a),
              ...balloon(348, 438, 22, 30, c.balloons.b),
              ...balloon(332, 404, 26, 32, c.balloons.a),
            ],
    })
  }
  fg.push({
    type: 'group',
    id: 'confetti',
    children: [
      ...confetti(
        [
          [24, 178, 30],
          [334, 116, -30],
          [312, 186, 60],
          [194, 116, 15],
          [16, 470, -40],
          [342, 490, 20],
          [196, 312, 70],
          [176, 482, -10],
          [42, 520, 40],
          [320, 520, -60],
        ],
        c.gold,
      ),
      line(
        'M334 128C344 140 326 152 336 166 344 178 330 190 340 204 348 216 334 228 342 244 350 258 336 270 344 284',
        c.gold,
        1.1,
        0.9,
      ),
      line('M20 600C30 612 14 624 24 638', c.gold, 1, 0.8),
      sparkle(54, 128, 3.5, c.gold),
      sparkle(196, 128, 3, c.gold),
      sparkle(328, 300, 3, c.gold),
      sparkle(24, 400, 3, c.gold),
      ...(variant === 'celeste'
        ? [partyHat(22, 128, -18, c.doodle), partyHat(202, 136, 16, c.doodle)]
        : [
            {
              type: 'heart',
              x: 26,
              y: 146,
              size: 22,
              rotate: -10,
              stroke: '#D9467C',
              width: 1.5,
            } as SceneNode,
            {
              type: 'heart',
              x: 204,
              y: 144,
              size: 22,
              rotate: 6,
              stroke: '#D9467C',
              width: 1.5,
            } as SceneNode,
            sparkle(206, 176, 3.5, '#D9467C'),
          ]),
      line(
        [
          'M322 132L324 146M332 150L344 134M336 158L352 150',
          'M20 258L34 264M16 272L32 273M22 286L34 279',
          'M336 438L346 433M334 447L351 445M334 454L346 459',
        ].join(''),
        c.doodle,
        1.4,
        0.85,
      ),
    ],
  })

  fg.push({ type: 'group', id: 'logo', children: wordmark(measure, 180, 47, 23, c.logo) })

  // Etiqueta con un filete a cada lado.
  const kickerFont: Font = { family: 'outfit', weight: 600, size: 9.8 }
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
        y: 77,
        text: kicker,
        font: kickerFont,
        color: c.kicker,
        spacing,
      },
      line(`M26 73.5H${Math.max(40, 180 - kw / 2 - 12)}`, c.kickerLine, 1),
      line(`M${Math.min(320, 180 + kw / 2 + 12)} 73.5H334`, c.kickerLine, 1),
    ],
  })

  // Título.
  const [plain, accent] = splitAccent(data.title, 1)
  let titleFont: Font = { family: 'fredoka', weight: 700, size: 31.5 }
  const titleWidth = (f: Font) => (plain ? measure(`${plain} `, f) : 0) + measure(accent, f)
  while (titleWidth(titleFont) > 304 && titleFont.size > 16)
    titleFont = { ...titleFont, size: titleFont.size - 0.5 }
  const tx = 180 - titleWidth(titleFont) / 2
  const ax = tx + (plain ? measure(`${plain} `, titleFont) : 0)
  const aw = measure(accent, titleFont)
  fg.push({
    type: 'group',
    id: 'title',
    edit: 'title',
    children: [
      ...(plain
        ? [
            {
              type: 'text',
              x: tx,
              y: 108,
              text: plain,
              font: titleFont,
              color: c.title1,
            } as TextNode,
          ]
        : []),
      { type: 'text', x: ax, y: 108, text: accent, font: titleFont, color: c.title2 },
      variant === 'celeste'
        ? path(
            `M${ax + aw * 0.08} 116.5C${ax + aw * 0.4} 112 ${ax + aw * 0.75} 112 ${ax + aw + 6} 113.5C${ax + aw * 0.75} 113.5 ${ax + aw * 0.4} 114.5 ${ax + aw * 0.08} 116.5Z`,
            { stroke: c.underline, width: 1.2 },
          )
        : line(`M${ax + 2} 116Q${ax + aw * 0.5} 112 ${ax + aw - 2} 115.5`, c.underline, 2.4),
    ],
  })

  // Las polaroids.
  arrangeSpots(cumpleSpots(photos.length || 1), style.disposicion).forEach((spot, i) =>
    fg.push(cumplePolaroid(spot, photos[i], i, c, style.sujecion)),
  )

  // La vela sobre la frase.
  fg.push({ type: 'group', id: 'candle', children: candleDoodle(174, 494, c.gold, '#F5D39A') })

  // La frase en su píldora.
  const [p1, p2] = splitAccent(data.phrase, 3)
  const [phraseFont1, phraseFont2] = phraseFonts(style.letra)
  const l1 = p1 ? fit(measure, p1, phraseFont1, 226, 1) : null
  const l2 = fit(measure, p2, phraseFont2, 232, 1)
  const l2Text = l2.lines.join(' ')
  const l2w = measure(l2Text, l2.font)
  const l2y = l1 ? 569 : 557
  const words = l2Text.split(' ')
  const lastStart = words.length > 1 ? measure(`${words.slice(0, -1).join(' ')} `, l2.font) : 0
  const pill: SceneNode[] = []
  if (c.pillFill) {
    pill.push(
      path(
        'M100 518C150 508 236 510 282 520 314 527 320 556 300 574 276 594 200 596 140 592 96 589 64 580 62 556 60 534 76 523 100 518Z',
        { fill: c.pillFill, stroke: c.pillStroke, width: 1 },
      ),
    )
  } else {
    pill.push(
      line(
        'M150 516C210 508 290 512 316 530 332 542 324 568 294 578 248 592 150 590 96 582 60 576 52 550 66 534 82 520 112 517 150 516',
        c.pillStroke,
        1.4,
      ),
      line('M120 521C188 512 280 516 312 534 326 548 316 570 284 580', c.pillStroke, 0.9, 0.7),
    )
  }
  if (l1) {
    pill.push(centered(measure, l1.lines.join(' '), l1.font, 180, 542, c.script1))
  }
  const l2x = 180 - l2w / 2
  pill.push(
    { type: 'text', x: l2x, y: l2y, text: l2Text, font: l2.font, color: c.script2 },
    line(
      `M${l2x + lastStart - 2} ${l2y + 9}Q${l2x + (lastStart + l2w) / 2} ${l2y + 6} ${l2x + l2w + 4} ${l2y + 5}`,
      c.scriptLine,
      variant === 'celeste' ? 1.8 : 2.4,
    ),
  )
  fg.push({ type: 'group', id: 'phrase', edit: 'phrase', children: pill })

  // Días juntos (solo crema, si hay fecha).
  if (variant === 'crema' && data.days) {
    const ink = c.days
    fg.push({
      type: 'group',
      id: 'days',
      edit: 'since',
      children: [
        path('M26 601h15a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2Z', {
          stroke: ink,
          width: 1.4,
        }),
        line('M24 606H43M29 599V603M38 599V603', ink, 1.4),
        line('M49.5 600V617', ink, 1, 0.5),
        {
          type: 'text',
          x: 56,
          y: 614,
          text: data.days,
          font: { family: 'outfit', weight: 400, size: 12.5 },
          color: ink,
          spacing: 1,
        },
        sparkle(166, 604, 3.5, c.gold),
      ],
    })
  }

  return { bg: momentsBackground(variant), fg }
}
