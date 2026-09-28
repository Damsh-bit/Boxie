import { collectAssetIds, type BuyerContent, type ParsedThemeConfig } from '../config'
import type { CompressedImage } from './compress-image'
import type { UploadResult } from './contract'
import { initialDraft, type EditorDraft } from './draft'

/**
 * "Traer lo que armaste en la prueba": lo que alguien armó en el editor de
 * prueba (guardado en el navegador) pasa a la Boxie que compró. Así pagar es
 * el último paso de algo que ya quiere regalar, y no empieza de cero.
 *
 * Las fotos de la prueba viven como data URL en el navegador: se suben de a
 * una como cualquier foto del editor y se reemplazan sus identificadores. Las
 * que no se pueden subir (el plan tiene menos fotos, se cortó la conexión)
 * quedan vacías para cargarlas de nuevo.
 */

/** ¿La Boxie comprada está sin tocar? (sin pantallas guardadas ni fotos). */
export function isUntouched(content: BuyerContent): boolean {
  return Object.keys(content.slides ?? {}).length === 0 && collectAssetIds(content).length === 0
}

/** ¿La prueba tiene algo que valga la pena traer? */
export function hasSandboxWork(draft: EditorDraft | null): draft is EditorDraft {
  if (!draft) return false
  return (
    Boolean(draft.recipientName.trim() || draft.senderName.trim()) ||
    collectAssetIds(draft).length > 0
  )
}

/** Cambia cada foto por su nuevo identificador (null = no se pudo subir). */
export function remapPhotos(
  draft: EditorDraft,
  map: ReadonlyMap<string, string | null>,
): EditorDraft {
  const visit = (value: unknown): unknown => {
    if (!value || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(visit)
    const record = value as Record<string, unknown>
    if (typeof record.assetId === 'string' && Object.keys(record).length === 1) {
      const next = map.get(record.assetId)
      return next ? { assetId: next } : null
    }
    return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, visit(v)]))
  }
  return { ...draft, slides: visit(draft.slides) as EditorDraft['slides'] }
}

async function dataUrlToImage(url: string): Promise<CompressedImage> {
  const blob = await (await fetch(url)).blob()
  const bitmap = await createImageBitmap(blob)
  const image: CompressedImage = {
    blob,
    width: bitmap.width,
    height: bitmap.height,
    type: blob.type === 'image/webp' ? 'image/webp' : 'image/jpeg',
  }
  bitmap.close()
  return image
}

export interface ImportResult {
  draft: EditorDraft
  media: Record<string, string>
  uploaded: number
  failed: number
}

/**
 * Sube las fotos de la prueba y arma el borrador para la Boxie comprada (con
 * las pantallas de su plan: lo que no entra en el plan no se trae).
 */
export async function importSandboxDraft(opts: {
  config: ParsedThemeConfig
  draft: EditorDraft
  media: Record<string, string>
  upload(image: CompressedImage): Promise<UploadResult>
  onProgress?(done: number, total: number): void
}): Promise<ImportResult> {
  // Primero se recorta al plan: no se suben fotos de pantallas que no vienen.
  const fitted = initialDraft(opts.config, opts.draft)
  const ids = collectAssetIds(fitted)
  const map = new Map<string, string | null>()
  const media: Record<string, string> = {}
  let uploaded = 0
  let failed = 0
  for (const [i, id] of ids.entries()) {
    opts.onProgress?.(i, ids.length)
    const url = opts.media[id]
    if (!url) {
      map.set(id, null)
      failed++
      continue
    }
    try {
      const result = await opts.upload(await dataUrlToImage(url))
      if (result.ok) {
        map.set(id, result.photo.assetId)
        media[result.photo.assetId] = result.url
        uploaded++
      } else {
        map.set(id, null)
        failed++
      }
    } catch {
      map.set(id, null)
      failed++
    }
  }
  opts.onProgress?.(ids.length, ids.length)
  return { draft: remapPhotos(fitted, map), media, uploaded, failed }
}
