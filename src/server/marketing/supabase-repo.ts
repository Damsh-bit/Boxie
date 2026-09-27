import 'server-only'
import type { Device, OrderAttribution, Touch } from '@/domain/marketing/attribution'
import type { ChannelId } from '@/domain/marketing/channels'
import { slugify } from '@/domain/marketing/tools'
import {
  DEFAULT_MARKETING_SETTINGS,
  type AttributionModel,
  type Campaign,
  type CampaignObjective,
  type CampaignStatus,
  type MarketingDataset,
  type SpendEntry,
  type TrafficRow,
} from '@/domain/marketing/types'
import type { Actor } from '../admin/repo'
import { serviceDb } from '../db/client'
import type { Tables } from '../db/database.types'
import { log } from '../log'
import { MARKETING_UNAVAILABLE, MarketingError, type MarketingRepo } from './repo'

/**
 * Marketing sobre Supabase, con el service role (cada acción del panel ya
 * validó sesión y rol; el sitio solo escribe visitas y el origen de una orden
 * recién creada). Necesita la migración 20260927120000_marketing.sql: sin
 * ella, el panel ve `available: false` y el sitio no mide, pero nada se rompe.
 */

const db = () => serviceDb()
const PAGE = 1000
const DAY = 86_400_000

type PgError = { message: string; code?: string } | null

/** ¿La base todavía no tiene las tablas de marketing? */
function missingSchema(error: PgError | unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  const message = (error as { message?: string } | null)?.message ?? String(error)
  if (code === '42P01' || code === 'PGRST205' || code === 'PGRST202') return true
  return (
    /(marketing_|order_attribution)/.test(message) &&
    /(does not exist|schema cache|could not find)/i.test(message)
  )
}

function check(error: PgError, what: string): void {
  if (!error) return
  if (missingSchema(error)) throw new MarketingError(MARKETING_UNAVAILABLE, 'unavailable')
  if (error.code === '23505') throw new MarketingError(`${what}: ya existe una igual.`, 'conflict')
  if (error.code === '23503')
    throw new MarketingError(`${what}: la referencia no existe.`, 'invalid')
  if (error.code === '23514')
    throw new MarketingError(`${what}: hay un dato fuera de rango.`, 'invalid')
  throw new Error(`${what}: ${error.message}`)
}

async function audit(actor: Actor, action: string, entityId: string | null, summary: string) {
  const { error } = await db()
    .from('admin_audit_log')
    .insert({
      actor_id: actor.id ?? null,
      actor_email: actor.email,
      action,
      entity: 'marketing',
      entity_id: entityId,
      summary: summary.slice(0, 300),
    })
  if (error) log.warn('No se pudo registrar en la bitácora', { action, error: error.message })
}

/** Lee todas las filas de a páginas (PostgREST corta en 1000). */
async function all<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: PgError }>,
  what: string,
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1)
    check(error, what)
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}

// ── Mapeos ──────────────────────────────────────────────────────────────────

function toCampaign(r: Tables<'marketing_campaigns'>): Campaign {
  return {
    id: r.id,
    name: r.name,
    channel: r.channel as ChannelId,
    objective: r.objective as CampaignObjective,
    status: r.status as CampaignStatus,
    utmCampaign: r.utm_campaign,
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    dailyBudgetCents: r.daily_budget_cents,
    themeId: r.theme_id,
    couponId: r.coupon_id,
    audience: r.audience,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toSpend(r: Tables<'marketing_spend'>): SpendEntry {
  return {
    id: r.id,
    campaignId: r.campaign_id,
    day: r.day,
    spendCents: r.spend_cents,
    impressions: r.impressions,
    clicks: r.clicks,
    platformConversions: r.platform_conversions,
  }
}

function toTraffic(r: Tables<'marketing_traffic'>): TrafficRow {
  return {
    day: r.day,
    source: r.source,
    medium: r.medium,
    campaign: r.campaign,
    device: r.device as Device,
    landing: r.landing,
    sessions: r.sessions,
    themeViews: r.theme_views,
    checkouts: r.checkouts,
  }
}

function touch(r: Tables<'order_attribution'>, prefix: 'first' | 'last'): Touch | null {
  const source = r[`${prefix}_source`]
  const at = r[`${prefix}_at`]
  if (!source || !at) return null
  return {
    source,
    medium: r[`${prefix}_medium`] ?? '',
    campaign: r[`${prefix}_campaign`] ?? '',
    content: r[`${prefix}_content`] ?? '',
    term: r[`${prefix}_term`] ?? '',
    landing: r[`${prefix}_landing`] ?? '/',
    at,
  }
}

function toAttribution(r: Tables<'order_attribution'>): OrderAttribution {
  return {
    orderId: r.order_id,
    first: touch(r, 'first'),
    last: touch(r, 'last'),
    device: r.device as Device | null,
    createdAt: r.created_at,
  }
}

const touchColumns = (t: Touch | null, prefix: 'first' | 'last') => ({
  [`${prefix}_source`]: t?.source ?? null,
  [`${prefix}_medium`]: t ? t.medium : null,
  [`${prefix}_campaign`]: t ? t.campaign : null,
  [`${prefix}_content`]: t ? t.content : null,
  [`${prefix}_term`]: t ? t.term : null,
  [`${prefix}_landing`]: t?.landing ?? null,
  [`${prefix}_at`]: t?.at ?? null,
})

function unavailable(): MarketingDataset {
  return {
    available: false,
    settings: DEFAULT_MARKETING_SETTINGS,
    campaigns: [],
    spend: [],
    traffic: [],
    attributions: [],
  }
}

// ── Repositorio ─────────────────────────────────────────────────────────────

export const supabaseMarketingRepo: MarketingRepo = {
  mode: 'supabase',

  async dataset() {
    try {
      // Las visitas de más de 13 meses no se muestran en ningún período del panel.
      const since = new Date(Date.now() - 400 * DAY).toISOString().slice(0, 10)
      const [settings, campaigns, spend, traffic, attributions] = await Promise.all([
        db().from('marketing_settings').select('*').maybeSingle(),
        all(
          (a, b) =>
            db()
              .from('marketing_campaigns')
              .select('*')
              .order('starts_on', { ascending: false })
              .range(a, b),
          'campañas',
        ),
        all(
          (a, b) => db().from('marketing_spend').select('*').order('day').range(a, b),
          'inversión',
        ),
        all(
          (a, b) =>
            db().from('marketing_traffic').select('*').gte('day', since).order('day').range(a, b),
          'visitas',
        ),
        all(
          (a, b) => db().from('order_attribution').select('*').order('created_at').range(a, b),
          'origen de las órdenes',
        ),
      ])
      check(settings.error, 'supuestos de marketing')
      const s = settings.data
      return {
        available: true,
        settings: s
          ? {
              monthlyBudgetCents: s.monthly_budget_cents,
              targetMarginBps: s.target_margin_bps,
              defaultModel: s.default_model as AttributionModel,
              updatedAt: s.updated_at,
            }
          : DEFAULT_MARKETING_SETTINGS,
        campaigns: campaigns.map(toCampaign),
        spend: spend.map(toSpend),
        traffic: traffic.map(toTraffic),
        attributions: attributions.map(toAttribution),
      }
    } catch (error) {
      if (error instanceof MarketingError && error.code === 'unavailable') return unavailable()
      throw error
    }
  },

  async saveSettings(patch, actor) {
    const { error } = await db()
      .from('marketing_settings')
      .upsert({
        id: true,
        ...(patch.monthlyBudgetCents !== undefined && {
          monthly_budget_cents: patch.monthlyBudgetCents,
        }),
        ...(patch.targetMarginBps !== undefined && { target_margin_bps: patch.targetMarginBps }),
        ...(patch.defaultModel !== undefined && { default_model: patch.defaultModel }),
      })
    check(error, 'Supuestos de marketing')
    await audit(actor, 'marketing.settings', null, 'Cambió los supuestos de marketing')
  },

  async saveCampaign(input, actor) {
    const row = {
      name: input.name,
      channel: input.channel,
      objective: input.objective,
      status: input.status,
      utm_campaign: input.utmCampaign,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
      daily_budget_cents: input.dailyBudgetCents,
      theme_id: input.themeId,
      coupon_id: input.couponId,
      audience: input.audience,
      notes: input.notes,
    }
    const { data, error } = input.id
      ? await db()
          .from('marketing_campaigns')
          .update(row)
          .eq('id', input.id)
          .select('*')
          .maybeSingle()
      : await db().from('marketing_campaigns').insert(row).select('*').single()
    if (error?.code === '23505')
      throw new MarketingError(
        `Ya hay una campaña con el nombre de links "${input.utmCampaign}".`,
        'conflict',
      )
    check(error, 'Campaña')
    if (!data) throw new MarketingError('La campaña no existe.', 'not_found')
    await audit(
      actor,
      input.id ? 'marketing.campaign.update' : 'marketing.campaign.create',
      data.id,
      `${input.id ? 'Editó' : 'Creó'} la campaña "${data.name}"`,
    )
    return toCampaign(data)
  },

  async deleteCampaign(id, actor) {
    const { data, error } = await db()
      .from('marketing_campaigns')
      .delete()
      .eq('id', id)
      .select('name')
      .maybeSingle()
    check(error, 'Campaña')
    if (!data) throw new MarketingError('La campaña no existe.', 'not_found')
    await audit(actor, 'marketing.campaign.delete', id, `Borró la campaña "${data.name}"`)
  },

  async saveSpend(rows, actor) {
    const { error } = await db()
      .from('marketing_spend')
      .upsert(
        rows.map((r) => ({
          campaign_id: r.campaignId,
          day: r.day,
          spend_cents: r.spendCents,
          impressions: r.impressions,
          clicks: r.clicks,
          platform_conversions: r.platformConversions,
        })),
        { onConflict: 'campaign_id,day' },
      )
    check(error, 'Resultados de pauta')
    await audit(
      actor,
      'marketing.spend',
      rows.length === 1 ? rows[0]!.campaignId : null,
      `Cargó resultados de pauta (${rows.length} ${rows.length === 1 ? 'día' : 'días'})`,
    )
    return rows.length
  },

  async deleteSpend(campaignId, day, actor) {
    const { data, error } = await db()
      .from('marketing_spend')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('day', day)
      .select('id')
    check(error, 'Resultados de pauta')
    if (!data?.length) throw new MarketingError('Ese día no tiene resultados.', 'not_found')
    await audit(actor, 'marketing.spend.delete', campaignId, `Borró los resultados del ${day}`)
  },

  async importSpend(input, actor) {
    const existing = await all(
      (a, b) => db().from('marketing_campaigns').select('*').range(a, b),
      'campañas',
    )
    const byName = new Map(existing.map((c) => [c.name.toLowerCase(), c]))
    const utms = new Set(existing.map((c) => c.utm_campaign))
    let created = 0
    const ids = new Map<string, string>()
    for (const row of input.rows) {
      if (row.campaignId || ids.has(row.campaignName.toLowerCase())) continue
      const key = row.campaignName.toLowerCase()
      const found = byName.get(key)
      if (found) {
        ids.set(key, found.id)
        continue
      }
      let utm = slugify(row.campaignName, 70) || 'campana'
      for (let i = 2; utms.has(utm); i++) utm = `${slugify(row.campaignName, 66) || 'campana'}-${i}`
      utms.add(utm)
      const firstDay = input.rows
        .filter((r) => r.campaignName.toLowerCase() === key)
        .reduce((min, r) => (r.day < min ? r.day : min), row.day)
      const { data, error } = await db()
        .from('marketing_campaigns')
        .insert({
          name: row.campaignName,
          channel: input.channel,
          utm_campaign: utm,
          starts_on: firstDay,
          notes: 'Creada al importar resultados.',
        })
        .select('id')
        .single()
      check(error, `Campaña "${row.campaignName}"`)
      ids.set(key, data!.id)
      created++
    }
    const rows = input.rows.map((r) => ({
      campaign_id: r.campaignId ?? ids.get(r.campaignName.toLowerCase())!,
      day: r.day,
      spend_cents: r.spendCents,
      impressions: r.impressions,
      clicks: r.clicks,
      platform_conversions: r.platformConversions,
    }))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await db()
        .from('marketing_spend')
        .upsert(rows.slice(i, i + 500), { onConflict: 'campaign_id,day' })
      check(error, 'Resultados de pauta')
    }
    await audit(
      actor,
      'marketing.import',
      null,
      `Importó ${rows.length} filas de pauta${created ? ` (${created} campañas nuevas)` : ''}`,
    )
    return { created, rows: rows.length }
  },

  async track(payload) {
    const { error } = await db().rpc('marketing_track', {
      p_day: payload.day,
      p_source: payload.source,
      p_medium: payload.medium,
      p_campaign: payload.campaign,
      p_device: payload.device,
      p_landing: payload.landing,
      p_step: payload.step,
    })
    if (error && !missingSchema(error))
      log.warn('No se pudo contar la visita', { error: error.message })
  },

  async saveAttribution(orderId, payload) {
    const { error } = await db()
      .from('order_attribution')
      .upsert({
        order_id: orderId,
        ...touchColumns(payload.first, 'first'),
        ...touchColumns(payload.last, 'last'),
        device: payload.device,
      })
    if (error && !missingSchema(error))
      log.warn('No se pudo guardar el origen de la orden', { orderId, error: error.message })
  },
}
