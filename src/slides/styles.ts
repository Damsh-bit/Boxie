import { z } from 'zod'

/**
 * Estilos por elemento (docs/PLAN-VARIACIONES.md): cada pantalla declara qué
 * se puede variar (sus ejes: la torta, los globos, la paleta, la tipografía)
 * y con qué opciones. La temática decide cuáles se ofrecen y cuál va por
 * defecto; el comprador elige entre esas.
 *
 * Lo que elige el comprador se guarda en el contenido de cada slide, en el
 * campo `estilo` ({ eje: opción }), también en las slides que no tienen nada
 * más para completar. Vacío = lo de la temática: las Ribbly que ya estaban se
 * ven igual que siempre.
 *
 * Sin React: el servidor valida con esto.
 */

export const STYLE_FIELD = 'estilo'

const AXIS_KEY = /^[a-z][a-z0-9-]{0,23}$/
const OPTION_VALUE = /^[a-z0-9][a-z0-9-]{0,29}$/

export interface StyleOption {
  value: string
  label: string
  /** Muestra de dos colores (paletas, fondos). */
  swatch?: readonly [string, string]
  /** Muestra con la tipografía (CSS font-family). */
  font?: string
}

export interface StyleAxis {
  /** Nombre del eje en el contenido (`torta`, `paleta`). */
  key: string
  label: string
  /**
   * `data-edit` del elemento que lo muestra: tocarlo en el editor directo abre
   * este selector. Sin anchor, el eje va en la barra de la pantalla.
   */
  anchor?: string
  /** Se puede aplicar a todo el regalo de una vez (paleta, tipografía). */
  global?: boolean
  /** La primera es la de la temática, salvo que la temática diga otra. */
  options: readonly StyleOption[]
}

/** Lo que eligió el comprador en una slide: eje → opción. */
export type StyleChoice = Record<string, string>

/** El estilo resuelto de una slide: todos sus ejes con una opción. */
export type StyleValues = Readonly<Record<string, string>>

/** Qué ofrece la temática en cada eje de una slide (panel → configuración). */
export const SlideStylesConfigSchema = z
  .record(
    z.string().regex(AXIS_KEY),
    z.object({
      /** Opciones que se ofrecen, en este orden. Sin esto, todas. */
      allow: z.array(z.string().regex(OPTION_VALUE)).max(24).optional(),
      /** La opción por defecto. Sin esto, la primera de las ofrecidas. */
      default: z.string().regex(OPTION_VALUE).optional(),
    }),
  )
  .refine((v) => Object.keys(v).length <= 16, 'Demasiados ejes de estilo')
export type SlideStylesConfig = z.infer<typeof SlideStylesConfigSchema>

/**
 * Lo elegido, leído con tolerancia: lo que no tiene forma de eje y opción se
 * descarta (no se rechaza el borrador entero por un estilo raro).
 */
export function readStyleChoice(raw: unknown): StyleChoice {
  const source =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>)[STYLE_FIELD] : undefined
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}
  const out: StyleChoice = {}
  for (const [key, value] of Object.entries(source as Record<string, unknown>).slice(0, 16)) {
    if (AXIS_KEY.test(key) && typeof value === 'string' && OPTION_VALUE.test(value)) {
      out[key] = value
    }
  }
  return out
}

/** Las opciones de un eje que ofrece la temática, con la de por defecto primero. */
export function offeredOptions(axis: StyleAxis, config?: SlideStylesConfig): StyleOption[] {
  const rule = config?.[axis.key]
  let options = axis.options.slice()
  if (rule?.allow?.length) {
    const byValue = new Map(options.map((o) => [o.value, o]))
    options = rule.allow.flatMap((v) => {
      const option = byValue.get(v)
      return option ? [option] : []
    })
    if (!options.length) options = axis.options.slice()
  }
  const preferred = rule?.default && options.find((o) => o.value === rule.default)
  if (preferred) options = [preferred, ...options.filter((o) => o !== preferred)]
  return options
}

/** Los ejes que el comprador puede tocar: los que tienen al menos dos opciones. */
export function offeredAxes(
  axes: readonly StyleAxis[],
  config?: SlideStylesConfig,
): (StyleAxis & { options: StyleOption[] })[] {
  return axes
    .map((axis) => ({ ...axis, options: offeredOptions(axis, config) }))
    .filter((axis) => axis.options.length > 1)
}

/** Cada eje con su opción: la elegida si se ofrece, si no la de la temática. */
export function resolveStyle(
  axes: readonly StyleAxis[],
  config: SlideStylesConfig | undefined,
  choice: StyleChoice,
): StyleValues {
  const out: Record<string, string> = {}
  for (const axis of axes) {
    const options = offeredOptions(axis, config)
    const chosen = choice[axis.key]
    out[axis.key] =
      chosen && options.some((o) => o.value === chosen) ? chosen : (options[0]?.value ?? '')
  }
  return out
}
