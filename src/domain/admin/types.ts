import type { CouponKind } from '../coupons'
import type { Cents } from '../money'

/**
 * Entidades del panel de administración. Son las filas de la base (ver
 * supabase/migrations) en camelCase y con fechas ISO: viajan tal cual de los
 * Server Components a los componentes de cliente.
 *
 * Las que no existen todavía en la base (planes, gastos, bitácora, tareas,
 * perfiles del equipo) las agrega la migración `admin_backoffice`.
 */

export type OrderStatus = 'pending' | 'paid' | 'refunded' | 'cancelled'
export type BoxieStatus = 'active' | 'refunded' | 'expired'
export type ThemeStatus = 'draft' | 'published' | 'archived'
export type PaymentProvider = 'mercadopago' | 'fake' | 'free'

export interface AdminOrder {
  id: string
  status: OrderStatus
  themeId: string
  themeVersionId: string
  /** Plan comprado. null en órdenes anteriores a los planes. */
  planId: string | null
  currency: string
  listPriceCents: Cents
  discountCents: Cents
  amountCents: Cents
  couponId: string | null
  couponCode: string | null
  affiliateId: string | null
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
  paymentProvider: PaymentProvider
  mpPaymentId: string | null
  /** Último estado del proveedor (approved, pending, rejected, amount_mismatch…). */
  providerStatus: string | null
  paidAt: string | null
  /** Cuándo se reembolsó (lo registra el evento de pago). */
  refundedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface PaymentEvent {
  id: number
  orderId: string | null
  provider: string
  providerPaymentId: string
  status: string
  source: 'webhook' | 'return' | 'admin' | 'checkout'
  outcome: string | null
  receivedAt: string
}

export interface AdminBoxie {
  id: string
  code: string
  orderId: string
  themeVersionId: string
  status: BoxieStatus
  recipientName: string
  senderName: string
  lockedAt: string | null
  expiresAt: string
  accessEmailSentAt: string | null
  giftEmailSentAt: string | null
  firstOpenedAt: string | null
  openCount: number
  /** Última vez que el comprador guardó algo en el editor. */
  lastEditedAt: string | null
  /** Módulos completos / módulos del plan (lo calcula el servidor con la temática). */
  modulesDone: number
  modulesTotal: number
  photos: number
  createdAt: string
  updatedAt: string
}

export interface AdminCoupon {
  id: string
  code: string
  kind: CouponKind
  value: number
  active: boolean
  maxUses: number | null
  usedCount: number
  startsAt: string | null
  expiresAt: string | null
  affiliateId: string | null
  description: string
  createdAt: string
  updatedAt: string
}

export interface AdminAffiliate {
  id: string
  name: string
  code: string
  /** Comisión en puntos básicos (1000 = 10%). */
  commissionBps: number
  active: boolean
  email: string
  notes: string
  createdAt: string
}

export type ExpenseCategory =
  'infraestructura' | 'marketing' | 'herramientas' | 'equipo' | 'impuestos' | 'otros'

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'infraestructura', label: 'Infraestructura' },
  { value: 'marketing', label: 'Marketing y publicidad' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'equipo', label: 'Equipo y honorarios' },
  { value: 'impuestos', label: 'Impuestos fijos' },
  { value: 'otros', label: 'Otros' },
]

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  vendor: string
  amountCents: Cents
  /** monthly: se repite cada mes desde `startsOn` (hasta `endsOn`, si hay). once: un solo pago en `startsOn`. */
  recurrence: 'monthly' | 'once'
  startsOn: string
  endsOn: string | null
  createdAt: string
}

/** Parámetros de rentabilidad: lo que se descuenta de cada venta. */
export interface FinanceSettings {
  /** Comisión de la pasarela, en puntos básicos (629 = 6,29%). */
  gatewayFeeBps: number
  /** IVA sobre la comisión, en puntos básicos (2100 = 21%). */
  gatewayVatBps: number
  /** Cargo fijo por cobro. */
  gatewayFixedCents: Cents
  /** Impuestos sobre la facturación (Ingresos Brutos, etc.), en puntos básicos. */
  taxBps: number
  /** Costo variable por Boxie entregada (storage, mails, ancho de banda). */
  variableCostCents: Cents
  /** Meta de facturación mensual (para el tablero). */
  monthlyGoalCents: Cents
}

export interface AdminSettings extends FinanceSettings {
  basePriceCents: Cents
  currency: string
  giftLifetimeDays: number
  offerCouponId: string | null
  offerDelaySeconds: number
  /** Datos del negocio que muestran los mails y el sitio. */
  businessName: string
  supportEmail: string
  whatsapp: string
  instagram: string
  /** Pausa las ventas (el checkout muestra un aviso). */
  salesPaused: boolean
  updatedAt: string
}

export interface ThemeVersionInfo {
  id: string
  version: number
  publishedAt: string
  createdBy: string | null
  slides: number
}

export type ThemeOrigin = 'seed' | 'generator' | 'manual' | 'duplicate'

export interface AdminThemeSummary {
  id: string
  slug: string
  name: string
  category: string
  description: string
  status: ThemeStatus
  priceCents: Cents | null
  sortOrder: number
  listing: unknown
  currentVersionId: string | null
  currentVersion: number | null
  /** Hay cambios en el borrador que no se publicaron. */
  hasUnpublishedChanges: boolean
  slides: number
  origin: ThemeOrigin
  createdAt: string
  updatedAt: string
}

export interface AdminTheme extends AdminThemeSummary {
  draftConfig: unknown
  versions: ThemeVersionInfo[]
}

export type AdminRole = 'owner' | 'admin' | 'editor' | 'support'

export const ADMIN_ROLES: { value: AdminRole; label: string; description: string }[] = [
  { value: 'owner', label: 'Dueño', description: 'Todo, incluido el equipo y las finanzas.' },
  { value: 'admin', label: 'Administrador', description: 'Todo menos el equipo.' },
  {
    value: 'editor',
    label: 'Editor de contenido',
    description: 'Temáticas, planes y generador.',
  },
  { value: 'support', label: 'Soporte', description: 'Ventas, Boxies y clientes.' },
]

export interface AdminUser {
  id: string
  email: string
  name: string
  role: AdminRole
  /** Invitación enviada que todavía no se aceptó. */
  pending: boolean
  lastSeenAt: string | null
  createdAt: string
}

export interface AuditEntry {
  id: string
  at: string
  actor: string
  action: string
  /** Tipo de entidad: theme, plan, coupon, boxie, order, settings… */
  entity: string
  entityId: string | null
  summary: string
}

export type TaskStatus = 'todo' | 'doing' | 'done'
export type TaskPriority = 'alta' | 'media' | 'baja'

export interface AdminTask {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assignee: string | null
  tags: string[]
  dueOn: string | null
  position: number
  createdAt: string
  updatedAt: string
}
