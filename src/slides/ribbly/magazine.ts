import { CUMPLE_MAGAZINE, type MagazineRow } from './magazine-bank'

/**
 * Elige el texto de la tapa de revista. Regla de la base de pantallas: "el
 * sistema elige una variación según la relación declarada y el tono elegido,
 * de modo que dos Ribblys de la misma ocasión no tengan el mismo texto".
 *
 * Es determinístico: los mismos nombres dan siempre el mismo texto (el regalo
 * no cambia cada vez que se abre) y `version` permite probar otro.
 */

export interface MagazineText {
  id: string
  title: readonly [string, string, string]
  before: string
  mark: string
  after: string
  closing: string
}

function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Las variaciones que corresponden a un vínculo y un tono (nunca vacío). */
export function magazinePool(
  relation: string,
  tone: string,
  bank: readonly MagazineRow[] = CUMPLE_MAGAZINE,
): readonly MagazineRow[] {
  let pool: readonly MagazineRow[] = bank.filter((row) => row[1] === relation)
  if (!pool.length) pool = bank.filter((row) => row[1] === 'generico')
  if (!pool.length) pool = bank
  const toned = pool.filter((row) => row[2] === tone)
  return toned.length ? toned : pool
}

export function pickMagazine(options: {
  relation: string
  tone: string
  /** 1 = el que toca; cada número siguiente, otro del mismo grupo. */
  version: number
  /** Lo que distingue a este regalo de otro (los nombres). */
  seed: string
}): MagazineText {
  const pool = magazinePool(options.relation, options.tone)
  const start = hash(options.seed) % pool.length
  const row = pool[(start + Math.max(options.version, 1) - 1) % pool.length]!
  const [id, , , title, before, mark, after, closing] = row
  return { id, title, before, mark, after, closing }
}
