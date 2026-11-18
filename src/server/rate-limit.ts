import 'server-only'

/**
 * Límite de pedidos por clave (IP, email) en una ventana de tiempo.
 *
 * Vive en memoria de cada instancia: frena abusos obvios (un bot mandando el
 * formulario en loop) pero no es un límite global. Para eso está el firewall
 * de Vercel (docs/OPERACION.md).
 */

/**
 * Un mapa por espacio de nombres (lo que va antes del primer ":" de la clave:
 * `admin-login-fail`, `recover`, `preference`…). Antes había uno solo y, al
 * pasar las 10.000 claves, se borraba entero: alcanzaba con pedir "recuperar
 * acceso" con miles de mails distintos para resetear también los límites del
 * login del panel. Ahora llenar un espacio solo afecta a ese espacio.
 */
const spaces = new Map<string, Map<string, number[]>>()

const MAX_KEYS_PER_SPACE = 10_000
/** La ventana más larga que se usa (1 hora): pasado eso, ninguna clave importa. */
const MAX_WINDOW_MS = 60 * 60 * 1000

function space(key: string): Map<string, number[]> {
  const name = key.split(':', 1)[0] ?? ''
  let buckets = spaces.get(name)
  if (!buckets) {
    buckets = new Map()
    spaces.set(name, buckets)
  }
  return buckets
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now = Date.now(),
): boolean {
  const buckets = space(key)
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= limit) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  // Se reinserta para que el orden del Map sea "usada más recientemente al final".
  buckets.delete(key)
  buckets.set(key, recent)
  if (buckets.size > MAX_KEYS_PER_SPACE) prune(buckets, now)
  return true
}

/** Primero las claves vencidas; si no alcanza, las usadas hace más tiempo. */
function prune(buckets: Map<string, number[]>, now: number) {
  for (const [key, times] of buckets) {
    if (!times.some((t) => now - t < MAX_WINDOW_MS)) buckets.delete(key)
  }
  const excess = buckets.size - Math.floor(MAX_KEYS_PER_SPACE * 0.9)
  if (excess <= 0) return
  let removed = 0
  for (const key of buckets.keys()) {
    if (removed >= excess) break
    buckets.delete(key)
    removed++
  }
}

/**
 * ¿La clave ya alcanzó el límite? No registra un intento: sirve para contar
 * solo los fallidos (el login del panel limita las claves erradas, no los
 * ingresos correctos).
 */
export function isRateLimited(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
  now = Date.now(),
): boolean {
  return (space(key).get(key) ?? []).filter((t) => now - t < windowMs).length >= limit
}

export function clientIp(headers: Headers): string {
  return (
    headers.get('x-real-ip') ?? headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  )
}
