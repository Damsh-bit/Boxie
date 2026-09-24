import 'server-only'
import { env } from './env'

// ─── Base fetch ──────────────────────────────────────────────────────────────

async function mpFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = env().MP_ACCESS_TOKEN
  if (!token) throw new Error('MP_ACCESS_TOKEN no configurado')

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '(sin cuerpo)')
    throw new Error(`MP API ${path} → ${response.status}: ${body}`)
  }

  return response.json() as Promise<T>
}

// ─── Preferencias ────────────────────────────────────────────────────────────

export interface MpPreferenceItem {
  title: string
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
  back_urls: {
    success: string
    failure: string
    pending: string
  }
  /** 'approved' = auto-redirige solo cuando el pago se aprueba. */
  auto_return: 'approved' | 'all'
  /** Nuestro UUID de orden: lo devuelve MP en el redirect y en el webhook. */
  external_reference: string
  notification_url?: string
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
}

/** Consulta el estado real de un pago. Siempre verificar en vez de confiar en query-params. */
export function getPayment(paymentId: string | number): Promise<MpPayment> {
  return mpFetch<MpPayment>(`/v1/payments/${paymentId}`)
}
