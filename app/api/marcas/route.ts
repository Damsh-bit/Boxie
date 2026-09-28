import { NextResponse } from 'next/server'
import { site } from '@/content/site'
import {
  SPONSOR_INTEREST_LABELS,
  SPONSOR_KIND_LABELS,
  SponsorLeadSchema,
  leadToInput,
} from '@/domain/sponsors'
import { isDemoMode } from '@/server/demo'
import { log } from '@/server/log'
import { sendMail } from '@/server/mail/send'
import { contactEmail } from '@/server/mail/templates'
import { clientIp, rateLimit } from '@/server/rate-limit'
import { sponsorsRepo } from '@/server/sponsors/repo'

/**
 * "Quiero ser aliado" (/marcas). El contacto entra al panel como sponsor en
 * etapa "nuevo contacto" (sin publicar nada) y además se avisa por mail al
 * área comercial. Alcanza con que funcione uno de los dos para no perderlo.
 */
export async function POST(request: Request) {
  const parsed = SponsorLeadSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisá los datos del formulario.' }, { status: 400 })
  }
  if (!rateLimit(`marcas:${clientIp(request.headers)}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json(
      { error: 'Recibimos varios pedidos seguidos. Probá de nuevo en un rato.' },
      { status: 429 },
    )
  }

  const lead = parsed.data
  let saved = false
  try {
    await (await sponsorsRepo()).createLead(leadToInput(lead))
    saved = true
  } catch (error) {
    log.error('No se pudo guardar un contacto de sponsor', error)
  }

  let mailed = false
  if (!isDemoMode()) {
    try {
      const interests = lead.interests.map((i) => SPONSOR_INTEREST_LABELS[i]).join(', ')
      await sendMail({
        to: site.emails.marketing,
        replyTo: lead.email,
        tag: 'sponsor-lead',
        ...contactEmail({
          name: lead.name,
          email: lead.email,
          area: `Boxie para marcas · ${SPONSOR_KIND_LABELS[lead.kind]}`,
          message: [
            `Negocio o marca: ${lead.business}`,
            lead.city && `Ciudad: ${lead.city}`,
            lead.phone && `WhatsApp: ${lead.phone}`,
            interests && `Le interesa: ${interests}`,
            lead.message && `\n${lead.message}`,
            saved ? '\nYa está en el panel, en Sponsors (nuevo contacto).' : '',
          ]
            .filter(Boolean)
            .join('\n'),
        }),
      })
      mailed = true
    } catch (error) {
      log.error('No se pudo avisar por mail de un contacto de sponsor', error)
    }
  }

  if (!saved && !mailed) {
    return NextResponse.json(
      { error: `No pudimos enviar tu pedido. Escribinos a ${site.emails.marketing}.` },
      { status: 502 },
    )
  }
  return NextResponse.json({ ok: true })
}
