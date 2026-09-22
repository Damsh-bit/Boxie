import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Valores firmados con HMAC-SHA256 para cookies httpOnly: el navegador los
 * guarda pero no los puede fabricar ni modificar. Llevan su propio
 * vencimiento, así una cookie robada no sirve para siempre.
 *
 *   base64url(json) + "." + base64url(hmac)
 */

export interface SignedPayload {
  /** Propósito: una cookie del editor no sirve como cookie del checkout. */
  purpose: string
  /** Vencimiento, epoch en segundos. */
  exp: number
  [key: string]: unknown
}

function mac(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data, 'utf8').digest()
}

export function sign<T extends SignedPayload>(payload: T, secret: string): string {
  const data = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  return `${data}.${mac(data, secret).toString('base64url')}`
}

export function verify<T extends SignedPayload>(
  value: string | undefined | null,
  purpose: T['purpose'],
  secret: string,
  now = Date.now(),
): T | null {
  if (!value) return null
  const [data, signature] = value.split('.')
  if (!data || !signature) return null

  const expected = mac(data, secret)
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as T
    if (payload.purpose !== purpose) return null
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= now) return null
    return payload
  } catch {
    return null
  }
}

export function expiresIn(seconds: number, now = Date.now()): number {
  return Math.floor(now / 1000) + seconds
}
