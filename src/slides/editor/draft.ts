import type { z } from 'zod'
import { buyerSlides, type BuyerContent, type ParsedThemeConfig } from '../config'
import { initialBuyerProps, slideDefinitions } from '../schemas'

/**
 * El borrador del editor: los nombres y lo que el comprador cargó en cada
 * slide. Tiene la misma forma que lo que guarda el servidor (BuyerContent),
 * así el editor real y el de prueba comparten todo menos dónde se guarda.
 */
export type EditorDraft = BuyerContent

export type Path = readonly (string | number)[]

/**
 * Borrador inicial: lo guardado, o las sugerencias de la temática (10 razones
 * y vales de la cuponera, como el prototipo) para lo que todavía no se tocó.
 * Cada slide pasa por su schema: lo que falta toma su valor por defecto.
 */
export function initialDraft(
  config: ParsedThemeConfig,
  stored?: Partial<EditorDraft> | null,
): EditorDraft {
  const slides: EditorDraft['slides'] = {}
  for (const slide of buyerSlides(config)) {
    const schema = slideDefinitions[slide.kind].buyerSchema as z.ZodType | null
    if (!schema) continue
    const saved = stored?.slides?.[slide.key]
    const base = saved ?? initialBuyerProps(slide.kind, slide.props as Record<string, unknown>)
    const parsed = schema.safeParse(base)
    slides[slide.key] = (parsed.success ? parsed.data : schema.parse({})) as Record<string, unknown>
  }
  return {
    recipientName: stored?.recipientName ?? '',
    senderName: stored?.senderName ?? '',
    slides,
  }
}

export function getIn(value: unknown, path: Path): unknown {
  let current = value
  for (const key of path) {
    if (current === null || typeof current !== 'object') return undefined
    current = (current as Record<string | number, unknown>)[key]
  }
  return current
}

/** Copia con `value` en `path`. No muta: React compara por referencia. */
export function setIn<T>(target: T, path: Path, value: unknown): T {
  if (path.length === 0) return value as T
  const [head, ...rest] = path
  const source = (target ?? (typeof head === 'number' ? [] : {})) as Record<
    string | number,
    unknown
  >
  const next = Array.isArray(source) ? [...source] : { ...source }
  ;(next as Record<string | number, unknown>)[head!] = setIn(
    (source as Record<string | number, unknown>)[head!],
    rest,
    value,
  )
  return next as T
}

/** Mueve un ítem de una lista (para reordenar razones o vales). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return [...list]
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item as T)
  return next
}
