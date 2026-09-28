import 'server-only'
import { randomUUID } from 'node:crypto'
import type { AuditEntry } from '@/domain/admin/types'
import { slugify } from '@/domain/marketing/tools'
import type { Campaign, SpendEntry } from '@/domain/marketing/types'
import type { Actor } from '../admin/repo'
import type { DemoDb, DemoMarketing } from '../admin/demo/seed'
import { demoDb, mutateDemoDb } from '../admin/demo/store'
import { seedMarketing } from './demo-seed'
import { MarketingError, type MarketingRepo } from './repo'

/**
 * Marketing sobre la base de demo (en memoria): la primera vez se siembra un
 * año de campañas simuladas sobre las ventas de muestra. Las visitas reales
 * que se hagan al sitio en modo demo también se cuentan acá.
 */

const now = () => new Date().toISOString()

function marketing(db: DemoDb): DemoMarketing {
  db.marketing ??= seedMarketing(db)
  return db.marketing
}

function withMarketing<T>(fn: (m: DemoMarketing, db: DemoDb) => T): T {
  return mutateDemoDb((db) => fn(marketing(db), db))
}

function audit(db: DemoDb, actor: Actor, action: string, entityId: string | null, summary: string) {
  const entry: AuditEntry = {
    id: randomUUID(),
    at: now(),
    actor: actor.email,
    action,
    entity: 'marketing',
    entityId,
    summary,
  }
  db.audit.unshift(entry)
  if (db.audit.length > 500) db.audit.length = 500
}

function upsertSpend(m: DemoMarketing, row: Omit<SpendEntry, 'id'>) {
  const existing = m.spend.find((e) => e.campaignId === row.campaignId && e.day === row.day)
  if (existing) Object.assign(existing, row)
  else m.spend.push({ id: randomUUID(), ...row })
}

export const demoMarketingRepo: MarketingRepo = {
  mode: 'demo',

  async dataset() {
    const db = demoDb()
    // La primera lectura siembra (y guarda) el marketing de muestra.
    const m = db.marketing ?? withMarketing((x) => x)
    return {
      available: true,
      settings: m.settings,
      campaigns: m.campaigns,
      spend: m.spend,
      traffic: m.traffic,
      attributions: m.attributions,
    }
  },

  async adSpend() {
    const m = demoDb().marketing ?? withMarketing((x) => x)
    return { campaigns: m.campaigns, spend: m.spend }
  },

  async orderOrigin(orderId) {
    const m = demoDb().marketing ?? withMarketing((x) => x)
    return {
      attribution: m.attributions.find((a) => a.orderId === orderId) ?? null,
      campaigns: m.campaigns,
    }
  },

  async saveSettings(patch, actor) {
    withMarketing((m, db) => {
      m.settings = { ...m.settings, ...patch, updatedAt: now() }
      audit(db, actor, 'marketing.settings', null, 'Cambió los supuestos de marketing')
    })
  },

  async saveCampaign(input, actor) {
    return withMarketing((m, db) => {
      const clash = m.campaigns.find(
        (c) => c.utmCampaign === input.utmCampaign && c.id !== input.id,
      )
      if (clash)
        throw new MarketingError(
          `Ya hay una campaña con el nombre de links "${input.utmCampaign}" (${clash.name}).`,
          'conflict',
        )
      if (input.themeId && !db.themes.some((t) => t.id === input.themeId))
        throw new MarketingError('La temática no existe.')
      if (input.couponId && !db.coupons.some((c) => c.id === input.couponId))
        throw new MarketingError('El cupón no existe.')
      const at = now()
      if (input.id) {
        const current = m.campaigns.find((c) => c.id === input.id)
        if (!current) throw new MarketingError('La campaña no existe.', 'not_found')
        Object.assign(current, { ...input, updatedAt: at })
        audit(
          db,
          actor,
          'marketing.campaign.update',
          current.id,
          `Editó la campaña "${current.name}"`,
        )
        return current
      }
      const campaign: Campaign = { ...input, id: randomUUID(), createdAt: at, updatedAt: at }
      m.campaigns.unshift(campaign)
      audit(
        db,
        actor,
        'marketing.campaign.create',
        campaign.id,
        `Creó la campaña "${campaign.name}"`,
      )
      return campaign
    })
  },

  async deleteCampaign(id, actor) {
    withMarketing((m, db) => {
      const campaign = m.campaigns.find((c) => c.id === id)
      if (!campaign) throw new MarketingError('La campaña no existe.', 'not_found')
      m.campaigns = m.campaigns.filter((c) => c.id !== id)
      m.spend = m.spend.filter((e) => e.campaignId !== id)
      audit(db, actor, 'marketing.campaign.delete', id, `Borró la campaña "${campaign.name}"`)
    })
  },

  async saveSpend(rows, actor) {
    return withMarketing((m, db) => {
      for (const row of rows) {
        if (!m.campaigns.some((c) => c.id === row.campaignId))
          throw new MarketingError('Una de las campañas no existe.', 'not_found')
        upsertSpend(m, row)
      }
      audit(
        db,
        actor,
        'marketing.spend',
        rows.length === 1 ? rows[0]!.campaignId : null,
        `Cargó resultados de pauta (${rows.length} ${rows.length === 1 ? 'día' : 'días'})`,
      )
      return rows.length
    })
  },

  async deleteSpend(campaignId, day, actor) {
    withMarketing((m, db) => {
      const before = m.spend.length
      m.spend = m.spend.filter((e) => !(e.campaignId === campaignId && e.day === day))
      if (m.spend.length === before)
        throw new MarketingError('Ese día no tiene resultados.', 'not_found')
      audit(db, actor, 'marketing.spend.delete', campaignId, `Borró los resultados del ${day}`)
    })
  },

  async importSpend(input, actor) {
    return withMarketing((m, db) => {
      const created = new Map<string, Campaign>()
      for (const row of input.rows) {
        let campaignId = row.campaignId
        if (campaignId && !m.campaigns.some((c) => c.id === campaignId))
          throw new MarketingError('Una de las campañas elegidas no existe.', 'not_found')
        if (!campaignId) {
          const key = row.campaignName.toLowerCase()
          let campaign = created.get(key) ?? m.campaigns.find((c) => c.name.toLowerCase() === key)
          if (!campaign) {
            const at = now()
            let utm = slugify(row.campaignName, 70) || 'campana'
            while (m.campaigns.some((c) => c.utmCampaign === utm))
              utm = `${utm}-${randomUUID().slice(0, 4)}`
            campaign = {
              id: randomUUID(),
              name: row.campaignName,
              channel: input.channel,
              objective: 'ventas',
              status: 'active',
              utmCampaign: utm,
              startsOn: row.day,
              endsOn: null,
              dailyBudgetCents: 0,
              themeId: null,
              couponId: null,
              audience: '',
              notes: 'Creada al importar resultados.',
              createdAt: at,
              updatedAt: at,
            }
            m.campaigns.unshift(campaign)
            created.set(key, campaign)
          }
          if (row.day < campaign.startsOn) campaign.startsOn = row.day
          campaignId = campaign.id
        }
        upsertSpend(m, {
          campaignId,
          day: row.day,
          spendCents: row.spendCents,
          impressions: row.impressions,
          clicks: row.clicks,
          platformConversions: row.platformConversions,
        })
      }
      audit(
        db,
        actor,
        'marketing.import',
        null,
        `Importó ${input.rows.length} filas de pauta${created.size ? ` (${created.size} campañas nuevas)` : ''}`,
      )
      return { created: created.size, rows: input.rows.length }
    })
  },

  async track(payload) {
    withMarketing((m) => {
      const row = m.traffic.find(
        (t) =>
          t.day === payload.day &&
          t.source === payload.source &&
          t.medium === payload.medium &&
          t.campaign === payload.campaign &&
          t.device === payload.device &&
          t.landing === payload.landing,
      )
      const target = row ?? {
        day: payload.day,
        source: payload.source,
        medium: payload.medium,
        campaign: payload.campaign,
        device: payload.device,
        landing: payload.landing,
        sessions: 0,
        themeViews: 0,
        checkouts: 0,
      }
      if (payload.step === 'session') target.sessions++
      else if (payload.step === 'theme') target.themeViews++
      else target.checkouts++
      if (!row) m.traffic.push(target)
    })
  },

  async saveAttribution(orderId, payload) {
    withMarketing((m) => {
      m.attributions = m.attributions.filter((a) => a.orderId !== orderId)
      m.attributions.push({ orderId, ...payload, createdAt: now() })
    })
  },
}
