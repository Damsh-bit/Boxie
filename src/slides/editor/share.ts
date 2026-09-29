export function giftShareMessage(p: {
  recipientName: string
  url: string
  hasPassword: boolean
}): string {
  const name = p.recipientName.trim()
  const greeting = name ? `¡Hola ${name}! ✨` : '¡Hola! ✨'
  const lines = [
    greeting,
    '',
    'Te preparé un regalo digital interactivo muy especial con nuestras fotos y recuerdos 🎁❤️',
    '',
    'Tocá el link para abrir tu regalo desde el celular:',
    p.url,
  ]
  if (p.hasPassword) {
    lines.push('', '🔐 Le puse clave por privacidad. La clave te la paso por acá aparte 😉')
  }
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
