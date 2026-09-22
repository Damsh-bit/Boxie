/**
 * Dinero. Siempre enteros en centavos: nada de float para plata.
 */

export type Cents = number

export const CURRENCY = 'ARS' as const

export function pesosToCents(pesos: number): Cents {
  return Math.round(pesos * 100)
}

export function centsToPesos(cents: Cents): number {
  return cents / 100
}

const formatters = new Map<boolean, Intl.NumberFormat>()

/** "$ 15.000" · "$ 14.990,50" (los centavos solo aparecen si existen). */
export function formatARS(cents: Cents): string {
  const hasDecimals = cents % 100 !== 0
  let formatter = formatters.get(hasDecimals)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: CURRENCY,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    })
    formatters.set(hasDecimals, formatter)
  }
  return formatter.format(centsToPesos(cents))
}
