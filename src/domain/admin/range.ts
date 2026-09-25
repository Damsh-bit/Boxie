/**
 * Períodos del panel. Todo se corta en hora argentina (UTC−3, sin horario de
 * verano desde 2009), igual que las funciones de analítica de la base.
 *
 * Un rango es [from, to): `to` es exclusivo, así "hoy" termina a la
 * medianoche siguiente y dos rangos consecutivos no se pisan.
 */

export const AR_OFFSET_MS = -3 * 60 * 60 * 1000
const DAY = 86_400_000

export type RangePreset = '7d' | '30d' | '90d' | '12m' | 'mtd' | 'ytd' | 'custom'
export type Bucket = 'day' | 'week' | 'month'

export interface DateRange {
  from: Date
  to: Date
  preset: RangePreset
}

export const RANGE_PRESETS: { value: Exclude<RangePreset, 'custom'>; label: string }[] = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Últimos 30 días' },
  { value: '90d', label: 'Últimos 90 días' },
  { value: 'mtd', label: 'Este mes' },
  { value: 'ytd', label: 'Este año' },
  { value: '12m', label: 'Últimos 12 meses' },
]

/** "2026-09-24" del día argentino de ese instante. */
export function arDayKey(date: Date | number | string): string {
  const t = typeof date === 'number' ? date : new Date(date).getTime()
  return new Date(t + AR_OFFSET_MS).toISOString().slice(0, 10)
}

/** Medianoche argentina de ese día, como instante. */
export function arStartOfDay(date: Date | number): Date {
  const key = arDayKey(date)
  return new Date(`${key}T00:00:00.000-03:00`)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY)
}

/** Primer instante del mes argentino de `date`, desplazado `months` meses. */
export function arStartOfMonth(date: Date | number, months = 0): Date {
  const [y, m] = arDayKey(date).split('-').map(Number) as [number, number]
  const index = y * 12 + (m - 1) + months
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00.000-03:00`)
}

export function rangeFromPreset(
  preset: Exclude<RangePreset, 'custom'>,
  now = new Date(),
): DateRange {
  const tomorrow = addDays(arStartOfDay(now), 1)
  switch (preset) {
    case '7d':
      return { from: addDays(tomorrow, -7), to: tomorrow, preset }
    case '30d':
      return { from: addDays(tomorrow, -30), to: tomorrow, preset }
    case '90d':
      return { from: addDays(tomorrow, -90), to: tomorrow, preset }
    case '12m':
      return { from: arStartOfMonth(now, -11), to: tomorrow, preset }
    case 'mtd':
      return { from: arStartOfMonth(now), to: tomorrow, preset }
    case 'ytd': {
      const year = arDayKey(now).slice(0, 4)
      return { from: new Date(`${year}-01-01T00:00:00.000-03:00`), to: tomorrow, preset }
    }
  }
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Lee el período de la URL (?periodo=30d o ?desde=2026-09-01&hasta=2026-09-15).
 * Cualquier cosa rara vuelve al default: la URL la escribe cualquiera.
 */
export function parseRange(
  params: { periodo?: string | string[]; desde?: string | string[]; hasta?: string | string[] },
  now = new Date(),
  fallback: Exclude<RangePreset, 'custom'> = '30d',
): DateRange {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  const desde = one(params.desde)
  const hasta = one(params.hasta)
  if (desde && hasta && DAY_KEY.test(desde) && DAY_KEY.test(hasta)) {
    const from = new Date(`${desde}T00:00:00.000-03:00`)
    const to = addDays(new Date(`${hasta}T00:00:00.000-03:00`), 1)
    const span = (to.getTime() - from.getTime()) / DAY
    if (!Number.isNaN(span) && span >= 1 && span <= 3 * 366) return { from, to, preset: 'custom' }
  }
  const preset = one(params.periodo)
  const known = RANGE_PRESETS.find((p) => p.value === preset)
  return rangeFromPreset(known?.value ?? fallback, now)
}

/** El período anterior, del mismo largo (para comparar). */
export function previousRange(range: DateRange): DateRange {
  const span = range.to.getTime() - range.from.getTime()
  return { from: new Date(range.from.getTime() - span), to: range.from, preset: 'custom' }
}

export function rangeDays(range: DateRange): number {
  return Math.round((range.to.getTime() - range.from.getTime()) / DAY)
}

export function inRange(date: Date | string | null | undefined, range: DateRange): boolean {
  if (!date) return false
  const t = new Date(date).getTime()
  return t >= range.from.getTime() && t < range.to.getTime()
}

export function bucketFor(range: DateRange): Bucket {
  const days = rangeDays(range)
  if (days <= 62) return 'day'
  if (days <= 190) return 'week'
  return 'month'
}

/** Lunes de la semana argentina de ese instante (clave "2026-09-21"). */
function weekKey(t: number): string {
  const key = arDayKey(t)
  const weekday = new Date(`${key}T12:00:00Z`).getUTCDay() // 0 = domingo
  const back = (weekday + 6) % 7
  return arDayKey(new Date(`${key}T12:00:00-03:00`).getTime() - back * DAY)
}

export function bucketKey(date: Date | string | number, bucket: Bucket): string {
  const t = typeof date === 'number' ? date : new Date(date).getTime()
  if (bucket === 'day') return arDayKey(t)
  if (bucket === 'week') return weekKey(t)
  return arDayKey(t).slice(0, 7)
}

/** Todas las claves del rango, en orden, aunque no tengan datos. */
export function bucketKeys(range: DateRange, bucket: Bucket): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (let t = range.from.getTime(); t < range.to.getTime(); t += DAY) {
    const key = bucketKey(t, bucket)
    if (!seen.has(key)) {
      seen.add(key)
      keys.push(key)
    }
  }
  return keys
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** "24 sep" · "sem. 21 sep" · "sep 2026". */
export function bucketLabel(key: string, bucket: Bucket): string {
  const [y, m, d] = key.split('-')
  const month = MONTHS[Number(m) - 1] ?? m
  if (bucket === 'month') return `${month} ${y}`
  if (bucket === 'week') return `sem. ${Number(d)} ${month}`
  return `${Number(d)} ${month}`
}

export function formatRange(range: DateRange): string {
  const preset = RANGE_PRESETS.find((p) => p.value === range.preset)
  if (preset) return preset.label
  const last = addDays(range.to, -1)
  return `${bucketLabel(arDayKey(range.from), 'day')} – ${bucketLabel(arDayKey(last), 'day')}`
}

/** Día de la semana (0 = lunes) y hora argentinos de un instante. */
export function arWeekdayHour(date: Date | string): { weekday: number; hour: number } {
  const shifted = new Date(new Date(date).getTime() + AR_OFFSET_MS)
  return { weekday: (shifted.getUTCDay() + 6) % 7, hour: shifted.getUTCHours() }
}

export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
