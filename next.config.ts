import type { NextConfig } from 'next'

const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined
  } catch {
    return undefined
  }
})()

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
]

// En /g/<token> y /editor/<token> el token es la credencial: que no viaje en
// el Referer a YouTube, Unsplash ni a nadie.
const tokenRouteHeaders = [
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
  { key: 'Cache-Control', value: 'private, no-store' },
]

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      ...(supabaseHost ? [{ protocol: 'https' as const, hostname: supabaseHost }] : []),
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/g/:path*', headers: tokenRouteHeaders },
      { source: '/editor/:path*', headers: tokenRouteHeaders },
      { source: '/editor', headers: tokenRouteHeaders },
    ]
  },
  async redirects() {
    return [
      // Rutas del prototipo: los links viejos no pueden dar 404.
      { source: '/producto/:slug', destination: '/tematicas/:slug', permanent: true },
      { source: '/terminos', destination: '/legales/terminos', permanent: true },
      { source: '/privacidad', destination: '/legales/privacidad', permanent: true },
      { source: '/login-boxie', destination: '/editor', permanent: false },
      { source: '/gift', destination: '/', permanent: false },
    ]
  },
}

export default nextConfig
