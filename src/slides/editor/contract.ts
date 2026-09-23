import type { BuyerPhoto, MissingField } from '../fields'

/**
 * Lo que intercambian el editor y quien guarda: el servidor (editor real) o
 * el navegador (modo prueba). Sin React: el servidor lo usa para tipar sus
 * respuestas.
 */

export type SaveResult = { ok: true; savedAt: string } | { ok: false; error: string }

export type UploadResult =
  { ok: true; photo: BuyerPhoto; url: string } | { ok: false; error: string }

export type PasswordResult = { ok: true; hasPassword: boolean } | { ok: false; error: string }

export type LockResult =
  | {
      ok: true
      /** Link del regalo (null en el modo prueba). */
      giftUrl: string | null
      /** Hasta cuándo se puede abrir el regalo. */
      expiresAt: string
      /** A qué mail se mandó el link, si se mandó. */
      emailedTo: string | null
    }
  | { ok: false; error: string; missing?: MissingField[] }

/** Clave opcional del regalo. */
export const GIFT_PASSWORD_MIN = 4
export const GIFT_PASSWORD_MAX = 30
