import { z } from 'zod'
import { missingRequired, type MissingField } from './fields'
import {
  isSlideKind,
  slideDefinitions,
  type BuyerPropsOf,
  type SlideKind,
  type ThemePropsOf,
} from './schemas'
import { FrameSchema, ThemeConfigSchema, type Frame, type Palette } from './theme-config'

/**
 * Validación de temáticas y del contenido del comprador contra el registro.
 * La usan el servidor (al publicar, al guardar el editor, al bloquear) y el
 * constructor del admin (para mostrar errores antes de publicar).
 */

export type ParsedSlide = {
  [K in SlideKind]: { key: string; kind: K; props: ThemePropsOf<K>; frame: Frame }
}[SlideKind]

export interface ParsedThemeConfig {
  palette: Palette
  slides: ParsedSlide[]
}

export type ParseResult<T> = { success: true; data: T } | { success: false; issues: string[] }

function formatIssues(prefix: string, error: z.ZodError): string[] {
  return error.issues.map(
    (i) => `${prefix}${i.path.length ? `${i.path.join('.')}: ` : ''}${i.message}`,
  )
}

export function parseThemeConfig(input: unknown): ParseResult<ParsedThemeConfig> {
  const base = ThemeConfigSchema.safeParse(input)
  if (!base.success) return { success: false, issues: formatIssues('', base.error) }

  const issues: string[] = []
  const seen = new Set<string>()
  const slides: ParsedSlide[] = []

  base.data.slides.forEach((slide, index) => {
    const where = `Slide ${index + 1} (${slide.key}): `
    if (seen.has(slide.key)) issues.push(`${where}la clave está repetida`)
    seen.add(slide.key)

    if (!isSlideKind(slide.kind)) {
      issues.push(`${where}tipo desconocido "${slide.kind}"`)
      return
    }
    const definition = slideDefinitions[slide.kind]
    const props = definition.themeSchema.safeParse(slide.props)
    if (!props.success) {
      issues.push(...formatIssues(where, props.error))
      return
    }
    const frame = FrameSchema.parse({ ...definition.frame, ...slide.frame })
    slides.push({ key: slide.key, kind: slide.kind, props: props.data, frame } as ParsedSlide)
  })

  if (issues.length) return { success: false, issues }
  return { success: true, data: { palette: base.data.palette, slides } }
}

/** Versión estricta para datos que ya se validaron al publicar. */
export function readThemeConfig(input: unknown): ParsedThemeConfig {
  const result = parseThemeConfig(input)
  if (!result.success)
    throw new Error(`Configuración de temática inválida:\n${result.issues.join('\n')}`)
  return result.data
}

// ── Contenido del comprador ─────────────────────────────────────────────────

export const GlobalsSchema = z.object({
  recipientName: z.string().trim().max(40),
  senderName: z.string().trim().max(40),
})

export interface BuyerContent {
  recipientName: string
  senderName: string
  slides: Record<string, Record<string, unknown>>
}

/** Slides de la temática que tienen algo para completar por el comprador. */
export function buyerSlides(config: ParsedThemeConfig) {
  return config.slides.filter((s) => slideDefinitions[s.kind].buyerSchema !== null)
}

/**
 * Valida (y normaliza) lo que el editor manda a guardar. Los borradores pueden
 * estar incompletos; lo que no puede pasar es que un campo no respete su
 * schema (largo, tipo, foto que no es una referencia válida).
 */
export function parseBuyerContent(
  config: ParsedThemeConfig,
  input: unknown,
): ParseResult<BuyerContent> {
  const shape = z.object({
    recipientName: GlobalsSchema.shape.recipientName,
    senderName: GlobalsSchema.shape.senderName,
    slides: z.record(z.string(), z.record(z.string(), z.unknown())).default({}),
  })
  const base = shape.safeParse(input)
  if (!base.success) return { success: false, issues: formatIssues('', base.error) }

  const issues: string[] = []
  const slides: Record<string, Record<string, unknown>> = {}
  for (const slide of buyerSlides(config)) {
    const schema = slideDefinitions[slide.kind].buyerSchema as z.ZodType | null
    if (!schema) continue
    const parsed = schema.safeParse(base.data.slides[slide.key] ?? {})
    if (!parsed.success) issues.push(...formatIssues(`${slide.key}: `, parsed.error))
    else slides[slide.key] = parsed.data as Record<string, unknown>
  }
  if (issues.length) return { success: false, issues }
  return {
    success: true,
    data: { recipientName: base.data.recipientName, senderName: base.data.senderName, slides },
  }
}

/** Lo que falta para poder bloquear y regalar. Vacío = lista para bloquear. */
export function missingForLock(config: ParsedThemeConfig, content: BuyerContent): MissingField[] {
  const missing: MissingField[] = []
  if (!content.recipientName.trim())
    missing.push({ path: 'recipientName', label: 'Para (destinatario)' })
  if (!content.senderName.trim()) missing.push({ path: 'senderName', label: 'De parte de' })
  for (const slide of buyerSlides(config)) {
    const schema = slideDefinitions[slide.kind].buyerSchema
    if (!schema) continue
    for (const m of missingRequired(schema, content.slides[slide.key] ?? {})) {
      missing.push({ path: `${slide.key}.${m.path}`, label: m.label })
    }
  }
  return missing
}

export function buyerPropsFor<K extends SlideKind>(kind: K, raw: unknown): BuyerPropsOf<K> {
  const schema = slideDefinitions[kind].buyerSchema as z.ZodType | null
  if (!schema) return {} as BuyerPropsOf<K>
  const parsed = schema.safeParse(raw ?? {})
  return (parsed.success ? parsed.data : schema.parse({})) as BuyerPropsOf<K>
}

/** Todas las referencias a fotos del comprador en su contenido (para firmar URLs). */
export function collectAssetIds(content: BuyerContent): string[] {
  const ids = new Set<string>()
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) return value.forEach(visit)
    const record = value as Record<string, unknown>
    if (typeof record.assetId === 'string' && Object.keys(record).length === 1)
      ids.add(record.assetId)
    Object.values(record).forEach(visit)
  }
  visit(content.slides)
  return [...ids]
}
