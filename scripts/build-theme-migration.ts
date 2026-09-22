/**
 * Convierte las temáticas iniciales (supabase/seed/themes/*.json) en una
 * migración de datos: los tres temas del prototipo pasan a ser filas, no
 * código (criterio de aceptación de la Fase 5, docs/ARQUITECTURA.md §4.5).
 *
 * Cada JSON guarda solo lo que difiere de los valores por defecto del
 * registro. La migración guarda la configuración RESUELTA (con todos los
 * valores aplicados): si mañana cambia un default en el código, los regalos ya
 * vendidos no cambian.
 *
 *   npx tsx scripts/build-theme-migration.ts          escribe la migración
 *   npx tsx scripts/build-theme-migration.ts --check  falla si no coincide
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { ThemeListingSchema } from '../src/domain/catalog'
import { parseThemeConfig } from '../src/slides/config'

const ROOT = join(import.meta.dirname, '..')
const SEED_DIR = join(ROOT, 'supabase', 'seed', 'themes')
const OUT = join(ROOT, 'supabase', 'migrations', '20260922120400_initial_catalog.sql')

interface SeedTheme {
  slug: string
  name: string
  category: string
  description: string
  sortOrder: number
  listing: unknown
  config: unknown
}

const sqlString = (value: string) => `'${value.replace(/'/g, "''")}'`
const sqlJson = (value: unknown) => `${sqlString(JSON.stringify(value))}::jsonb`

export function loadSeedThemes() {
  return readdirSync(SEED_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((file) => {
      const seed = JSON.parse(readFileSync(join(SEED_DIR, file), 'utf8')) as SeedTheme
      const listing = ThemeListingSchema.safeParse(seed.listing)
      if (!listing.success) throw new Error(`${file}: ficha inválida\n${listing.error.message}`)
      const config = parseThemeConfig(seed.config)
      if (!config.success) throw new Error(`${file}: configuración inválida\n${config.issues.join('\n')}`)
      return { ...seed, listing: listing.data, resolved: config.data }
    })
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

function render(): string {
  const themes = loadSeedThemes()
  // Sentencias separadas a propósito: un UPDATE no ve lo que insertó un CTE de
  // la misma sentencia (comparten snapshot).
  const blocks = themes.map(
    (t) => `-- ${t.name}
insert into public.themes (slug, name, category, description, status, sort_order, listing, draft_config)
values (${sqlString(t.slug)}, ${sqlString(t.name)}, ${sqlString(t.category)}, ${sqlString(t.description)},
        'draft', ${t.sortOrder}, ${sqlJson(t.listing)}, ${sqlJson(t.resolved)});

insert into public.theme_versions (theme_id, version, config)
select id, 1, draft_config from public.themes where slug = ${sqlString(t.slug)};

update public.themes t
   set current_version_id = v.id, status = 'published'
  from public.theme_versions v
 where v.theme_id = t.id and v.version = 1 and t.slug = ${sqlString(t.slug)};`,
  )

  return `-- ════════════════════════════════════════════════════════════════════════════
-- Boxie · Catálogo inicial
--
-- GENERADO por scripts/build-theme-migration.ts a partir de
-- supabase/seed/themes/*.json. No editar a mano.
--
-- Las temáticas del prototipo (pareja, amistad, cumpleaños) cargadas como
-- datos, con su configuración resuelta contra el registro de slides. Desde acá
-- se editan en el panel y cada publicación crea una versión nueva.
-- ════════════════════════════════════════════════════════════════════════════

${blocks.join('\n\n')}

-- ── Cupones que vivían hardcodeados en server.js (hallazgos E y F12) ─────────
-- LOQUIEROYA25 otorgaba 50%: se corrige al 25% que promete su nombre.

insert into public.coupons (code, kind, value, description) values
  ('BOXIE10', 'percent', 10, 'Cupón general'),
  ('PAREJA20', 'percent', 20, 'Temática Pareja'),
  ('INFLUENCER50', 'percent', 50, 'Influencers (revisar tope de usos)'),
  ('LOQUIEROYA25', 'percent', 25, 'Oferta de urgencia de la ficha de producto'),
  ('PROMO35', 'percent', 35, 'Promoción');

-- ── Configuración ───────────────────────────────────────────────────────────
-- Precio que el prototipo tenía fijo en el navegador (hallazgo D): $15.000.

insert into public.settings (base_price_cents, gift_lifetime_days, offer_coupon_id, offer_delay_seconds)
select 1500000, 60, id, 15 from public.coupons where code = 'LOQUIEROYA25';
`
}

const output = render()
if (process.argv.includes('--check')) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== output) {
    console.error('La migración del catálogo no coincide con supabase/seed/themes. Regenerala.')
    process.exit(1)
  }
  console.log('Migración del catálogo al día.')
} else {
  writeFileSync(OUT, output)
  console.log(`Escrito ${OUT}`)
}
