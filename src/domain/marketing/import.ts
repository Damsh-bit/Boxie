/**
 * Importar resultados de campañas pegando la exportación del administrador
 * de anuncios (Meta Ads Manager, Google Ads, TikTok Ads): CSV con coma, punto
 * y coma o tabulaciones, encabezados en castellano o en inglés y números con
 * formato argentino ("1.234,56") o inglés ("1,234.56").
 *
 * Cada fila tiene que tener el día y el gasto; la campaña, las impresiones,
 * los clics y las compras son opcionales.
 */

export interface ParsedSpendRow {
  line: number
  day: string
  campaignName: string
  spendCents: number
  impressions: number
  clicks: number
  platformConversions: number
}

export interface ParseResult {
  rows: ParsedSpendRow[]
  /** Qué columna se usó para cada dato (para mostrarlo antes de importar). */
  columns: Partial<Record<Field, string>>
  errors: { line: number; message: string }[]
}

type Field = 'day' | 'campaign' | 'spend' | 'impressions' | 'clicks' | 'conversions'

const SYNONYMS: Record<Field, string[]> = {
  day: ['dia', 'day', 'fecha', 'date', 'inicio del informe', 'reporting starts', 'reporting start'],
  campaign: ['nombre de la campana', 'campana', 'campaign name', 'campaign', 'nombre de campana'],
  spend: [
    'importe gastado',
    'importe gastado (ars)',
    'gasto',
    'costo',
    'coste',
    'cost',
    'amount spent',
    'amount spent (ars)',
    'spend',
    'inversion',
  ],
  impressions: ['impresiones', 'impr', 'impr.', 'impressions'],
  clicks: [
    'clics en el enlace',
    'clics (todos)',
    'clics',
    'link clicks',
    'clicks (all)',
    'clicks',
    'interacciones',
  ],
  conversions: [
    'compras',
    'compras en el sitio web',
    'conversiones',
    'purchases',
    'website purchases',
    'conversions',
    'resultados',
    'results',
  ],
}

const norm = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Parte un CSV respetando comillas ("a, b" es un solo campo). */
export function splitCsv(text: string, delimiter: string): string[][] {
  const out: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"'
        i++
      } else if (ch === '"') quoted = false
      else field += ch
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === delimiter) {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      out.push(row)
      row = []
      field = ''
    } else field += ch
  }
  if (field !== '' || row.length) {
    row.push(field)
    out.push(row)
  }
  return out.filter((r) => r.some((c) => c.trim() !== ''))
}

function detectDelimiter(firstLine: string): string {
  const counts = ['\t', ';', ','].map((d) => [d, firstLine.split(d).length] as const)
  return counts.sort((a, b) => b[1] - a[1])[0]![0]
}

/**
 * "1.234,56" → 1234.56 · "1,234.56" → 1234.56 · "$ 12.500" → 12500 ·
 * "1234" → 1234. null si no es un número.
 */
export function parseNumber(raw: string): number | null {
  let s = raw.replace(/[^\d.,-]/g, '')
  if (!s || s === '-') return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > -1 && lastDot > -1) {
    // El último separador es el decimal.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.')
    else s = s.replace(/,/g, '')
  } else if (lastComma > -1) {
    // "1,5" decimal; "1,234" miles (tres dígitos después de una sola coma).
    const parts = s.split(',')
    s = parts.length === 2 && parts[1]!.length !== 3 ? s.replace(',', '.') : s.replace(/,/g, '')
  } else if (lastDot > -1) {
    const parts = s.split('.')
    if (parts.length > 2 || (parts.length === 2 && parts[1]!.length === 3)) s = s.replace(/\./g, '')
  }
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

/** "2026-09-20" · "20/09/2026" · "20/9/26" · "2026/09/20" → "2026-09-20". */
export function parseDay(raw: string): string | null {
  const s = raw.trim()
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s)
  if (m) return valid(Number(m[1]), Number(m[2]), Number(m[3]))
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s)
  if (m) {
    const year = m[3]!.length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return valid(year, Number(m[2]), Number(m[1]))
  }
  return null
}

function valid(y: number, m: number, d: number): string | null {
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d)
    return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function parseSpendCsv(text: string): ParseResult {
  const trimmed = text.replace(/^﻿/, '').trim()
  if (!trimmed) return { rows: [], columns: {}, errors: [] }
  const delimiter = detectDelimiter(trimmed.split(/\r?\n/)[0] ?? '')
  const table = splitCsv(trimmed, delimiter)
  const header = (table[0] ?? []).map(norm)

  const columns: Partial<Record<Field, string>> = {}
  const index: Partial<Record<Field, number>> = {}
  for (const field of Object.keys(SYNONYMS) as Field[]) {
    // Primero la coincidencia exacta; después, la que empieza igual.
    let i = header.findIndex((h) => SYNONYMS[field].includes(h))
    if (i < 0) i = header.findIndex((h) => SYNONYMS[field].some((s) => h.startsWith(s)))
    if (i >= 0 && !Object.values(index).includes(i)) {
      index[field] = i
      columns[field] = table[0]![i]!.trim()
    }
  }

  const errors: ParseResult['errors'] = []
  if (index.day === undefined || index.spend === undefined) {
    errors.push({
      line: 1,
      message:
        'No encontramos las columnas del día y del gasto. Exportá el informe desglosado por día.',
    })
    return { rows: [], columns, errors }
  }

  const rows: ParsedSpendRow[] = []
  table.slice(1).forEach((cells, i) => {
    const line = i + 2
    const cell = (f: Field) => (index[f] === undefined ? '' : (cells[index[f]!] ?? ''))
    // Las filas de totales ("Total", "Resultados de 3 campañas") no tienen día.
    const day = parseDay(cell('day'))
    if (!day) {
      if (cell('day').trim())
        errors.push({ line, message: `Fecha que no entendemos: "${cell('day')}"` })
      return
    }
    const spend = parseNumber(cell('spend'))
    if (spend === null || spend < 0) {
      errors.push({ line, message: `Gasto que no entendemos: "${cell('spend')}"` })
      return
    }
    const int = (f: Field) => Math.max(0, Math.round(parseNumber(cell(f)) ?? 0))
    rows.push({
      line,
      day,
      campaignName: cell('campaign').trim().slice(0, 120) || 'Sin nombre',
      spendCents: Math.round(spend * 100),
      impressions: int('impressions'),
      clicks: int('clicks'),
      platformConversions: int('conversions'),
    })
  })
  return { rows, columns, errors }
}
