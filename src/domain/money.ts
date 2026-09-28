/**
 * Dinero. Siempre enteros en centavos: nada de float para plata.
 */

export type Cents = number

export const CURRENCY = 'ARS' as const
export type Currency = 'ARS' | 'USD'

export function pesosToCents(pesos: number): Cents {
  return Math.round(pesos * 100)
}

export function centsToPesos(cents: Cents): number {
  return cents / 100
}

const formatters = new Map<string, Intl.NumberFormat>()

/** "$ 15.000" · "$ 14.990,50" (los centavos solo aparecen si existen). */
export function formatARS(cents: Cents): string {
  const hasDecimals = cents % 100 !== 0
  const key = `ARS-${hasDecimals}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    })
    formatters.set(key, formatter)
  }
  return formatter.format(centsToPesos(cents))
}

/** "US$ 5" · "US$ 4,50" (formato estándar de dólares). */
export function formatUSD(usdCents: Cents): string {
  const hasDecimals = usdCents % 100 !== 0
  const key = `USD-${hasDecimals}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    })
    formatters.set(key, formatter)
  }
  return formatter.format(usdCents / 100)
}

/**
 * Convierte centavos de ARS a centavos de USD usando una tasa de cambio (pesos por dólar).
 */
export function arsToUsdCents(arsCents: Cents, exchangeRate: number): Cents {
  if (!exchangeRate || exchangeRate <= 0) return 0
  // arsCents / 100 = pesos; pesos / exchangeRate = usd; usd * 100 = usdCents
  return Math.round(arsCents / exchangeRate)
}

/**
 * Formatea un monto en ARS según la moneda seleccionada. Si la moneda es USD,
 * se convierte según la tasa de cambio provista.
 */
export function formatMoney(
  arsCents: Cents,
  currency: Currency = 'ARS',
  exchangeRate?: number,
): string {
  if (currency === 'USD' && exchangeRate && exchangeRate > 0) {
    return formatUSD(arsToUsdCents(arsCents, exchangeRate))
  }
  return formatARS(arsCents)
}
