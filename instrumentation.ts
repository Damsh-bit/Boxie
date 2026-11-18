import type { Instrumentation } from 'next'

/**
 * Sentry del lado del servidor. Antes había DSN pero nunca se inicializaba:
 * `log.error` llamaba a captureException y no salía nada (un fallo en el
 * webhook = una venta cobrada sin regalo, y nadie se enteraba).
 *
 * Solo servidor: sin SDK en el navegador (no suma peso ni orígenes a la CSP).
 * Todo evento pasa por `scrub` antes de salir: sin mails, tokens ni cookies.
 */

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn || process.env.NEXT_RUNTIME !== 'nodejs') return
  const Sentry = await import('@sentry/nextjs')
  const { scrub } = await import('./src/server/sentry-scrub')
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.cookies
        delete event.request.data
        if (event.request.headers) event.request.headers = scrub(event.request.headers)
        if (event.request.url) event.request.url = scrub(event.request.url)
        if (event.request.query_string) event.request.query_string = '[oculto]'
      }
      delete event.user
      if (event.extra) event.extra = scrub(event.extra)
      if (event.message) event.message = scrub(event.message)
      for (const ex of event.exception?.values ?? []) {
        if (ex.value) ex.value = scrub(ex.value)
      }
      if (event.breadcrumbs) event.breadcrumbs = scrub(event.breadcrumbs)
      return event
    },
  })
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.NEXT_RUNTIME !== 'nodejs') return
  const Sentry = await import('@sentry/nextjs')
  Sentry.captureRequestError(...args)
}
