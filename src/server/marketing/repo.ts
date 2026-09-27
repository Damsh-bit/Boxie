import 'server-only'
import type { AttributionPayload, TrafficPayload } from '@/domain/marketing/attribution'
import type {
  CampaignInput,
  ImportInput,
  MarketingSettingsInput,
  SpendInput,
} from '@/domain/marketing/inputs'
import type { Campaign, MarketingDataset } from '@/domain/marketing/types'
import type { Actor } from '../admin/repo'
import { isDemoMode } from '../demo'

/**
 * El contrato de datos de Marketing: campañas, resultados diarios de la
 * pauta, visitas del sitio (agregadas) y el origen de cada orden. Igual que
 * el panel y el soporte, tiene una implementación demo (en memoria, con un
 * año de campañas simuladas) y otra sobre Supabase (migración `marketing`).
 *
 * Sin la migración en la base, `dataset()` responde `available: false` y las
 * escrituras del sitio (visitas, origen de la orden) no hacen nada: la tienda
 * nunca se rompe por la medición.
 */

export interface MarketingRepo {
  readonly mode: 'demo' | 'supabase'

  dataset(): Promise<MarketingDataset>
  saveSettings(patch: MarketingSettingsInput, actor: Actor): Promise<void>

  saveCampaign(input: CampaignInput, actor: Actor): Promise<Campaign>
  deleteCampaign(id: string, actor: Actor): Promise<void>
  /** Guarda (o reemplaza) los resultados de esos días de esas campañas. */
  saveSpend(rows: SpendInput[], actor: Actor): Promise<number>
  deleteSpend(campaignId: string, day: string, actor: Actor): Promise<void>
  /** Importación del administrador de anuncios: crea las campañas que falten y reemplaza los días. */
  importSpend(input: ImportInput, actor: Actor): Promise<{ created: number; rows: number }>

  /** Suma una visita (o un paso del embudo). Nunca falla hacia afuera. */
  track(payload: TrafficPayload): Promise<void>
  /** Guarda de dónde vino una orden. Nunca falla hacia afuera. */
  saveAttribution(orderId: string, payload: AttributionPayload): Promise<void>
}

export const MARKETING_UNAVAILABLE =
  'La base todavía no tiene la parte de marketing (falta la migración 20260927120000_marketing.sql).'

export class MarketingError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'conflict' | 'invalid' | 'unavailable' = 'invalid',
  ) {
    super(message)
    this.name = 'MarketingError'
  }
}

let repo: Promise<MarketingRepo> | undefined

/** El repositorio del entorno: demo si DEMO_MODE=1, Supabase si no. */
export function marketingRepo(): Promise<MarketingRepo> {
  repo ??= isDemoMode()
    ? import('./demo-repo').then((m) => m.demoMarketingRepo)
    : import('./supabase-repo').then((m) => m.supabaseMarketingRepo)
  return repo
}
