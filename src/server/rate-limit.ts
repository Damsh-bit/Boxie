import 'server-only'

/**
 * Límite de pedidos por clave (IP, email) en una ventana de tiempo.
 *
 * Vive en memoria de cada instancia: frena abusos obvios (un bot mandando el
 * formulario en loop) pero no es un límite global. Para eso está el firewall
 * de Vercel (docs/OPERACION.md).
 */

const buckets = new Map<string, number[]>()

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now = Date.now(),
): boolean {
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  if (buckets.size > 10_000) buckets.clear()
  return true
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}
