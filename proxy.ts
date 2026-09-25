import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, readAdminSession } from '@/server/admin/token'

/**
 * Proxy (el middleware de Next 16) del panel de administración.
 *
 * 1. Con ADMIN_HOST definido, el panel solo responde en ese host
 *    (admin.boxiedigital.com.ar) y la raíz de ese host lleva a /admin.
 * 2. Sin una sesión válida, cualquier página del panel lleva al login.
 *    Las páginas y las acciones vuelven a verificar la sesión: esto es la
 *    primera barrera, no la única.
 */

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const adminHost = process.env.ADMIN_HOST?.trim().toLowerCase()
  const host = (request.headers.get('host') ?? '').toLowerCase()

  if (pathname === '/') {
    return adminHost && host === adminHost
      ? NextResponse.redirect(new URL('/admin', request.url))
      : NextResponse.next()
  }

  if (adminHost && host !== adminHost) return new NextResponse(null, { status: 404 })

  const headers = new Headers({ 'x-robots-tag': 'noindex, nofollow' })
  if (pathname === '/admin/login') return NextResponse.next({ headers })

  const session = readAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)
  if (!session) {
    const login = new URL('/admin/login', request.url)
    if (pathname !== '/admin') login.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(login)
  }
  return NextResponse.next({ headers })
}

export const config = {
  matcher: ['/', '/admin', '/admin/:path*'],
}
