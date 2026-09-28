import 'server-only'
import { cache } from 'react'
import { log } from './log'

export interface ExchangeRate {
  rate: number
  currency: 'USD'
  updatedAt: string
  source: 'dolarapi' | 'fallback'
}

/** Tasa de respaldo por si DolarApi está caído o no responde. */
const FALLBACK_RATE = 1500

/**
 * Consulta la cotización del dólar oficial en Argentina desde DolarApi.
 * Cacheado en servidor para revalidar cada 1 hora (3600s).
 */
export const getUsdExchangeRate = cache(async (): Promise<ExchangeRate> => {
  try {
    const res = await fetch('https://dolarapi.com/v1/dolares/oficial', {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3500),
    })

    if (!res.ok) {
      log.warn(`DolarApi respondió status ${res.status}. Usando tasa de respaldo.`)
      return {
        rate: FALLBACK_RATE,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
        source: 'fallback',
      }
    }

    const data = (await res.json()) as {
      venta?: number
      compra?: number
      fechaActualizacion?: string
    }

    const rate = Number(data.venta || data.compra)
    if (!rate || isNaN(rate) || rate <= 0) {
      log.warn('DolarApi devolvió una tasa inválida. Usando tasa de respaldo.', { data })
      return {
        rate: FALLBACK_RATE,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
        source: 'fallback',
      }
    }

    return {
      rate,
      currency: 'USD',
      updatedAt: data.fechaActualizacion || new Date().toISOString(),
      source: 'dolarapi',
    }
  } catch (error) {
    log.warn('No se pudo obtener la cotización de DolarApi. Usando tasa de respaldo.', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      rate: FALLBACK_RATE,
      currency: 'USD',
      updatedAt: new Date().toISOString(),
      source: 'fallback',
    }
  }
})
