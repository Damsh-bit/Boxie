import 'server-only'

/**
 * Log estructurado (una línea JSON por evento: Vercel la indexa). Los errores
 * además se reportan a Sentry si está configurado: un fallo silencioso en el
 * webhook es una venta cobrada sin regalo entregado.
 */

type Level = 'debug' | 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

function serializeError(error: unknown) {
  if (error instanceof Error)
    return { name: error.name, message: error.message, stack: error.stack }
  if (typeof error === 'object' && error !== null) return error
  return { message: String(error) }
}

function write(level: Level, message: string, fields?: Fields) {
  if (level === 'debug' && process.env.NODE_ENV === 'production') return
  const line = JSON.stringify({ level, message, time: new Date().toISOString(), ...fields })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else process.stdout.write(`${line}\n`)
}

async function report(error: unknown, fields?: Fields) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(error, { extra: fields })
  } catch {
    // Sentry es opcional: nunca rompe el request.
  }
}

export const log = {
  debug: (message: string, fields?: Fields) => write('debug', message, fields),
  info: (message: string, fields?: Fields) => write('info', message, fields),
  warn: (message: string, fields?: Fields) => write('warn', message, fields),
  error(message: string, error?: unknown, fields?: Fields) {
    write('error', message, { ...fields, ...(error ? { error: serializeError(error) } : {}) })
    void report(error ?? new Error(message), { message, ...fields })
  },
}
