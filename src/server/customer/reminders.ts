import 'server-only'
import type { User } from '@supabase/supabase-js'
import { serviceDb } from '../db/client'
import { log } from '../log'
import { sendMail } from '../mail/send'
import { specialDateReminderEmail } from '../mail/templates'
import { siteUrl } from '../env'

export interface SpecialDateRecord {
  id: string
  recipientName: string
  occasion: string
  day: number
  month: number
  year?: number
  notes?: string
  createdAt: string
  lastNotifiedYear?: number
}

export interface CustomerSpecialDate extends SpecialDateRecord {
  daysUntil: number
  nextDateFormatted: string
  status: 'today' | 'urgent' | 'soon' | 'later'
}

const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/**
 * Calcula los días faltantes para la próxima ocurrencia de la fecha anual
 * tomando como referencia la hora oficial de Argentina.
 */
export function calculateNextOccurrence(
  day: number,
  month: number,
  now = new Date(),
): {
  daysUntil: number
  nextDateFormatted: string
  status: 'today' | 'urgent' | 'soon' | 'later'
} {
  // Ajustar a hora argentina (UTC-3)
  const arOffsetMs = -3 * 60 * 60 * 1000
  const arNow = new Date(now.getTime() + arOffsetMs + now.getTimezoneOffset() * 60000)

  const currentYear = arNow.getFullYear()
  const todayAtMidnight = new Date(currentYear, arNow.getMonth(), arNow.getDate())

  let target = new Date(currentYear, month - 1, day)
  if (target < todayAtMidnight) {
    target = new Date(currentYear + 1, month - 1, day)
  }

  const diffMs = target.getTime() - todayAtMidnight.getTime()
  const daysUntil = Math.round(diffMs / (1000 * 60 * 60 * 24))

  const monthName = MONTH_NAMES[month - 1] ?? ''
  const nextDateFormatted = `${day} de ${monthName}`

  let status: 'today' | 'urgent' | 'soon' | 'later' = 'later'
  if (daysUntil === 0) status = 'today'
  else if (daysUntil <= 10) status = 'urgent'
  else if (daysUntil <= 30) status = 'soon'

  return { daysUntil, nextDateFormatted, status }
}

/** Obtiene las fechas especiales del usuario ordenadas por cercanía */
export function getCustomerSpecialDates(user?: User | null): CustomerSpecialDate[] {
  if (!user || !user.user_metadata) return []

  const rawList = user.user_metadata.special_dates
  if (!Array.isArray(rawList)) return []

  const dates: CustomerSpecialDate[] = []

  for (const item of rawList) {
    if (
      !item ||
      typeof item !== 'object' ||
      typeof item.id !== 'string' ||
      typeof item.recipientName !== 'string' ||
      typeof item.day !== 'number' ||
      typeof item.month !== 'number'
    ) {
      continue
    }

    const { daysUntil, nextDateFormatted, status } = calculateNextOccurrence(item.day, item.month)

    dates.push({
      id: item.id,
      recipientName: item.recipientName,
      occasion: typeof item.occasion === 'string' ? item.occasion : 'Cumpleaños',
      day: item.day,
      month: item.month,
      year: typeof item.year === 'number' ? item.year : undefined,
      notes: typeof item.notes === 'string' ? item.notes : '',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      lastNotifiedYear:
        typeof item.lastNotifiedYear === 'number' ? item.lastNotifiedYear : undefined,
      daysUntil,
      nextDateFormatted,
      status,
    })
  }

  // Ordenar por las más próximas primero
  return dates.sort((a, b) => a.daysUntil - b.daysUntil)
}

/** Agrega una nueva fecha especial a la cuenta del usuario */
export async function addCustomerSpecialDate(
  userId: string,
  userEmail: string,
  input: {
    recipientName: string
    occasion: string
    day: number
    month: number
    year?: number
    notes?: string
  },
): Promise<SpecialDateRecord> {
  const db = serviceDb()
  const { data, error } = await db.auth.admin.getUserById(userId)

  if (error || !data.user) {
    throw new Error('No se pudo encontrar al usuario para registrar la fecha')
  }

  const currentList = Array.isArray(data.user.user_metadata?.special_dates)
    ? (data.user.user_metadata.special_dates as SpecialDateRecord[])
    : []

  const newRecord: SpecialDateRecord = {
    id: crypto.randomUUID(),
    recipientName: input.recipientName.trim(),
    occasion: input.occasion.trim() || 'Cumpleaños',
    day: Math.max(1, Math.min(31, Math.round(input.day))),
    month: Math.max(1, Math.min(12, Math.round(input.month))),
    year: input.year ? Math.round(input.year) : undefined,
    notes: (input.notes ?? '').slice(0, 500),
    createdAt: new Date().toISOString(),
  }

  const updatedList = [...currentList, newRecord]

  const updateResult = await db.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...data.user.user_metadata,
      special_dates: updatedList,
    },
  })

  if (updateResult.error) {
    throw new Error(`Error al guardar fecha especial: ${updateResult.error.message}`)
  }

  // Si la tabla customer_reminders existe en Postgres, registrar también ahí
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('customer_reminders').insert({
      id: newRecord.id,
      customer_email: userEmail.toLowerCase().trim(),
      recipient_name: newRecord.recipientName,
      occasion: newRecord.occasion,
      day: newRecord.day,
      month: newRecord.month,
      year: newRecord.year ?? null,
      notes: newRecord.notes ?? '',
      created_at: newRecord.createdAt,
    })
  } catch {
    // Si la tabla opcional aún no está creada, ignorar silenciosamente
  }

  return newRecord
}

/** Elimina una fecha especial de la cuenta del usuario */
export async function deleteCustomerSpecialDate(userId: string, dateId: string): Promise<void> {
  const db = serviceDb()
  const { data, error } = await db.auth.admin.getUserById(userId)

  if (error || !data.user) {
    throw new Error('Usuario no encontrado')
  }

  const currentList = Array.isArray(data.user.user_metadata?.special_dates)
    ? (data.user.user_metadata.special_dates as SpecialDateRecord[])
    : []

  const updatedList = currentList.filter((item) => item.id !== dateId)

  const updateResult = await db.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...data.user.user_metadata,
      special_dates: updatedList,
    },
  })

  if (updateResult.error) {
    throw new Error(`Error al eliminar fecha: ${updateResult.error.message}`)
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).from('customer_reminders').delete().eq('id', dateId)
  } catch {
    // ignorar
  }
}

/**
 * Escanea los recordatorios de todos los clientes y envía el correo con cupón 15% OFF
 * a aquellos cuya fecha ocurra en los próximos 10 días (y que no se hayan notificado este año).
 */
export async function processAnnualReminders(): Promise<{ sent: number; checked: number }> {
  const db = serviceDb()
  const currentYear = new Date().getFullYear()
  const base = siteUrl()
  let sent = 0
  let checked = 0

  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (error || !data.users) {
    log.error('Error al listar usuarios para recordatorios anuales', error)
    return { sent: 0, checked: 0 }
  }

  for (const user of data.users) {
    if (!user.email) continue
    const dates = getCustomerSpecialDates(user)
    if (dates.length === 0) continue

    let hasUpdates = false
    const updatedRecords: SpecialDateRecord[] = []

    for (const d of dates) {
      checked++
      // Si faltan entre 0 y 10 días y no se notificó este año: enviar
      if (d.daysUntil <= 10 && d.daysUntil >= 0 && d.lastNotifiedYear !== currentYear) {
        try {
          await sendMail({
            to: user.email,
            tag: 'date-reminder',
            ...specialDateReminderEmail({
              recipientName: d.recipientName,
              occasion: d.occasion,
              daysUntil: d.daysUntil === 0 ? 0 : d.daysUntil,
              couponCode: 'RECORDAR15',
              discountPercent: 15,
              storeUrl: `${base}/galeria`,
            }),
          })

          sent++
          hasUpdates = true
          updatedRecords.push({ ...d, lastNotifiedYear: currentYear })

          log.info('Recordatorio anual de fecha enviado al cliente', {
            email: user.email,
            recipient: d.recipientName,
            occasion: d.occasion,
            daysUntil: d.daysUntil,
          })
        } catch (err) {
          log.error('Error enviando recordatorio anual', err, {
            email: user.email,
            recipient: d.recipientName,
          })
          updatedRecords.push(d)
        }
      } else {
        updatedRecords.push(d)
      }
    }

    if (hasUpdates) {
      await db.auth.admin.updateUserById(user.id, {
        user_metadata: {
          ...user.user_metadata,
          special_dates: updatedRecords,
        },
      })
    }
  }

  return { sent, checked }
}
