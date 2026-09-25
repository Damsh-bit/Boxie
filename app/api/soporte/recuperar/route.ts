import { after } from 'next/server'
import { z } from 'zod'
import { log } from '@/server/log'
import { rateLimit } from '@/server/rate-limit'
import { handle, json, limit } from '@/server/support/http'
import { recoverTickets } from '@/server/support/service'

/**
 * "Escribí desde otro dispositivo": manda el link personal de las consultas
 * abiertas de ese mail. Responde siempre igual y enseguida (el envío sigue
 * después): no se puede usar para averiguar quién escribió a soporte.
 */

export const dynamic = 'force-dynamic'

const Body = z.object({
  email: z.email('Revisá el mail.').max(254),
  website: z.string().max(0).optional(),
})

export async function POST(request: Request) {
  return handle(
    request,
    async () => {
      limit(request, 'recover', 6, 60 * 60 * 1000)
      const { email } = Body.parse(await request.json().catch(() => null))
      const key = email.trim().toLowerCase()
      if (rateLimit(`support:recover:mail:${key}`, { limit: 3, windowMs: 60 * 60 * 1000 })) {
        after(async () => {
          try {
            await recoverTickets(key)
          } catch (error) {
            log.error('Soporte: no se pudieron reenviar los links', error)
          }
        })
      }
      return json({ ok: true })
    },
    { write: true },
  )
}
