import { z } from 'zod'

/**
 * Texto enriquecido serializable (docs/ARQUITECTURA.md §4.1).
 *
 * THEME_CONTENT del prototipo guardaba JSX (`<>¿Quién<br/><span>eres tú</span></>`),
 * que no entra en una base de datos. Este formato sí: sobrevive a
 * JSON.stringify, no usa HTML (nada de dangerouslySetInnerHTML) y alcanza
 * para lo que las temáticas necesitan: saltos de línea y algunas marcas.
 *
 *   { "t": "rich", "v": [ { "text": "¿Quién" }, { "br": true },
 *                         { "text": "eres tú", "mark": "accent" } ] }
 *
 * Para editarlo desde el panel existe una notación de texto equivalente:
 *   *acento*   **negrita**   ==resaltado==   _itálica_   (salto de línea = br)
 */

export const RICH_MARKS = ['accent', 'bold', 'highlight', 'italic'] as const
export type RichMark = (typeof RICH_MARKS)[number]

const TextNode = z
  .object({ text: z.string().max(2000), mark: z.enum(RICH_MARKS).optional() })
  .strict()
const BreakNode = z.object({ br: z.literal(true) }).strict()
export const RichNodeSchema = z.union([TextNode, BreakNode])

export const RichTextSchema = z.object({
  t: z.literal('rich'),
  v: z.array(RichNodeSchema).max(300),
})

export type RichNode = z.infer<typeof RichNodeSchema>
export type RichText = z.infer<typeof RichTextSchema>

export function rich(...nodes: (string | RichNode)[]): RichText {
  return { t: 'rich', v: nodes.map((n) => (typeof n === 'string' ? { text: n } : n)) }
}

export const br = { br: true } as const
export const accent = (text: string): RichNode => ({ text, mark: 'accent' })
export const highlight = (text: string): RichNode => ({ text, mark: 'highlight' })

export function richToPlain(value: RichText | string | null | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value.v.map((n) => ('br' in n ? '\n' : n.text)).join('')
}

// ── Notación de texto para el editor del panel ──────────────────────────────

const MARKERS: { mark: RichMark; open: string; close: string }[] = [
  { mark: 'bold', open: '**', close: '**' },
  { mark: 'highlight', open: '==', close: '==' },
  { mark: 'accent', open: '*', close: '*' },
  { mark: 'italic', open: '_', close: '_' },
]

function escapeMarkup(text: string): string {
  return text.replace(/([\\*=_])/g, '\\$1')
}

export function richToMarkup(value: RichText | null | undefined): string {
  if (!value) return ''
  return value.v
    .map((n) => {
      if ('br' in n) return '\n'
      const escaped = escapeMarkup(n.text)
      const marker = MARKERS.find((m) => m.mark === n.mark)
      return marker ? `${marker.open}${escaped}${marker.close}` : escaped
    })
    .join('')
}

export function markupToRich(markup: string): RichText {
  const nodes: RichNode[] = []
  let buffer = ''
  let current: RichMark | undefined

  const flush = () => {
    if (buffer) nodes.push(current ? { text: buffer, mark: current } : { text: buffer })
    buffer = ''
  }

  let i = 0
  const source = markup.replace(/\r\n?/g, '\n')
  while (i < source.length) {
    const ch = source[i]!
    if (ch === '\\' && i + 1 < source.length) {
      buffer += source[i + 1]
      i += 2
      continue
    }
    if (ch === '\n') {
      flush()
      nodes.push({ br: true })
      i += 1
      continue
    }
    const marker = current
      ? MARKERS.find((m) => m.mark === current && source.startsWith(m.close, i))
      : MARKERS.find(
          (m) => source.startsWith(m.open, i) && source.indexOf(m.close, i + m.open.length) > i,
        )
    if (marker) {
      flush()
      current = current ? undefined : marker.mark
      i += current ? marker.open.length : marker.close.length
      continue
    }
    buffer += ch
    i += 1
  }
  flush()
  return { t: 'rich', v: nodes }
}
