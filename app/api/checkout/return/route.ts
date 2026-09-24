import { NextResponse } from 'next/server'
import type { Json } from '@/server/db/database.types'
import { log } from '@/server/log'
import { getPayment } from '@/server/mercadopago'
import { applyPaymentNotice, type PaymentStatus } from '@/server/payments'

export const dynamic = 'force-dynamic'

/**
 * Back URL que Mercado Pago llama al terminar el pago (success, failure, pending).
 * Verifica el estado real con la API de MP (no confía en los query-params del redirect),
 * procesa el aviso de pago y redirige al comprador a la pantalla correcta.
 *
 * Query params enviados por MP:
 *   payment_id / collection_id — ID del pago
 *   status / collection_status — estado (no confiable, se verifica)
 *   external_reference         — nuestro order UUID
 *   merchant_order_id
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)

  const paymentId = searchParams.get('payment_id') ?? searchParams.get('collection_id')
  const externalRef = searchParams.get('external_reference')

  const redirect = (path: string) => NextResponse.redirect(`${origin}${path}`)

  if (!paymentId || !externalRef) {
    return redirect('/checkout/error?razon=sin-datos')
  }

  try {
    // Verificar el pago directamente con la API de MP.
    const payment = await getPayment(paymentId)

    // Validar que el external_reference coincide (evita manipulación de URLs).
    if (payment.external_reference !== externalRef) {
      log.error('external_reference mismatch en retorno de MP', undefined, {
        paymentId,
        externalRef,
        mpRef: payment.external_reference,
      })
      return redirect('/checkout/error?razon=referencia-invalida')
    }

    const outcome = await applyPaymentNotice({
      orderId: externalRef,
      provider: 'mercadopago',
      paymentId: String(payment.id),
      status: payment.status as PaymentStatus,
      amountCents: Math.round(payment.transaction_amount * 100),
      currency: payment.currency_id,
      source: 'return',
      raw: payment as unknown as Json,
    })

    // Pago aprobado y Boxie recién creada → directo al editor.
    if (outcome.created && outcome.links) {
      return redirect(new URL(outcome.links.editor).pathname)
    }

    // Aprobado pero Boxie ya existía (doble redirect, pago repetido idempotente).
    if (payment.status === 'approved') {
      return redirect('/checkout/exito')
    }

    // Pago pendiente (ej. transferencia bancaria).
    if (payment.status === 'pending' || payment.status === 'in_process') {
      return redirect('/checkout/pendiente')
    }

    // Pago rechazado o cancelado.
    return redirect('/checkout/error?razon=pago-rechazado')
  } catch (error) {
    log.error('Error procesando retorno de Mercado Pago', error, { paymentId })
    return redirect('/checkout/error?razon=error-interno')
  }
}
