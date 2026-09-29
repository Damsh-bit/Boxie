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
  'Recibís este mail porque hiciste una compra en Ribbly. Si no fuiste vos, respondé este mensaje.'

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
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ribbly</title></head>
<body style="margin:0;padding:0;background:#f4f1f2;font-family:Helvetica,Arial,sans-serif;color:${INK}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1f2;padding:32px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:${BRAND};padding:22px 32px;color:#fff;font-size:22px;font-weight:bold;letter-spacing:.5px">Ribbly 🎁</td></tr>
<tr><td style="padding:32px;font-size:16px;line-height:1.6">${body}</td></tr>
<tr><td style="padding:20px 32px;background:#faf7f8;color:#8a8190;font-size:12px;line-height:1.5">
${esc(reason)}<br>
Ribbly · Buenos Aires, Argentina
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
    ? 'Tu nuevo link para editar tu regalo'
    : '¡Gracias por tu compra! Ya podés armar tu regalo 🎁'
  const intro = p.resent
    ? 'Nos pediste un link nuevo para entrar a tu regalo. El anterior dejó de funcionar.'
    : `Recibimos tu pago de la temática <strong>${esc(p.themeName)}</strong>. Ya podés personalizarla: fotos, dedicatoria, música y sorpresas.`
  const html = layout({
    preheader: 'Tu link personal para editar el regalo',
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">¡Hola${first ? `, ${esc(first)}` : ''}!</p>
<p>${intro}</p>
${button(p.editorUrl, 'Personalizar mi regalo')}
<p style="font-size:14px;color:#6b6272">Este link es personal: con él se edita tu regalo. No lo compartas. Podés usarlo desde cualquier dispositivo hasta el <strong>${dateAR(p.expiresAt)}</strong>.</p>
<p style="font-size:14px;color:#6b6272">Código de tu regalo para soporte: <strong style="font-family:monospace;font-size:15px;color:${INK}">${formatBoxieCode(p.code)}</strong></p>`,
  })
  const text = `¡Hola${first ? `, ${first}` : ''}!

${p.resent ? 'Nos pediste un link nuevo para entrar a tu regalo.' : `Recibimos tu pago de la temática ${p.themeName}. Ya podés personalizarla.`}

Personalizá tu regalo acá (link personal, no lo compartas):
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
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">¡Tu regalo está listo${first ? `, ${esc(first)}` : ''}!</p>
<p>Este es el link del regalo para <strong>${esc(p.recipientName)}</strong>. Mandáselo por WhatsApp o por donde quieras: se abre desde el celular, sin instalar nada.</p>
<p style="background:#fff0f3;border-radius:12px;padding:14px 16px;font-family:monospace;font-size:14px;word-break:break-all">${esc(p.giftUrl)}</p>
${button(p.giftUrl, 'Ver el regalo')}
${p.hasPassword ? '<p style="font-size:14px;color:#6b6272">Le pusiste una clave: acordate de pasársela.</p>' : ''}
<p style="font-size:14px;color:#6b6272">El regalo queda disponible hasta el <strong>${dateAR(p.expiresAt)}</strong>.</p>`,
  })
  const text = `¡Tu regalo está listo!

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
  'Recibís este mail porque escribiste a soporte de Ribbly. Si no fuiste vos, ignoralo.'

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
    preheader: `Tu consulta #${p.number} llegó al equipo de Ribbly`,
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
    reason: 'Aviso interno del soporte de Ribbly.',
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

export function teamInviteEmail(p: {
  name: string
  inviterName: string
  roleLabel: string
  inviteUrl: string
  expiresAt: Date
}): MailContent {
  const first = p.name.trim().split(/\s+/)[0] ?? ''
  const html = layout({
    preheader: `Te invitaron al equipo de Ribbly como ${p.roleLabel}`,
    body: `<p style="font-size:20px;font-weight:bold;margin:0 0 12px">¡Hola${first ? `, ${esc(first)}` : ''}!</p>
<p><strong>${esc(p.inviterName)}</strong> te sumó al equipo de Ribbly con el rol de <strong>${esc(p.roleLabel)}</strong>.</p>
<p>Para activar tu cuenta y elegir tu contraseña para acceder al panel de administración, hacé clic en el botón de abajo:</p>
${button(p.inviteUrl, 'Activar mi cuenta y crear clave')}
<p style="font-size:14px;color:#6b6272">Este enlace es personal e intransferible. Vence el <strong>${dateAR(p.expiresAt)}</strong>.</p>
<p style="font-size:14px;color:#6b6272">Si no esperabas esta invitación, podés ignorar este correo.</p>`,
  })
  const text = `¡Hola${first ? `, ${first}` : ''}!

${p.inviterName} te sumó al equipo de Ribbly como ${p.roleLabel}.

Para activar tu cuenta y elegir tu clave, ingresá al siguiente enlace:
${p.inviteUrl}

Este enlace vence el ${dateAR(p.expiresAt)}.
`
  return {
    subject: `Te invitaron al equipo de Ribbly 🎁`,
    html,
    text,
  }
}

/** Avisa al comprador en el momento exacto en que el agasajado abre el regalo por primera vez. */
export function giftOpenedEmail(p: {
  recipientName: string
  themeName?: string
  accountUrl: string
}): MailContent {
  const recipient = p.recipientName.trim() || 'Tu agasajado/a'
  const subject = `¡${recipient} acaba de abrir tu regalo! 🎉`
  const preheader = `${recipient} abrió tu regalo sorpresa en este momento. ¡Qué emoción!`

  const body = `
<p style="font-size:20px;font-weight:bold;margin:0 0 14px;color:${INK}">¡Llegó el momento más esperado! 🥳</p>
<p style="font-size:16px;line-height:1.6">Te avisamos que <strong>${esc(recipient)}</strong> acaba de abrir tu <strong>regalo digital en Ribbly</strong> en este instante.</p>
<div style="background:#faf7f8;border:1px solid #ebd9df;border-radius:16px;padding:20px;margin:24px 0">
  <p style="margin:0 0 8px;font-size:13px;color:#8a8190;text-transform:uppercase;font-weight:600;letter-spacing:0.5px">Detalles del regalo</p>
  <p style="margin:0;font-weight:700;font-size:17px;color:${INK}">🎁 Para: ${esc(recipient)}</p>
  ${p.themeName ? `<p style="margin:6px 0 0;font-size:14px;color:#6b6272">Temática: ${esc(p.themeName)}</p>` : ''}
</div>
<p style="font-size:15px;line-height:1.6">Ahora mismo está recorriendo la experiencia con las fotos, la música y las palabras que le dedicaste.</p>
<p style="font-size:15px;line-height:1.6">¿Qué tal si le mandás un mensajito por WhatsApp para ver su reacción? 😉</p>
${button(p.accountUrl, 'Ver mis regalos en Mi Cuenta')}
<p style="font-size:13px;color:#8a8190;margin-top:20px">Podés ver el estado de todas tus compras y regalos entregados desde tu portal de cliente.</p>
`

  const text = `¡${recipient} acaba de abrir tu regalo! 🎉\n\nTe avisamos que ${recipient} acaba de abrir tu regalo en este momento.\n\nAhora mismo está viviendo la experiencia con las fotos, la música y las palabras que le dedicaste.\n\nPodés ver tus regalos en: ${p.accountUrl}\n\n¡Gracias por regalar momentos inolvidables con Ribbly!`

  return {
    subject,
    html: layout({ preheader, body }),
    text,
  }
}

/** Recordatorio anual de cumpleaños o aniversario para recomprar con descuento. */
export function specialDateReminderEmail(p: {
  recipientName: string
  occasion: string
  daysUntil: number
  couponCode: string
  discountPercent: number
  storeUrl: string
}): MailContent {
  const recipient = p.recipientName.trim()
  const subject = `Se acerca el ${p.occasion} de ${recipient} 🎂 (tenés ${p.discountPercent}% OFF)`
  const preheader = `Faltan solo ${p.daysUntil} días para el ${p.occasion} de ${recipient}. Sorprendelo/a con un nuevo regalo en Ribbly.`

  const body = `
<p style="font-size:20px;font-weight:bold;margin:0 0 14px;color:${INK}">¡No te cuelgues con el regalo! ⏰</p>
<p style="font-size:16px;line-height:1.6">Faltan solo <strong>${p.daysUntil} días</strong> para el <strong>${esc(p.occasion)} de ${esc(recipient)}</strong>.</p>
<p style="font-size:15px;line-height:1.6">Como el año pasado le hiciste un regalo inolvidable, queremos darte un beneficio exclusivo para que vuelvas a sorprender a ${esc(recipient)}:</p>
<div style="background:#faf7f8;border:2px dashed ${BRAND};border-radius:16px;padding:24px;margin:24px 0;text-align:center">
  <p style="margin:0 0 6px;font-size:13px;color:#8a8190;text-transform:uppercase;font-weight:600">Cupón de regalo exclusivo</p>
  <p style="margin:0;font-size:28px;font-weight:900;letter-spacing:2px;color:${BRAND}">${esc(p.couponCode)}</p>
  <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:${INK}">${p.discountPercent}% de descuento en cualquier temática</p>
</div>
<p style="font-size:15px;line-height:1.6">Armarla te lleva solo 10 minutos y te asegurás un regalo original, emotivo e interactivo.</p>
${button(p.storeUrl, 'Elegir temática y armar regalo')}
<p style="font-size:13px;color:#8a8190;margin-top:20px">Cupón válido por los próximos 14 días. Aplicable al finalizar tu compra.</p>
`

  const text = `Se acerca el ${p.occasion} de ${recipient} 🎂\n\nFaltan solo ${p.daysUntil} días. Te regalamos un cupón de ${p.discountPercent}% OFF:\n\nCUPÓN: ${p.couponCode}\n\nElegí su temática y armá su regalo acá: ${p.storeUrl}`

  return {
    subject,
    html: layout({ preheader, body }),
    text,
  }
}
