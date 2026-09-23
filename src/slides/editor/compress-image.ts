/**
 * Compresión de fotos en el navegador, antes de subirlas.
 *
 * El prototipo guardaba la foto original en Base64 dentro del documento de
 * Firestore (límite de 1 MiB): cualquier foto de celular lo rompía. Acá se
 * achica a 1600 px del lado largo y se reencodea en WebP (JPEG si el navegador
 * no sabe encodear WebP, como Safari): una foto de 4 MB queda en ~300 KB.
 */

export interface CompressedImage {
  blob: Blob
  width: number
  height: number
  type: 'image/webp' | 'image/jpeg'
}

export const MAX_SIDE = 1600
/** Si después de comprimir sigue pesando más que esto, se achica otra vez. */
export const TARGET_BYTES = 1_500_000

export class ImageError extends Error {
  override name = 'ImageError'
}

/** Medidas para que el lado largo no pase de `max`, sin agrandar nunca. */
export function fitWithin(width: number, height: number, max: number) {
  const scale = Math.min(1, max / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

type Source = { image: CanvasImageSource; width: number; height: number; close(): void }

async function decode(file: Blob): Promise<Source> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Respeta la orientación EXIF (las fotos verticales del celular).
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        image: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      }
    } catch {
      // Algunos navegadores no aceptan opciones o el formato: se prueba con <img>.
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return { image: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } catch {
    throw new ImageError('No pudimos leer esa imagen. Probá con una foto JPG o PNG.')
  } finally {
    // Decodificada (o descartada), el blob URL ya no hace falta.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

async function encode(source: Source, maxSide: number, quality: number): Promise<CompressedImage> {
  const { width, height } = fitWithin(source.width, source.height, maxSide)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new ImageError('Tu navegador no pudo procesar la foto.')
  // Fondo blanco: un PNG con transparencia no queda negro al pasar a JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source.image, 0, 0, width, height)

  const webp = await toBlob(canvas, 'image/webp', quality)
  if (webp && webp.type === 'image/webp') return { blob: webp, width, height, type: 'image/webp' }
  const jpeg = await toBlob(canvas, 'image/jpeg', quality)
  if (!jpeg) throw new ImageError('Tu navegador no pudo procesar la foto.')
  return { blob: jpeg, width, height, type: 'image/jpeg' }
}

export async function compressImage(file: Blob): Promise<CompressedImage> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new ImageError('Ese archivo no es una imagen.')
  }
  const source = await decode(file)
  try {
    let result = await encode(source, MAX_SIDE, 0.82)
    if (result.blob.size > TARGET_BYTES) result = await encode(source, 1200, 0.72)
    return result
  } finally {
    source.close()
  }
}
