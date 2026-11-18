import { NextResponse, type NextRequest } from 'next/server'
import { ADMIN_COOKIE, readAdminSession } from '@/server/admin/token'

/**
 * Proxy (el middleware de Next 16).
 *
 * 1. Content-Security-Policy con nonce en todas las páginas (auditoría
 *    17/11/2026). Los scripts solo corren si traen el nonce de este pedido
 *    ('strict-dynamic' deja pasar lo que esos scripts carguen, como el píxel
 *    de Meta). Un XSS que logre inyectar un <script> no corre, y aunque
 *    corriera no podría mandar datos a otro dominio (connect-src).
 * 2. Con ADMIN_HOST definido, el panel solo responde en ese host
 *    (admin.ribbly.com.ar) y la raíz de ese host lleva a /admin.
 * 3. Sin una sesión válida, cualquier página del panel lleva al login.
 *    Las páginas y las acciones vuelven a verificar la sesión: esto es la
 *    primera barrera, no la única.
 */

function supabaseOrigin(): string | null {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    return url ? new URL(url).origin : null
  } catch {
    return null
  }
}

export function buildCsp(nonce: string, opts: { dev: boolean; https: boolean }): string {
  const supabase = supabaseOrigin()
  const supabaseWs = supabase?.replace(/^http/, 'ws')
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    // `https:` solo lo usan navegadores viejos que no entienden 'strict-dynamic'.
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      'https:',
      ...(opts.dev ? ["'unsafe-eval'"] : []),
    ],
    // framer-motion y Next escriben estilos en línea (atributo style).
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://images.unsplash.com',
      'https://i.ytimg.com',
      'https://www.facebook.com',
      'https://*.googleusercontent.com',
      ...(supabase ? [supabase] : []),
    ],
    'media-src': ["'self'", 'blob:', ...(supabase ? [supabase] : [])],
    'font-src': ["'self'", 'data:'],
    'connect-src': [
      "'self'",
      ...(supabase ? [supabase] : []),
      ...(supabaseWs ? [supabaseWs] : []),
      'https://www.facebook.com',
      'https://connect.facebook.net',
      ...(opts.dev ? ['ws:', 'wss:'] : []),
    ],
    'frame-src': ['https://www.youtube-nocookie.com', 'https://www.youtube.com'],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  }
  const policy = Object.entries(directives).map(([k, v]) => `${k} ${v.join(' ')}`)
  if (opts.https) policy.push('upgrade-insecure-requests')
  return policy.join('; ')
}

function withCsp(request: NextRequest, extraHeaders?: Headers): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV === 'development',
    https: request.nextUrl.protocol === 'https:',
  })
  const requestHeaders = new Headers(request.headers)
  // Next lee el nonce de la CSP del pedido y se lo pone a sus propios scripts.
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  extraHeaders?.forEach((value, key) => response.headers.set(key, value))
  return response
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const adminHost = process.env.ADMIN_HOST?.trim().toLowerCase()
  const host = (request.headers.get('host') ?? '').toLowerCase()

  if (pathname === '/' && adminHost && host === adminHost) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
  if (!isAdmin) return withCsp(request)

  if (adminHost && host !== adminHost) return new NextResponse(null, { status: 404 })

  const headers = new Headers({ 'x-robots-tag': 'noindex, nofollow' })
  if (pathname === '/admin/login' || pathname === '/admin/activar') return withCsp(request, headers)

  const session = readAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)
  if (!session) {
    const login = new URL('/admin/login', request.url)
    if (pathname !== '/admin') login.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(login)
  }
  return withCsp(request, headers)
}

export const config = {
  matcher: [
    // El panel siempre (también los prefetch): la sesión se revisa en cada pedido.
    '/admin',
    '/admin/:path*',
    {
      // Todo menos las APIs, los estáticos y los archivos con extensión
      // (imágenes, manifest, robots): no son HTML y no necesitan CSP.
      source:
        '/((?!api/|_next/static|_next/image|_vercel|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|webmanifest|json|mp3|mp4|woff2?)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
