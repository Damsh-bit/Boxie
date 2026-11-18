import 'server-only'
import crypto from 'node:crypto'
import { env } from './env'

// ─── Base fetch ──────────────────────────────────────────────────────────────

async function mpFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = env().MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN no configurado')

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    // Que una API lenta no deje colgado el checkout ni el webhook (MP reintenta).
    signal: options?.signal ?? AbortSignal.timeout(10_000),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    // El cuerpo de error de MP puede traer datos del pagador: va recortado al log.
    const body = (await response.text().catch(() => '(sin cuerpo)')).slice(0, 300)
    throw new Error(`MP API ${path.split('?')[0]} → ${response.status}: ${body}`)
  }

  return response.json() as Promise<T>
}

// ─── Preferencias ────────────────────────────────────────────────────────────

export interface MpPreferenceItem {
  /** Identificador propio del producto: MP lo usa en su análisis de fraude. */
  id?: string
  title: string
  description?: string
  category_id?: string
  quantity: number
  /** Pesos (no centavos). MP usa unidad entera con decimales. */
  unit_price: number
  currency_id: string
}

export interface MpPreference {
  id: string
  /** URL de producción. */
  init_point: string
  /** URL de sandbox (credenciales de prueba). */
  sandbox_init_point: string
}

export interface MpPreferenceInput {
  items: MpPreferenceItem[]
  payer: {
    name: string
    email: string
    phone?: { number: string }
  }
  back_urls?: {
    success: string
    failure: string
    pending: string
  }
  /** 'approved' = auto-redirige solo cuando el pago se aprueba (requiere HTTPS en back_urls.success). */
  auto_return?: 'approved' | 'all'
  /** Nuestro UUID de orden: lo devuelve MP en el redirect y en el webhook. */
  external_reference: string
  notification_url?: string
  /** Texto en el resumen de la tarjeta: un cargo reconocible evita contracargos. */
  statement_descriptor?: string
  /** Vencimiento: una orden vieja no se puede pagar meses después al precio de entonces. */
  expires?: boolean
  expiration_date_from?: string
  expiration_date_to?: string
}

/**
 * Fecha en el formato que pide MP ("2026-11-18T12:00:00.000-03:00").
 * Argentina no tiene horario de verano: el desfase es fijo.
 */
export function toMpDate(date: Date): string {
  return new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString().replace('Z', '-03:00')
}

export function createPreference(input: MpPreferenceInput): Promise<MpPreference> {
  return mpFetch<MpPreference>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

// ─── Pagos ───────────────────────────────────────────────────────────────────

export interface MpPayment {
  id: number
  status: string
  status_detail: string
  /** Monto en pesos (no centavos). */
  transaction_amount: number
  currency_id: string
  external_reference: string
  order: { id: number; type: string }
  payment_type_id?: string
  payment_method_id?: string
  installments?: number
  date_approved?: string | null
  card?: { last_four_digits?: string | null } | null
}

/**
 * Lo que se guarda del pago en `payment_events.raw`: solo lo que se usa
 * (comprobante del portal y conciliación). El pago completo de MP trae mail,
 * DNI, IP y datos de la tarjeta del pagador, que no hace falta conservar
 * (minimización de datos, Ley 25.326).
 */
export function summarizePayment(payment: MpPayment) {
  return {
    id: payment.id,
    status: payment.status,
    status_detail: payment.status_detail ?? null,
    transaction_amount: payment.transaction_amount,
    currency_id: payment.currency_id,
    external_reference: payment.external_reference ?? null,
    payment_type_id: payment.payment_type_id ?? null,
    payment_method_id: payment.payment_method_id ?? null,
    installments: typeof payment.installments === 'number' ? payment.installments : null,
    date_approved: payment.date_approved ?? null,
    card: payment.card?.last_four_digits
      ? { last_four_digits: payment.card.last_four_digits }
      : null,
  }
}

/** Consulta el estado real de un pago. Siempre verificar en vez de confiar en query-params. */
export function getPayment(paymentId: string | number): Promise<MpPayment> {
  const id = String(paymentId)
  if (!/^\d{1,20}$/.test(id)) throw new Error('Id de pago de Mercado Pago inválido')
  return mpFetch<MpPayment>(`/v1/payments/${id}`)
}

// ─── Verificación de Webhooks ────────────────────────────────────────────────

export interface VerifySignatureParams {
  xSignature?: string | null
  xRequestId?: string | null
  dataId?: string | number | null
  secret: string
}

/**
 * Valida la firma HMAC-SHA256 del encabezado x-signature enviado por Mercado Pago.
 * Formato x-signature: "ts=1700000000,v1=hash_hexadecimal"
 * Manifest template: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
export function verifyMpWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
  secret,
}: VerifySignatureParams): boolean {
  if (!xSignature || !secret || dataId == null) return false

  let ts: string | undefined
  let hash: string | undefined

  for (const part of xSignature.split(',')) {
    const [k, v] = part.split('=')
    if (k?.trim() === 'ts') ts = v?.trim()
    if (k?.trim() === 'v1') hash = v?.trim()
  }

  if (!ts || !hash) return false

  const manifest = `id:${dataId};request-id:${xRequestId ?? ''};ts:${ts};`
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  const computedBuf = Buffer.from(computed)
  const hashBuf = Buffer.from(hash)

  if (computedBuf.length !== hashBuf.length) return false
  return crypto.timingSafeEqual(computedBuf, hashBuf)
}
