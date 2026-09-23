import type { z } from 'zod'
import { unwrap } from '../fields'

/**
 * Lo que <SchemaForm> necesita saber de un schema además de sus metadatos:
 * los límites (para contadores y para no dejar agregar un ítem de más) y el
 * valor con el que arranca un ítem nuevo de una lista.
 */

type AnySchema = z.core.$ZodType

interface CheckDef {
  check: string
  minimum?: number
  maximum?: number
  value?: number
  format?: string
}

function checksOf(schema: AnySchema): CheckDef[] {
  const def = unwrap(schema)._zod.def as { checks?: { _zod: { def: CheckDef } }[] }
  return (def.checks ?? []).map((c) => c._zod.def)
}

/** Largo mínimo y máximo de un texto o de una lista. */
export function lengthLimits(schema: AnySchema): { min?: number; max?: number } {
  const out: { min?: number; max?: number } = {}
  for (const c of checksOf(schema)) {
    if (c.check === 'min_length' && c.minimum !== undefined) out.min = c.minimum
    if (c.check === 'max_length' && c.maximum !== undefined) out.max = c.maximum
  }
  return out
}

export function numberLimits(schema: AnySchema): { min?: number; max?: number; int: boolean } {
  const out: { min?: number; max?: number; int: boolean } = { int: false }
  for (const c of checksOf(schema)) {
    if (c.check === 'greater_than' && c.value !== undefined) out.min = c.value
    if (c.check === 'less_than' && c.value !== undefined) out.max = c.value
    if (c.check === 'number_format' && /int/.test(c.format ?? '')) out.int = true
  }
  return out
}

/** Valor inicial de un campo o de un ítem nuevo: su default, o el objeto con los defaults de sus campos. */
export function defaultFor(schema: AnySchema): unknown {
  const s = schema as z.ZodType
  const empty = s.safeParse(undefined)
  if (empty.success) return empty.data
  const obj = s.safeParse({})
  if (obj.success) return obj.data
  return null
}

/**
 * Mensaje para el comprador. Los `refine` de los campos ya traen su mensaje
 * en castellano; los de largo y tipo son los genéricos de Zod (en inglés).
 */
export function friendlyIssue(issue: z.core.$ZodIssue): string {
  const origin = 'origin' in issue ? issue.origin : undefined
  switch (issue.code) {
    case 'too_big':
      return origin === 'array'
        ? `Máximo ${issue.maximum} ítems`
        : origin === 'number'
          ? `Tiene que ser ${issue.maximum} o menos`
          : `Máximo ${issue.maximum} caracteres`
    case 'too_small':
      return origin === 'array'
        ? `Tiene que haber al menos ${issue.minimum}`
        : origin === 'number'
          ? `Tiene que ser ${issue.minimum} o más`
          : `Mínimo ${issue.minimum} caracteres`
    case 'invalid_type':
    case 'invalid_union':
    case 'unrecognized_keys':
      return 'Dato inválido'
    case 'invalid_value':
      return 'Elegí una de las opciones'
    default:
      return issue.message
  }
}

/**
 * Errores de validación por ruta ("coupons.2.title" → mensaje), para
 * mostrarlos al lado de cada campo.
 */
export function issuesByPath(schema: AnySchema, value: unknown): Record<string, string> {
  const result = (schema as z.ZodType).safeParse(value)
  if (result.success) return {}
  const out: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const key = issue.path.join('.')
    out[key] ??= friendlyIssue(issue)
  }
  return out
}
