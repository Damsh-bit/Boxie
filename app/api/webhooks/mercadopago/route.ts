import { NextResponse } from 'next/server'
import type { Json } from '@/server/db/database.types'
import { env } from '@/server/env'
import { log } from '@/server/log'
import { getPayment, verifyMpWebhookSignature } from '@/server/mercadopago'
import { applyPaymentNotice, type PaymentStatus } from '@/server/payments'

export const dynamic = 'force-dynamic'

/**
 * Health check para validar conectividad desde herramientas externas o monitoreo.
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'boxie-mercadopago-webhook' })
}

/**
 * Webhook de Mercado Pago para notificaciones de pago (Checkout Pro / API).
 * Valida la firma criptográfica HMAC-SHA256 (x-signature) usando MP_WEBHOOK_SECRET,
 * consulta el pago en la API de MP y aplica la confirmación de la orden con idempotencia.
 */
export async function POST(request: Request) {
  const url = new URL(request.url)
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')

  let body: Record<string, unknown> | null = null
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    // Si MP envía body vacío o formato form-data (ej. IPN legacy en query string)
    body = null
  }

  // Mercado Pago envía el ID en body.data.id o en searchParams (?data.id=... o ?id=...)
  const dataId =
    (body?.data && typeof body.data === 'object' && 'id' in body.data
      ? String(body.data.id)
      : null) ??
    url.searchParams.get('data.id') ??
    (body?.id ? String(body.id) : null) ??
    url.searchParams.get('id')

  const type =
    (typeof body?.type === 'string' ? body.type : null) ??
    (typeof body?.topic === 'string' ? body.topic : null) ??
    url.searchParams.get('type') ??
    url.searchParams.get('topic')

  const action = typeof body?.action === 'string' ? body.action : null

  // 1. Validación de firma criptográfica si MP_WEBHOOK_SECRET está configurado
  const webhookSecret = env().MP_WEBHOOK_SECRET
  if (webhookSecret) {
    const isValid = verifyMpWebhookSignature({
      xSignature,
      xRequestId,
      dataId,
      secret: webhookSecret,
    })

    if (!isValid) {
      log.warn('Firma de webhook de Mercado Pago inválida o ausente', {
        xRequestId,
        hasSignature: Boolean(xSignature),
        dataId,
      })
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }
  } else {
    log.warn('MP_WEBHOOK_SECRET no configurado: procesando webhook sin verificación de firma')
  }

  // 2. Filtrar eventos que no sean de pagos (ej: ping de prueba, merchants, suscripciones)
  const isPaymentEvent =
    type === 'payment' ||
    action?.startsWith('payment.') ||
    (!type && !action && dataId && /^\d+$/.test(dataId))

  if (!isPaymentEvent) {
    // Respondemos 200 OK para que MP confirme la entrega del evento
    return NextResponse.json({ status: 'ignored', reason: 'non-payment event' }, { status: 200 })
  }

  if (!dataId) {
    return NextResponse.json({ status: 'ignored', reason: 'missing data id' }, { status: 200 })
  }

  // 3. Consultar a la API de Mercado Pago el estado real del pago
  try {
    const payment = await getPayment(dataId)

    if (!payment.external_reference) {
      log.info('Pago de MP sin external_reference recibido en webhook', { paymentId: dataId })
      return NextResponse.json(
        { status: 'ignored', reason: 'no external_reference' },
        { status: 200 },
      )
    }

    const outcome = await applyPaymentNotice({
      orderId: payment.external_reference,
      provider: 'mercadopago',
      paymentId: String(payment.id),
      status: payment.status as PaymentStatus,
      amountCents: Math.round(payment.transaction_amount * 100),
      currency: payment.currency_id,
      source: 'webhook',
      raw: payment as unknown as Json,
    })

    log.info('Webhook de Mercado Pago procesado exitosamente', {
      paymentId: dataId,
      orderId: payment.external_reference,
      status: payment.status,
      outcome: outcome.outcome,
      created: outcome.created,
    })

    return NextResponse.json({
      status: 'ok',
      paymentId: payment.id,
      outcome: outcome.outcome,
      created: outcome.created,
    })
  } catch (error) {
    log.error('Error procesando webhook de Mercado Pago', error, { paymentId: dataId })
    return NextResponse.json({ error: 'Error interno procesando webhook' }, { status: 500 })
  }
}
