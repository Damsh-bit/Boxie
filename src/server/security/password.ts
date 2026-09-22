import 'server-only'
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from 'node:crypto'

/**
 * Clave opcional del regalo ("que solo pueda abrirlo con una clave que yo le
 * paso"). Nunca en texto plano: scrypt con sal por clave.
 */

const PARAMS = { N: 16384, r: 8, p: 1 } as const
const KEY_LENGTH = 32

function scrypt(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(password, salt, KEY_LENGTH, options, (err, key) => (err ? reject(err) : resolve(key))),
  )
}

/** Normaliza para que "Cumple2026 " y "cumple2026" sean la misma clave. */
export function normalizeGiftPassword(password: string): string {
  return password.trim().toLowerCase()
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scrypt(normalizeGiftPassword(password), salt, PARAMS)
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, n, r, p, salt, hash] = stored.split('$')
  if (scheme !== 'scrypt' || !n || !r || !p || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await scrypt(normalizeGiftPassword(password), Buffer.from(salt, 'base64url'), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
  })
  return key.length === expected.length && timingSafeEqual(key, expected)
}
