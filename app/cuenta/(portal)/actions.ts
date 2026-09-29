'use server'

import { revalidatePath } from 'next/cache'
import { requireCustomerSession } from '@/server/customer/session'
import { addCustomerSpecialDate, deleteCustomerSpecialDate } from '@/server/customer/reminders'

export interface AddSpecialDateResult {
  ok: boolean
  error?: string
}

export async function addSpecialDateAction(data: {
  recipientName: string
  occasion: string
  day: number
  month: number
  year?: number
  notes?: string
}): Promise<AddSpecialDateResult> {
  try {
    const session = await requireCustomerSession('/cuenta')

    if (!data.recipientName || data.recipientName.trim().length === 0) {
      return { ok: false, error: 'Por favor indicá el nombre de la persona.' }
    }

    if (!data.day || data.day < 1 || data.day > 31) {
      return { ok: false, error: 'Por favor indicá un día válido (1 a 31).' }
    }

    if (!data.month || data.month < 1 || data.month > 12) {
      return { ok: false, error: 'Por favor indicá un mes válido.' }
    }

    await addCustomerSpecialDate(session.user.id, session.email, {
      recipientName: data.recipientName,
      occasion: data.occasion || 'Cumpleaños',
      day: data.day,
      month: data.month,
      year: data.year,
      notes: data.notes,
    })

    revalidatePath('/cuenta')
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al guardar la fecha'
    return { ok: false, error: message }
  }
}

export async function deleteSpecialDateAction(dateId: string): Promise<AddSpecialDateResult> {
  try {
    const session = await requireCustomerSession('/cuenta')
    if (!dateId) return { ok: false, error: 'ID inválido' }

    await deleteCustomerSpecialDate(session.user.id, dateId)
    revalidatePath('/cuenta')
    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al eliminar la fecha'
    return { ok: false, error: message }
  }
}
