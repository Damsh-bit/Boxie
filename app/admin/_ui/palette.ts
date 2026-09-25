/**
 * Colores de las series de los gráficos (variables de globals.css, orden
 * fijo validado para daltonismo). Vive aparte de charts.tsx (que es de
 * cliente) para que los Server Components también los puedan usar: un valor
 * importado de un módulo 'use client' llega al servidor como referencia, no
 * como el valor.
 */
export const SERIES = [1, 2, 3, 4, 5, 6].map((n) => `var(--color-series-${n})`)
