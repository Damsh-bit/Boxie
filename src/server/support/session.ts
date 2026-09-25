import 'server-only'
import { isWellFormedToken } from '../security/tokens'

/**
 * Las consultas de soporte de un navegador: sus tokens de acceso en una
 * cookie httpOnly (el JavaScript de la página no los puede leer ni robar).
 * El token ES la credencial (192 bits, se guarda solo el hash): no hace falta
 * firmar la cookie. Viaja solo a /api/soporte.
 */

export const SUPPORT_COOKIE = 'bx_soporte'
/** Las más recientes; las más viejas siguen abiertas desde el link del mail. */
const MAX_TOKENS = 12
const MAX_AGE_SECONDS = 180 * 24 * 60 * 60

export function readSupportTokens(value: string | undefined | null): string[] {
  if (!value) return []
  return [...new Set(value.split('.').filter(isWellFormedToken))].slice(0, MAX_TOKENS)
}

/** La cookie con este token primero (sin repetir, con tope). */
export function withSupportToken(current: string[], token: string): string {
  return [token, ...current.filter((t) => t !== token)].slice(0, MAX_TOKENS).join('.')
}

export function supportCookieOptions() {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  return {
    httpOnly: true,
    secure: site.startsWith('https://') || process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/soporte',
    maxAge: MAX_AGE_SECONDS,
  }
}

/**
 * Las rutas que escriben solo aceptan pedidos de este mismo sitio: si el
 * navegador manda `Origin`, tiene que ser el nuestro. (La cookie ya es
 * SameSite=Lax; esto es una segunda barrera.)
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
