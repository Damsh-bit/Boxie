/**
 * El mensaje para mandar el regalo. La clave (si la hay) no va en el mismo
 * mensaje: si viajan juntos, la clave no protege nada.
 */
export function giftShareMessage(p: {
  recipientName: string
  url: string
  hasPassword: boolean
}): string {
  const hello = p.recipientName.trim() ? `¡Hola ${p.recipientName.trim()}! ✨` : '¡Hola! ✨'
  const lines = [
    hello,
    '',
    'Te preparé una sorpresa digital en Boxie 🎁',
    'Abrila desde el celular:',
    p.url,
  ]
  if (p.hasPassword) lines.push('', 'La clave te la paso por acá aparte 😉')
  return lines.join('\n')
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Argentina/Buenos_Aires',
})

/** "22 de noviembre de 2026", en hora argentina. */
export function formatLongDate(value: string | Date): string {
  return dateFormat.format(typeof value === 'string' ? new Date(value) : value)
}
