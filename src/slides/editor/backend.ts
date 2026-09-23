import type { CompressedImage } from './compress-image'
import type { LockResult, PasswordResult, SaveResult, UploadResult } from './contract'
import type { EditorDraft } from './draft'

export * from './contract'

/**
 * Dónde guarda el editor. El real habla con el servidor (acciones y subida de
 * fotos a Storage); el de prueba guarda todo en el navegador. La interfaz es
 * la misma: el editor no sabe cuál está usando.
 */
export interface EditorBackend {
  save(draft: EditorDraft): Promise<SaveResult>
  uploadPhoto(image: CompressedImage, onProgress: (fraction: number) => void): Promise<UploadResult>
  setPassword(password: string | null): Promise<PasswordResult>
  lock(): Promise<LockResult>
}

/** Sube un archivo con progreso (fetch todavía no informa el avance de la subida). */
export function uploadWithProgress<T>(
  url: string,
  body: FormData,
  onProgress: (fraction: number) => void,
): Promise<{ status: number; json: T | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.responseType = 'json'
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => resolve({ status: xhr.status, json: (xhr.response as T | null) ?? null })
    xhr.onerror = () => reject(new Error('network'))
    xhr.ontimeout = () => reject(new Error('timeout'))
    xhr.timeout = 60_000
    xhr.send(body)
  })
}
