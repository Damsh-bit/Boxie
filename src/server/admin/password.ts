import 'server-only'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const KEY_LEN = 64

/**
 * Hashea una contraseña usando scrypt con salt aleatorio.
 * Formato resultante: `${salt}:${hashHex}`
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex')
  return `${salt}:${hash}`
}

/**
 * Verifica si una contraseña coincide con el valor guardado en public.users.
 * Soporta tanto hashes seguros (`salt:hash`) como texto plano por si se carga
 * a mano en el Table Editor de Supabase (marcando needsRehash: true para actualizarlo).
 */
export function verifyPassword(
  password: string,
  stored: string,
): { ok: boolean; needsRehash: boolean } {
  if (!stored) return { ok: false, needsRehash: false }

  const parts = stored.split(':')
  // Si no tiene el formato salt:hash (ej. clave escrita a mano directamente en Supabase)
  if (parts.length !== 2) {
    const match = password === stored
    return { ok: match, needsRehash: match }
  }

  const [salt, key] = parts
  if (!salt || !key) {
    const match = password === stored
    return { ok: match, needsRehash: match }
  }

  try {
    const hash = scryptSync(password, salt, KEY_LEN)
    const keyBuf = Buffer.from(key, 'hex')
    if (hash.length !== keyBuf.length) return { ok: false, needsRehash: false }
    const ok = timingSafeEqual(hash, keyBuf)
    return { ok, needsRehash: false }
  } catch {
    return { ok: false, needsRehash: false }
  }
}
