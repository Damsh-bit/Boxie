import { z } from 'zod'
import { HexColorSchema } from './fields'

/**
 * Qué es una temática, concretamente (docs/ARQUITECTURA.md §4.4): una paleta
 * y una lista ordenada de slides, cada una con su tipo y sus props de capa 1.
 * Se guarda como JSON en theme_versions.config.
 */

export const PaletteSchema = z.object({
  primary: HexColorSchema.default('#F44E63'),
  ink: HexColorSchema.default('#2A2433'),
  accent: HexColorSchema.default('#FFD700'),
})
export type Palette = z.infer<typeof PaletteSchema>
export const DEFAULT_PALETTE: Palette = PaletteSchema.parse({})

export const FRAME_BACKGROUNDS = [
  'intro',
  'salmon',
  'white',
  'dark',
  'full',
  'cream',
  'party',
  'none',
] as const
export const PARTICLES = ['none', 'heart', 'friend', 'bday-fest', 'circle'] as const

export const FrameSchema = z.object({
  /** Fondo de la tarjeta (las clases theme-* del player). */
  background: z.enum(FRAME_BACKGROUNDS).default('full'),
  particles: z.enum(PARTICLES).default('none'),
  /** Sin bordes redondeados ni margen: la slide ocupa toda la pantalla. */
  fullScreen: z.boolean().default(false),
  confetti: z.boolean().default(false),
})
export type Frame = z.infer<typeof FrameSchema>
export type FrameInput = z.input<typeof FrameSchema>

export const SLIDE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/

export const SlideInstanceSchema = z.object({
  /** Identidad estable de la slide: el contenido del comprador se guarda por esta clave. */
  key: z.string().regex(SLIDE_KEY_PATTERN, 'Clave inválida: minúsculas, números, - y _'),
  kind: z.string().min(1),
  props: z.record(z.string(), z.unknown()).default({}),
  frame: FrameSchema.partial().optional(),
  /**
   * Plan desde el que se incluye la slide (slug de la tabla plans). Sin plan,
   * va en todos. Ver src/slides/plans.ts.
   */
  plan: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .max(40)
    .optional(),
})

export const ThemeConfigSchema = z.object({
  palette: PaletteSchema.default(DEFAULT_PALETTE),
  slides: z.array(SlideInstanceSchema).min(1, 'La temática necesita al menos una slide').max(40),
})

export type ThemeConfigInput = z.input<typeof ThemeConfigSchema>
