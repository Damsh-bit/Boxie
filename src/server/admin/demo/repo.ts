import 'server-only'
import { randomUUID } from 'node:crypto'
import { addDays } from '@/domain/admin/range'
import type {
  AdminBoxie,
  AdminCoupon,
  AdminTheme,
  AdminThemeSummary,
  AuditEntry,
} from '@/domain/admin/types'
import { parseThemeConfig } from '@/slides/config'
import type { ThemeConfigInput } from '@/slides/theme-config'
import { sampleGift } from '../../sample-gift'
import { AdminRepoError, type Actor, type AdminRepo } from '../repo'
import type { DemoDb, DemoTheme } from './seed'
import { demoDb, mutateDemoDb, resetDemoDb } from './store'

/**
 * El panel sobre la base de demo (en memoria). Respeta las mismas reglas que
 * la base real: versiones inmutables, no se borra una temática con ventas,
 * un reembolso cambia la orden y la Boxie juntas, etc.
 */

const now = () => new Date().toISOString()

function audit(
  db: DemoDb,
  actor: Actor,
  action: string,
  entity: string,
  entityId: string | null,
  summary: string,
) {
  const entry: AuditEntry = {
    id: randomUUID(),
    at: now(),
    actor: actor.email,
    action,
    entity,
    entityId,
    summary,
  }
  db.audit.unshift(entry)
  if (db.audit.length > 500) db.audit.length = 500
}

function summary(theme: DemoTheme): AdminThemeSummary {
  const current = theme.versions.find((v) => v.id === theme.currentVersionId)
  return {
    id: theme.id,
    slug: theme.slug,
    name: theme.name,
    category: theme.category,
    description: theme.description,
    status: theme.status,
    priceCents: theme.priceCents,
    sortOrder: theme.sortOrder,
    listing: theme.listing,
    currentVersionId: theme.currentVersionId,
    currentVersion: current?.version ?? null,
    hasUnpublishedChanges:
      !current || JSON.stringify(current.config) !== JSON.stringify(theme.draftConfig),
    slides: theme.draftConfig.slides.length,
    origin: theme.origin,
    createdAt: theme.createdAt,
    updatedAt: theme.updatedAt,
  }
}

function findTheme(db: DemoDb, id: string): DemoTheme {
  const theme = db.themes.find((t) => t.id === id)
  if (!theme) throw new AdminRepoError('La temática no existe.', 'not_found')
  return theme
}

function findBoxie(db: DemoDb, id: string): AdminBoxie {
  const boxie = db.boxies.find((b) => b.id === id)
  if (!boxie) throw new AdminRepoError('La Boxie no existe.', 'not_found')
  return boxie
}

function themeOfVersion(db: DemoDb, versionId: string) {
  for (const theme of db.themes) {
    const version = theme.versions.find((v) => v.id === versionId)
    if (version) return { theme, version }
  }
  return null
}

const dayToIso = (day: string | null) => (day ? `${day}T00:00:00.000-03:00` : null)
const isoDate = (day: string | null) => (day ? new Date(dayToIso(day)!).toISOString() : null)

export const demoRepo: AdminRepo = {
  mode: 'demo',

  async dataset() {
    const db = demoDb()
    return {
      settings: db.settings,
      plans: db.plans,
      themes: db.themes.map(summary),
      coupons: db.coupons,
      affiliates: db.affiliates,
      orders: db.orders,
      boxies: db.boxies,
      expenses: db.expenses,
    }
  },

  async getSettings() {
    return demoDb().settings
  },

  async saveSettings(patch, actor) {
    mutateDemoDb((db) => {
      const changed = Object.keys(patch).filter(
        (k) =>
          JSON.stringify(patch[k as keyof typeof patch]) !==
          JSON.stringify(db.settings[k as keyof typeof db.settings]),
      )
      if (patch.offerCouponId && !db.coupons.some((c) => c.id === patch.offerCouponId))
        throw new AdminRepoError('El cupón de la oferta no existe.')
      db.settings = { ...db.settings, ...patch, updatedAt: now() }
      audit(
        db,
        actor,
        'settings.update',
        'settings',
        null,
        `Cambió la configuración (${changed.join(', ') || 'sin cambios'})`,
      )
    })
  },

  // ── Planes ────────────────────────────────────────────────────────────────

  async listPlans() {
    return demoDb().plans
  },

  async savePlan(input, actor) {
    return mutateDemoDb((db) => {
      const clash = db.plans.find((p) => p.slug === input.slug && p.id !== input.id)
      if (clash)
        throw new AdminRepoError(`Ya hay un plan con el identificador "${input.slug}".`, 'conflict')
      const existing = input.id ? db.plans.find((p) => p.id === input.id) : undefined
      if (input.id && !existing) throw new AdminRepoError('El plan no existe.', 'not_found')
      if (existing && existing.slug !== input.slug) {
        // Las slides guardan el slug del plan: se renombra en todas las temáticas.
        for (const theme of db.themes) {
          for (const slide of theme.draftConfig.slides)
            if (slide.plan === existing.slug) slide.plan = input.slug
        }
      }
      if (input.highlighted) for (const p of db.plans) p.highlighted = false
      const plan = {
        ...(existing ?? { id: randomUUID(), createdAt: now() }),
        ...input,
        id: existing?.id ?? randomUUID(),
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      }
      if (existing) Object.assign(existing, plan)
      else db.plans.push(plan)
      audit(
        db,
        actor,
        existing ? 'plan.update' : 'plan.create',
        'plan',
        plan.id,
        `${existing ? 'Editó' : 'Creó'} el plan ${plan.name}`,
      )
      return existing ?? plan
    })
  },

  async deletePlan(id, actor) {
    mutateDemoDb((db) => {
      const plan = db.plans.find((p) => p.id === id)
      if (!plan) throw new AdminRepoError('El plan no existe.', 'not_found')
      if (db.orders.some((o) => o.planId === id))
        throw new AdminRepoError(
          'El plan tiene ventas: desactivalo en vez de borrarlo.',
          'conflict',
        )
      db.plans = db.plans.filter((p) => p.id !== id)
      audit(db, actor, 'plan.delete', 'plan', id, `Borró el plan ${plan.name}`)
    })
  },

  // ── Temáticas ─────────────────────────────────────────────────────────────

  async listThemes() {
    return demoDb()
      .themes.map(summary)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
  },

  async getTheme(id) {
    const theme = demoDb().themes.find((t) => t.id === id)
    if (!theme) return null
    const detail: AdminTheme = {
      ...summary(theme),
      draftConfig: theme.draftConfig,
      versions: [...theme.versions].reverse().map((v) => ({
        id: v.id,
        version: v.version,
        publishedAt: v.publishedAt,
        createdBy: v.createdBy,
        slides: v.config.slides.length,
      })),
    }
    return detail
  },

  async getVersionConfig(versionId) {
    return themeOfVersion(demoDb(), versionId)?.version.config ?? null
  },

  async createTheme(input, actor) {
    return mutateDemoDb((db) => {
      if (db.themes.some((t) => t.slug === input.slug))
        throw new AdminRepoError(
          `Ya existe una temática con la dirección "${input.slug}".`,
          'conflict',
        )
      const theme: DemoTheme = {
        id: randomUUID(),
        slug: input.slug,
        name: input.name,
        category: input.category,
        description: input.description,
        status: 'draft',
        priceCents: null,
        sortOrder: input.sortOrder,
        listing: input.listing,
        draftConfig: input.config as ThemeConfigInput,
        currentVersionId: null,
        origin: input.origin,
        createdAt: now(),
        updatedAt: now(),
        versions: [],
      }
      db.themes.push(theme)
      audit(
        db,
        actor,
        input.origin === 'generator' ? 'theme.generate' : 'theme.create',
        'theme',
        theme.id,
        `${input.origin === 'generator' ? 'Generó' : 'Creó'} "${theme.name}"`,
      )
      return { id: theme.id, slug: theme.slug }
    })
  },

  async updateTheme(id, patch, actor) {
    mutateDemoDb((db) => {
      const theme = findTheme(db, id)
      if (patch.slug && patch.slug !== theme.slug) {
        if (db.themes.some((t) => t.slug === patch.slug && t.id !== id))
          throw new AdminRepoError(
            `Ya existe una temática con la dirección "${patch.slug}".`,
            'conflict',
          )
        if (theme.versions.length > 0)
          throw new AdminRepoError(
            'La dirección de una temática publicada no se cambia (rompería los links).',
            'conflict',
          )
      }
      if (patch.status === 'published' && !theme.currentVersionId)
        throw new AdminRepoError('Publicá una versión antes de ponerla a la venta.', 'conflict')
      Object.assign(theme, {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.slug !== undefined && { slug: patch.slug }),
        ...(patch.category !== undefined && { category: patch.category }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.sortOrder !== undefined && { sortOrder: patch.sortOrder }),
        ...(patch.priceCents !== undefined && { priceCents: patch.priceCents }),
        ...(patch.listing !== undefined && { listing: patch.listing }),
        ...(patch.status !== undefined && { status: patch.status }),
        updatedAt: now(),
      })
      const what =
        patch.status === 'archived'
          ? 'Archivó'
          : patch.status === 'published'
            ? 'Puso a la venta'
            : patch.status === 'draft'
              ? 'Sacó de la venta'
              : 'Editó'
      audit(
        db,
        actor,
        patch.status ? `theme.${patch.status}` : 'theme.update',
        'theme',
        id,
        `${what} "${theme.name}"`,
      )
    })
  },

  async saveThemeDraft(id, config, actor) {
    mutateDemoDb((db) => {
      const theme = findTheme(db, id)
      theme.draftConfig = config as ThemeConfigInput
      theme.updatedAt = now()
      // El guardado del borrador es frecuente: no llena la bitácora.
      void actor
    })
  },

  async publishTheme(id, config, actor) {
    return mutateDemoDb((db) => {
      const theme = findTheme(db, id)
      if (!parseThemeConfig(config).success)
        throw new AdminRepoError('La configuración no es válida: revisá los errores.')
      const version = {
        id: randomUUID(),
        version: (theme.versions.at(-1)?.version ?? 0) + 1,
        config: config as ThemeConfigInput,
        publishedAt: now(),
        createdBy: actor.email,
      }
      theme.versions.push(version)
      theme.currentVersionId = version.id
      theme.draftConfig = version.config
      if (theme.status === 'draft') theme.status = 'published'
      theme.updatedAt = now()
      audit(db, actor, 'theme.publish', 'theme', id, `Publicó "${theme.name}" v${version.version}`)
      return {
        id: version.id,
        version: version.version,
        publishedAt: version.publishedAt,
        createdBy: version.createdBy,
        slides: version.config.slides.length,
      }
    })
  },

  async duplicateTheme(id, actor) {
    return mutateDemoDb((db) => {
      const source = findTheme(db, id)
      let slug = `${source.slug}-copia`.slice(0, 60)
      for (let i = 2; db.themes.some((t) => t.slug === slug); i++)
        slug = `${source.slug}-copia-${i}`.slice(0, 60)
      const theme: DemoTheme = {
        ...structuredClone(source),
        id: randomUUID(),
        slug,
        name: `${source.name} (copia)`.slice(0, 80),
        status: 'draft',
        currentVersionId: null,
        versions: [],
        origin: 'duplicate',
        sortOrder: source.sortOrder + 1,
        createdAt: now(),
        updatedAt: now(),
      }
      db.themes.push(theme)
      audit(db, actor, 'theme.duplicate', 'theme', theme.id, `Duplicó "${source.name}"`)
      return { id: theme.id }
    })
  },

  async deleteTheme(id, actor) {
    mutateDemoDb((db) => {
      const theme = findTheme(db, id)
      if (theme.versions.length > 0 || db.orders.some((o) => o.themeId === id))
        throw new AdminRepoError(
          'Tiene versiones publicadas o ventas: archivala en vez de borrarla.',
          'conflict',
        )
      db.themes = db.themes.filter((t) => t.id !== id)
      audit(db, actor, 'theme.delete', 'theme', id, `Borró el borrador "${theme.name}"`)
    })
  },

  // ── Ventas y Boxies ───────────────────────────────────────────────────────

  async getOrder(id) {
    const db = demoDb()
    const order = db.orders.find((o) => o.id === id)
    if (!order) return null
    const theme = db.themes.find((t) => t.id === order.themeId)
    return {
      order,
      events: db.events
        .filter((e) => e.orderId === id)
        .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt)),
      boxie: db.boxies.find((b) => b.orderId === id) ?? null,
      theme: theme ? summary(theme) : null,
      plan: db.plans.find((p) => p.id === order.planId) ?? null,
      coupon: db.coupons.find((c) => c.id === order.couponId) ?? null,
      version: theme?.versions.find((v) => v.id === order.themeVersionId)?.version ?? null,
    }
  },

  async refundOrder(id, actor) {
    mutateDemoDb((db) => {
      const order = db.orders.find((o) => o.id === id)
      if (!order) throw new AdminRepoError('La orden no existe.', 'not_found')
      if (order.status !== 'paid')
        throw new AdminRepoError('Solo se reembolsa una orden pagada.', 'conflict')
      order.status = 'refunded'
      order.refundedAt = now()
      order.updatedAt = now()
      const boxie = db.boxies.find((b) => b.orderId === id)
      if (boxie) {
        boxie.status = 'refunded'
        boxie.updatedAt = now()
      }
      db.events.push({
        id: (db.events.at(-1)?.id ?? 0) + 1,
        orderId: id,
        provider: 'admin',
        providerPaymentId: id,
        status: 'refunded',
        source: 'admin',
        outcome: 'refunded',
        receivedAt: now(),
      })
      audit(db, actor, 'order.refund', 'order', id, `Reembolsó la orden de ${order.buyerEmail}`)
    })
  },

  async getBoxie(id) {
    const db = demoDb()
    const boxie = db.boxies.find((b) => b.id === id)
    if (!boxie) return null
    const order = db.orders.find((o) => o.id === boxie.orderId)
    if (!order) return null
    const found = themeOfVersion(db, boxie.themeVersionId)
    const parsed = found ? parseThemeConfig(found.version.config) : null
    let content: Record<string, Record<string, unknown>> = {}
    if (parsed?.success && boxie.lastEditedAt) content = sampleGift(parsed.data).content
    return {
      boxie,
      order,
      theme: found ? summary(found.theme) : null,
      plan: db.plans.find((p) => p.id === order.planId) ?? null,
      config: found?.version.config ?? null,
      version: found?.version.version ?? null,
      content,
    }
  },

  async updateBoxieNames(id, names, actor) {
    mutateDemoDb((db) => {
      const boxie = findBoxie(db, id)
      boxie.recipientName = names.recipientName
      boxie.senderName = names.senderName
      boxie.updatedAt = now()
      audit(
        db,
        actor,
        'boxie.update',
        'boxie',
        id,
        `Corrigió los nombres de la Boxie ${boxie.code}`,
      )
    })
  },

  async extendBoxie(id, days, actor) {
    mutateDemoDb((db) => {
      const boxie = findBoxie(db, id)
      if (boxie.status === 'refunded') throw new AdminRepoError('Está reembolsada.', 'conflict')
      const base = Math.max(Date.parse(boxie.expiresAt), Date.now())
      boxie.expiresAt = addDays(new Date(base), days).toISOString()
      if (boxie.status === 'expired') boxie.status = 'active'
      boxie.updatedAt = now()
      audit(db, actor, 'boxie.extend', 'boxie', id, `Extendió ${days} días la Boxie ${boxie.code}`)
    })
  },

  async unlockBoxie(id, actor) {
    mutateDemoDb((db) => {
      const boxie = findBoxie(db, id)
      if (!boxie.lockedAt) throw new AdminRepoError('La Boxie no está bloqueada.', 'conflict')
      if (boxie.status === 'refunded') throw new AdminRepoError('Está reembolsada.', 'conflict')
      boxie.lockedAt = null
      // Vuelve a tener 7 días para editar, como mínimo.
      boxie.expiresAt = new Date(
        Math.max(Date.parse(boxie.expiresAt), Date.now() + 7 * 86_400_000),
      ).toISOString()
      boxie.updatedAt = now()
      audit(
        db,
        actor,
        'boxie.unlock',
        'boxie',
        id,
        `Desbloqueó la Boxie ${boxie.code} para que el comprador la corrija`,
      )
    })
  },

  async resendBoxieEmail(id, kind, actor) {
    mutateDemoDb((db) => {
      const boxie = findBoxie(db, id)
      if (kind === 'gift' && !boxie.lockedAt)
        throw new AdminRepoError(
          'Todavía no se bloqueó: no hay link del regalo para mandar.',
          'conflict',
        )
      if (kind === 'access') boxie.accessEmailSentAt = now()
      else boxie.giftEmailSentAt = now()
      audit(
        db,
        actor,
        'boxie.resend',
        'boxie',
        id,
        `Reenvió el mail ${kind === 'access' ? 'del editor' : 'del regalo'} de la Boxie ${boxie.code} (demo: no sale ningún mail)`,
      )
    })
  },

  // ── Cupones y afiliados ───────────────────────────────────────────────────

  async saveCoupon(input, actor) {
    return mutateDemoDb((db) => {
      if (db.coupons.some((c) => c.code === input.code && c.id !== input.id))
        throw new AdminRepoError(`Ya existe el cupón ${input.code}.`, 'conflict')
      const existing = input.id ? db.coupons.find((c) => c.id === input.id) : undefined
      if (input.id && !existing) throw new AdminRepoError('El cupón no existe.', 'not_found')
      if (input.affiliateId && !db.affiliates.some((a) => a.id === input.affiliateId))
        throw new AdminRepoError('El afiliado no existe.')
      const coupon: AdminCoupon = {
        id: existing?.id ?? randomUUID(),
        code: input.code,
        kind: input.kind,
        value: input.value,
        active: input.active,
        maxUses: input.maxUses,
        usedCount: existing?.usedCount ?? 0,
        startsAt: isoDate(input.startsOn),
        expiresAt: isoDate(input.expiresOn),
        affiliateId: input.affiliateId,
        description: input.description,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      }
      if (existing) Object.assign(existing, coupon)
      else db.coupons.unshift(coupon)
      audit(
        db,
        actor,
        existing ? 'coupon.update' : 'coupon.create',
        'coupon',
        coupon.id,
        `${existing ? 'Editó' : 'Creó'} el cupón ${coupon.code}`,
      )
      return coupon
    })
  },

  async setCouponActive(id, active, actor) {
    mutateDemoDb((db) => {
      const coupon = db.coupons.find((c) => c.id === id)
      if (!coupon) throw new AdminRepoError('El cupón no existe.', 'not_found')
      coupon.active = active
      coupon.updatedAt = now()
      audit(
        db,
        actor,
        'coupon.update',
        'coupon',
        id,
        `${active ? 'Activó' : 'Pausó'} el cupón ${coupon.code}`,
      )
    })
  },

  async deleteCoupon(id, actor) {
    mutateDemoDb((db) => {
      const coupon = db.coupons.find((c) => c.id === id)
      if (!coupon) throw new AdminRepoError('El cupón no existe.', 'not_found')
      if (coupon.usedCount > 0 || db.orders.some((o) => o.couponId === id))
        throw new AdminRepoError(
          'Ya se usó: pausalo en vez de borrarlo (las ventas lo referencian).',
          'conflict',
        )
      if (db.settings.offerCouponId === id)
        throw new AdminRepoError(
          'Es el cupón de la oferta de la ficha: cambialo en Configuración antes.',
          'conflict',
        )
      db.coupons = db.coupons.filter((c) => c.id !== id)
      audit(db, actor, 'coupon.delete', 'coupon', id, `Borró el cupón ${coupon.code}`)
    })
  },

  async saveAffiliate(input, actor) {
    return mutateDemoDb((db) => {
      if (db.affiliates.some((a) => a.code === input.code && a.id !== input.id))
        throw new AdminRepoError(`Ya existe el código ${input.code}.`, 'conflict')
      const existing = input.id ? db.affiliates.find((a) => a.id === input.id) : undefined
      const affiliate = {
        ...input,
        id: existing?.id ?? randomUUID(),
        createdAt: existing?.createdAt ?? now(),
      }
      if (existing) Object.assign(existing, affiliate)
      else db.affiliates.push(affiliate)
      audit(
        db,
        actor,
        existing ? 'affiliate.update' : 'affiliate.create',
        'affiliate',
        affiliate.id,
        `${existing ? 'Editó' : 'Sumó'} al afiliado ${affiliate.name}`,
      )
      return affiliate
    })
  },

  // ── Finanzas ──────────────────────────────────────────────────────────────

  async saveExpense(input, actor) {
    return mutateDemoDb((db) => {
      const existing = input.id ? db.expenses.find((e) => e.id === input.id) : undefined
      const expense = {
        ...input,
        id: existing?.id ?? randomUUID(),
        createdAt: existing?.createdAt ?? now(),
      }
      if (existing) Object.assign(existing, expense)
      else db.expenses.push(expense)
      audit(
        db,
        actor,
        existing ? 'expense.update' : 'expense.create',
        'expense',
        expense.id,
        `${existing ? 'Editó' : 'Cargó'} el gasto "${expense.description}"`,
      )
      return expense
    })
  },

  async deleteExpense(id, actor) {
    mutateDemoDb((db) => {
      const expense = db.expenses.find((e) => e.id === id)
      if (!expense) throw new AdminRepoError('El gasto no existe.', 'not_found')
      db.expenses = db.expenses.filter((e) => e.id !== id)
      audit(db, actor, 'expense.delete', 'expense', id, `Borró el gasto "${expense.description}"`)
    })
  },

  // ── Equipo, bitácora y tareas ─────────────────────────────────────────────

  async listTeam() {
    return demoDb().team
  },

  async inviteMember(input, actor) {
    return mutateDemoDb((db) => {
      if (db.team.some((m) => m.email.toLowerCase() === input.email.toLowerCase()))
        throw new AdminRepoError('Esa persona ya está en el equipo.', 'conflict')
      const member = {
        id: randomUUID(),
        email: input.email.toLowerCase(),
        name: input.name,
        role: input.role,
        pending: true,
        lastSeenAt: null,
        createdAt: now(),
      }
      db.team.push(member)
      audit(
        db,
        actor,
        'team.invite',
        'team',
        member.id,
        `Invitó a ${member.email} como ${member.role}`,
      )
      return member
    })
  },

  async updateMemberRole(id, role, actor) {
    mutateDemoDb((db) => {
      const member = db.team.find((m) => m.id === id)
      if (!member) throw new AdminRepoError('No está en el equipo.', 'not_found')
      if (
        member.role === 'owner' &&
        role !== 'owner' &&
        db.team.filter((m) => m.role === 'owner').length === 1
      )
        throw new AdminRepoError('Tiene que quedar al menos un dueño.', 'conflict')
      member.role = role
      audit(db, actor, 'team.role', 'team', id, `Cambió el rol de ${member.email} a ${role}`)
    })
  },

  async removeMember(id, actor) {
    mutateDemoDb((db) => {
      const member = db.team.find((m) => m.id === id)
      if (!member) throw new AdminRepoError('No está en el equipo.', 'not_found')
      if (member.email === actor.email)
        throw new AdminRepoError('No te podés sacar a vos.', 'conflict')
      if (member.role === 'owner' && db.team.filter((m) => m.role === 'owner').length === 1)
        throw new AdminRepoError('Tiene que quedar al menos un dueño.', 'conflict')
      db.team = db.team.filter((m) => m.id !== id)
      audit(db, actor, 'team.remove', 'team', id, `Sacó a ${member.email} del equipo`)
    })
  },

  async touchMember(email) {
    mutateDemoDb((db) => {
      const member = db.team.find((m) => m.email === email)
      if (member) {
        member.lastSeenAt = now()
        member.pending = false
      }
    })
  },

  async listAudit(limit = 100) {
    return demoDb().audit.slice(0, limit)
  },

  async listTasks() {
    return [...demoDb().tasks].sort((a, b) => a.position - b.position)
  },

  async saveTask(input, actor) {
    return mutateDemoDb((db) => {
      const existing = input.id ? db.tasks.find((t) => t.id === input.id) : undefined
      const task = {
        ...input,
        id: existing?.id ?? randomUUID(),
        position:
          existing?.position ??
          Math.min(0, ...db.tasks.filter((t) => t.status === input.status).map((t) => t.position)) -
            1,
        createdAt: existing?.createdAt ?? now(),
        updatedAt: now(),
      }
      if (existing) Object.assign(existing, task)
      else db.tasks.push(task)
      if (!existing)
        audit(db, actor, 'task.create', 'task', task.id, `Creó la tarea "${task.title}"`)
      return task
    })
  },

  async moveTask(id, status, position, actor) {
    mutateDemoDb((db) => {
      const task = db.tasks.find((t) => t.id === id)
      if (!task) throw new AdminRepoError('La tarea no existe.', 'not_found')
      const column = db.tasks
        .filter((t) => t.status === status && t.id !== id)
        .sort((a, b) => a.position - b.position)
      column.splice(Math.max(0, Math.min(position, column.length)), 0, task)
      column.forEach((t, i) => (t.position = i))
      if (task.status !== status && status === 'done')
        audit(db, actor, 'task.done', 'task', id, `Completó "${task.title}"`)
      task.status = status
      task.updatedAt = now()
    })
  },

  async deleteTask(id, actor) {
    mutateDemoDb((db) => {
      const task = db.tasks.find((t) => t.id === id)
      if (!task) return
      db.tasks = db.tasks.filter((t) => t.id !== id)
      audit(db, actor, 'task.delete', 'task', id, `Borró la tarea "${task.title}"`)
    })
  },

  async reset() {
    resetDemoDb()
  },
}
