import { NextResponse, type NextRequest } from 'next/server'
import { isDemoMode } from '@/server/demo'
import { findBoxieByEditToken } from '@/server/editor'
import { EDITOR_COOKIE, editorCookieOptions, issueEditorSession } from '@/server/editor-session'
import { log } from '@/server/log'
import { clientIp, rateLimit } from '@/server/rate-limit'

/**
 * El link del mail. Canjea el token por una cookie firmada y redirige a
 * /editor: el token no queda en la barra de direcciones ni en el historial.
 */
export async function GET(request: NextRequest, { params }: RouteContext<'/editor/[token]'>) {
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url), 303)
  if (isDemoMode()) return go('/editor')

  if (
    !rateLimit(`editor-link:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60_000 })
  ) {
    return go('/editor?error=limite')
  }

  try {
    const found = await findBoxieByEditToken((await params).token)
    if (!found) return go('/editor?error=link')
    const response = go('/editor')
    response.cookies.set(
      EDITOR_COOKIE,
      issueEditorSession(found.boxieId, found.editTokenHash),
      editorCookieOptions(),
    )
    return response
  } catch (error) {
    log.error('No se pudo abrir el editor', error)
    return go('/editor?error=servidor')
  }
}
