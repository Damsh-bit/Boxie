import { formatARS, type Cents } from '../money'
import { AR_OFFSET_MS } from './range'

/**
 * Formatos del panel (es-AR). Los montos grandes se abrevian en tarjetas y
 * ejes ("$ 1,2 M"); en tablas y detalles van completos.
 */

export { formatARS }

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 })
const integer = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })

/** "$ 1,2 M" · "$ 850 mil" · "$ 4.990". */
export function formatCompactARS(cents: Cents): string {
  const pesos = cents / 100
  if (Math.abs(pesos) < 100_000) return formatARS(Math.round(pesos) * 100)
  return `$ ${compact.format(pesos)}`
}

export function formatNumber(n: number): string {
  return integer.format(n)
}

export function formatCompactNumber(n: number): string {
  return Math.abs(n) < 10_000 ? integer.format(n) : compact.format(n)
}

/** 0.1234 → "12,3 %". */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toLocaleString('es-AR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  })} %`
}

/** Puntos básicos → "6,29 %". */
export function formatBps(bps: number): string {
  return `${(bps / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`
}

/** +0.123 → "+12 %", null → "—". */
export function formatDelta(delta: number | null): string {
  if (delta === null) return '—'
  const pct = Math.round(delta * 100)
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)} %`
}

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function arParts(date: Date | string) {
  const d = new Date(new Date(date).getTime() + AR_OFFSET_MS)
  return {
    y: d.getUTCFullYear(),
    m: d.getUTCMonth(),
    d: d.getUTCDate(),
    hh: String(d.getUTCHours()).padStart(2, '0'),
    mm: String(d.getUTCMinutes()).padStart(2, '0'),
  }
}

/** "24 sep 2026" (hora argentina). */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const p = arParts(date)
  return `${p.d} ${MONTHS[p.m]} ${p.y}`
}

/** "24 sep, 21:40" (hora argentina). */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '—'
  const p = arParts(date)
  return `${p.d} ${MONTHS[p.m]}${p.y !== arParts(new Date()).y ? ` ${p.y}` : ''}, ${p.hh}:${p.mm}`
}

/** "hace 3 min" · "hace 2 h" · "ayer" · "hace 5 días" · "en 3 días". */
export function formatRelative(date: Date | string | null | undefined, now = new Date()): string {
  if (!date) return '—'
  const diff = new Date(date).getTime() - now.getTime()
  const abs = Math.abs(diff)
  const future = diff > 0
  const minutes = Math.round(abs / 60_000)
  if (minutes < 1) return future ? 'en un momento' : 'recién'
  if (minutes < 60) return future ? `en ${minutes} min` : `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return future ? `en ${hours} h` : `hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return future ? 'mañana' : 'ayer'
  if (days < 45) return future ? `en ${days} días` : `hace ${days} días`
  const months = Math.round(days / 30)
  if (months < 12) return future ? `en ${months} meses` : `hace ${months} meses`
  return formatDate(date)
}

export function initials(name: string): string {
  return (
    name
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?'
  )
}

/** Centavos ↔ pesos en los formularios (los formularios muestran pesos). */
export const toPesos = (cents: Cents) => cents / 100
export const toCents = (pesos: number) => Math.round(pesos * 100)
