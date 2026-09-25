'use server'

import { z } from 'zod'
import { parseThemeConfig } from '@/slides/config'
import { generateBatch, MAX_BATCH } from '@/slides/generator/generate'
import { CONTENT_ROLES, runAction } from '../../_lib/action'

const ItemsSchema = z
  .array(
    z.object({
      name: z.string().trim().min(2).max(80),
      variant: z.number().int().min(0).max(50),
      structure: z.enum(['completa', 'compacta']),
    }),
  )
  .min(1, 'La lista está vacía')
  .max(MAX_BATCH, `Hasta ${MAX_BATCH} por vez`)

export interface CreatedTheme {
  id: string
  name: string
  slug: string
  published: boolean
}

/**
 * Crea las temáticas generadas. El servidor vuelve a generarlas con los
 * mismos datos (nombre, variante, estructura): no se confía en la
 * configuración que armó el navegador. El generador es determinístico, así
 * que queda exactamente lo que se vio en la vista previa.
 */
export async function createGeneratedThemes(items: unknown, publish: boolean) {
  return runAction<CreatedTheme[]>(
    { roles: CONTENT_ROLES, revalidate: ['/admin', '/admin/tematicas', '/', '/galeria'] },
    async ({ repo, actor }) => {
      const list = ItemsSchema.parse(items)
      const [plans, themes] = await Promise.all([repo.listPlans(), repo.listThemes()])
      const taken = themes.map((t) => t.slug)
      const created: CreatedTheme[] = []
      const baseOrder = Math.max(0, ...themes.map((t) => t.sortOrder)) + 1

      // Cada ítem con su variante y estructura, respetando los slugs del lote.
      const used = new Set(taken)
      for (const [i, item] of list.entries()) {
        const [theme] = generateBatch([item.name], {
          plans,
          existingSlugs: used,
          variant: item.variant,
          structure: item.structure,
          sortOrder: baseOrder + i,
        })
        if (!theme) continue
        used.add(theme.slug)
        const { id } = await repo.createTheme(
          {
            slug: theme.slug,
            name: theme.name,
            category: theme.category,
            description: theme.description,
            listing: theme.listing,
            config: theme.config,
            sortOrder: theme.sortOrder,
            origin: 'generator',
          },
          actor,
        )
        let published = false
        if (publish) {
          const parsed = parseThemeConfig(theme.config)
          if (parsed.success) {
            await repo.publishTheme(id, theme.config, actor)
            published = true
          }
        }
        created.push({ id, name: theme.name, slug: theme.slug, published })
      }
      return {
        message: `${created.length} ${created.length === 1 ? 'temática creada' : 'temáticas creadas'}${publish ? ' y publicadas' : ' como borradores'}`,
        data: created,
      }
    },
  )
}
