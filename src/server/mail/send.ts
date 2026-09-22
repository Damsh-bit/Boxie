import 'server-only'
import { Resend } from 'resend'
import { env } from '../env'
import { log } from '../log'
import type { MailContent } from './templates'

/**
 * Envío de mails. Con RESEND_API_KEY se manda por Resend; sin ella (desarrollo
 * y E2E) queda en una bandeja en memoria que se ve en /api/dev/outbox.
 */

export interface OutgoingMail extends MailContent {
  to: string
  replyTo?: string
  /** Etiqueta para buscar el envío en el panel de Resend. */
  tag: string
}

export interface OutboxEntry extends OutgoingMail {
  sentAt: string
}

const globalOutbox = globalThis as unknown as { __boxieOutbox?: OutboxEntry[] }

export function devOutbox(): OutboxEntry[] {
  globalOutbox.__boxieOutbox ??= []
  return globalOutbox.__boxieOutbox
}

let client: Resend | undefined

export async function sendMail(mail: OutgoingMail): Promise<{ id: string | null }> {
  const { RESEND_API_KEY, MAIL_FROM, MAIL_REPLY_TO } = env()

  if (!RESEND_API_KEY) {
    const outbox = devOutbox()
    outbox.unshift({ ...mail, sentAt: new Date().toISOString() })
    outbox.length = Math.min(outbox.length, 50)
    log.info('mail (sin RESEND_API_KEY, queda en /api/dev/outbox)', {
      to: mail.to,
      subject: mail.subject,
      tag: mail.tag,
    })
    return { id: null }
  }

  client ??= new Resend(RESEND_API_KEY)
  const { data, error } = await client.emails.send({
    from: MAIL_FROM,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    replyTo: mail.replyTo ?? MAIL_REPLY_TO,
    tags: [{ name: 'type', value: mail.tag }],
  })
  if (error) throw new Error(`Resend: ${error.message}`)
  return { id: data?.id ?? null }
}
