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
 * Verifica si una contraseña coincide con el hash scrypt guardado en public.users.
 * Solo admite hashes válidos en formato `${salt}:${hashHex}` (no admite texto plano).
 */
export function verifyPassword(
  password: string,
  stored: string,
): { ok: boolean; needsRehash: boolean } {
  if (!stored || typeof stored !== 'string') return { ok: false, needsRehash: false }

  const parts = stored.split(':')
  // Exige estrictamente formato salt:hash
  if (parts.length !== 2) {
    return { ok: false, needsRehash: false }
  }

  const [salt, key] = parts
  if (!salt || !key || salt.length !== 32 || key.length !== KEY_LEN * 2) {
    return { ok: false, needsRehash: false }
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
