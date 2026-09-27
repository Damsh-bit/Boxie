import { TrafficPayloadSchema } from '@/domain/marketing/attribution'
import { arDayKey } from '@/domain/admin/range'
import { log } from '@/server/log'
import { marketingRepo } from '@/server/marketing/repo'
import { clientIp, rateLimit } from '@/server/rate-limit'

/**
 * Cuenta una visita del sitio (o un paso del embudo: llegó a una temática,
 * llegó al checkout) en la fila de su día y origen. La manda el navegador con
 * `navigator.sendBeacon` (src/ui/marketing/AttributionTracker.tsx).
 *
 * No guarda nada que identifique a la persona (ni IP, ni cookie): solo suma
 * uno. Siempre responde 204: la medición nunca le devuelve un error a la
 * tienda.
 */

export const dynamic = 'force-dynamic'

const DAY = 86_400_000

export async function POST(request: Request) {
  const done = new Response(null, { status: 204 })

  // Solo desde el propio sitio (sendBeacon manda el Origin en los POST).
  const origin = request.headers.get('origin')
  if (origin && new URL(origin).host !== new URL(request.url).host) return done
  if (!rateLimit(`track:${clientIp(request.headers)}`, { limit: 90, windowMs: 10 * 60_000 }))
    return done

  let body: unknown
  try {
    body = JSON.parse(await request.text())
  } catch {
    return done
  }
  const parsed = TrafficPayloadSchema.safeParse(body)
  if (!parsed.success) return done

  // El día de la visita: hoy o ayer (una sesión que empezó antes de la medianoche).
  const now = Date.now()
  if (parsed.data.day !== arDayKey(now) && parsed.data.day !== arDayKey(now - DAY)) return done

  try {
    await (await marketingRepo()).track(parsed.data)
  } catch (error) {
    log.warn('No se pudo contar la visita', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
  return done
}
