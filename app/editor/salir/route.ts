import { NextResponse, type NextRequest } from 'next/server'
import { EDITOR_COOKIE, editorCookieOptions } from '@/server/editor-session'

/**
 * Cierra la sesión del editor y sigue a `next` (solo rutas de este sitio).
 *
 * Existe porque la página /editor no puede borrar cookies mientras se
 * renderiza (Next solo lo permite en Server Actions y Route Handlers: si lo
 * intenta, tira error). Cuando la Ribbly ya terminó (bloqueada, vencida,
 * reembolsada o el link dejó de valer), la página redirige acá.
 */
export function GET(request: NextRequest) {
  const fallback = new URL('/editor', request.url)
  const raw = request.nextUrl.searchParams.get('next') ?? ''
  let target = fallback
  if (raw.startsWith('/') && !raw.startsWith('//') && !raw.includes('\\')) {
    const candidate = new URL(raw, request.url)
    if (candidate.origin === fallback.origin) target = candidate
  }
  const response = NextResponse.redirect(target, 303)
  // La cookie vive en /editor: se borra con el mismo path.
  response.cookies.set(EDITOR_COOKIE, '', { ...editorCookieOptions(), maxAge: 0 })
  return response
}
