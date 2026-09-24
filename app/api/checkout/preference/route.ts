import { NextResponse } from 'next/server'
import { z } from 'zod'
import { quoteCheckout } from '@/server/checkout'
import { serviceDb, unwrap } from '@/server/db/client'
import { env, siteUrl } from '@/server/env'
import { log } from '@/server/log'
import { createPreference } from '@/server/mercadopago'
import { clientIp, rateLimit } from '@/server/rate-limit'

const Body = z.object({
  tematica: z.string().regex(/^[a-z0-9-]{1,60}$/),
  cupon: z.string().max(40).optional().nullable(),
  nombre: z.string().min(2).max(120),
  email: z.string().email().max(254),
  telefono: z.string().max(40).optional().nullable(),
})

/**
 * Crea una orden en la base y una preferencia en Mercado Pago.
 * Devuelve la URL a la que redirigir al comprador.
 */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos.' }, { status: 400 })
  }

  if (
    !rateLimit(`preference:${clientIp(request.headers)}`, { limit: 10, windowMs: 10 * 60 * 1000 })
  ) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos.' },
      { status: 429 },
    )
  }

  const { tematica, cupon, nombre, email, telefono } = parsed.data

  try {
    const result = await quoteCheckout(tematica, cupon)
    if (!result) return NextResponse.json({ error: 'Esa temática no existe.' }, { status: 404 })

    const { theme, quote } = result

    // Buscar coupon_id si hay cupón aplicado (para referencia en la orden).
    let couponId: string | null = null
    let couponCode: string | null = null
    if (quote.coupon) {
      const couponRow = await serviceDb()
        .from('coupons')
        .select('id')
        .eq('code', quote.coupon.code)
        .maybeSingle()
      couponId = couponRow.data?.id ?? null
      couponCode = quote.coupon.code
    }

    // Crear la orden (estado 'pending'; se actualiza a 'paid' cuando llegue el aviso).
    const order = unwrap(
      await serviceDb()
        .from('orders')
        .insert({
          theme_id: theme.id,
          theme_version_id: theme.versionId,
          currency: 'ARS',
          list_price_cents: quote.listPriceCents,
          discount_cents: quote.discountCents,
          amount_cents: quote.totalCents,
          coupon_id: couponId,
          coupon_code: couponCode,
          buyer_name: nombre,
          buyer_email: email,
          buyer_phone: telefono ?? null,
          payment_provider: 'mercadopago',
        })
        .select('id')
        .single(),
      'crear orden',
    )

    // Crear la preferencia en Mercado Pago.
    const returnBase = siteUrl('/api/checkout/return')
    const preference = await createPreference({
      items: [
        {
          title: `Boxie ${theme.name}`,
          quantity: 1,
          // MP trabaja en pesos (no centavos).
          unit_price: quote.totalCents / 100,
          currency_id: 'ARS',
        },
      ],
      payer: {
        name: nombre,
        email,
        ...(telefono ? { phone: { number: telefono } } : {}),
      },
      back_urls: {
        success: returnBase,
        failure: returnBase,
        pending: returnBase,
      },
      // auto_return: MP redirige automáticamente al success_url cuando el pago se aprueba.
      auto_return: 'approved',
      external_reference: order.id,
    })

    // Guardar el preference_id para trazabilidad.
    await serviceDb().from('orders').update({ mp_preference_id: preference.id }).eq('id', order.id)

    // En sandbox usamos sandbox_init_point; en producción, init_point.
    const isProduction = env().VERCEL_ENV === 'production'
    const initPoint = isProduction ? preference.init_point : preference.sandbox_init_point

    return NextResponse.json({ initPoint })
  } catch (error) {
    log.error('No se pudo crear la preferencia de pago', error)
    return NextResponse.json(
      { error: 'No pudimos crear el pago. Intentá de nuevo en unos segundos.' },
      { status: 500 },
    )
  }
}
