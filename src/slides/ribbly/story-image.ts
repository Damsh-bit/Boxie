import {
  HEART_PATH,
  type Font,
  type FontFamily,
  type Measure,
  type Paint,
  type Scene,
  type SceneNode,
  STORY_H,
  STORY_W,
} from './love-art'

/**
 * La imagen para compartir en una historia de Instagram (1080 × 1920) de las
 * pantallas 03 y 05 de Pareja: dibuja en un canvas la misma escena que se ve
 * en pantalla (love-art.ts), sin los botones ni la barra del player.
 *
 * Solo navegador (canvas, fuentes del documento).
 */

const SCALE = 3

// ── Fuentes ─────────────────────────────────────────────────────────────────

const VARS: Record<FontFamily, [string, string]> = {
  fredoka: ['--font-fredoka', 'sans-serif'],
  caveat: ['--font-caveat', 'cursive'],
  outfit: ['--font-outfit', 'sans-serif'],
  nunito: ['--font-nunito', 'sans-serif'],
}

/** Las familias reales de next/font (sus nombres cambian en cada build). */
export type Families = Record<FontFamily, string>

export function readFamilies(): Families {
  const style = getComputedStyle(document.documentElement)
  const out = {} as Families
  for (const [key, [name, fallback]] of Object.entries(VARS) as [FontFamily, [string, string]][]) {
    out[key] = style.getPropertyValue(name).trim() || fallback
  }
  return out
}

export const cssFont = (font: Font, families: Families) =>
  `${font.italic ? 'italic ' : ''}${font.weight} ${font.size}px ${families[font.family]}`

let measureCtx: CanvasRenderingContext2D | null = null

/** Mide con las fuentes de verdad (las mismas que usa la pantalla). */
export function createMeasure(families: Families): Measure {
  measureCtx ??= document.createElement('canvas').getContext('2d')
  const ctx = measureCtx!
  const cache = new Map<string, number>()
  return (text, font, spacing = 0) => {
    const key = `${cssFont(font, families)}|${spacing}|${text}`
    let width = cache.get(key)
    if (width === undefined) {
      ctx.font = cssFont(font, families)
      width = ctx.measureText(text).width + spacing * [...text].length
      cache.set(key, width)
    }
    return width
  }
}

/** Pide las fuentes de las escenas (si ya están, no hace nada). */
export async function loadFonts(families: Families): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const fonts: Font[] = [
    { family: 'fredoka', weight: 600, size: 20 },
    { family: 'fredoka', weight: 700, size: 20 },
    { family: 'caveat', weight: 700, size: 20 },
    { family: 'outfit', weight: 400, size: 20 },
    { family: 'outfit', weight: 500, size: 20 },
    { family: 'nunito', weight: 300, size: 20, italic: true },
    { family: 'nunito', weight: 400, size: 20, italic: true },
    { family: 'nunito', weight: 800, size: 20, italic: true },
  ]
  // Solo la familia principal: la de respaldo de next/font es local() y, si
  // falla, haría fallar la carga entera.
  const primary = Object.fromEntries(
    Object.entries(families).map(([key, list]) => [key, list.split(',')[0]!.trim()]),
  ) as Families
  await Promise.all(fonts.map((f) => document.fonts.load(cssFont(f, primary)).catch(() => [])))
  await document.fonts.ready
}

// ── Dibujo ──────────────────────────────────────────────────────────────────

/** Carga una imagen para dibujarla; si no se puede (CORS, red), null. */
function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous'
    img.decoding = 'async'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function collectPhotos(nodes: SceneNode[], out: Set<string>) {
  for (const node of nodes) {
    if (node.type === 'photo' && node.src) out.add(node.src)
    if (node.type === 'group') collectPhotos(node.children, out)
  }
}

function paint(ctx: CanvasRenderingContext2D, p: Paint): string | CanvasGradient {
  if (typeof p === 'string') return p
  const g =
    'linear' in p
      ? ctx.createLinearGradient(...p.linear)
      : ctx.createRadialGradient(p.radial[0], p.radial[1], 0, ...p.radial)
  for (const [offset, color] of p.stops) g.addColorStop(offset, color)
  return g
}

/** Cubre el rectángulo con la imagen (como object-fit: cover). */
export function drawCover(
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
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, w, h)
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
  drawHeart(ctx, x + w / 2, y + h / 2, Math.min(w, h) * 0.3, 0, 'rgba(255,255,255,0.85)')
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  rotate: number,
  fill?: Paint,
  stroke?: string,
  width = 1.6,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate((rotate * Math.PI) / 180)
  const k = size / 24
  ctx.scale(k, k)
  ctx.translate(-12, -12.5)
  const heart = new Path2D(HEART_PATH)
  if (fill) {
    // Un degradé del corazón va en su cuadro de 24 × 24.
    ctx.fillStyle = paint(ctx, fill)
    ctx.fill(heart)
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = width / k
    ctx.lineJoin = 'round'
    ctx.stroke(heart)
  }
  ctx.restore()
}

function drawNodes(
  ctx: CanvasRenderingContext2D,
  nodes: SceneNode[],
  families: Families,
  images: Map<string, HTMLImageElement | null>,
) {
  for (const node of nodes) {
    ctx.save()
    switch (node.type) {
      case 'path': {
        const p = new Path2D(node.d)
        ctx.globalAlpha *= node.opacity ?? 1
        if (node.fill) {
          ctx.fillStyle = paint(ctx, node.fill)
          ctx.fill(p)
        }
        if (node.stroke) {
          ctx.strokeStyle = node.stroke
          ctx.lineWidth = node.width ?? 1
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          ctx.stroke(p)
        }
        break
      }
      case 'text': {
        ctx.font = cssFont(node.font, families)
        ctx.fillStyle = node.color
        ctx.textAlign = 'left'
        ctx.textBaseline = 'alphabetic'
        if (node.shadow) {
          ctx.shadowColor = 'rgba(0,0,0,0.35)'
          ctx.shadowBlur = 6 * SCALE
        }
        if (node.spacing) {
          // Letra por letra: así sale igual en todos los navegadores.
          let x = node.x
          for (const ch of node.text) {
            ctx.fillText(ch, x, node.y)
            x += ctx.measureText(ch).width + node.spacing
          }
        } else {
          ctx.fillText(node.text, node.x, node.y)
        }
        break
      }
      case 'heart':
        drawHeart(
          ctx,
          node.x,
          node.y,
          node.size,
          node.rotate ?? 0,
          node.fill,
          node.stroke,
          node.width,
        )
        break
      case 'rect': {
        ctx.globalAlpha *= node.opacity ?? 1
        if (node.shadow) {
          ctx.shadowColor = 'rgba(150,60,90,0.24)'
          ctx.shadowBlur = 12 * SCALE
          ctx.shadowOffsetY = 5 * SCALE
        }
        ctx.fillStyle = paint(ctx, node.fill)
        ctx.beginPath()
        ctx.roundRect(node.x, node.y, node.w, node.h, node.radius ?? 0)
        ctx.fill()
        break
      }
      case 'photo': {
        const img = node.src ? images.get(node.src) : null
        if (img) drawCover(ctx, img, node.x, node.y, node.w, node.h)
        else drawPlaceholder(ctx, node.x, node.y, node.w, node.h)
        break
      }
      case 'group':
        ctx.translate(node.x ?? 0, node.y ?? 0)
        ctx.rotate(((node.rotate ?? 0) * Math.PI) / 180)
        drawNodes(ctx, node.children, families, images)
        break
    }
    ctx.restore()
  }
}

/**
 * Dibuja la escena en 1080 × 1920. `photo` es la foto de fondo (la de la Love
 * edition), que va antes que todo lo demás.
 */
export async function drawScene(
  scene: Scene,
  families: Families,
  photo?: { src?: string; x: number; y: number; w: number; h: number },
): Promise<Blob> {
  const sources = new Set<string>()
  collectPhotos(scene.fg, sources)
  if (photo?.src) sources.add(photo.src)
  const [loaded] = await Promise.all([
    Promise.all([...sources].map(async (src) => [src, await loadImage(src)] as const)),
    loadFonts(families),
  ])
  const images = new Map(loaded)

  const canvas = document.createElement('canvas')
  canvas.width = STORY_W * SCALE
  canvas.height = STORY_H * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.scale(SCALE, SCALE)
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, STORY_W, STORY_H)
  if (photo) {
    const img = photo.src ? images.get(photo.src) : null
    if (img) drawCover(ctx, img, photo.x, photo.y, photo.w, photo.h)
    else drawPlaceholder(ctx, photo.x, photo.y, photo.w, photo.h)
  }
  drawNodes(ctx, scene.bg, families, images)
  drawNodes(ctx, scene.fg, families, images)

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('sin imagen'))), 'image/png')
    } catch (error) {
      reject(error)
    }
  })
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
