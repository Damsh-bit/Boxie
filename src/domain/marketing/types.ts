import type { Cents } from '../money'
import type { Device, OrderAttribution } from './attribution'
import type { ChannelId } from './channels'

/**
 * Entidades de la sección de Marketing del panel. Son las filas de la base
 * (migración `marketing`) en camelCase, con fechas ISO y días de calendario
 * "AAAA-MM-DD" (hora argentina).
 */

export type CampaignObjective = 'ventas' | 'remarketing' | 'trafico' | 'alcance' | 'marca'

export const CAMPAIGN_OBJECTIVES: { value: CampaignObjective; label: string; hint: string }[] = [
  {
    value: 'ventas',
    label: 'Ventas',
    hint: 'Prospección: gente nueva que todavía no conoce Boxie.',
  },
  {
    value: 'remarketing',
    label: 'Remarketing',
    hint: 'Gente que ya visitó el sitio o empezó una compra.',
  },
  { value: 'trafico', label: 'Tráfico', hint: 'Llevar visitas a una temática o a la home.' },
  { value: 'alcance', label: 'Alcance', hint: 'Que la marca se vea: reproducciones y alcance.' },
  { value: 'marca', label: 'Marca', hint: 'Búsquedas con el nombre "Boxie".' },
]

/** Lo que se guarda: borrador, activa o pausada. Terminada y programada salen de las fechas. */
export type CampaignStatus = 'draft' | 'active' | 'paused'
export type CampaignState = CampaignStatus | 'scheduled' | 'ended'

export interface Campaign {
  id: string
  name: string
  channel: ChannelId
  objective: CampaignObjective
  status: CampaignStatus
  /** El utm_campaign de sus links: así se le atribuyen las visitas y las ventas. */
  utmCampaign: string
  startsOn: string
  endsOn: string | null
  /** Presupuesto diario planeado (para el ritmo de gasto). 0 = sin presupuesto fijo. */
  dailyBudgetCents: Cents
  /** Temática que empuja (opcional). */
  themeId: string | null
  /** Cupón de la campaña: las ventas con ese cupón cuentan para ella. */
  couponId: string | null
  audience: string
  notes: string
  createdAt: string
  updatedAt: string
}

/** Resultados de un día de una campaña (lo que muestra el administrador de anuncios). */
export interface SpendEntry {
  id: string
  campaignId: string
  day: string
  spendCents: Cents
  impressions: number
  clicks: number
  /** Compras que reporta la plataforma (para comparar con las nuestras). */
  platformConversions: number
}

/**
 * Visitas del sitio, agregadas por día y origen (no hay una fila por
 * persona). `themeViews` y `checkouts` cuentan las visitas que llegaron a una
 * temática y al checkout.
 */
export interface TrafficRow {
  day: string
  source: string
  medium: string
  campaign: string
  device: Device
  landing: string
  sessions: number
  themeViews: number
  checkouts: number
}

export type AttributionModel = 'last' | 'first' | 'linear'

export const ATTRIBUTION_MODELS: { value: AttributionModel; label: string; hint: string }[] = [
  {
    value: 'last',
    label: 'Último clic',
    hint: 'La venta es del último origen con nombre antes de comprar (el que la cerró).',
  },
  {
    value: 'first',
    label: 'Primer clic',
    hint: 'La venta es del origen por el que la persona conoció Boxie (el que la descubrió).',
  },
  {
    value: 'linear',
    label: 'Repartido',
    hint: 'Mitad para el primer origen y mitad para el último.',
  },
]

/** Supuestos del equipo de marketing. */
export interface MarketingSettings {
  /** Presupuesto de pauta del mes. */
  monthlyBudgetCents: Cents
  /** Ganancia que se quiere dejar en cada venta después de la publicidad (puntos básicos del cobrado). */
  targetMarginBps: number
  /** Modelo de atribución por defecto. */
  defaultModel: AttributionModel
  updatedAt: string
}

export interface MarketingDataset {
  /** false: la base no tiene la migración de marketing (se ve lo que sale de las ventas). */
  available: boolean
  settings: MarketingSettings
  campaigns: Campaign[]
  spend: SpendEntry[]
  traffic: TrafficRow[]
  attributions: OrderAttribution[]
}

export const DEFAULT_MARKETING_SETTINGS: MarketingSettings = {
  monthlyBudgetCents: 0,
  targetMarginBps: 2500,
  defaultModel: 'last',
  updatedAt: '2026-09-01T00:00:00.000Z',
}
