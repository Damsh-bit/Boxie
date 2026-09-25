import 'server-only'
import { formatBoxieCode } from '@/domain/boxie'

/**
 * Plantillas de mails transaccionales. HTML con estilos en línea (lo único que
 * respetan todos los clientes de correo) y siempre una versión de texto.
 * Todo lo que viene del usuario pasa por `esc`.
 */

export interface MailContent {
  subject: string
  html: string
  text: string
}

export function esc(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

const BRAND = '#F44E63'
const INK = '#2A2433'

const PURCHASE_REASON =
  'Recibís este mail porque hiciste una compra en Boxie Digital. Si no fuiste vos, respondé este mensaje.'

function layout({
  preheader,
  body,
  reason = PURCHASE_REASON,
}: {
  preheader: string
  body: string
  /** Por qué le llega este mail (pie). */
  reason?: string
}) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boxie</title></head>
<body style="margin:0;padding:0;background:#f4f1f2;font-family:Helvetica,Arial,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1f2;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:${BRAND};padding:22px 32px;color:#fff;font-size:22px;font-weight:bold;letter-spacing:.5px">Boxie 🎁</td></tr>
<tr><td style="padding:32px;font-size:16px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:20px 32px;background:#faf7f8;color:#8a8190;font-size:12px;line-height:1.5">
${esc(reason)}<br>
Boxie Digital · Buenos Aires, Argentina
</td></tr>
</table></td></tr></table></body></html>`
}

function button(href: string, label: string) {
  return `<p style="margin:28px 0"><a href="${esc(href)}" style="background:${BRAND};color:#fff;text-decoration:none;padding:15px 28px;border-radius:999px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`
}

const dateAR = (d: Date) =>
  d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires',
  })

export function editorAccessEmail(p: {
  buyerName: string
  themeName: string
  editorUrl: string
  code: string
  expiresAt: Date
  resent?: boolean
}): MailContent {
  const first = p.buyerName.trim().split(/\s+/)[0] ?? ''
  const subject = p.resent
    ? 'Tu nuevo link para editar tu Boxie'
    : '¡Gracias por tu compra! Ya podés armar tu Boxie 🎁'
  const intro = p.resent
    ? 'Nos pediste un link nuevo para entrar a tu Boxie. El anterior dejó de funcionar.'
    : `Recibimos tu pago de la Boxie <strong>${esc(p.themeName)}</strong>. Ya podés personalizarla: fotos, dedicatoria, música y sorpresas.`
  const html = layout({
    preheader: 'Tu link personal para editar la Boxie',
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">¡Hola${first ? `, ${esc(first)}` : ''}!</p>
<p>${intro}</p>
${button(p.editorUrl, 'Personalizar mi Boxie')}
<p style="font-size:14px;color:#6b6272">Este link es personal: con él se edita tu Boxie. No lo compartas. Podés usarlo desde cualquier dispositivo hasta el <strong>${dateAR(p.expiresAt)}</strong>.</p>
<p style="font-size:14px;color:#6b6272">Código de tu Boxie para soporte: <strong style="font-family:monospace;font-size:15px;color:${INK}">${formatBoxieCode(p.code)}</strong></p>`,
  })
  const text = `¡Hola${first ? `, ${first}` : ''}!

${p.resent ? 'Nos pediste un link nuevo para entrar a tu Boxie.' : `Recibimos tu pago de la Boxie ${p.themeName}. Ya podés personalizarla.`}

Personalizá tu Boxie acá (link personal, no lo compartas):
${p.editorUrl}

Disponible hasta el ${dateAR(p.expiresAt)}.
Código para soporte: ${formatBoxieCode(p.code)}
`
  return { subject, html, text }
}

export function giftReadyEmail(p: {
  buyerName: string
  recipientName: string
  giftUrl: string
  expiresAt: Date
  hasPassword: boolean
}): MailContent {
  const first = p.buyerName.trim().split(/\s+/)[0] ?? ''
  const html = layout({
    preheader: `El regalo para ${p.recipientName} está listo`,
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">¡Tu Boxie está lista${first ? `, ${esc(first)}` : ''}!</p>
<p>Este es el link del regalo para <strong>${esc(p.recipientName)}</strong>. Mandáselo por WhatsApp o por donde quieras: se abre desde el celular, sin instalar nada.</p>
<p style="background:#fff0f3;border-radius:12px;padding:14px 16px;font-family:monospace;font-size:14px;word-break:break-all">${esc(p.giftUrl)}</p>
${button(p.giftUrl, 'Ver el regalo')}
${p.hasPassword ? '<p style="font-size:14px;color:#6b6272">Le pusiste una clave: acordate de pasársela.</p>' : ''}
<p style="font-size:14px;color:#6b6272">El regalo queda disponible hasta el <strong>${dateAR(p.expiresAt)}</strong>.</p>`,
  })
  const text = `¡Tu Boxie está lista!

Link del regalo para ${p.recipientName}:
${p.giftUrl}
${p.hasPassword ? '\nLe pusiste una clave: acordate de pasársela.\n' : ''}
Disponible hasta el ${dateAR(p.expiresAt)}.
`
  return { subject: `El regalo para ${p.recipientName} está listo 🎁`, html, text }
}

export function contactEmail(p: {
  name: string
  email: string
  area: string
  message: string
}): MailContent {
  const html = layout({
    preheader: `Consulta de ${p.name}`,
    body: `<p><strong>Área:</strong> ${esc(p.area)}</p>
<p><strong>De:</strong> ${esc(p.name)} &lt;${esc(p.email)}&gt;</p>
<p style="white-space:pre-wrap;background:#faf7f8;border-radius:12px;padding:16px">${esc(p.message)}</p>`,
  })
  return {
    subject: `[Contacto web · ${p.area}] ${p.name}`,
    html,
    text: `Área: ${p.area}\nDe: ${p.name} <${p.email}>\n\n${p.message}`,
  }
}

// ── Soporte ─────────────────────────────────────────────────────────────────

const SUPPORT_REASON =
  'Recibís este mail porque escribiste a soporte de Boxie Digital. Si no fuiste vos, ignoralo.'

/** Un mensaje citado (sin HTML del usuario, con los saltos de línea). */
function quote(text: string) {
  const short = text.length > 600 ? `${text.slice(0, 597)}…` : text
  return `<p style="white-space:pre-wrap;background:#fff0f3;border-radius:14px;padding:14px 16px;margin:18px 0">${esc(short)}</p>`
}

/** Al cliente: recibimos su consulta y cómo seguirla desde cualquier dispositivo. */
export function supportTicketCreatedEmail(p: {
  name: string
  number: number
  subject: string
  url: string
}): MailContent {
  const first = p.name.trim().split(/\s+/)[0] ?? ''
  const html = layout({
    preheader: `Tu consulta #${p.number} llegó al equipo de Boxie`,
    reason: SUPPORT_REASON,
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">¡Hola${first ? `, ${esc(first)}` : ''}!</p>
<p>Recibimos tu consulta <strong>#${p.number}</strong>: «${esc(p.subject)}». Te va a responder una persona del equipo por el chat, y te avisamos por acá cuando haya respuesta.</p>
${button(p.url, 'Ver mi consulta')}
<p style="font-size:14px;color:#6b6272">Con este link seguís la conversación desde cualquier dispositivo. Es personal: no lo compartas.</p>`,
  })
  const text = `¡Hola${first ? `, ${first}` : ''}!

Recibimos tu consulta #${p.number}: «${p.subject}». Te respondemos por el chat y te avisamos por mail.

Seguí la conversación acá (link personal):
${p.url}
`
  return { subject: `Recibimos tu consulta #${p.number} 💬`, html, text }
}

/** Al cliente: el equipo le respondió. */
export function supportReplyEmail(p: {
  name: string
  number: number
  agentName: string
  message: string
  url: string
}): MailContent {
  const first = p.name.trim().split(/\s+/)[0] ?? ''
  const html = layout({
    preheader: `${p.agentName} te respondió: ${p.message.slice(0, 80)}`,
    reason: SUPPORT_REASON,
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">¡Hola${first ? `, ${esc(first)}` : ''}!</p>
<p><strong>${esc(p.agentName)}</strong> te respondió en tu consulta <strong>#${p.number}</strong>:</p>
${quote(p.message)}
${button(p.url, 'Responder')}`,
  })
  const text = `¡Hola${first ? `, ${first}` : ''}!

${p.agentName} te respondió en tu consulta #${p.number}:

${p.message}

Respondé acá: ${p.url}
`
  return { subject: `Te respondimos tu consulta #${p.number}`, html, text }
}

/** Al equipo: una consulta nueva, o el cliente volvió a escribir. */
export function supportTeamEmail(p: {
  kind: 'new' | 'reply'
  number: number
  topic: string
  subject: string
  customerName: string
  customerEmail: string
  message: string
  adminUrl: string
}): MailContent {
  const heading =
    p.kind === 'new'
      ? `Nueva consulta #${p.number} · ${esc(p.topic)}`
      : `${esc(p.customerName)} respondió en #${p.number}`
  const html = layout({
    preheader: `${p.customerName}: ${p.message.slice(0, 90)}`,
    reason: 'Aviso interno del soporte de Boxie Digital.',
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">${heading}</p>
<p><strong>${esc(p.subject)}</strong><br><span style="color:#6b6272">${esc(p.customerName)} &lt;${esc(p.customerEmail)}&gt;</span></p>
${quote(p.message)}
${button(p.adminUrl, 'Abrir en el panel')}`,
  })
  const text = `${p.kind === 'new' ? `Nueva consulta #${p.number} (${p.topic})` : `${p.customerName} respondió en #${p.number}`}
${p.subject}
${p.customerName} <${p.customerEmail}>

${p.message}

${p.adminUrl}
`
  return {
    subject:
      p.kind === 'new'
        ? `[Soporte #${p.number}] ${p.topic} · ${p.subject}`
        : `[Soporte #${p.number}] Nueva respuesta de ${p.customerName}`,
    html,
    text,
  }
}
