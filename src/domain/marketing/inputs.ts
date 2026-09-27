import { z } from 'zod'
import { SPEND_CHANNELS, type ChannelId } from './channels'
import { slugify } from './tools'

/**
 * Lo que mandan los formularios de Marketing. El servidor valida siempre con
 * estos schemas. Montos en centavos, días como "AAAA-MM-DD".
 */

const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
const cents = z.number().int('Tiene que ser un monto entero').min(0, 'No puede ser negativo')
const count = z.number().int().min(0).max(2_000_000_000)
const id = z.string().min(1).max(64)
const spendChannel = z.enum(SPEND_CHANNELS as unknown as readonly [ChannelId, ...ChannelId[]])

export const CampaignInputSchema = z
  .object({
    id: id.optional(),
    name: z.string().trim().min(2, 'Muy corto').max(120),
    channel: spendChannel,
    objective: z.enum(['ventas', 'remarketing', 'trafico', 'alcance', 'marca']),
    status: z.enum(['draft', 'active', 'paused']),
    utmCampaign: z
      .string()
      .trim()
      .transform((v) => slugify(v, 80))
      .pipe(z.string().min(2, 'Falta el nombre para los links (utm_campaign)')),
    startsOn: dayString,
    endsOn: dayString.nullable(),
    dailyBudgetCents: cents,
    themeId: id.nullable(),
    couponId: id.nullable(),
    audience: z.string().trim().max(300),
    notes: z.string().trim().max(2000),
  })
  .refine((c) => !c.endsOn || c.endsOn >= c.startsOn, {
    message: 'Termina antes de empezar',
    path: ['endsOn'],
  })
export type CampaignInput = z.infer<typeof CampaignInputSchema>

export const SpendInputSchema = z.object({
  campaignId: id,
  day: dayString,
  spendCents: cents,
  impressions: count,
  clicks: count,
  platformConversions: count,
})
export type SpendInput = z.infer<typeof SpendInputSchema>

export const SpendBatchSchema = z
  .array(SpendInputSchema)
  .min(1, 'No hay filas para guardar')
  .max(5000, 'Son demasiadas filas: importá de a 5000')
  .refine((rows) => rows.every((r) => r.clicks <= r.impressions || r.impressions === 0), {
    message: 'Hay filas con más clics que impresiones',
  })

export const ImportRowSchema = z.object({
  campaignName: z.string().trim().min(1).max(120),
  /** Campaña existente; null = crear una nueva con ese nombre. */
  campaignId: id.nullable(),
  day: dayString,
  spendCents: cents,
  impressions: count,
  clicks: count,
  platformConversions: count,
})

export const ImportInputSchema = z.object({
  /** Canal de las campañas nuevas que cree la importación. */
  channel: spendChannel,
  rows: z.array(ImportRowSchema).min(1, 'No hay filas para importar').max(5000),
})
export type ImportInput = z.infer<typeof ImportInputSchema>

export const MarketingSettingsInputSchema = z
  .object({
    monthlyBudgetCents: cents,
    targetMarginBps: z.number().int().min(0).max(9000),
    defaultModel: z.enum(['last', 'first', 'linear']),
  })
  .partial()
export type MarketingSettingsInput = z.infer<typeof MarketingSettingsInputSchema>
