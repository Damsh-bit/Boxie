import { after, NextResponse } from 'next/server'
import { z } from 'zod'
import { isDemoMode } from '@/server/demo'
import { log } from '@/server/log'
import { clientIp, rateLimit } from '@/server/rate-limit'
import { resendAccessByEmail } from '@/server/recovery'

/**
 * Recuperar el acceso (/mi-boxie): reenvía por mail los links de las Boxies
 * vigentes de ese comprador. La respuesta es siempre la misma, haya o no
 * compras con ese mail (no se puede usar para averiguar quién compró).
 */

const Body = z.object({
  email: z.email().max(254),
  // Trampa para bots: los humanos no ven este campo.
  website: z.string().max(0).optional(),
})

const HOUR = 60 * 60 * 1000

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      {
        error:
          'Esta es una versión de demostración: no hay compras reales para reenviar. Probá el editor de prueba desde cualquier temática.',
      },
      { status: 503 },
    )
  }
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Revisá el mail: parece que está incompleto.' },
      { status: 400 },
    )
  }
  const email = parsed.data.email.trim().toLowerCase()
  const ip = clientIp(request.headers)
  if (
    !rateLimit(`recover:ip:${ip}`, { limit: 6, windowMs: HOUR }) ||
    !rateLimit(`recover:mail:${email}`, { limit: 3, windowMs: HOUR })
  ) {
    return NextResponse.json(
      { error: 'Pediste varios links seguidos. Revisá tu mail (y spam) o probá en un rato.' },
      { status: 429 },
    )
  }

  // Se responde enseguida y el reenvío sigue después: tardar más cuando el
  // mail tiene compras delataría que existe.
  after(async () => {
    try {
      await resendAccessByEmail(email)
    } catch (error) {
      log.error('Recuperar acceso: falló el reenvío', error)
    }
  })
  return NextResponse.json({ ok: true })
}
