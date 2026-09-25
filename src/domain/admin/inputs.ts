import { z } from 'zod'
import { COUPON_CODE_PATTERN } from '../coupons'
import { PLAN_SLUG_PATTERN } from '../plans'

/**
 * Lo que mandan los formularios del panel. El servidor valida siempre con
 * estos schemas (la UI los usa para mostrar los mismos límites): un pedido
 * armado a mano no puede cargar un cupón del 300% ni un precio negativo.
 * Montos en centavos, fechas de calendario como "AAAA-MM-DD".
 */

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida')
  .nullable()
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Color en formato #RRGGBB')
const cents = z.number().int('Tiene que ser un monto entero').min(0, 'No puede ser negativo')
const id = z.string().min(1).max(64)

export const CouponInputSchema = z
  .object({
    id: id.optional(),
    code: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase().replace(/\s+/g, ''))
      .pipe(z.string().regex(COUPON_CODE_PATTERN, 'De 3 a 32 letras, números, - o _')),
    kind: z.enum(['percent', 'fixed']),
    value: z.number().int().positive('Tiene que ser mayor a cero'),
    active: z.boolean(),
    maxUses: z.number().int().positive().nullable(),
    startsOn: day,
    expiresOn: day,
    affiliateId: id.nullable(),
    description: z.string().trim().max(200),
  })
  .refine((c) => c.kind !== 'percent' || c.value <= 100, {
    message: 'Un porcentaje va de 1 a 100',
    path: ['value'],
  })
  .refine((c) => !c.startsOn || !c.expiresOn || c.expiresOn > c.startsOn, {
    message: 'Tiene que vencer después de empezar',
    path: ['expiresOn'],
  })
export type CouponInput = z.infer<typeof CouponInputSchema>

export const PlanInputSchema = z
  .object({
    id: id.optional(),
    slug: z.string().trim().regex(PLAN_SLUG_PATTERN, 'Minúsculas, números y guiones').max(40),
    name: z.string().trim().min(2, 'Muy corto').max(40),
    tagline: z.string().trim().max(80),
    priceCents: cents.refine((v) => v > 0, 'El precio tiene que ser mayor a cero'),
    compareAtCents: cents.nullable(),
    rank: z.number().int().min(1).max(20),
    color: hex,
    features: z.array(z.string().trim().min(1).max(80)).max(8),
    limits: z.object({
      giftLifetimeDays: z.number().int().min(1).max(3650),
      maxPhotos: z.number().int().min(0).max(30),
      allowPassword: z.boolean(),
    }),
    highlighted: z.boolean(),
    active: z.boolean(),
  })
  .refine((p) => p.compareAtCents === null || p.compareAtCents > p.priceCents, {
    message: 'El precio tachado tiene que ser mayor al precio',
    path: ['compareAtCents'],
  })
export type PlanInput = z.infer<typeof PlanInputSchema>

export const ExpenseInputSchema = z
  .object({
    id: id.optional(),
    category: z.enum([
      'infraestructura',
      'marketing',
      'herramientas',
      'equipo',
      'impuestos',
      'otros',
    ]),
    description: z.string().trim().min(2, 'Muy corto').max(120),
    vendor: z.string().trim().max(80),
    amountCents: cents,
    recurrence: z.enum(['monthly', 'once']),
    startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida'),
    endsOn: day,
  })
  .refine((e) => !e.endsOn || e.endsOn >= e.startsOn, {
    message: 'Termina antes de empezar',
    path: ['endsOn'],
  })
export type ExpenseInput = z.infer<typeof ExpenseInputSchema>

export const SettingsInputSchema = z
  .object({
    basePriceCents: cents.refine((v) => v > 0, 'Tiene que ser mayor a cero'),
    giftLifetimeDays: z.number().int().min(1).max(3650),
    offerCouponId: id.nullable(),
    offerDelaySeconds: z.number().int().min(0).max(600),
    gatewayFeeBps: z.number().int().min(0).max(5000),
    gatewayVatBps: z.number().int().min(0).max(5000),
    gatewayFixedCents: cents,
    taxBps: z.number().int().min(0).max(5000),
    variableCostCents: cents,
    monthlyGoalCents: cents,
    businessName: z.string().trim().min(2).max(80),
    supportEmail: z.email('Mail inválido'),
    whatsapp: z.string().trim().max(40),
    instagram: z.string().trim().max(40),
    salesPaused: z.boolean(),
  })
  .partial()
export type SettingsInput = z.infer<typeof SettingsInputSchema>

export const AffiliateInputSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, 'Muy corto').max(120),
  code: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(COUPON_CODE_PATTERN, 'De 3 a 32 letras, números, - o _')),
  commissionBps: z.number().int().min(0).max(10000),
  active: z.boolean(),
  email: z.union([z.email('Mail inválido'), z.literal('')]),
  notes: z.string().trim().max(500),
})
export type AffiliateInput = z.infer<typeof AffiliateInputSchema>

export const TaskInputSchema = z.object({
  id: id.optional(),
  title: z.string().trim().min(2, 'Muy corto').max(120),
  description: z.string().trim().max(2000),
  status: z.enum(['todo', 'doing', 'done']),
  priority: z.enum(['alta', 'media', 'baja']),
  assignee: z.string().trim().max(254).nullable(),
  tags: z.array(z.string().trim().min(1).max(24)).max(6),
  dueOn: day,
})
export type TaskInput = z.infer<typeof TaskInputSchema>

export const MemberInputSchema = z.object({
  email: z.email('Mail inválido').max(254),
  name: z.string().trim().min(2, 'Muy corto').max(80),
  role: z.enum(['owner', 'admin', 'editor', 'support']),
})
export type MemberInput = z.infer<typeof MemberInputSchema>

export const ThemeMetaInputSchema = z.object({
  name: z.string().trim().min(2, 'Muy corto').max(80),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Minúsculas, números y guiones')
    .max(60),
  category: z.string().trim().min(1, 'Falta la categoría').max(40),
  description: z.string().trim().max(300),
  sortOrder: z.number().int().min(0).max(9999),
  priceCents: cents.nullable(),
})
export type ThemeMetaInput = z.infer<typeof ThemeMetaInputSchema>

/** Primer error de cada campo, para mostrarlo al lado del campo. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    out[key] ??= issue.message
  }
  return out
}
