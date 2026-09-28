import 'server-only'
import { cache } from 'react'
import {
  liveSponsors,
  type PublicSponsor,
  type Sponsor,
  type SponsorInput,
} from '@/domain/sponsors'
import type { Actor } from '../admin/repo'
import { isDemoMode } from '../demo'
import { log } from '../log'

/**
 * El contrato de datos de Sponsors. Como el panel, Marketing y el soporte,
 * tiene una implementación demo (en memoria, con ejemplos) y otra sobre
 * Supabase (migración `sponsors`). Sin la migración, `list()` responde
 * `available: false`, el sitio muestra la invitación a sumarse y el
 * formulario de /marcas manda el pedido por mail: nada se rompe.
 */

export interface SponsorsRepo {
  readonly mode: 'demo' | 'supabase'
  list(): Promise<{ available: boolean; sponsors: Sponsor[] }>
  save(input: SponsorInput, actor: Actor): Promise<Sponsor>
  delete(id: string, actor: Actor): Promise<void>
  /** Un contacto nuevo desde /marcas (sin sesión: lo llama la ruta pública, ya validado). */
  createLead(input: SponsorInput): Promise<Sponsor>
}

export const SPONSORS_UNAVAILABLE =
  'La base todavía no tiene la tabla de sponsors (falta la migración 20260928120000_sponsors.sql).'

export class SponsorsError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'invalid' | 'unavailable' = 'invalid',
  ) {
    super(message)
    this.name = 'SponsorsError'
  }
}

let repo: Promise<SponsorsRepo> | undefined

/** El repositorio del entorno: demo si DEMO_MODE=1, Supabase si no. */
export function sponsorsRepo(): Promise<SponsorsRepo> {
  repo ??= isDemoMode()
    ? import('./demo-repo').then((m) => m.demoSponsorsRepo)
    : import('./supabase-repo').then((m) => m.supabaseSponsorsRepo)
  return repo
}

/**
 * Los sponsors que el sitio muestra hoy (solo lo público). Una lectura por
 * pedido; si la base falla o no tiene la tabla, ninguno (se ve la invitación).
 */
export const getLiveSponsors = cache(async (): Promise<PublicSponsor[]> => {
  try {
    const { sponsors } = await (await sponsorsRepo()).list()
    return liveSponsors(sponsors)
  } catch (error) {
    log.warn('No se pudieron leer los sponsors: se muestra la invitación', {
      error: error instanceof Error ? error.message : String(error),
    })
    return []
  }
})
