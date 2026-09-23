import 'server-only'
import { env, siteUrl } from './env'
import { expiresIn, sign, verify, type SignedPayload } from './security/signed'

/**
 * Sesión del editor (docs/ARQUITECTURA.md §3.3): el link del mail
 * (/editor/<token>) se canjea por una cookie firmada httpOnly y la URL queda
 * limpia (/editor). El navegador guarda la cookie pero no la puede fabricar;
 * el servidor la valida en cada pedido, nunca le cree al cliente qué Boxie
 * está editando (en el prototipo alcanzaba con escribir otro ID en
 * localStorage).
 */

export const EDITOR_COOKIE = 'bx_editor'
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60

export interface EditorSession extends SignedPayload {
  purpose: 'editor'
  boxieId: string
  /** Huella del token de edición vigente: si se rota (reenvío del link), las sesiones viejas caducan. */
  fp: string
}

export function editorFingerprint(editTokenHash: string): string {
  return editTokenHash.slice(0, 16)
}

export function issueEditorSession(boxieId: string, editTokenHash: string): string {
  return sign<EditorSession>(
    {
      purpose: 'editor',
      boxieId,
      fp: editorFingerprint(editTokenHash),
      exp: expiresIn(MAX_AGE_SECONDS),
    },
    env().SESSION_SECRET,
  )
}

export function readEditorSession(value: string | undefined | null): EditorSession | null {
  const session = verify<EditorSession>(value, 'editor', env().SESSION_SECRET)
  return session && typeof session.boxieId === 'string' && typeof session.fp === 'string'
    ? session
    : null
}

export function editorCookieOptions() {
  return {
    httpOnly: true,
    secure: siteUrl().startsWith('https://'),
    sameSite: 'lax' as const,
    // Solo viaja a /editor (la página, sus acciones y la subida de fotos).
    path: '/editor',
    maxAge: MAX_AGE_SECONDS,
  }
}
