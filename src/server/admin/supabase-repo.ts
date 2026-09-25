import 'server-only'
import type {
  AdminAffiliate,
  AdminBoxie,
  AdminCoupon,
  AdminOrder,
  AdminSettings,
  AdminTask,
  AdminTheme,
  AdminThemeSummary,
  AdminUser,
  AuditEntry,
  Expense,
  PaymentEvent,
  ThemeOrigin,
  ThemeVersionInfo,
} from '@/domain/admin/types'
import type { Plan } from '@/domain/plans'
import { buyerSlides, parseThemeConfig } from '@/slides/config'
import { configForPlan } from '@/slides/plans'
import type { ThemeConfigInput } from '@/slides/theme-config'
import { serviceDb, unwrap, unwrapMaybe } from '../db/client'
import type { Json, Tables, TablesUpdate } from '../db/database.types'
import { env, siteUrl } from '../env'
import { log } from '../log'
import { sendMail } from '../mail/send'
import { editorAccessEmail, giftReadyEmail } from '../mail/templates'
import { toPlan } from '../mappers'
import { signedMediaUrls } from '../media'
import { decryptToken, generateToken, hashToken } from '../security/tokens'
import { AdminRepoError, type Actor, type AdminRepo } from './repo'

/**
 * El panel sobre Supabase: el mismo contrato que el modo demo, contra la
 * base real. Usa el service role (saltea RLS) porque cada acción ya pasó por
 * `requireAdminAction` (sesión firmada + rol); la base igual hace cumplir sus
 * reglas (versiones inmutables, reembolsos atómicos, un solo dueño…).
 *
 * Necesita la migración 20260925120000_admin_backoffice.sql aplicada.
 * ⚠️ Escrita contra los tipos generados de las migraciones y probada en su
 * lógica con el modo demo; al conectar el proyecto real, recorrer el panel
 * una vez (docs/ADMIN.md § "Conectar Supabase").
 */

const db = () => serviceDb()
const now = () => new Date().toISOString()

// ── Errores ─────────────────────────────────────────────────────────────────

type PgError = { message: string; code?: string } | null

/** Traduce los errores de Postgres que el panel puede provocar. */
function check(error: PgError, what: string): void {
  if (!error) return
  if (error.code === '23505') throw new AdminRepoError(`${what}: ya existe uno igual.`, 'conflict')
  if (error.code === '23503')
    throw new AdminRepoError(`${what}: está en uso (tiene ventas o referencias).`, 'conflict')
  if (error.code === '23514' || error.code === 'P0001')
    throw new AdminRepoError(`${what}: ${error.message}`, 'invalid')
  throw new Error(`${what}: ${error.message}`)
}

async function audit(
  actor: Actor,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
) {
  const { error } = await db()
    .from('admin_audit_log')
    .insert({
      actor_id: actor.id ?? null,
      actor_email: actor.email,
      action,
      entity,
      entity_id: entityId,
      summary: summary.slice(0, 300),
    })
  // La bitácora nunca rompe la acción que ya se hizo.
  if (error) log.warn('No se pudo registrar en la bitácora', { action, error: error.message })
}

// ── Mapeos ──────────────────────────────────────────────────────────────────

const dayToIso = (d: string | null) =>
  d ? new Date(`${d}T00:00:00.000-03:00`).toISOString() : null

function toOrder(r: Tables<'orders'>): AdminOrder {
  return {
    id: r.id,
    status: r.status,
    themeId: r.theme_id,
    themeVersionId: r.theme_version_id,
    planId: r.plan_id,
    currency: r.currency,
    listPriceCents: r.list_price_cents,
    discountCents: r.discount_cents,
    amountCents: r.amount_cents,
    couponId: r.coupon_id,
    couponCode: r.coupon_code,
    affiliateId: r.affiliate_id,
    buyerName: r.buyer_name,
    buyerEmail: r.buyer_email,
    buyerPhone: r.buyer_phone,
    paymentProvider: r.payment_provider as AdminOrder['paymentProvider'],
    mpPaymentId: r.mp_payment_id,
    providerStatus: r.provider_status,
    paidAt: r.paid_at,
    // El reembolso no tiene columna propia: cambia el estado (y queda en payment_events).
    refundedAt: r.status === 'refunded' ? r.updated_at : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

const BOXIE_COLUMNS =
  'id, code, order_id, theme_version_id, status, recipient_name, sender_name, locked_at, expires_at, access_email_sent_at, gift_email_sent_at, first_opened_at, open_count, created_at, updated_at'

type BoxieRow = Pick<
  Tables<'boxies'>,
  | 'id'
  | 'code'
  | 'order_id'
  | 'theme_version_id'
  | 'status'
  | 'recipient_name'
  | 'sender_name'
  | 'locked_at'
  | 'expires_at'
  | 'access_email_sent_at'
  | 'gift_email_sent_at'
  | 'first_opened_at'
  | 'open_count'
  | 'created_at'
  | 'updated_at'
>

interface BoxieStats {
  last_edited_at: string | null
  filled_slides: number | null
  photos: number | null
  has_password: boolean | null
}

function toBoxie(r: BoxieRow, stats: BoxieStats | undefined, modulesTotal: number): AdminBoxie {
  const done =
    (stats?.filled_slides ?? 0) + (r.recipient_name.trim() ? 1 : 0) + (stats?.has_password ? 1 : 0)
  return {
    id: r.id,
    code: r.code,
    orderId: r.order_id,
    themeVersionId: r.theme_version_id,
    status: r.status,
    recipientName: r.recipient_name,
    senderName: r.sender_name,
    lockedAt: r.locked_at,
    expiresAt: r.expires_at,
    accessEmailSentAt: r.access_email_sent_at,
    giftEmailSentAt: r.gift_email_sent_at,
    firstOpenedAt: r.first_opened_at,
    openCount: r.open_count,
    lastEditedAt: stats?.last_edited_at ?? null,
    modulesDone: r.locked_at ? modulesTotal : Math.min(done, modulesTotal),
    modulesTotal,
    photos: stats?.photos ?? 0,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toCoupon(r: Tables<'coupons'>): AdminCoupon {
  return {
    id: r.id,
    code: r.code,
    kind: r.kind,
    value: r.value,
    active: r.active,
    maxUses: r.max_uses,
    usedCount: r.used_count,
    startsAt: r.starts_at,
    expiresAt: r.expires_at,
    affiliateId: r.affiliate_id,
    description: r.description,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toSettings(r: Tables<'settings'>): AdminSettings {
  return {
    basePriceCents: r.base_price_cents,
    currency: r.currency,
    giftLifetimeDays: r.gift_lifetime_days,
    offerCouponId: r.offer_coupon_id,
    offerDelaySeconds: r.offer_delay_seconds,
    gatewayFeeBps: r.gateway_fee_bps,
    gatewayVatBps: r.gateway_vat_bps,
    gatewayFixedCents: r.gateway_fixed_cents,
    taxBps: r.tax_bps,
    variableCostCents: r.variable_cost_cents,
    monthlyGoalCents: Number(r.monthly_goal_cents),
    businessName: r.business_name,
    supportEmail: r.support_email,
    whatsapp: r.whatsapp,
    instagram: r.instagram,
    salesPaused: r.sales_paused,
    updatedAt: r.updated_at,
  }
}

function toExpense(r: Tables<'expenses'>): Expense {
  return {
    id: r.id,
    category: r.category,
    description: r.description,
    vendor: r.vendor,
    amountCents: Number(r.amount_cents),
    recurrence: r.recurrence as Expense['recurrence'],
    startsOn: r.starts_on,
    endsOn: r.ends_on,
    createdAt: r.created_at,
  }
}

function toTask(r: Tables<'admin_tasks'>): AdminTask {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    status: r.status,
    priority: r.priority,
    assignee: r.assignee,
    tags: r.tags,
    dueOn: r.due_on,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

type VersionRow = Pick<
  Tables<'theme_versions'>,
  'id' | 'theme_id' | 'version' | 'config' | 'published_at' | 'created_by'
>

function summary(t: Tables<'themes'>, versions: VersionRow[]): AdminThemeSummary {
  const current = versions.find((v) => v.id === t.current_version_id)
  const draft = (t.draft_config ?? current?.config ?? { slides: [] }) as { slides?: unknown[] }
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    category: t.category,
    description: t.description,
    status: t.status,
    priceCents: t.price_cents,
    sortOrder: t.sort_order,
    listing: t.listing,
    currentVersionId: t.current_version_id,
    currentVersion: current?.version ?? null,
    hasUnpublishedChanges:
      !current ||
      JSON.stringify(current.config) !== JSON.stringify(t.draft_config ?? current.config),
    slides: Array.isArray(draft.slides) ? draft.slides.length : 0,
    origin: t.origin as ThemeOrigin,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }
}

async function themesWithVersions() {
  const [themes, versions] = await Promise.all([
    db()
      .from('themes')
      .select('*')
      .order('sort_order')
      .then((r) => unwrap(r, 'temáticas')),
    db()
      .from('theme_versions')
      .select('id, theme_id, version, config, published_at, created_by')
      .then((r) => unwrap(r, 'versiones')),
  ])
  return { themes, versions }
}

/** Módulos que completa el comprador según la versión vendida y el plan. */
function modulesTotalFor(config: Json | undefined, plan: Plan | undefined, plans: Plan[]): number {
  const parsed = parseThemeConfig(config)
  if (!parsed.success) return 1
  const shown = plan ? configForPlan(parsed.data, plan, plans) : parsed.data
  return buyerSlides(shown).length + 1 + (plan?.limits.allowPassword === false ? 0 : 1)
}

async function loadBoxies(orders: AdminOrder[], versions: VersionRow[], plans: Plan[]) {
  const [rows, stats] = await Promise.all([
    db()
      .from('boxies')
      .select(BOXIE_COLUMNS)
      .then((r) => unwrap(r, 'Boxies')),
    db()
      .from('admin_boxie_stats')
      .select('*')
      .then((r) => unwrap(r, 'estadísticas de Boxies')),
  ])
  const statsById = new Map(stats.map((s) => [s.boxie_id, s]))
  const orderById = new Map(orders.map((o) => [o.id, o]))
  const configById = new Map(versions.map((v) => [v.id, v.config]))
  const planById = new Map(plans.map((p) => [p.id, p]))
  const totals = new Map<string, number>()
  return rows.map((r) => {
    const plan = planById.get(orderById.get(r.order_id)?.planId ?? '')
    const key = `${r.theme_version_id}:${plan?.id ?? ''}`
    if (!totals.has(key))
      totals.set(key, modulesTotalFor(configById.get(r.theme_version_id), plan, plans))
    return toBoxie(r, statsById.get(r.id), totals.get(key)!)
  })
}

async function findBoxieRow(id: string) {
  const row = unwrapMaybe(
    await db().from('boxies').select(`${BOXIE_COLUMNS}, gift_token_enc`).eq('id', id).maybeSingle(),
    'Boxie',
  )
  if (!row) throw new AdminRepoError('La Boxie no existe.', 'not_found')
  return row
}

// ── Repositorio ─────────────────────────────────────────────────────────────

export const supabaseRepo: AdminRepo = {
  mode: 'supabase',

  async dataset() {
    const [settings, plans, { themes, versions }, coupons, affiliates, orders, expenses] =
      await Promise.all([
        this.getSettings(),
        this.listPlans(),
        themesWithVersions(),
        db()
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false })
          .then((r) => unwrap(r, 'cupones').map(toCoupon)),
        db()
          .from('affiliates')
          .select('*')
          .then((r) =>
            unwrap(r, 'afiliados').map((a): AdminAffiliate => ({
              id: a.id,
              name: a.name,
              code: a.code,
              commissionBps: a.commission_bps,
              active: a.active,
              email: a.email,
              notes: a.notes,
              createdAt: a.created_at,
            })),
          ),
        db()
          .from('orders')
          .select('*')
          .order('created_at')
          .then((r) => unwrap(r, 'órdenes').map(toOrder)),
        db()
          .from('expenses')
          .select('*')
          .then((r) => unwrap(r, 'gastos').map(toExpense)),
      ])
    const boxies = await loadBoxies(orders, versions, plans)
    return {
      settings,
      plans,
      themes: themes.map((t) =>
        summary(
          t,
          versions.filter((v) => v.theme_id === t.id),
        ),
      ),
      coupons,
      affiliates,
      orders,
      boxies,
      expenses,
    }
  },

  async getSettings() {
    return toSettings(unwrap(await db().from('settings').select('*').single(), 'configuración'))
  },

  async saveSettings(patch, actor) {
    const update: TablesUpdate<'settings'> = {
      ...(patch.basePriceCents !== undefined && { base_price_cents: patch.basePriceCents }),
      ...(patch.giftLifetimeDays !== undefined && { gift_lifetime_days: patch.giftLifetimeDays }),
      ...(patch.offerCouponId !== undefined && { offer_coupon_id: patch.offerCouponId }),
      ...(patch.offerDelaySeconds !== undefined && {
        offer_delay_seconds: patch.offerDelaySeconds,
      }),
      ...(patch.gatewayFeeBps !== undefined && { gateway_fee_bps: patch.gatewayFeeBps }),
      ...(patch.gatewayVatBps !== undefined && { gateway_vat_bps: patch.gatewayVatBps }),
      ...(patch.gatewayFixedCents !== undefined && {
        gateway_fixed_cents: patch.gatewayFixedCents,
      }),
      ...(patch.taxBps !== undefined && { tax_bps: patch.taxBps }),
      ...(patch.variableCostCents !== undefined && {
        variable_cost_cents: patch.variableCostCents,
      }),
      ...(patch.monthlyGoalCents !== undefined && { monthly_goal_cents: patch.monthlyGoalCents }),
      ...(patch.businessName !== undefined && { business_name: patch.businessName }),
      ...(patch.supportEmail !== undefined && { support_email: patch.supportEmail }),
      ...(patch.whatsapp !== undefined && { whatsapp: patch.whatsapp }),
      ...(patch.instagram !== undefined && { instagram: patch.instagram }),
      ...(patch.salesPaused !== undefined && { sales_paused: patch.salesPaused }),
    }
    const { error } = await db().from('settings').update(update).eq('id', true)
    check(error, 'Configuración')
    await audit(
      actor,
      'settings.update',
      'settings',
      null,
      `Cambió la configuración (${Object.keys(patch).join(', ')})`,
    )
  },

  // ── Planes ────────────────────────────────────────────────────────────────

  async listPlans() {
    return unwrap(await db().from('plans').select('*').order('rank'), 'planes').map(toPlan)
  },

  async savePlan(input, actor) {
    const row = {
      slug: input.slug,
      name: input.name,
      tagline: input.tagline,
      price_cents: input.priceCents,
      compare_at_cents: input.compareAtCents,
      rank: input.rank,
      color: input.color,
      features: input.features,
      gift_lifetime_days: input.limits.giftLifetimeDays,
      max_photos: input.limits.maxPhotos,
      allow_password: input.limits.allowPassword,
      highlighted: input.highlighted,
      active: input.active,
    }
    const previous = input.id
      ? unwrapMaybe(await db().from('plans').select('*').eq('id', input.id).maybeSingle(), 'plan')
      : null
    if (input.id && !previous) throw new AdminRepoError('El plan no existe.', 'not_found')
    // Un solo destacado: se desmarca el anterior antes de marcar este.
    if (input.highlighted) {
      const { error } = await db()
        .from('plans')
        .update({ highlighted: false })
        .neq('id', input.id ?? '')
      check(error, 'Plan')
    }
    const { data, error } = previous
      ? await db().from('plans').update(row).eq('id', previous.id).select('*').single()
      : await db().from('plans').insert(row).select('*').single()
    check(error, 'Plan')
    // Las slides guardan el slug del plan: si cambió, se actualizan los borradores.
    if (previous && previous.slug !== input.slug) {
      const themes = unwrap(await db().from('themes').select('id, draft_config'), 'temáticas')
      for (const t of themes) {
        const config = t.draft_config as ThemeConfigInput | null
        if (!config?.slides?.some((s) => s.plan === previous.slug)) continue
        const next = {
          ...config,
          slides: config.slides.map((s) =>
            s.plan === previous.slug ? { ...s, plan: input.slug } : s,
          ),
        }
        await db()
          .from('themes')
          .update({ draft_config: next as unknown as Json })
          .eq('id', t.id)
      }
    }
    await audit(
      actor,
      previous ? 'plan.update' : 'plan.create',
      'plan',
      data!.id,
      `${previous ? 'Editó' : 'Creó'} el plan ${input.name}`,
    )
    return toPlan(data!)
  },

  async deletePlan(id, actor) {
    const { data, error } = await db()
      .from('plans')
      .delete()
      .eq('id', id)
      .select('name')
      .maybeSingle()
    if (error?.code === '23503')
      throw new AdminRepoError('El plan tiene ventas: desactivalo en vez de borrarlo.', 'conflict')
    check(error, 'Plan')
    if (!data) throw new AdminRepoError('El plan no existe.', 'not_found')
    await audit(actor, 'plan.delete', 'plan', id, `Borró el plan ${data.name}`)
  },

  // ── Temáticas ─────────────────────────────────────────────────────────────

  async listThemes() {
    const { themes, versions } = await themesWithVersions()
    return themes.map((t) =>
      summary(
        t,
        versions.filter((v) => v.theme_id === t.id),
      ),
    )
  },

  async getTheme(id) {
    const theme = unwrapMaybe(
      await db().from('themes').select('*').eq('id', id).maybeSingle(),
      'temática',
    )
    if (!theme) return null
    const versions = unwrap(
      await db()
        .from('theme_versions')
        .select('id, theme_id, version, config, published_at, created_by')
        .eq('theme_id', id)
        .order('version', { ascending: false }),
      'versiones',
    )
    const current = versions.find((v) => v.id === theme.current_version_id)
    const detail: AdminTheme = {
      ...summary(theme, versions),
      draftConfig: theme.draft_config ?? current?.config ?? { slides: [] },
      versions: versions.map((v): ThemeVersionInfo => ({
        id: v.id,
        version: v.version,
        publishedAt: v.published_at,
        createdBy: v.created_by,
        slides: Array.isArray((v.config as { slides?: unknown[] }).slides)
          ? (v.config as { slides: unknown[] }).slides.length
          : 0,
      })),
    }
    return detail
  },

  async getVersionConfig(versionId) {
    const row = unwrapMaybe(
      await db().from('theme_versions').select('config').eq('id', versionId).maybeSingle(),
      'versión',
    )
    return row?.config ?? null
  },

  async createTheme(input, actor) {
    const { data, error } = await db()
      .from('themes')
      .insert({
        slug: input.slug,
        name: input.name,
        category: input.category,
        description: input.description,
        listing: input.listing as Json,
        draft_config: input.config as Json,
        sort_order: input.sortOrder,
        origin: input.origin,
      })
      .select('id, slug')
      .single()
    check(error, 'Temática')
    await audit(
      actor,
      input.origin === 'generator' ? 'theme.generate' : 'theme.create',
      'theme',
      data!.id,
      `${input.origin === 'generator' ? 'Generó' : 'Creó'} "${input.name}"`,
    )
    return data!
  },

  async updateTheme(id, patch, actor) {
    const theme = unwrapMaybe(
      await db().from('themes').select('*').eq('id', id).maybeSingle(),
      'temática',
    )
    if (!theme) throw new AdminRepoError('La temática no existe.', 'not_found')
    if (patch.slug && patch.slug !== theme.slug && theme.current_version_id)
      throw new AdminRepoError(
        'La dirección de una temática publicada no se cambia (rompería los links).',
        'conflict',
      )
    if (patch.status === 'published' && !theme.current_version_id)
      throw new AdminRepoError('Publicá una versión antes de ponerla a la venta.', 'conflict')
    const update: TablesUpdate<'themes'> = {
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.slug !== undefined && { slug: patch.slug }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.sortOrder !== undefined && { sort_order: patch.sortOrder }),
      ...(patch.priceCents !== undefined && { price_cents: patch.priceCents }),
      ...(patch.listing !== undefined && { listing: patch.listing as Json }),
      ...(patch.status !== undefined && { status: patch.status }),
    }
    const { error } = await db().from('themes').update(update).eq('id', id)
    check(error, 'Temática')
    const what =
      patch.status === 'archived'
        ? 'Archivó'
        : patch.status === 'published'
          ? 'Puso a la venta'
          : patch.status === 'draft'
            ? 'Sacó de la venta'
            : 'Editó'
    await audit(
      actor,
      patch.status ? `theme.${patch.status}` : 'theme.update',
      'theme',
      id,
      `${what} "${patch.name ?? theme.name}"`,
    )
  },

  async saveThemeDraft(id, config) {
    const { data, error } = await db()
      .from('themes')
      .update({ draft_config: config as Json })
      .eq('id', id)
      .select('id')
      .maybeSingle()
    check(error, 'Borrador')
    if (!data) throw new AdminRepoError('La temática no existe.', 'not_found')
  },

  async publishTheme(id, config, actor) {
    // publish_theme congela la versión y la deja vigente en una transacción.
    const version = unwrap(
      await db().rpc('publish_theme', { p_theme_id: id, p_config: config as Json }),
      'publicar',
    )
    const theme = unwrapMaybe(
      await db().from('themes').select('name').eq('id', id).maybeSingle(),
      'temática',
    )
    await audit(
      actor,
      'theme.publish',
      'theme',
      id,
      `Publicó "${theme?.name ?? id}" v${version.version}`,
    )
    return {
      id: version.id,
      version: version.version,
      publishedAt: version.published_at,
      createdBy: version.created_by ?? actor.email,
      slides: Array.isArray((config as { slides?: unknown[] }).slides)
        ? (config as { slides: unknown[] }).slides.length
        : 0,
    }
  },

  async duplicateTheme(id, actor) {
    const source = unwrapMaybe(
      await db().from('themes').select('*').eq('id', id).maybeSingle(),
      'temática',
    )
    if (!source) throw new AdminRepoError('La temática no existe.', 'not_found')
    const slugs = new Set(
      unwrap(await db().from('themes').select('slug'), 'temáticas').map((t) => t.slug),
    )
    let slug = `${source.slug}-copia`.slice(0, 60)
    for (let i = 2; slugs.has(slug); i++) slug = `${source.slug}-copia-${i}`.slice(0, 60)
    const current = source.current_version_id
      ? await this.getVersionConfig(source.current_version_id)
      : null
    const created = await this.createTheme(
      {
        slug,
        name: `${source.name} (copia)`.slice(0, 80),
        category: source.category,
        description: source.description,
        listing: source.listing,
        config: source.draft_config ?? current ?? { slides: [] },
        sortOrder: source.sort_order + 1,
        origin: 'duplicate',
      },
      actor,
    )
    return { id: created.id }
  },

  async deleteTheme(id, actor) {
    const theme = unwrapMaybe(
      await db().from('themes').select('name, current_version_id').eq('id', id).maybeSingle(),
      'temática',
    )
    if (!theme) throw new AdminRepoError('La temática no existe.', 'not_found')
    const { count } = await db()
      .from('theme_versions')
      .select('id', { count: 'exact', head: true })
      .eq('theme_id', id)
    if ((count ?? 0) > 0)
      throw new AdminRepoError(
        'Tiene versiones publicadas o ventas: archivala en vez de borrarla.',
        'conflict',
      )
    const { error } = await db().from('themes').delete().eq('id', id)
    check(error, 'Temática')
    await audit(actor, 'theme.delete', 'theme', id, `Borró el borrador "${theme.name}"`)
  },

  // ── Ventas y Boxies ───────────────────────────────────────────────────────

  async getOrder(id) {
    const row = unwrapMaybe(
      await db().from('orders').select('*').eq('id', id).maybeSingle(),
      'orden',
    )
    if (!row) return null
    const order = toOrder(row)
    const [events, boxieRow, theme, plans, coupon, version] = await Promise.all([
      db()
        .from('payment_events')
        .select('*')
        .eq('order_id', id)
        .order('received_at')
        .then((r) => unwrap(r, 'eventos')),
      db()
        .from('boxies')
        .select(BOXIE_COLUMNS)
        .eq('order_id', id)
        .maybeSingle()
        .then((r) => unwrapMaybe(r, 'Boxie')),
      db()
        .from('themes')
        .select('*')
        .eq('id', order.themeId)
        .maybeSingle()
        .then((r) => unwrapMaybe(r, 'temática')),
      this.listPlans(),
      order.couponId
        ? db()
            .from('coupons')
            .select('*')
            .eq('id', order.couponId)
            .maybeSingle()
            .then((r) => unwrapMaybe(r, 'cupón'))
        : Promise.resolve(null),
      db()
        .from('theme_versions')
        .select('id, theme_id, version, config, published_at, created_by')
        .eq('id', order.themeVersionId)
        .maybeSingle()
        .then((r) => unwrapMaybe(r, 'versión')),
    ])
    const plan = plans.find((p) => p.id === order.planId) ?? null
    let boxie: AdminBoxie | null = null
    if (boxieRow) {
      const stats = unwrapMaybe(
        await db().from('admin_boxie_stats').select('*').eq('boxie_id', boxieRow.id).maybeSingle(),
        'estadísticas',
      )
      boxie = toBoxie(
        boxieRow,
        stats ?? undefined,
        modulesTotalFor(version?.config, plan ?? undefined, plans),
      )
    }
    return {
      order,
      events: events.map((e): PaymentEvent => ({
        id: e.id,
        orderId: e.order_id,
        provider: e.provider,
        providerPaymentId: e.provider_payment_id,
        status: e.status,
        source: e.source as PaymentEvent['source'],
        outcome: e.outcome,
        receivedAt: e.received_at,
      })),
      boxie,
      theme: theme ? summary(theme, version ? [version] : []) : null,
      plan,
      coupon: coupon ? toCoupon(coupon) : null,
      version: version?.version ?? null,
    }
  },

  async refundOrder(id, actor) {
    const order = unwrapMaybe(
      await db().from('orders').select('status, buyer_email').eq('id', id).maybeSingle(),
      'orden',
    )
    if (!order) throw new AdminRepoError('La orden no existe.', 'not_found')
    if (order.status !== 'paid')
      throw new AdminRepoError('Solo se reembolsa una orden pagada.', 'conflict')
    const boxie = unwrapMaybe(
      await db().from('boxies').select('id').eq('order_id', id).maybeSingle(),
      'Boxie',
    )
    if (boxie) {
      // Orden, Boxie y evento de pago juntos, en la base.
      const { error } = await db().rpc('admin_refund_boxie', { p_boxie_id: boxie.id })
      check(error, 'Reembolso')
    } else {
      const { error } = await db().from('orders').update({ status: 'refunded' }).eq('id', id)
      check(error, 'Reembolso')
    }
    await audit(actor, 'order.refund', 'order', id, `Reembolsó la orden de ${order.buyer_email}`)
  },

  async getBoxie(id) {
    const row = unwrapMaybe(
      await db().from('boxies').select(BOXIE_COLUMNS).eq('id', id).maybeSingle(),
      'Boxie',
    )
    if (!row) return null
    const [orderRow, version, plans, stats, content] = await Promise.all([
      db()
        .from('orders')
        .select('*')
        .eq('id', row.order_id)
        .single()
        .then((r) => unwrap(r, 'orden')),
      db()
        .from('theme_versions')
        .select('id, theme_id, version, config, published_at, created_by')
        .eq('id', row.theme_version_id)
        .maybeSingle()
        .then((r) => unwrapMaybe(r, 'versión')),
      this.listPlans(),
      db()
        .from('admin_boxie_stats')
        .select('*')
        .eq('boxie_id', id)
        .maybeSingle()
        .then((r) => unwrapMaybe(r, 'estadísticas')),
      db()
        .from('boxie_content')
        .select('slide_key, props')
        .eq('boxie_id', id)
        .then((r) => unwrap(r, 'contenido')),
    ])
    const order = toOrder(orderRow)
    const plan = plans.find((p) => p.id === order.planId) ?? null
    const theme = version
      ? unwrapMaybe(
          await db().from('themes').select('*').eq('id', version.theme_id).maybeSingle(),
          'temática',
        )
      : null
    const media = await signedMediaUrls(id, 30 * 60).catch((error: unknown) => {
      log.warn('No se pudieron firmar las fotos para el panel', { error: String(error) })
      return {}
    })
    return {
      boxie: toBoxie(
        row,
        stats ?? undefined,
        modulesTotalFor(version?.config, plan ?? undefined, plans),
      ),
      order,
      theme: theme ? summary(theme, version ? [version] : []) : null,
      plan,
      config: version?.config ?? null,
      version: version?.version ?? null,
      content: Object.fromEntries(
        content.map((c) => [c.slide_key, c.props as Record<string, unknown>]),
      ),
      media,
    }
  },

  async updateBoxieNames(id, names, actor) {
    const boxie = await findBoxieRow(id)
    const { error } = await db()
      .from('boxies')
      .update({ recipient_name: names.recipientName, sender_name: names.senderName })
      .eq('id', id)
    check(error, 'Boxie')
    await audit(
      actor,
      'boxie.update',
      'boxie',
      id,
      `Corrigió los nombres de la Boxie ${boxie.code}`,
    )
  },

  async extendBoxie(id, days, actor) {
    const boxie = await findBoxieRow(id)
    if (boxie.status === 'refunded') throw new AdminRepoError('Está reembolsada.', 'conflict')
    const base = Math.max(Date.parse(boxie.expires_at), Date.now())
    const { error } = await db()
      .from('boxies')
      .update({
        expires_at: new Date(base + days * 86_400_000).toISOString(),
        ...(boxie.status === 'expired' ? { status: 'active' as const } : {}),
      })
      .eq('id', id)
    check(error, 'Boxie')
    await audit(actor, 'boxie.extend', 'boxie', id, `Extendió ${days} días la Boxie ${boxie.code}`)
  },

  async unlockBoxie(id, actor) {
    const boxie = await findBoxieRow(id)
    if (!boxie.locked_at) throw new AdminRepoError('La Boxie no está bloqueada.', 'conflict')
    if (boxie.status === 'refunded') throw new AdminRepoError('Está reembolsada.', 'conflict')
    const { error } = await db()
      .from('boxies')
      .update({
        locked_at: null,
        expires_at: new Date(
          Math.max(Date.parse(boxie.expires_at), Date.now() + 7 * 86_400_000),
        ).toISOString(),
      })
      .eq('id', id)
    check(error, 'Boxie')
    await audit(
      actor,
      'boxie.unlock',
      'boxie',
      id,
      `Desbloqueó la Boxie ${boxie.code} para que el comprador la corrija`,
    )
  },

  async resendBoxieEmail(id, kind, actor) {
    const boxie = await findBoxieRow(id)
    const order = unwrap(
      await db()
        .from('orders')
        .select('buyer_name, buyer_email, theme:themes(name)')
        .eq('id', boxie.order_id)
        .single(),
      'orden',
    )
    if (kind === 'access') {
      // El link de edición solo se guarda hasheado: reenviarlo es rotarlo
      // (las sesiones abiertas con el viejo dejan de valer).
      const token = generateToken()
      const { error } = await db()
        .from('boxies')
        .update({ edit_token_hash: hashToken(token), access_email_sent_at: now() })
        .eq('id', id)
      check(error, 'Boxie')
      const mail = editorAccessEmail({
        buyerName: order.buyer_name,
        themeName: order.theme.name,
        editorUrl: siteUrl(`/editor/${token}`),
        code: boxie.code,
        expiresAt: new Date(boxie.expires_at),
        resent: true,
      })
      await sendMail({ ...mail, to: order.buyer_email, tag: 'editor-access' })
    } else {
      if (!boxie.locked_at)
        throw new AdminRepoError(
          'Todavía no se bloqueó: no hay link del regalo para mandar.',
          'conflict',
        )
      const gift = decryptToken(boxie.gift_token_enc, env().TOKEN_ENCRYPTION_KEY)
      const stats = unwrapMaybe(
        await db()
          .from('admin_boxie_stats')
          .select('has_password')
          .eq('boxie_id', id)
          .maybeSingle(),
        'estadísticas',
      )
      const mail = giftReadyEmail({
        buyerName: order.buyer_name,
        recipientName: boxie.recipient_name || 'quien la recibe',
        giftUrl: siteUrl(`/g/${gift}`),
        expiresAt: new Date(boxie.expires_at),
        hasPassword: stats?.has_password === true,
      })
      await sendMail({ ...mail, to: order.buyer_email, tag: 'gift-ready' })
      await db().from('boxies').update({ gift_email_sent_at: now() }).eq('id', id)
    }
    await audit(
      actor,
      'boxie.resend',
      'boxie',
      id,
      `Reenvió el mail ${kind === 'access' ? 'del editor' : 'del regalo'} de la Boxie ${boxie.code}`,
    )
  },

  // ── Cupones y afiliados ───────────────────────────────────────────────────

  async saveCoupon(input, actor) {
    const row = {
      code: input.code,
      kind: input.kind,
      value: input.value,
      active: input.active,
      max_uses: input.maxUses,
      starts_at: dayToIso(input.startsOn),
      expires_at: dayToIso(input.expiresOn),
      affiliate_id: input.affiliateId,
      description: input.description,
    }
    const { data, error } = input.id
      ? await db().from('coupons').update(row).eq('id', input.id).select('*').maybeSingle()
      : await db().from('coupons').insert(row).select('*').single()
    if (error?.code === '23505')
      throw new AdminRepoError(`Ya existe el cupón ${input.code}.`, 'conflict')
    check(error, 'Cupón')
    if (!data) throw new AdminRepoError('El cupón no existe.', 'not_found')
    await audit(
      actor,
      input.id ? 'coupon.update' : 'coupon.create',
      'coupon',
      data.id,
      `${input.id ? 'Editó' : 'Creó'} el cupón ${data.code}`,
    )
    return toCoupon(data)
  },

  async setCouponActive(id, active, actor) {
    const { data, error } = await db()
      .from('coupons')
      .update({ active })
      .eq('id', id)
      .select('code')
      .maybeSingle()
    check(error, 'Cupón')
    if (!data) throw new AdminRepoError('El cupón no existe.', 'not_found')
    await audit(
      actor,
      'coupon.update',
      'coupon',
      id,
      `${active ? 'Activó' : 'Pausó'} el cupón ${data.code}`,
    )
  },

  async deleteCoupon(id, actor) {
    const coupon = unwrapMaybe(
      await db().from('coupons').select('code, used_count').eq('id', id).maybeSingle(),
      'cupón',
    )
    if (!coupon) throw new AdminRepoError('El cupón no existe.', 'not_found')
    if (coupon.used_count > 0)
      throw new AdminRepoError(
        'Ya se usó: pausalo en vez de borrarlo (las ventas lo referencian).',
        'conflict',
      )
    const settings = await this.getSettings()
    if (settings.offerCouponId === id)
      throw new AdminRepoError(
        'Es el cupón de la oferta de la ficha: cambialo en Configuración antes.',
        'conflict',
      )
    const { error } = await db().from('coupons').delete().eq('id', id)
    check(error, 'Cupón')
    await audit(actor, 'coupon.delete', 'coupon', id, `Borró el cupón ${coupon.code}`)
  },

  async saveAffiliate(input, actor) {
    const row = {
      name: input.name,
      code: input.code,
      commission_bps: input.commissionBps,
      active: input.active,
      email: input.email,
      notes: input.notes,
    }
    const { data, error } = input.id
      ? await db().from('affiliates').update(row).eq('id', input.id).select('*').maybeSingle()
      : await db().from('affiliates').insert(row).select('*').single()
    check(error, 'Afiliado')
    if (!data) throw new AdminRepoError('El afiliado no existe.', 'not_found')
    await audit(
      actor,
      input.id ? 'affiliate.update' : 'affiliate.create',
      'affiliate',
      data.id,
      `${input.id ? 'Editó' : 'Sumó'} al afiliado ${data.name}`,
    )
    return {
      id: data.id,
      name: data.name,
      code: data.code,
      commissionBps: data.commission_bps,
      active: data.active,
      email: data.email,
      notes: data.notes,
      createdAt: data.created_at,
    }
  },

  // ── Finanzas ──────────────────────────────────────────────────────────────

  async saveExpense(input, actor) {
    const row = {
      category: input.category,
      description: input.description,
      vendor: input.vendor,
      amount_cents: input.amountCents,
      recurrence: input.recurrence,
      starts_on: input.startsOn,
      ends_on: input.endsOn,
    }
    const { data, error } = input.id
      ? await db().from('expenses').update(row).eq('id', input.id).select('*').maybeSingle()
      : await db().from('expenses').insert(row).select('*').single()
    check(error, 'Gasto')
    if (!data) throw new AdminRepoError('El gasto no existe.', 'not_found')
    await audit(
      actor,
      input.id ? 'expense.update' : 'expense.create',
      'expense',
      data.id,
      `${input.id ? 'Editó' : 'Cargó'} el gasto "${data.description}"`,
    )
    return toExpense(data)
  },

  async deleteExpense(id, actor) {
    const { data, error } = await db()
      .from('expenses')
      .delete()
      .eq('id', id)
      .select('description')
      .maybeSingle()
    check(error, 'Gasto')
    if (!data) throw new AdminRepoError('El gasto no existe.', 'not_found')
    await audit(actor, 'expense.delete', 'expense', id, `Borró el gasto "${data.description}"`)
  },

  // ── Equipo, bitácora y tareas ─────────────────────────────────────────────

  async listTeam() {
    const rows = unwrap(
      await db().from('users').select('*').not('role', 'is', null).order('created_at'),
      'equipo',
    )
    return rows.map((r): AdminUser => ({
      id: r.user_id,
      email: r.email ?? '',
      name: r.name || (r.email ?? '').split('@')[0] || 'Admin',
      role: r.role,
      pending: r.invited_at !== null && r.last_seen_at === null,
      lastSeenAt: r.last_seen_at,
      createdAt: r.created_at,
    }))
  },

  async inviteMember(input, actor) {
    try {
      const { createMemberInvite } = await import('./invite')
      const result = await createMemberInvite(input, actor)
      await audit(
        actor,
        'team.invite',
        'team',
        result.id,
        `Invitó a ${result.email} como ${result.role}`,
      )
      return result
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo invitar'
      if (message.includes('ya está en el equipo')) {
        throw new AdminRepoError(message, 'conflict')
      }
      throw new AdminRepoError(message)
    }
  },

  async updateMemberRole(id, role, actor) {
    const { data, error } = await db()
      .from('users')
      .update({ role })
      .eq('user_id', id)
      .select('email')
      .maybeSingle()
    check(error, 'Equipo')
    if (!data) throw new AdminRepoError('No está en el equipo.', 'not_found')
    await audit(actor, 'team.role', 'team', id, `Cambió el rol de ${data.email ?? id} a ${role}`)
  },

  async removeMember(id, actor) {
    if (id === actor.id) throw new AdminRepoError('No te podés sacar a vos.', 'conflict')
    const { data, error } = await db()
      .from('users')
      .delete()
      .eq('user_id', id)
      .select('email')
      .maybeSingle()
    check(error, 'Equipo')
    if (!data) throw new AdminRepoError('No está en el equipo.', 'not_found')
    await audit(actor, 'team.remove', 'team', id, `Sacó a ${data.email ?? id} del equipo`)
  },

  async touchMember(email) {
    await db().from('users').update({ last_seen_at: now() }).eq('email', email.toLowerCase())
  },

  async listAudit(limit = 100) {
    const rows = unwrap(
      await db().from('admin_audit_log').select('*').order('at', { ascending: false }).limit(limit),
      'bitácora',
    )
    return rows.map((r): AuditEntry => ({
      id: String(r.id),
      at: r.at,
      actor: r.actor_email,
      action: r.action,
      entity: r.entity,
      entityId: r.entity_id,
      summary: r.summary,
    }))
  },

  async listTasks() {
    return unwrap(await db().from('admin_tasks').select('*').order('position'), 'tareas').map(
      toTask,
    )
  },

  async saveTask(input, actor) {
    const row = {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignee: input.assignee,
      tags: input.tags,
      due_on: input.dueOn,
    }
    const { data, error } = input.id
      ? await db().from('admin_tasks').update(row).eq('id', input.id).select('*').maybeSingle()
      : await db()
          .from('admin_tasks')
          .insert({ ...row, position: -1, created_by: actor.id ?? null })
          .select('*')
          .single()
    check(error, 'Tarea')
    if (!data) throw new AdminRepoError('La tarea no existe.', 'not_found')
    if (!input.id)
      await audit(actor, 'task.create', 'task', data.id, `Creó la tarea "${data.title}"`)
    return toTask(data)
  },

  async moveTask(id, status, position, actor) {
    const tasks = unwrap(await db().from('admin_tasks').select('*').order('position'), 'tareas')
    const task = tasks.find((t) => t.id === id)
    if (!task) throw new AdminRepoError('La tarea no existe.', 'not_found')
    const column = tasks.filter((t) => t.status === status && t.id !== id)
    column.splice(Math.max(0, Math.min(position, column.length)), 0, { ...task, status })
    await Promise.all(
      column.map((t, i) =>
        t.position === i && t.status === status && t.id !== id
          ? null
          : db().from('admin_tasks').update({ position: i, status }).eq('id', t.id),
      ),
    )
    if (task.status !== status && status === 'done')
      await audit(actor, 'task.done', 'task', id, `Completó "${task.title}"`)
  },

  async deleteTask(id, actor) {
    const { data, error } = await db()
      .from('admin_tasks')
      .delete()
      .eq('id', id)
      .select('title')
      .maybeSingle()
    check(error, 'Tarea')
    if (data) await audit(actor, 'task.delete', 'task', id, `Borró la tarea "${data.title}"`)
  },
}
