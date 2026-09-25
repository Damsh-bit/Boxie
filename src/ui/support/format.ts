/** Fechas del chat de soporte, en la zona horaria de quien mira. */

const clockFormat = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dayFormat = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' })
const longDayFormat = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})

/** "14:05". */
export const clock = (iso: string) => clockFormat.format(new Date(iso))

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** "Hoy" · "Ayer" · "martes 23 de septiembre" (separadores del chat). */
export function dayLabel(iso: string, now = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  const label = longDayFormat.format(new Date(iso))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** "recién" · "hace 5 min" · "hace 3 h" · "ayer" · "12 sep". */
export function timeAgo(iso: string, now = new Date()): string {
  const minutes = Math.floor((now.getTime() - Date.parse(iso)) / 60_000)
  if (minutes < 1) return 'recién'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86_400_000)
  if (days === 1) return 'ayer'
  return dayFormat.format(new Date(iso)).replace('.', '')
}

/** Mismo día (para agrupar los mensajes). */
export const sameDay = (a: string, b: string) => startOfDay(new Date(a)) === startOfDay(new Date(b))
