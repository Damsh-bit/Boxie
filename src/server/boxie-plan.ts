import 'server-only'
import type { Plan } from '@/domain/plans'
import type { ParsedThemeConfig } from '@/slides/config'
import { configForPlan } from '@/slides/plans'
import { serviceDb } from './db/client'
import { log } from './log'
import { toPlan } from './mappers'

/**
 * El plan que se compró para una Boxie. Define qué pantallas ve el editor y
 * el regalo, cuántas fotos se suben, si se le puede poner clave y cuántos
 * días queda online. Sin plan (órdenes anteriores a los planes), todo.
 *
 * Se leen también los planes inactivos: un plan que dejó de venderse sigue
 * valiendo para lo que ya se vendió.
 */

export interface BoxiePlan {
  plan: Plan | null
  plans: Plan[]
}

export async function planOfOrder(orderId: string): Promise<BoxiePlan> {
  const order = await serviceDb().from('orders').select('plan_id').eq('id', orderId).maybeSingle()
  const planId = order.data?.plan_id ?? null
  if (order.error || !planId) {
    if (order.error) log.warn('No se pudo leer el plan de la orden', { error: order.error.message })
    return { plan: null, plans: [] }
  }
  const all = await serviceDb().from('plans').select('*')
  if (all.error) {
    log.warn('No se pudieron leer los planes', { error: all.error.message })
    return { plan: null, plans: [] }
  }
  const plans = all.data.map(toPlan)
  return { plan: plans.find((p) => p.id === planId) ?? null, plans }
}

/** La temática vendida recortada al plan (sin plan, entera). */
export function applyPlan(
  config: ParsedThemeConfig,
  { plan, plans }: BoxiePlan,
): ParsedThemeConfig {
  return plan ? configForPlan(config, plan, plans) : config
}
