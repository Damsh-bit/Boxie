import {
  EDITION_DOODLES,
  EDITION_PHOTO_BOTTOM,
  EDITION_WAVES,
  HEART_PATH,
  MOMENTS_BG,
  MOMENTS_DOODLES,
  MOMENTS_WAVES,
  POLAROID,
  polaroidSpots,
  splitAccent,
  STORY_H,
  STORY_W,
  type Wave,
} from './love-art'

/**
 * La imagen para compartir en una historia de Instagram (1080 × 1920) de las
 * pantallas 03 y 05 de Pareja. Se dibuja a mano sobre un canvas con la misma
 * geometría que la pantalla (love-art.ts): no depende de capturar el DOM, así
 * que sale igual en cualquier teléfono y sin los botones ni la barra del
 * player.
 *
 * Solo navegador (canvas, fuentes del documento).
 */

const SCALE = 3
export const IMAGE_W = STORY_W * SCALE
export const IMAGE_H = STORY_H * SCALE

/** Las tipografías de next/font, por nombre real (cambian en cada build). */
export interface StoryFonts {
  fredoka: string
  caveat: string
  outfit: string
}

/** Lee las familias de las variables CSS de next/font (--font-fredoka, …). */
export function readFonts(el: Element): StoryFonts {
  const style = getComputedStyle(el)
  const read = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    fredoka: read('--font-fredoka', 'sans-serif'),
    caveat: read('--font-caveat', 'cursive'),
    outfit: read('--font-outfit', 'sans-serif'),
  }
}

async function loadFonts(fonts: StoryFonts) {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all(
    [
      `italic 500 40px ${fonts.fredoka}`,
      `italic 700 40px ${fonts.fredoka}`,
      `700 40px ${fonts.fredoka}`,
      `700 40px ${fonts.caveat}`,
      `600 40px ${fonts.outfit}`,
    ].map((font) => document.fonts.load(font).catch(() => [])),
  )
}

/** Carga una imagen para dibujarla; si no se puede (CORS, red), null. */
function loadImage(src: string | undefined): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function makeCanvas() {
  const canvas = document.createElement('canvas')
  canvas.width = IMAGE_W
  canvas.height = IMAGE_H
  const ctx = canvas.getContext('2d')!
  // De acá en más se dibuja en el lienzo de 360 × 640.
  ctx.scale(SCALE, SCALE)
  ctx.textBaseline = 'alphabetic'
  return { canvas, ctx }
}

function drawWaves(ctx: CanvasRenderingContext2D, waves: Wave[]) {
  for (const wave of waves) {
    const path = new Path2D(wave.d)
    ctx.save()
    ctx.globalAlpha = wave.opacity ?? 1
    if (wave.stroke) {
      ctx.strokeStyle = wave.stroke
      ctx.lineWidth = wave.strokeWidth ?? 1
      ctx.lineCap = 'round'
      ctx.stroke(path)
    } else {
      if (wave.gradient) {
        const g = ctx.createLinearGradient(0, 0, 0, STORY_H)
        g.addColorStop(0, wave.gradient[0])
        g.addColorStop(1, wave.gradient[1])
        ctx.fillStyle = g
      } else {
        ctx.fillStyle = wave.fill ?? '#fff'
      }
      ctx.fill(path)
    }
    ctx.restore()
  }
}

/** Dibuja la imagen cubriendo el rectángulo (como object-fit: cover). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ratio = Math.max(w / img.naturalWidth, h / img.naturalHeight)
  const sw = w / ratio
  const sh = h / ratio
  const sx = (img.naturalWidth - sw) / 2
  const sy = (img.naturalHeight - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

/** Sin foto: un degradé rosa con un corazón. */
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, '#F9C9D9')
  g.addColorStop(1, '#F48FB1')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  const size = Math.min(w, h) * 0.3
  drawHeart(ctx, x + w / 2, y + h / 2, size, { fill: 'rgba(255,255,255,0.85)' })
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  o: { fill?: string; stroke?: string; lineWidth?: number; rotate?: number },
) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(((o.rotate ?? 0) * Math.PI) / 180)
  const k = size / 24
  ctx.scale(k, k)
  ctx.translate(-12, -12.5)
  const path = new Path2D(HEART_PATH)
  if (o.fill) {
    ctx.fillStyle = o.fill
    ctx.fill(path)
  }
  if (o.stroke) {
    ctx.strokeStyle = o.stroke
    ctx.lineWidth = (o.lineWidth ?? 1.6) / k
    ctx.lineJoin = 'round'
    ctx.stroke(path)
  }
  ctx.restore()
}

/** Corta un texto en renglones que entren en `max` de ancho. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ').filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Achica la letra hasta que el texto entre en `max` renglones. */
function fit(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  size: number,
  width: number,
  maxLines: number,
): { lines: string[]; size: number } {
  let s = size
  for (;;) {
    ctx.font = font(s)
    const lines = wrap(ctx, text, width)
    if (lines.length <= maxLines || s <= size * 0.6) return { lines, size: s }
    s -= 1
  }
}

/** "ribbly♥" en minúscula, centrado. */
function drawWordmark(ctx: CanvasRenderingContext2D, fonts: StoryFonts, y: number, color: string) {
  ctx.font = `700 25px ${fonts.fredoka}`
  ctx.fillStyle = color
  ctx.textAlign = 'left'
  const w = ctx.measureText('ribbly').width
  const x = STORY_W / 2 - (w + 10) / 2
  ctx.fillText('ribbly', x, y)
  drawHeart(ctx, x + w + 6, y - 17, 10, { fill: color, rotate: 12 })
}

/** Subrayado a mano: una curva suave debajo de un texto. */
function underline(
  ctx: CanvasRenderingContext2D,
  x1: number,
  x2: number,
  y: number,
  color: string,
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x1, y + 1.5)
  ctx.quadraticCurveTo((x1 + x2) / 2, y - 2.5, x2, y)
  ctx.stroke()
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('sin imagen'))), 'image/png')
    } catch (error) {
      reject(error)
    }
  })
}

// ── 03 · Love edition ───────────────────────────────────────────────────────

export interface EditionImage {
  photo?: string
  caption: string
  wish: string
  sender: string
}

export async function drawEditionImage(data: EditionImage, fonts: StoryFonts): Promise<Blob> {
  const [img] = await Promise.all([loadImage(data.photo), loadFonts(fonts)])
  const { canvas, ctx } = makeCanvas()

  ctx.fillStyle = '#FDFAF5'
  ctx.fillRect(0, 0, STORY_W, STORY_H)
  if (img) drawCover(ctx, img, 0, 0, STORY_W, EDITION_PHOTO_BOTTOM)
  else drawPlaceholder(ctx, 0, 0, STORY_W, EDITION_PHOTO_BOTTOM)
  drawWaves(ctx, EDITION_WAVES)

  drawWordmark(ctx, fonts, 52, '#F23A74')

  // "nosotros ♥" escrito sobre la foto, con su subrayado y un corazón.
  if (data.caption) {
    ctx.save()
    ctx.translate(300, 176)
    ctx.rotate((-7 * Math.PI) / 180)
    ctx.font = `700 25px ${fonts.caveat}`
    ctx.textAlign = 'right'
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 6
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(data.caption, 0, 0)
    const w = ctx.measureText(data.caption).width
    ctx.shadowBlur = 3
    underline(ctx, -w + 4, -4, 9, '#FFFFFF')
    ctx.restore()
    drawHeart(ctx, 322, 168, 20, { stroke: '#F64482', lineWidth: 2, rotate: 8 })
    ctx.save()
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 1.8
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(334, 150)
    ctx.lineTo(338, 142)
    ctx.moveTo(340, 156)
    ctx.lineTo(348, 152)
    ctx.stroke()
    ctx.restore()
  }

  // La frase: corazón, dos colores y la firma.
  drawHeart(ctx, 46, 474, 24, { fill: '#EA245F' })
  const [plain, accent] = splitAccent(data.wish, 2)
  const left = 34
  const width = 290
  let y = 522
  let last = y
  ctx.textAlign = 'left'
  if (plain) {
    const quoted = `“${plain}`
    const top = fit(ctx, quoted, (s) => `italic 500 ${s}px ${fonts.fredoka}`, 28, width, 2)
    ctx.fillStyle = '#5D4447'
    for (const line of top.lines) {
      ctx.fillText(line, left, y)
      last = y
      y += top.size * 1.18
    }
  }
  const bottom = fit(
    ctx,
    `${plain ? '' : '“'}${accent}”`,
    (s) => `italic 700 ${s}px ${fonts.fredoka}`,
    31,
    width,
    2,
  )
  ctx.fillStyle = '#F23A74'
  for (const line of bottom.lines) {
    ctx.fillText(line, left, y)
    last = y
    y += bottom.size * 1.12
  }
  if (data.sender) {
    ctx.font = `italic 500 17px ${fonts.fredoka}`
    ctx.fillStyle = '#61474A'
    ctx.fillText(`— ${data.sender}`, left + 2, last + 32)
  }

  for (const d of EDITION_DOODLES) {
    drawHeart(ctx, d.x, d.y, d.size, { stroke: '#F3A5BF', lineWidth: 1.4, rotate: d.rotate })
  }

  return toBlob(canvas)
}

// ── 05 · Fotos ──────────────────────────────────────────────────────────────

export interface MomentsImage {
  photos: (string | undefined)[]
  kicker: string
  title: string
  phrase: string
  days: string
}

export async function drawMomentsImage(data: MomentsImage, fonts: StoryFonts): Promise<Blob> {
  const photos = data.photos.slice(0, 4)
  const [images] = await Promise.all([Promise.all(photos.map(loadImage)), loadFonts(fonts)])
  const { canvas, ctx } = makeCanvas()

  const bg = ctx.createLinearGradient(0, 0, 0, STORY_H)
  bg.addColorStop(0, MOMENTS_BG[0])
  bg.addColorStop(0.55, MOMENTS_BG[1])
  bg.addColorStop(1, MOMENTS_BG[2])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, STORY_W, STORY_H)
  drawWaves(ctx, MOMENTS_WAVES)

  drawWordmark(ctx, fonts, 52, '#E43672')

  // Etiqueta con un filete a cada lado.
  ctx.font = `600 11px ${fonts.outfit}`
  ctx.fillStyle = '#231F26'
  ctx.textAlign = 'center'
  const kicker = data.kicker.toUpperCase()
  const spaced = 'letterSpacing' in ctx
  if (spaced) ctx.letterSpacing = '3px'
  ctx.fillText(kicker, STORY_W / 2, 80)
  const kw = ctx.measureText(kicker).width
  ctx.strokeStyle = 'rgba(35,31,38,0.45)'
  ctx.lineWidth = 0.8
  ctx.beginPath()
  ctx.moveTo(30, 76.5)
  ctx.lineTo(STORY_W / 2 - kw / 2 - 12, 76.5)
  ctx.moveTo(STORY_W / 2 + kw / 2 + 12, 76.5)
  ctx.lineTo(STORY_W - 30, 76.5)
  ctx.stroke()
  if (spaced) ctx.letterSpacing = '0px'

  // Título en dos colores, lo destacado subrayado.
  const [plain, accent] = splitAccent(data.title, 1)
  let size = 28
  const font = (s: number) => `700 ${s}px ${fonts.fredoka}`
  ctx.font = font(size)
  const gap = plain ? 7 : 0
  let pw = plain ? ctx.measureText(plain).width : 0
  let aw = ctx.measureText(accent).width
  while (pw + gap + aw > 316 && size > 18) {
    size -= 1
    ctx.font = font(size)
    pw = plain ? ctx.measureText(plain).width : 0
    aw = ctx.measureText(accent).width
  }
  const tx = STORY_W / 2 - (pw + gap + aw) / 2
  ctx.textAlign = 'left'
  ctx.fillStyle = '#231F26'
  if (plain) ctx.fillText(plain, tx, 112)
  ctx.fillStyle = '#F62E72'
  ctx.fillText(accent, tx + pw + gap, 112)
  underline(ctx, tx + pw + gap + 2, tx + pw + gap + aw - 2, 122, '#F62E72')

  // Garabatos.
  for (const h of MOMENTS_DOODLES.hearts) {
    drawHeart(ctx, h.x, h.y, h.size, { stroke: '#E8487E', lineWidth: 1.5, rotate: h.rotate })
  }
  ctx.strokeStyle = '#231F26'
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  for (const d of MOMENTS_DOODLES.dashes) {
    const s = d.flip ? -1 : 1
    ctx.beginPath()
    ctx.moveTo(d.x, d.y - 8)
    ctx.lineTo(d.x + 4 * s, d.y - 15)
    ctx.moveTo(d.x + 2 * s, d.y)
    ctx.lineTo(d.x + 11 * s, d.y - 3)
    ctx.moveTo(d.x, d.y + 8)
    ctx.lineTo(d.x + 8 * s, d.y + 12)
    ctx.stroke()
  }

  // Las polaroids, con su cinta y el corazón al pie.
  const spots = polaroidSpots(photos.length || 1)
  const { w, pad, foot } = POLAROID
  const photoSize = w - pad * 2
  const h = pad + photoSize + foot
  spots.forEach((spot, i) => {
    ctx.save()
    ctx.translate(spot.x, spot.y)
    ctx.rotate((spot.rotate * Math.PI) / 180)
    ctx.shadowColor = 'rgba(140,40,80,0.22)'
    ctx.shadowBlur = 14
    ctx.shadowOffsetY = 6
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(-w / 2, -h / 2, w, h)
    ctx.shadowColor = 'transparent'
    const img = images[i]
    if (img) drawCover(ctx, img, -w / 2 + pad, -h / 2 + pad, photoSize, photoSize)
    else drawPlaceholder(ctx, -w / 2 + pad, -h / 2 + pad, photoSize, photoSize)
    drawHeart(ctx, -w / 2 + pad + 18, h / 2 - foot / 2, 15, { stroke: '#231F26', lineWidth: 1.3 })
    ctx.fillStyle = 'rgba(251,142,172,0.85)'
    ctx.rotate((-4 * Math.PI) / 180)
    ctx.fillRect(-22, -h / 2 - 8, 44, 15)
    ctx.restore()
  })

  // La frase dentro de la píldora.
  const [phrasePlain, phraseAccent] = splitAccent(data.phrase, 2)
  roundRect(ctx, 40, 516, 280, 66, 33)
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.fill()
  ctx.strokeStyle = '#F2B8CC'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.font = `700 24px ${fonts.caveat}`
  ctx.fillStyle = '#231F26'
  if (phrasePlain) ctx.fillText(phrasePlain, STORY_W / 2 - 6, 544)
  ctx.font = `700 26px ${fonts.caveat}`
  ctx.fillStyle = '#F52970'
  const py = phrasePlain ? 570 : 556
  ctx.fillText(phraseAccent, STORY_W / 2 - 6, py)
  const paw = ctx.measureText(phraseAccent).width
  underline(ctx, STORY_W / 2 - 6 - paw / 2 + 8, STORY_W / 2 - 6 + paw / 2, py + 6, '#231F26')
  drawHeart(ctx, STORY_W / 2 - 6 + Math.max(paw, 120) / 2 + 22, 552, 22, {
    stroke: '#231F26',
    lineWidth: 1.5,
    rotate: 8,
  })

  // Días juntos, abajo a la izquierda.
  if (data.days) {
    ctx.save()
    ctx.strokeStyle = '#231F26'
    ctx.lineWidth = 1.4
    roundRect(ctx, 22, 604, 20, 18, 3)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(22, 610)
    ctx.lineTo(42, 610)
    ctx.moveTo(27, 601)
    ctx.lineTo(27, 606)
    ctx.moveTo(37, 601)
    ctx.lineTo(37, 606)
    ctx.stroke()
    ctx.fillStyle = '#231F26'
    for (const [dx, dy] of [
      [27, 614],
      [32, 614],
      [37, 614],
      [27, 618.5],
      [32, 618.5],
    ]) {
      ctx.fillRect(dx! - 1, dy! - 1, 2, 2)
    }
    ctx.globalAlpha = 0.4
    ctx.fillRect(50, 603, 1, 20)
    ctx.globalAlpha = 1
    ctx.font = `500 13px ${fonts.outfit}`
    ctx.textAlign = 'left'
    ctx.fillText(data.days, 58, 618)
    ctx.restore()
  }

  return toBlob(canvas)
}

// ── Compartir ───────────────────────────────────────────────────────────────

export type ShareResult = 'shared' | 'downloaded' | 'cancelled' | 'retry' | 'failed'

/**
 * Abre la hoja de compartir del teléfono con la imagen (de ahí, Instagram →
 * Historia). Donde no se pueden compartir archivos (la compu), la descarga.
 * `retry`: el navegador pidió un toque nuevo (la imagen tardó y se venció el
 * permiso del toque); con la imagen ya lista, el segundo toque comparte.
 */
export async function shareImage(blob: Blob, fileName: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: 'image/png' })
  if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (error) {
      const name = (error as { name?: string } | null)?.name
      if (name === 'AbortError') return 'cancelled'
      if (name === 'NotAllowedError') return 'retry'
      // Otro error: se descarga como si no se pudiera compartir.
    }
  }
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
