/**
 * Las temáticas de supabase/seed/themes/*.json, validadas y con la
 * configuración RESUELTA (todos los valores por defecto aplicados). La usan la
 * migración del catálogo inicial y la publicación en una base existente.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { ThemeListingSchema } from '../src/domain/catalog'
import { parseThemeConfig } from '../src/slides/config'

export const SEED_DIR = join(import.meta.dirname, '..', 'supabase', 'seed', 'themes')

interface SeedTheme {
  slug: string
  name: string
  category: string
  description: string
  sortOrder: number
  listing: unknown
  config: unknown
}

export function loadSeedThemes() {
  return readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const seed = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8')) as SeedTheme
      const listing = ThemeListingSchema.safeParse(seed.listing)
      if (!listing.success) throw new Error(`${file}: ficha inválida\n${listing.error.message}`)
      const config = parseThemeConfig(seed.config)
      if (!config.success)
        throw new Error(`${file}: configuración inválida\n${config.issues.join('\n')}`)
      return { ...seed, listing: listing.data, resolved: config.data }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
}
