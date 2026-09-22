import { z } from 'zod'
import { RichTextSchema } from './rich-text'

/**
 * Constructores de campos para los schemas de las slides.
 *
 * Cada campo es un schema de Zod común (valida y tipa) con metadatos de UI
 * registrados aparte. <SchemaForm> recorre el schema y arma el formulario a
 * partir de esos metadatos: agregar una slide nueva no obliga a escribir su
 * formulario de admin ni su formulario de editor (docs/ARQUITECTURA.md §4.3).
 */

export type Widget =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'image'
  | 'video'
  | 'photo'
  | 'color'
  | 'select'
  | 'toggle'
  | 'number'
  | 'url'
  | 'youtube'
  | 'list'
  | 'group'

export interface FieldMeta {
  widget: Widget
  label: string
  help?: string
  placeholder?: string
  /** Solo para el comprador: tiene que estar completo para poder bloquear la Boxie. */
  required?: boolean
  options?: readonly { value: string; label: string }[]
  /** Listas: rótulo de cada ítem, `{n}` se reemplaza por el número. */
  itemLabel?: string
  /** Agrupa campos secundarios bajo "Más opciones" en el formulario. */
  advanced?: boolean
}

export const fieldMeta = z.registry<FieldMeta>()

type Common = Pick<FieldMeta, 'help' | 'placeholder' | 'required' | 'advanced'>

function meta<T extends z.ZodType>(schema: T, data: FieldMeta): T {
  fieldMeta.add(schema, data)
  return schema
}

/** URL absoluta https, ruta del sitio (/themes/...) o vacío. */
export const MediaUrlSchema = z
  .string()
  .max(1000)
  .refine((v) => v === '' || v.startsWith('/') || /^https:\/\//.test(v), 'Tiene que ser una URL https o una ruta del sitio')

/** Foto subida por el comprador: se guarda la referencia; la URL firmada la arma el servidor. */
export const BuyerPhotoSchema = z.object({ assetId: z.uuid() }).strict()
export type BuyerPhoto = z.infer<typeof BuyerPhotoSchema>

export const HexColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB')

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (YOUTUBE_ID.test(trimmed)) return trimmed
  const match = trimmed.match(/(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([A-Za-z0-9_-]{11})/)
  return match?.[1] ?? null
}

export const field = {
  text(label: string, o: Common & { max?: number; default?: string } = {}) {
    const s = meta(z.string().max(o.max ?? 120), { widget: 'text', label, ...pick(o) })
    return o.default === undefined ? s.default('') : s.default(o.default)
  },

  textarea(label: string, o: Common & { max?: number; default?: string } = {}) {
    const s = meta(z.string().max(o.max ?? 600), { widget: 'textarea', label, ...pick(o) })
    return s.default(o.default ?? '')
  },

  richText(label: string, o: Common & { default: z.input<typeof RichTextSchema> }) {
    return meta(RichTextSchema.clone(), { widget: 'richtext', label, ...pick(o) }).default(o.default)
  },

  /** Imagen de la temática (la carga el admin). */
  image(label: string, o: Common & { default?: string } = {}) {
    return meta(MediaUrlSchema.clone(), { widget: 'image', label, ...pick(o) }).default(o.default ?? '')
  },

  video(label: string, o: Common & { default?: string } = {}) {
    return meta(MediaUrlSchema.clone(), { widget: 'video', label, ...pick(o) }).default(o.default ?? '')
  },

  /** Foto del comprador (Supabase Storage). */
  photo(label: string, o: Common = {}) {
    return meta(BuyerPhotoSchema.clone().nullable(), { widget: 'photo', label, ...pick(o) }).default(null)
  },

  color(label: string, o: Common & { default: string }) {
    return meta(HexColorSchema.clone(), { widget: 'color', label, ...pick(o) }).default(o.default)
  },

  select<const V extends readonly [string, ...string[]]>(
    label: string,
    options: { [K in keyof V]: { value: V[K]; label: string } },
    o: Common & { default: V[number] },
  ) {
    const values = options.map((opt) => opt.value) as unknown as V
    return meta(z.enum(values), { widget: 'select', label, options, ...pick(o) }).default(
      o.default as never,
    )
  },

  toggle(label: string, o: Common & { default: boolean }) {
    return meta(z.boolean(), { widget: 'toggle', label, ...pick(o) }).default(o.default)
  },

  number(label: string, o: Common & { min: number; max: number; default: number; int?: boolean }) {
    let s = z.number().min(o.min).max(o.max)
    if (o.int !== false) s = s.int()
    return meta(s, { widget: 'number', label, ...pick(o) }).default(o.default)
  },

  url(label: string, o: Common & { default?: string } = {}) {
    const s = z.string().max(500).refine((v) => v === '' || /^https:\/\//.test(v), 'Tiene que empezar con https://')
    return meta(s, { widget: 'url', label, ...pick(o) }).default(o.default ?? '')
  },

  youtube(label: string, o: Common = {}) {
    const s = z
      .string()
      .max(300)
      .refine((v) => v === '' || youtubeId(v) !== null, 'No parece un link de YouTube')
    return meta(s, { widget: 'youtube', label, ...pick(o) }).default('')
  },

  list<T extends z.ZodType>(
    label: string,
    item: T,
    o: Common & { min?: number; max: number; itemLabel?: string; default?: z.input<T>[] },
  ) {
    const s = meta(
      z
        .array(item)
        .min(o.min ?? 0)
        .max(o.max),
      { widget: 'list', label, itemLabel: o.itemLabel, ...pick(o) },
    )
    return s.default((o.default ?? []) as never)
  },

  group<S extends z.ZodRawShape>(label: string, shape: S, o: Common = {}) {
    return meta(z.object(shape), { widget: 'group', label, ...pick(o) })
  },
}

function pick(o: Common): Common {
  const out: Common = {}
  if (o.help) out.help = o.help
  if (o.placeholder) out.placeholder = o.placeholder
  if (o.required) out.required = o.required
  if (o.advanced) out.advanced = o.advanced
  return out
}

// ── Introspección (la usan SchemaForm y la validación del bloqueo) ─────────

type AnySchema = z.core.$ZodType

/** Quita default/optional/nullable/pipe hasta llegar al schema con metadatos. */
export function unwrap(schema: AnySchema): AnySchema {
  let current = schema
  for (let i = 0; i < 10; i++) {
    if (fieldMeta.has(current as z.ZodType)) return current
    const def = current._zod.def as { type: string; innerType?: AnySchema; in?: AnySchema }
    if (def.innerType) current = def.innerType
    else if (def.type === 'pipe' && def.in) current = def.in
    else return current
  }
  return current
}

export function getFieldMeta(schema: AnySchema): FieldMeta | undefined {
  return fieldMeta.get(unwrap(schema) as z.ZodType)
}

export function objectShape(schema: AnySchema): Record<string, AnySchema> | null {
  const inner = unwrap(schema)
  const def = inner._zod.def as { type: string; shape?: Record<string, AnySchema> }
  return def.type === 'object' && def.shape ? def.shape : null
}

export function arrayElement(schema: AnySchema): AnySchema | null {
  const inner = unwrap(schema)
  const def = inner._zod.def as { type: string; element?: AnySchema }
  return def.type === 'array' && def.element ? def.element : null
}

export interface MissingField {
  path: string
  label: string
}

/**
 * Campos marcados como obligatorios que están vacíos. Es la regla del bloqueo:
 * los borradores se guardan incompletos, pero no se puede regalar una Boxie a
 * la que le falta, por ejemplo, la foto de la dedicatoria.
 */
export function missingRequired(schema: AnySchema, value: unknown, prefix = '', parentLabel = ''): MissingField[] {
  const m = getFieldMeta(schema)
  const label = [parentLabel, m?.label].filter(Boolean).join(' · ')
  const shape = objectShape(schema)
  if (shape) {
    const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>
    return Object.entries(shape).flatMap(([key, child]) =>
      missingRequired(child, obj[key], prefix ? `${prefix}.${key}` : key, m?.widget === 'group' ? label : parentLabel),
    )
  }
  const element = arrayElement(schema)
  if (element && m?.required) {
    const list = Array.isArray(value) ? value : []
    const minItems = (unwrap(schema)._zod.def as { checks?: { _zod: { def: { check: string; minimum?: number } } }[] }).checks
      ?.map((c) => c._zod.def)
      .find((d) => d.check === 'min_length')?.minimum
    const expected = Math.max(minItems ?? 1, 1)
    const filled = list.filter((item) => !isEmpty(item)).length
    return filled < expected ? [{ path: prefix, label: label || prefix }] : []
  }
  if (m?.required && isEmpty(value)) return [{ path: prefix, label: label || prefix }]
  return []
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>)
    return values.length === 0 || values.every(isEmpty)
  }
  return false
}
