import 'server-only'
import type { CustomerRow } from '@/domain/admin/metrics'

/** Segmentos de clientes del panel (los usa la lista y la exportación). */
const DAY = 86_400_000

export function segmentOf(c: CustomerRow, now: number, vipFrom: number): string[] {
  const out: string[] = []
  if (c.sales > 0) out.push('compradores')
  if (c.sales > 1) out.push('recurrentes')
  if (c.sales === 0) out.push('abandonaron')
  if (c.firstPurchaseAt && now - Date.parse(c.firstPurchaseAt) < 30 * DAY) out.push('nuevos')
  if (c.spentCents > 0 && c.spentCents >= vipFrom) out.push('vip')
  return out
}

/** Desde cuánto gastado se es del 5 % que más compra. */
export function vipThreshold(rows: readonly CustomerRow[]): number {
  const spent = rows
    .map((r) => r.spentCents)
    .filter((v) => v > 0)
    .sort((a, b) => b - a)
  return spent[Math.floor(spent.length * 0.05)] ?? Number.POSITIVE_INFINITY
}
