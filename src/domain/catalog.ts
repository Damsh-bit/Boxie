import { z } from 'zod'

/**
 * Ficha comercial de una temática (lo que se ve en la home, la galería y la
 * página de producto). Vive en themes.listing y se edita desde el panel.
 */

const MediaUrl = z
  .string()
  .max(1000)
  .refine((v) => v.startsWith('/') || /^https:\/\//.test(v), 'URL https o ruta del sitio')

export const ThemeListingSchema = z.object({
  title: z.string().max(40).default('Boxie para'),
  highlight: z.string().max(40),
  subtitle: z.string().max(160).default(''),
  cardDescription: z.string().max(200).default(''),
  cardColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default('#F44E63'),
  /** Texto claro u oscuro sobre el color de la tarjeta. */
  cardTone: z.enum(['light', 'dark']).default('light'),
  images: z.array(MediaUrl).min(1).max(8),
  features: z.array(z.string().max(120)).max(10).default([]),
  guide: z
    .object({
      emoji: z.string().max(16),
      title: z.string().max(60),
      text: z.string().max(300),
    })
    .nullable()
    .default(null),
})

export type ThemeListing = z.infer<typeof ThemeListingSchema>

export interface CatalogTheme {
  id: string
  slug: string
  name: string
  category: string
  description: string
  priceCents: number
  listing: ThemeListing
}

export function categoriesOf(themes: Pick<CatalogTheme, 'category'>[]): string[] {
  return [...new Set(themes.map((t) => t.category))]
}
