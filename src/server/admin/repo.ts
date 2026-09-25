import 'server-only'
import type {
  AffiliateInput,
  CouponInput,
  ExpenseInput,
  MemberInput,
  PlanInput,
  SettingsInput,
  TaskInput,
  ThemeMetaInput,
} from '@/domain/admin/inputs'
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
  TaskStatus,
  ThemeOrigin,
  ThemeStatus,
  ThemeVersionInfo,
} from '@/domain/admin/types'
import type { Plan } from '@/domain/plans'
import { isDemoMode } from '../demo'

/**
 * El contrato de datos del panel. Las páginas y las acciones hablan con esto,
 * nunca con la base directamente: hoy lo implementa el modo demo (en memoria)
 * y, al conectar Supabase, `supabase-repo.ts` (ver docs/ADMIN.md: qué tabla y
 * qué función de la base respalda cada método).
 *
 * Toda escritura recibe al `actor` (quién la hizo) y queda en la bitácora.
 */

export interface Actor {
  email: string
  name: string
}

/** Todo lo que la analítica necesita en una sola lectura. */
export interface AdminDataset {
  settings: AdminSettings
  plans: Plan[]
  themes: AdminThemeSummary[]
  coupons: AdminCoupon[]
  affiliates: AdminAffiliate[]
  orders: AdminOrder[]
  boxies: AdminBoxie[]
  expenses: Expense[]
}

export interface OrderDetail {
  order: AdminOrder
  events: PaymentEvent[]
  boxie: AdminBoxie | null
  theme: AdminThemeSummary | null
  plan: Plan | null
  coupon: AdminCoupon | null
  version: number | null
}

export interface BoxieDetail {
  boxie: AdminBoxie
  order: AdminOrder
  theme: AdminThemeSummary | null
  plan: Plan | null
  /** Configuración de la versión que se vendió (para la vista previa). */
  config: unknown
  version: number | null
  /** Lo que cargó el comprador, por clave de slide. */
  content: Record<string, Record<string, unknown>>
}

export interface NewTheme {
  slug: string
  name: string
  category: string
  description: string
  listing: unknown
  config: unknown
  sortOrder: number
  origin: ThemeOrigin
}

export interface ThemePatch extends Partial<ThemeMetaInput> {
  listing?: unknown
  status?: ThemeStatus
}

export interface AdminRepo {
  readonly mode: 'demo' | 'supabase'

  dataset(): Promise<AdminDataset>
  getSettings(): Promise<AdminSettings>
  saveSettings(patch: SettingsInput, actor: Actor): Promise<void>

  // Planes
  listPlans(): Promise<Plan[]>
  savePlan(input: PlanInput, actor: Actor): Promise<Plan>
  deletePlan(id: string, actor: Actor): Promise<void>

  // Temáticas
  listThemes(): Promise<AdminThemeSummary[]>
  getTheme(id: string): Promise<AdminTheme | null>
  getVersionConfig(versionId: string): Promise<unknown | null>
  createTheme(input: NewTheme, actor: Actor): Promise<{ id: string; slug: string }>
  updateTheme(id: string, patch: ThemePatch, actor: Actor): Promise<void>
  saveThemeDraft(id: string, config: unknown, actor: Actor): Promise<void>
  /** Congela el borrador (ya validado) como versión nueva y la deja vigente. */
  publishTheme(id: string, config: unknown, actor: Actor): Promise<ThemeVersionInfo>
  duplicateTheme(id: string, actor: Actor): Promise<{ id: string }>
  /** Solo borradores sin ventas; lo demás se archiva. */
  deleteTheme(id: string, actor: Actor): Promise<void>

  // Ventas y Boxies
  getOrder(id: string): Promise<OrderDetail | null>
  refundOrder(id: string, actor: Actor): Promise<void>
  getBoxie(id: string): Promise<BoxieDetail | null>
  updateBoxieNames(
    id: string,
    names: { recipientName: string; senderName: string },
    actor: Actor,
  ): Promise<void>
  extendBoxie(id: string, days: number, actor: Actor): Promise<void>
  unlockBoxie(id: string, actor: Actor): Promise<void>
  resendBoxieEmail(id: string, kind: 'access' | 'gift', actor: Actor): Promise<void>

  // Cupones y afiliados
  saveCoupon(input: CouponInput, actor: Actor): Promise<AdminCoupon>
  setCouponActive(id: string, active: boolean, actor: Actor): Promise<void>
  deleteCoupon(id: string, actor: Actor): Promise<void>
  saveAffiliate(input: AffiliateInput, actor: Actor): Promise<AdminAffiliate>

  // Finanzas
  saveExpense(input: ExpenseInput, actor: Actor): Promise<Expense>
  deleteExpense(id: string, actor: Actor): Promise<void>

  // Equipo, bitácora y tareas
  listTeam(): Promise<AdminUser[]>
  inviteMember(input: MemberInput, actor: Actor): Promise<AdminUser>
  updateMemberRole(id: string, role: AdminUser['role'], actor: Actor): Promise<void>
  removeMember(id: string, actor: Actor): Promise<void>
  touchMember(email: string): Promise<void>
  listAudit(limit?: number): Promise<AuditEntry[]>
  listTasks(): Promise<AdminTask[]>
  saveTask(input: TaskInput, actor: Actor): Promise<AdminTask>
  moveTask(id: string, status: TaskStatus, position: number, actor: Actor): Promise<void>
  deleteTask(id: string, actor: Actor): Promise<void>

  /** Solo demo: vuelve a los datos de muestra. */
  reset?(): Promise<void>
}

export class AdminRepoError extends Error {
  constructor(
    message: string,
    readonly code: 'not_found' | 'conflict' | 'invalid' | 'not_connected' = 'invalid',
  ) {
    super(message)
    this.name = 'AdminRepoError'
  }
}

let repo: Promise<AdminRepo> | undefined

/** El repositorio del entorno: demo si DEMO_MODE=1, Supabase si no. */
export function adminRepo(): Promise<AdminRepo> {
  repo ??= isDemoMode()
    ? import('./demo/repo').then((m) => m.demoRepo)
    : import('./supabase-repo').then((m) => m.supabaseRepo)
  return repo
}
