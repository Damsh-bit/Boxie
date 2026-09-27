import {
  formatARS,
  formatCompactARS,
  formatCompactNumber,
  formatMultiple,
  formatNumber,
  formatPercent,
} from '@/domain/admin/format'

/** Formatos que un Server Component le puede pasar a un gráfico (un string, no una función). */
export type NumberFormat =
  'ars' | 'ars-compact' | 'number' | 'number-compact' | 'percent' | 'multiple'

export function formatValue(value: number, format: NumberFormat): string {
  switch (format) {
    case 'ars':
      // El panel muestra pesos enteros: los promedios y proyecciones no llevan centavos.
      return formatARS(Math.round(value / 100) * 100)
    case 'ars-compact':
      return formatCompactARS(Math.round(value))
    case 'number':
      return formatNumber(Math.round(value))
    case 'number-compact':
      return formatCompactNumber(Math.round(value))
    case 'percent':
      return formatPercent(value)
    case 'multiple':
      return formatMultiple(value)
  }
}
