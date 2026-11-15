/**
 * Publica en una base de Supabase (la real, por ejemplo) las temáticas de
 * supabase/seed/themes/*.json que cambiaron desde su versión vigente.
 *
 * Hace lo mismo que el botón "Publicar" del panel: `publish_theme` congela la
 * configuración como versión nueva y la deja vigente; además actualiza la
 * ficha comercial si también cambió, y deja ambas cosas en la bitácora. Las
 * Ribbly ya vendidas no cambian (quedan atadas a su versión) y las versiones
 * anteriores quedan en el historial del panel.
 *
 * Usa NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (.env.local).
 * Sin --apply es un simulacro: muestra qué cambiaría y no escribe nada.
 *
 *   npm run themes:publish                                  simulacro, todas
 *   npm run themes:publish -- cumpleanos pareja             simulacro, esas
 *   npm run themes:publish -- cumpleanos pareja --apply     publica esas
 */
import { existsSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import type { Database, Json } from '../src/server/db/database.types'
import { loadSeedThemes } from './seed-themes'

const ACTOR = 'scripts/publish-themes'

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) {
    process.loadEnvFile(file)
    break
  }
}

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const slugs = args.filter((a) => !a.startsWith('--'))

if (apply && slugs.length === 0) {
  console.error('Con --apply hay que nombrar las temáticas (por ejemplo: cumpleanos pareja).')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const db = createClient<Database>(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

/** jsonb no guarda `undefined` ni respeta el orden de las claves: se compara como JSON. */
const asJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Json

const seeds = loadSeedThemes()
const unknown = slugs.filter((s) => !seeds.some((t) => t.slug === s))
if (unknown.length) {
  console.error(`No están en supabase/seed/themes: ${unknown.join(', ')}`)
  process.exit(1)
}

console.log(`${apply ? 'Publicando en' : 'Simulacro contra'} ${new URL(url).host}\n`)

let failed = false
for (const seed of seeds.filter((t) => slugs.length === 0 || slugs.includes(t.slug))) {
  const { data: theme, error } = await db
    .from('themes')
    .select('id, name, listing, current_version_id')
    .eq('slug', seed.slug)
    .maybeSingle()
  if (error) throw new Error(`${seed.slug}: ${error.message}`)
  if (!theme) {
    console.log(`· ${seed.slug}: no existe en la base (se crea desde el panel); se saltea.`)
    continue
  }

  const current = theme.current_version_id
    ? (
        await db
          .from('theme_versions')
          .select('version, config')
          .eq('id', theme.current_version_id)
          .single()
      ).data
    : null

  const config = asJson(seed.resolved)
  const listing = asJson(seed.listing)
  const configChanged = !isDeepStrictEqual(current?.config, config)
  const listingChanged = !isDeepStrictEqual(theme.listing, listing)

  const before = (current?.config as { slides?: { kind: string }[] } | undefined)?.slides ?? []
  const after = seed.resolved.slides
  const oldKinds = new Set(before.map((s) => s.kind))
  const newKinds = after.filter((s) => !oldKinds.has(s.kind)).length
  console.log(
    `· ${theme.name} (${seed.slug}): vigente v${current?.version ?? '–'} con ${before.length} pantallas → ` +
      `${after.length} pantallas (${newKinds} de tipos que la versión vigente no tiene)`,
  )
  console.log(
    `    configuración: ${configChanged ? 'cambia' : 'igual'} · ficha: ${listingChanged ? 'cambia' : 'igual'}`,
  )
  if (configChanged && newKinds === 0) {
    const paths = differences(current?.config, config)
    console.log(`    diferencias: ${paths.slice(0, 6).join(' · ')}${paths.length > 6 ? ' …' : ''}`)
  }

  if (!apply || (!configChanged && !listingChanged)) continue

  try {
    if (listingChanged) {
      const { error: e } = await db.from('themes').update({ listing }).eq('id', theme.id)
      if (e) throw new Error(`ficha: ${e.message}`)
      await audit('theme.update', theme.id, `Editó "${theme.name}" (ficha, desde supabase/seed)`)
    }
    if (configChanged) {
      const { data: version, error: e } = await db.rpc('publish_theme', {
        p_theme_id: theme.id,
        p_config: config,
      })
      if (e || !version) throw new Error(`publicar: ${e?.message ?? 'sin respuesta'}`)
      await audit(
        'theme.publish',
        theme.id,
        `Publicó "${theme.name}" v${version.version} (desde supabase/seed)`,
      )
      console.log(`    ✔ publicada la v${version.version}`)
    } else {
      console.log('    ✔ ficha actualizada')
    }
  } catch (err) {
    failed = true
    console.error(`    ✘ ${(err as Error).message}`)
  }
}

if (!apply) console.log('\nSimulacro: no se escribió nada. Para publicar, agregá --apply.')
process.exit(failed ? 1 : 0)

/** Rutas (slides.3.props.title…) donde dos JSON difieren. */
function differences(a: unknown, b: unknown, path = ''): string[] {
  if (isDeepStrictEqual(a, b)) return []
  const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null
  if (!isObject(a) || !isObject(b) || Array.isArray(a) !== Array.isArray(b))
    return [path || '(raíz)']
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].flatMap((k) => differences(a[k], b[k], path ? `${path}.${k}` : k))
}

async function audit(action: string, entityId: string, summary: string) {
  const { error } = await db.from('admin_audit_log').insert({
    actor_email: ACTOR,
    action,
    entity: 'theme',
    entity_id: entityId,
    summary: summary.slice(0, 300),
  })
  if (error) console.warn(`    (no quedó en la bitácora: ${error.message})`)
}
