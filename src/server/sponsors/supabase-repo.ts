import 'server-only'
import type {
  Sponsor,
  SponsorInput,
  SponsorInterest,
  SponsorKind,
  SponsorPlacement,
  SponsorStage,
} from '@/domain/sponsors'
import type { Actor } from '../admin/repo'
import { serviceDb } from '../db/client'
import type { Tables, TablesInsert } from '../db/database.types'
import { log } from '../log'
import { SPONSORS_UNAVAILABLE, SponsorsError, type SponsorsRepo } from './repo'

/**
 * Sponsors sobre Supabase, con el service role: el panel ya validó sesión y
 * rol, y la ruta pública de /marcas solo crea contactos nuevos (validados y
 * con límite de pedidos). Necesita la migración 20260928120000_sponsors.sql.
 */

const db = () => serviceDb()

type PgError = { message: string; code?: string } | null

/** ¿La base todavía no tiene la tabla? */
function missingSchema(error: PgError): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true
  return (
    /sponsors/.test(error.message) &&
    /(does not exist|schema cache|could not find)/i.test(error.message)
  )
}

function check(error: PgError, what: string): void {
  if (!error) return
  if (missingSchema(error)) throw new SponsorsError(SPONSORS_UNAVAILABLE, 'unavailable')
  if (error.code === '23514') throw new SponsorsError(`${what}: hay un dato fuera de rango.`)
  throw new Error(`${what}: ${error.message}`)
}

async function audit(actor: Actor, action: string, entityId: string, summary: string) {
  const { error } = await db()
    .from('admin_audit_log')
    .insert({
      actor_id: actor.id ?? null,
      actor_email: actor.email,
      action,
      entity: 'sponsor',
      entity_id: entityId,
      summary: summary.slice(0, 300),
    })
  if (error) log.warn('No se pudo registrar en la bitácora', { action, error: error.message })
}

function toSponsor(r: Tables<'sponsors'>): Sponsor {
  return {
    id: r.id,
    name: r.name,
    kind: r.kind as SponsorKind,
    stage: r.stage as SponsorStage,
    tagline: r.tagline,
    offer: r.offer,
    description: r.description,
    emoji: r.emoji,
    logoUrl: r.logo_url,
    color: r.color,
    url: r.url,
    city: r.city,
    couponCode: r.coupon_code,
    placements: r.placements as SponsorPlacement[],
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    sortOrder: r.sort_order,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    interests: r.interests as SponsorInterest[],
    notes: r.notes,
    source: r.source as Sponsor['source'],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(input: SponsorInput): Omit<TablesInsert<'sponsors'>, 'id' | 'source'> {
  return {
    name: input.name,
    kind: input.kind,
    stage: input.stage,
    tagline: input.tagline,
    offer: input.offer,
    description: input.description,
    emoji: input.emoji,
    logo_url: input.logoUrl,
    color: input.color,
    url: input.url,
    city: input.city,
    coupon_code: input.couponCode,
    placements: input.placements,
    starts_on: input.startsOn,
    ends_on: input.endsOn,
    sort_order: input.sortOrder,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    contact_phone: input.contactPhone,
    interests: input.interests,
    notes: input.notes,
  }
}

export const supabaseSponsorsRepo: SponsorsRepo = {
  mode: 'supabase',

  async list() {
    const { data, error } = await db()
      .from('sponsors')
      .select('*')
      .order('sort_order')
      .order('created_at', { ascending: false })
      .limit(500)
    if (missingSchema(error)) return { available: false, sponsors: [] }
    check(error, 'Sponsors')
    return { available: true, sponsors: (data ?? []).map(toSponsor) }
  },

  async save(input, actor) {
    if (input.id) {
      const { data, error } = await db()
        .from('sponsors')
        .update(toRow(input))
        .eq('id', input.id)
        .select('*')
        .maybeSingle()
      check(error, 'Guardar el sponsor')
      if (!data) throw new SponsorsError('El sponsor no existe.', 'not_found')
      await audit(actor, 'sponsor.update', data.id, `Editó el sponsor "${data.name}"`)
      return toSponsor(data)
    }
    const { data, error } = await db()
      .from('sponsors')
      .insert({ ...toRow(input), source: 'panel' })
      .select('*')
      .single()
    check(error, 'Guardar el sponsor')
    await audit(actor, 'sponsor.create', data!.id, `Sumó el sponsor "${data!.name}"`)
    return toSponsor(data!)
  },

  async delete(id, actor) {
    const { data, error } = await db()
      .from('sponsors')
      .delete()
      .eq('id', id)
      .select('id, name')
      .maybeSingle()
    check(error, 'Borrar el sponsor')
    if (!data) throw new SponsorsError('El sponsor no existe.', 'not_found')
    await audit(actor, 'sponsor.delete', id, `Borró el sponsor "${data.name}"`)
  },

  async createLead(input) {
    const { data, error } = await db()
      .from('sponsors')
      .insert({ ...toRow(input), source: 'web' })
      .select('*')
      .single()
    check(error, 'Guardar el contacto')
    return toSponsor(data!)
  },
}
