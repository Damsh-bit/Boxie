import { NextResponse } from 'next/server'
import { z } from 'zod'
import { contactAreas } from '@/content/site'
import { isDemoMode } from '@/server/demo'
import { log } from '@/server/log'
import { sendMail } from '@/server/mail/send'
import { contactEmail } from '@/server/mail/templates'
import { clientIp, rateLimit } from '@/server/rate-limit'

/**
 * Formulario de contacto. En el prototipo simulaba el envío con un
 * setTimeout: el mensaje no le llegaba a nadie.
 */

const Body = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(254),
  area: z.enum(contactAreas.map((a) => a.value) as [string, ...string[]]),
  message: z.string().trim().min(5).max(3000),
  website: z.string().max(0).optional(),
})

export async function POST(request: Request) {
  if (isDemoMode()) {
    return NextResponse.json(
      { error: 'Esta es una versión de demostración: el formulario todavía no envía mensajes.' },
      { status: 503 },
    )
  }
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisá los datos del formulario.' }, { status: 400 })
  }
  if (!rateLimit(`contact:${clientIp(request.headers)}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json(
      { error: 'Recibimos varios mensajes seguidos. Probá de nuevo en un rato.' },
      { status: 429 },
    )
  }

  const area = contactAreas.find((a) => a.value === parsed.data.area)!
  try {
    await sendMail({
      to: area.email,
      replyTo: parsed.data.email,
      tag: 'contact',
      ...contactEmail({
        name: parsed.data.name,
        email: parsed.data.email,
        area: area.label,
        message: parsed.data.message,
      }),
    })
  } catch (error) {
    log.error('No se pudo enviar un mensaje de contacto', error, { area: area.value })
    return NextResponse.json(
      { error: 'No pudimos enviar el mensaje. Escribinos por mail mientras lo arreglamos.' },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true })
}
