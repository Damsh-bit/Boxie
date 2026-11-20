import { z } from 'zod'

/**
 * Lo que el comprador acomoda a mano en cada pantalla (el "maquetador"): dónde
 * movió y cuánto agrandó cada foto o pieza del diseño, y si la quiere sin
 * fotos. Se guarda en el contenido de la slide, en `maqueta`, como el estilo en
 * `estilo`; vacío o sin la clave, la pantalla se ve como la diseñó la temática
 * (las Ribbly que ya estaban no cambian).
 *
 * Las piezas se marcan con `data-mv` (ver `editable` en ribbly/ui.tsx y los
 * grupos de las escenas): el reproductor les aplica lo guardado con las
 * propiedades `translate` y `scale` de CSS, que se suman a las animaciones (que
 * usan `transform`) sin pisarlas.
 */

export const LAYOUT_FIELD = 'maqueta'

/** Cuánto se movió (fracción del ancho y del alto de la pantalla) y agrandó una pieza. */
export interface PiecePlacement {
  x: number
  y: number
  s: number
}

export interface SlideLayout {
  piezas: Record<string, PiecePlacement>
  /** La pantalla se arma sin fotos (para quien no tiene tantas). */
  sinFotos: boolean
}

export const EMPTY_LAYOUT: SlideLayout = { piezas: {}, sinFotos: false }

/** Hasta dónde se puede mover (el centro no sale de la pantalla) y agrandar. */
export const PLACEMENT_LIMITS = { move: 0.5, minScale: 0.5, maxScale: 2.2 } as const

/** Identificador de una pieza: el campo o los estilos que marca (`photo`, `torta,velas`). */
export const PIECE_ID = /^[\w.,@-]{1,80}$/

const PlacementSchema = z.object({
  x: z.number().min(-PLACEMENT_LIMITS.move).max(PLACEMENT_LIMITS.move),
  y: z.number().min(-PLACEMENT_LIMITS.move).max(PLACEMENT_LIMITS.move),
  s: z.number().min(PLACEMENT_LIMITS.minScale).max(PLACEMENT_LIMITS.maxScale),
})

const LayoutSchema = z.object({
  piezas: z.record(z.string().regex(PIECE_ID), PlacementSchema).optional(),
  sinFotos: z.boolean().optional(),
})

/** La maqueta guardada en el contenido de una slide (lo que no valide, se ignora). */
export function readLayout(raw: unknown): SlideLayout {
  const value =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>)[LAYOUT_FIELD] : undefined
  const parsed = LayoutSchema.safeParse(value)
  if (!parsed.success) return EMPTY_LAYOUT
  const piezas = Object.fromEntries(
    Object.entries(parsed.data.piezas ?? {})
      .filter(([, p]) => !isNeutral(p))
      .slice(0, 40),
  )
  return { piezas, sinFotos: parsed.data.sinFotos === true }
}

/** Lo que se guarda: sin la clave si no hay nada acomodado. */
export function layoutValue(layout: SlideLayout): Record<string, unknown> | undefined {
  const piezas = Object.fromEntries(
    Object.entries(layout.piezas).filter(([id, p]) => PIECE_ID.test(id) && !isNeutral(p)),
  )
  const out: Record<string, unknown> = {}
  if (Object.keys(piezas).length) out.piezas = piezas
  if (layout.sinFotos) out.sinFotos = true
  return Object.keys(out).length ? out : undefined
}

/** El contenido de una slide con otra maqueta (sin la clave si quedó vacía). */
export function withLayout(
  content: Record<string, unknown>,
  layout: SlideLayout,
): Record<string, unknown> {
  const { [LAYOUT_FIELD]: _drop, ...rest } = content
  const value = layoutValue(layout)
  return value ? { ...rest, [LAYOUT_FIELD]: value } : rest
}

export function clampPlacement(p: PiecePlacement): PiecePlacement {
  const { move, minScale, maxScale } = PLACEMENT_LIMITS
  const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d
  return {
    x: round(Math.min(move, Math.max(-move, p.x)), 4),
    y: round(Math.min(move, Math.max(-move, p.y)), 4),
    s: round(Math.min(maxScale, Math.max(minScale, p.s)), 3),
  }
}

export function isNeutral(p: PiecePlacement): boolean {
  return Math.abs(p.x) < 0.0005 && Math.abs(p.y) < 0.0005 && Math.abs(p.s - 1) < 0.005
}

/**
 * Las reglas CSS que acomodan las piezas de una pantalla. `scope` es el
 * selector de la pantalla. En HTML se mueve contra el escenario (el contenedor
 * de las unidades cq); en las escenas SVG, contra su viewBox (`sceneSize`).
 */
export function placementCss(
  scope: string,
  piezas: Record<string, PiecePlacement>,
  sceneSize: { w: number; h: number },
): string {
  return Object.entries(piezas)
    .filter(([id]) => PIECE_ID.test(id))
    .map(([id, raw]) => {
      const p = clampPlacement(raw)
      const sel = `${scope} [data-mv="${id}"]`
      return (
        `${sel}{translate:calc(100cqw * ${p.x}) calc(100cqh * ${p.y});scale:${p.s}}` +
        `${scope} svg [data-mv="${id}"]{translate:${(p.x * sceneSize.w).toFixed(2)}px ${(p.y * sceneSize.h).toFixed(2)}px;transform-box:fill-box;transform-origin:center}`
      )
    })
    .join('')
}
