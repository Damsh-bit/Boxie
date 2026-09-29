import { describe, expect, it } from 'vitest'
import { calculateNextOccurrence, getCustomerSpecialDates } from './reminders'
import type { User } from '@supabase/supabase-js'

describe('calculateNextOccurrence', () => {
  it('calculates days until upcoming date in the current year', () => {
    // Referencia fija: 1 de octubre de 2026
    const now = new Date('2026-10-01T12:00:00Z')

    // Evento el 10 de octubre: faltan 9 días
    const res = calculateNextOccurrence(10, 10, now)
    expect(res.daysUntil).toBe(9)
    expect(res.nextDateFormatted).toBe('10 de octubre')
    expect(res.status).toBe('urgent')
  })

  it('marks today when day and month match', () => {
    const now = new Date('2026-10-01T12:00:00Z')
    const res = calculateNextOccurrence(1, 10, now)
    expect(res.daysUntil).toBe(0)
    expect(res.status).toBe('today')
  })

  it('wraps around to next year if date has already passed', () => {
    const now = new Date('2026-10-01T12:00:00Z')

    // Evento en enero (ya pasó en 2026, corresponde a 2027)
    const res = calculateNextOccurrence(15, 1, now)
    expect(res.daysUntil).toBeGreaterThan(100)
    expect(res.nextDateFormatted).toBe('15 de enero')
    expect(res.status).toBe('later')
  })
})

describe('getCustomerSpecialDates', () => {
  it('returns empty array when user has no metadata', () => {
    expect(getCustomerSpecialDates(null)).toEqual([])
    expect(getCustomerSpecialDates({ id: 'u1' } as User)).toEqual([])
  })

  it('parses and sorts special dates by proximity', () => {
    const user = {
      id: 'u1',
      user_metadata: {
        special_dates: [
          {
            id: 'd1',
            recipientName: 'Mamá',
            occasion: 'Cumpleaños',
            day: 20,
            month: 12,
          },
          {
            id: 'd2',
            recipientName: 'Sofi',
            occasion: 'Aniversario',
            day: 5,
            month: 10,
          },
        ],
      },
    } as unknown as User

    const list = getCustomerSpecialDates(user)
    expect(list.length).toBe(2)
    // d2 (octubre) debe aparecer antes que d1 (diciembre) si estamos a fines de septiembre/octubre
    expect(list[0]?.recipientName).toBe('Sofi')
    expect(list[1]?.recipientName).toBe('Mamá')
  })
})
