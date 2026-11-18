/**
 * Limpia un evento antes de mandarlo a Sentry (un tercero): sin mails, sin
 * los tokens de los links (/g/<token>, /editor/<token>, /soporte/<token>, que
 * son credenciales), sin cookies ni headers de autorización.
 */

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g
const TOKEN_PATH = /\/(g|editor|soporte)\/[A-Za-z0-9_-]{16,}/g
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi
const SENSITIVE_KEYS =
  /^(cookie|cookies|authorization|x-signature|password|token|access_token|refresh_token|set-cookie)$/i

export function scrubString(value: string): string {
  return value
    .replace(EMAIL, '[mail]')
    .replace(TOKEN_PATH, '/$1/[token]')
    .replace(BEARER, 'Bearer [oculto]')
}

export function scrub<T>(value: T, depth = 0): T {
  if (depth > 8) return value
  if (typeof value === 'string') return scrubString(value) as T
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEYS.test(key) ? '[oculto]' : scrub(v, depth + 1)
    }
    return out as T
  }
  return value
}
