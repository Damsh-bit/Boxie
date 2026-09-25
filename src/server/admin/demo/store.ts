import 'server-only'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { log } from '../../log'
import { DEMO_DB_VERSION, seedDemoDb, type DemoDb } from './seed'

/**
 * La "base" del modo demo: vive en memoria del servidor.
 *
 * - En desarrollo se guarda además en `.cache/admin-demo-db.json`, así los
 *   cambios del panel sobreviven a reiniciar `npm run dev`.
 * - En un deploy (Vercel), cada instancia tiene la suya y los cambios pueden
 *   perderse: el panel lo avisa. Para persistir de verdad está Supabase.
 *
 * El sitio público en modo demo lee el catálogo de acá: lo que se publica
 * desde el panel aparece en la tienda.
 */

const FILE = join(process.cwd(), '.cache', 'admin-demo-db.json')
const persist = process.env.NODE_ENV !== 'production' && process.env.VITEST !== 'true'

declare global {
  var __boxieDemoDb: DemoDb | undefined
}

function load(): DemoDb {
  if (persist) {
    try {
      const saved = JSON.parse(readFileSync(FILE, 'utf8')) as DemoDb
      if (saved.version === DEMO_DB_VERSION) return saved
    } catch {
      // Sin archivo (o de otra versión): se siembra de nuevo.
    }
  }
  return seedDemoDb()
}

let writeTimer: ReturnType<typeof setTimeout> | undefined

function save(db: DemoDb) {
  if (!persist) return
  clearTimeout(writeTimer)
  writeTimer = setTimeout(() => {
    try {
      mkdirSync(join(process.cwd(), '.cache'), { recursive: true })
      writeFileSync(FILE, JSON.stringify(db))
    } catch (error) {
      log.warn('No se pudo guardar la base de demo', { error: String(error) })
    }
  }, 300)
}

export function demoDb(): DemoDb {
  // Si cambió el formato de la semilla (recarga en caliente en desarrollo), se vuelve a sembrar.
  if (globalThis.__boxieDemoDb?.version !== DEMO_DB_VERSION) globalThis.__boxieDemoDb = load()
  return globalThis.__boxieDemoDb
}

/** Aplica un cambio a la base de demo y la guarda (en desarrollo). */
export function mutateDemoDb<T>(fn: (db: DemoDb) => T): T {
  const db = demoDb()
  const result = fn(db)
  save(db)
  return result
}

/** Vuelve a los datos de muestra originales. */
export function resetDemoDb() {
  globalThis.__boxieDemoDb = seedDemoDb()
  save(globalThis.__boxieDemoDb)
}

export const demoPersistence = persist ? 'archivo' : 'memoria'
