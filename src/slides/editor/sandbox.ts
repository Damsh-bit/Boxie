import { collectAssetIds } from '../config'
import type { EditorBackend, LockResult } from './backend'
import type { EditorDraft } from './draft'

/**
 * Editor de prueba: el mismo editor, guardando en el navegador. Sirve para
 * probar cómo se personaliza una Boxie antes de comprarla y para mostrar el
 * producto en la demo sin base de datos. Nada sale de la computadora.
 *
 * Las fotos (ya comprimidas) se guardan como data URL en localStorage. Si no
 * entran (el navegador da ~5 MB), quedan en memoria mientras dure la pestaña.
 */

const VERSION = 'v1'
const prefix = (slug: string) => `boxie:prueba:${VERSION}:${slug}`
const photoKey = (slug: string, id: string) => `${prefix(slug)}:foto:${id}`

export interface SandboxState {
  draft: EditorDraft | null
  media: Record<string, string>
  hasPassword: boolean
  locked: { expiresAt: string } | null
}

interface Stored {
  draft: EditorDraft
  hasPassword: boolean
  lockedAt: string | null
  expiresAt: string | null
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function remove(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // modo privado: no hay nada que borrar
  }
}

function keysWith(start: string): string[] {
  try {
    const keys: string[] = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i)
      if (key?.startsWith(start)) keys.push(key)
    }
    return keys
  } catch {
    return []
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la foto'))
    reader.readAsDataURL(blob)
  })
}

export function loadSandbox(slug: string): SandboxState {
  const stored = read<Stored>(prefix(slug))
  const media: Record<string, string> = {}
  if (stored?.draft) {
    for (const id of collectAssetIds(stored.draft)) {
      try {
        const url = window.localStorage.getItem(photoKey(slug, id))
        if (url) media[id] = url
      } catch {
        // sin acceso a localStorage: la foto se vuelve a subir
      }
    }
  }
  return {
    draft: stored?.draft ?? null,
    media,
    hasPassword: stored?.hasPassword ?? false,
    locked: stored?.lockedAt && stored.expiresAt ? { expiresAt: stored.expiresAt } : null,
  }
}

export function resetSandbox(slug: string) {
  for (const key of keysWith(prefix(slug))) remove(key)
}

export function sandboxBackend(
  slug: string,
  { lifetimeDays }: { lifetimeDays: number },
): EditorBackend & { unlock(): void } {
  let current: Stored = read<Stored>(prefix(slug)) ?? {
    draft: { recipientName: '', senderName: '', slides: {} },
    hasPassword: false,
    lockedAt: null,
    expiresAt: null,
  }
  const persist = () => write(prefix(slug), JSON.stringify(current))

  /** Borra las fotos que ya no usa ninguna slide (las reemplazadas). */
  const collectGarbage = () => {
    const used = new Set(collectAssetIds(current.draft))
    const start = `${prefix(slug)}:foto:`
    for (const key of keysWith(start)) {
      if (!used.has(key.slice(start.length))) remove(key)
    }
  }

  return {
    async save(draft) {
      current = { ...current, draft }
      if (!persist()) {
        return { ok: false, error: 'Tu navegador no tiene lugar para guardar la prueba.' }
      }
      collectGarbage()
      return { ok: true, savedAt: new Date().toISOString() }
    },

    async uploadPhoto(image, onProgress) {
      const id = crypto.randomUUID()
      const url = await blobToDataUrl(image.blob)
      // Si no entra en localStorage, la foto vive en memoria mientras dure la pestaña.
      write(photoKey(slug, id), url)
      onProgress(1)
      return { ok: true, photo: { assetId: id }, url }
    },

    async setPassword(password) {
      current = { ...current, hasPassword: password !== null }
      persist()
      return { ok: true, hasPassword: current.hasPassword }
    },

    async lock(): Promise<LockResult> {
      const expiresAt = new Date(Date.now() + lifetimeDays * 86_400_000).toISOString()
      current = { ...current, lockedAt: new Date().toISOString(), expiresAt }
      persist()
      return { ok: true, giftUrl: null, expiresAt, emailedTo: null }
    },

    unlock() {
      current = { ...current, lockedAt: null, expiresAt: null }
      persist()
    },
  }
}
