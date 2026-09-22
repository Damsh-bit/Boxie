import type { ComponentType } from 'react'
import type { z } from 'zod'
import type { BuyerPhoto } from './fields'
import type { FrameInput, Palette } from './theme-config'

/**
 * Las tres capas de contenido (docs/ARQUITECTURA.md §4.2):
 *   1. Configuración de la temática → la carga el dueño desde el admin (`themeSchema`)
 *   2. Slots del comprador         → los carga el comprador en el editor (`buyerSchema`)
 *   3. Lógica de la slide          → la escribe el programador, una vez por tipo (`Component`)
 */

export type SlideCategory = 'intro' | 'story' | 'media' | 'game' | 'reflect' | 'outro'

/** Ícono de lucide-react por nombre, para el repaso final y el constructor. */
export type SummaryIcon =
  | 'gift'
  | 'heart'
  | 'music'
  | 'headphones'
  | 'smile'
  | 'sun'
  | 'ticket'
  | 'camera'
  | 'check-circle'
  | 'pen-tool'
  | 'moon'
  | 'film'
  | 'sparkles'
  | 'gamepad'
  | 'party'

export interface SlideDefinition<
  TTheme extends z.ZodType = z.ZodType,
  TBuyer extends z.ZodType | null = z.ZodType | null,
> {
  label: string
  description: string
  category: SlideCategory
  themeSchema: TTheme
  buyerSchema: TBuyer
  /** Marco por defecto (fondo, partículas, pantalla completa). La temática lo puede pisar. */
  frame: FrameInput
  /** Cómo aparece en el repaso final ("Todo lo que vimos"). */
  summary: { icon: SummaryIcon; title: string; text: string } | null
}

export interface SlideContext {
  recipientName: string
  senderName: string
  palette: Palette
  /** Esta slide es la que está en pantalla (para arrancar animaciones y timers). */
  active: boolean
  /** Vista previa del editor o del constructor: nada se registra. */
  preview: boolean
  /** URL servible de una foto del comprador o de un asset de la temática. */
  resolveMedia(ref: BuyerPhoto | string | null | undefined): string | undefined
  /** Contenido del comprador de otra slide (p. ej. la foto de la dedicatoria). */
  buyerContent(slideKey: string): Record<string, unknown> | undefined
  /** Slides de la temática, para el repaso final. */
  summaries: { key: string; icon: SummaryIcon; title: string; text: string }[]
  goTo(index: number): void
  logoUrl: string
}

export interface SlideComponentProps<TTheme = unknown, TBuyer = unknown> {
  theme: TTheme
  buyer: TBuyer
  ctx: SlideContext
}

export type SlideComponent<D extends SlideDefinition> = ComponentType<
  SlideComponentProps<
    z.output<D['themeSchema']>,
    D['buyerSchema'] extends z.ZodType ? z.output<D['buyerSchema']> : Record<string, never>
  >
>
