import 'server-only'
import { serviceDb, unwrap } from './db/client'
import { log } from './log'

/**
 * Fotos del comprador en Supabase Storage (bucket privado boxie-media). Se
 * leen solo con URLs firmadas que arma el servidor; la ruta de cada foto es
 * boxies/<id de la Boxie>/<id de la foto>.<ext> (la base lo exige).
 */

export const BOXIE_MEDIA_BUCKET = 'boxie-media'

/** Lo que el editor acepta subir (ya comprimido en el navegador). */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024

export type ImageMime = 'image/jpeg' | 'image/png' | 'image/webp'

export const IMAGE_EXTENSION: Record<ImageMime, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

/**
 * El formato real, por los primeros bytes: el Content-Type lo decide el
 * navegador (o quien arme el pedido) y no prueba nada.
 */
export function sniffImage(bytes: Uint8Array): ImageMime | null {
  const at = (i: number) => bytes[i]
  if (at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg'
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => at(i) === b))
    return 'image/png'
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to))
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp'
  return null
}

export function boxiePhotoPath(boxieId: string, assetId: string, mime: ImageMime): string {
  return `boxies/${boxieId}/${assetId}.${IMAGE_EXTENSION[mime]}`
}

/** URLs firmadas (assetId → URL) de las fotos de una Boxie. */
export async function signedMediaUrls(
  boxieId: string,
  expiresInSeconds: number,
  onlyIds?: string[],
): Promise<Record<string, string>> {
  let query = serviceDb()
    .from('media_assets')
    .select('id, path')
    .eq('owner_type', 'boxie')
    .eq('owner_id', boxieId)
  if (onlyIds) {
    if (onlyIds.length === 0) return {}
    query = query.in('id', onlyIds)
  }
  const rows = unwrap(await query, 'fotos de la Boxie')
  if (rows.length === 0) return {}

  const { data, error } = await serviceDb()
    .storage.from(BOXIE_MEDIA_BUCKET)
    .createSignedUrls(
      rows.map((r) => r.path),
      expiresInSeconds,
    )
  if (error) throw new Error(`No se pudieron firmar las fotos: ${error.message}`)

  const byPath = new Map(data.map((d) => [d.path, d.signedUrl]))
  const urls: Record<string, string> = {}
  for (const row of rows) {
    const url = byPath.get(row.path)
    if (url) urls[row.id] = url
  }
  return urls
}

/**
 * Borra las fotos que ya no usa el contenido (las que se reemplazaron). Se
 * llama al bloquear: después de eso el contenido no cambia más.
 */
export async function pruneUnusedMedia(boxieId: string, keep: string[]): Promise<number> {
  const rows = unwrap(
    await serviceDb()
      .from('media_assets')
      .select('id, path')
      .eq('owner_type', 'boxie')
      .eq('owner_id', boxieId),
    'fotos de la Boxie',
  )
  const unused = rows.filter((r) => !keep.includes(r.id))
  if (unused.length === 0) return 0

  const { error } = await serviceDb()
    .storage.from(BOXIE_MEDIA_BUCKET)
    .remove(unused.map((r) => r.path))
  if (error) {
    log.warn('No se pudieron borrar fotos sin usar', { boxieId, error: error.message })
    return 0
  }
  unwrap(
    await serviceDb()
      .from('media_assets')
      .delete()
      .in(
        'id',
        unused.map((r) => r.id),
      )
      .select('id'),
    'borrar fotos sin usar',
  )
  return unused.length
}
