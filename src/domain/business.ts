/**
 * Datos de contacto del negocio (los carga el panel en Configuración). Reglas
 * puras para mostrarlos: el panel guarda el texto tal como lo escribe una
 * persona ("+54 9 11 5555-0100", "@boxie.app"), el sitio necesita links que
 * funcionen.
 */

export interface BusinessInfo {
  name: string
  supportEmail: string
  /** Como lo escribió el panel. Vacío = sin WhatsApp. */
  whatsapp: string
  /** "@cuenta" o la URL del perfil. Vacío = sin Instagram. */
  instagram: string
}

export interface BusinessContact {
  name: string
  supportEmail: string
  whatsapp: { display: string; url: string } | null
  instagram: { handle: string; url: string } | null
}

/**
 * Número de WhatsApp listo para wa.me: solo dígitos, con el código de país.
 * Un número argentino sin país (11 5555-0100) se completa con 54 9. Devuelve
 * null si no alcanza para ser un teléfono.
 */
export function whatsappNumber(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  let digits = trimmed.replace(/\D/g, '')
  if (!trimmed.startsWith('+') && !digits.startsWith('54')) {
    // Local argentino: sin 0 de larga distancia ni 15 del celular.
    digits = digits.replace(/^0/, '')
    if (digits.length === 10) digits = `549${digits}`
  }
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

/** Link de WhatsApp con un mensaje ya escrito (opcional). */
export function whatsappUrl(input: string, text?: string): string | null {
  const number = whatsappNumber(input)
  if (!number) return null
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

/** "@boxie.app" · "boxie.app" · "https://instagram.com/boxie.app/" → "boxie.app". */
export function instagramHandle(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const fromUrl = trimmed.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1]
  const handle = (fromUrl ?? trimmed).replace(/^@/, '').replace(/\/+$/, '')
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? handle.toLowerCase() : null
}

export function businessContact(info: BusinessInfo, whatsappText?: string): BusinessContact {
  const number = whatsappUrl(info.whatsapp, whatsappText)
  const handle = instagramHandle(info.instagram)
  return {
    name: info.name.trim() || 'Boxie Digital',
    supportEmail: info.supportEmail.trim(),
    whatsapp: number ? { display: info.whatsapp.trim(), url: number } : null,
    instagram: handle ? { handle: `@${handle}`, url: `https://instagram.com/${handle}` } : null,
  }
}
