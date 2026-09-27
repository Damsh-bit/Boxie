import 'server-only'
import type { Expense } from '@/domain/admin/types'
import { channelLabel } from '@/domain/marketing/channels'
import type { Campaign, SpendEntry } from '@/domain/marketing/types'
import { log } from '../log'
import { marketingRepo } from './repo'

/**
 * La pauta que se carga por campaña (Marketing › Campañas) también es un
 * gasto: Finanzas y el Resumen la suman como gastos de "Marketing y
 * publicidad", un gasto único por día y canal. Así no hace falta cargarla dos
 * veces (y si se carga dos veces, Marketing avisa).
 */
export function spendAsExpenses(
  campaigns: readonly Campaign[],
  spend: readonly SpendEntry[],
): Expense[] {
  const channelOf = new Map(campaigns.map((c) => [c.id, c.channel]))
  const byDay = new Map<string, Expense>()
  for (const e of spend) {
    if (e.spendCents <= 0) continue
    const channel = channelOf.get(e.campaignId)
    if (!channel) continue
    const key = `${e.day}|${channel}`
    const row = byDay.get(key)
    if (row) row.amountCents += e.spendCents
    else
      byDay.set(key, {
        id: `pauta-${key}`,
        category: 'marketing',
        description: `Pauta · ${channelLabel(channel)}`,
        vendor: channelLabel(channel),
        amountCents: e.spendCents,
        recurrence: 'once',
        startsOn: e.day,
        endsOn: null,
        createdAt: `${e.day}T12:00:00.000-03:00`,
      })
  }
  return [...byDay.values()]
}

/** Los gastos cargados más la pauta de las campañas (sin romper si marketing no está). */
export async function expensesWithAdSpend(expenses: readonly Expense[]): Promise<Expense[]> {
  try {
    const data = await (await marketingRepo()).dataset()
    return [...expenses, ...spendAsExpenses(data.campaigns, data.spend)]
  } catch (error) {
    log.warn('No se pudo sumar la pauta a los gastos', {
      error: error instanceof Error ? error.message : String(error),
    })
    return [...expenses]
  }
}
