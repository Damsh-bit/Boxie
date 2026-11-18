import type { ParsedThemeConfig } from '../config'
import { slideDefinitions } from '../schemas'
import type { SlideDefinition, SlideVars } from '../types'

/**
 * Las {{variables}} de los textos de una Ribbly: "para tus {{edad}}",
 * "Hecho con 🎉 por {{de}}". Salen de los datos del regalo (nombres) y de lo
 * que cada slide declara que presta (`variables` en su definición): la edad se
 * carga una sola vez, en la portada, y la usa cualquier pantalla.
 *
 * Sin React: lo usa el player y también lo puede usar el servidor.
 */

export type Treatment = 'ella' | 'el' | 'neutro'

/** Palabras que cambian según cómo se le dice a quien cumple. */
const TREATMENT: Record<Treatment, Record<string, string>> = {
  ella: {
    rol: 'Cumpleañera',
    titulo_cumple: 'La cumpleañera',
    querida: 'Querida',
    a_la: 'a la',
  },
  el: {
    rol: 'Cumpleañero',
    titulo_cumple: 'El cumpleañero',
    querida: 'Querido',
    a_la: 'al',
  },
  neutro: {
    rol: 'Estrella',
    titulo_cumple: 'Quien cumple',
    querida: 'Hola',
    a_la: 'a',
  },
}

const pad = (n: number) => String(n).padStart(2, '0')

/** "14/5", "14-05" o "14/05/1998" → { day, month }. */
export function parseDayMonth(text: string | undefined): { day: number; month: number } | null {
  const match = text?.trim().match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})(?:\s*[/.-]\s*\d{2,4})?$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return { day, month }
}

/** "14/02/2021", "14-2-21" o "2021-02-14" → la fecha (a las 0 h); si no es válida, null. */
export function parseFullDate(text: string | undefined): Date | null {
  const value = text?.trim() ?? ''
  let day: number, month: number, year: number
  const iso = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  const local = value.match(/^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d{2}|\d{4})$/)
  if (iso) {
    ;[year, month, day] = [Number(iso[1]), Number(iso[2]), Number(iso[3])]
  } else if (local) {
    ;[day, month, year] = [Number(local[1]), Number(local[2]), Number(local[3])]
    if (year < 100) year += 2000
  } else {
    return null
  }
  const date = new Date(year, month - 1, day)
  // 31/02 no existe: Date lo corre al mes siguiente.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null
  }
  return date
}

/** Días y años completos desde `since` hasta `now` (null si es a futuro). */
export function timeTogether(since: Date, now: Date): { days: number; years: number } | null {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  // Por fecha de calendario: los cambios de horario no corren un día.
  const days = Math.round(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(since.getFullYear(), since.getMonth(), since.getDate())) /
      86_400_000,
  )
  if (days < 0) return null
  let years = today.getFullYear() - since.getFullYear()
  const beforeAnniversary =
    today.getMonth() < since.getMonth() ||
    (today.getMonth() === since.getMonth() && today.getDate() < since.getDate())
  if (beforeAnniversary) years--
  return { days, years: Math.max(0, years) }
}

export function buildVars(
  config: Pick<ParsedThemeConfig, 'slides'>,
  data: {
    recipientName: string
    senderName: string
    content: Record<string, Record<string, unknown>>
  },
  now: Date = new Date(),
): SlideVars {
  const year = now.getFullYear()
  const vars: SlideVars = {
    nombre: data.recipientName.trim(),
    de: data.senderName.trim(),
    anio: String(year),
    anio_anterior: String(year - 1),
  }

  // Lo que prestan las slides (la primera que lo tenga cargado gana).
  for (const slide of config.slides) {
    const provides = (slideDefinitions[slide.kind] as SlideDefinition).variables
    if (!provides) continue
    const content = data.content[slide.key] ?? {}
    for (const [name, fieldName] of Object.entries(provides)) {
      const value = content[fieldName]
      const text =
        typeof value === 'number' ? String(value) : typeof value === 'string' ? value : ''
      if (text.trim() && !vars[name]) vars[name] = text.trim()
    }
  }

  const age = Number.parseInt((vars.edad ?? '').replace(/\D/g, ''), 10)
  if (Number.isFinite(age) && age > 0) {
    vars.edad = String(age)
    vars.edad_siguiente = String(age + 1)
  } else {
    vars.edad = ''
    vars.edad_siguiente = ''
  }

  const treatment = (vars.trato as Treatment) in TREATMENT ? (vars.trato as Treatment) : 'neutro'
  Object.assign(vars, TREATMENT[treatment])

  const birthday = parseDayMonth(vars.cumple)
  if (birthday) {
    vars.fecha = `${pad(birthday.day)}/${pad(birthday.month)}`
    vars.fecha_proximo_cumple = `${vars.fecha}/${year + 1}`
  } else {
    vars.fecha = ''
    vars.fecha_proximo_cumple = ''
  }

  // Pareja: desde cuándo están juntos (lo carga quien regala en la Love edition).
  const since = parseFullDate(vars.inicio)
  const together = since ? timeTogether(since, now) : null
  vars.dias_juntos = together ? together.days.toLocaleString('es-AR') : ''
  vars.anios = together ? String(together.years) : ''
  return vars
}

/** Reemplaza las {{variables}}; las que no tienen valor quedan vacías. */
export function fill(text: string | null | undefined, vars: SlideVars, extra?: SlideVars): string {
  if (!text) return ''
  return text
    .replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, key: string) => extra?.[key] ?? vars[key] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** Fecha corta de hoy ("14/05"), para sellar un vale canjeado. */
export function shortDate(date: Date = new Date()): string {
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`
}
