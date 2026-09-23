import { NextResponse } from 'next/server'
import { z } from 'zod'
import { quoteCheckout } from '@/server/checkout'
import { log } from '@/server/log'
import { clientIp, rateLimit } from '@/server/rate-limit'

const Body = z.object({
  tematica: z.string().regex(/^[a-z0-9-]{1,60}$/),
  cupon: z.string().max(40).optional().nullable(),
})

/** Precio con cupón, calculado en el servidor. El checkout solo lo muestra. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  // Frena el tanteo de códigos de cupón.
  if (!rateLimit(`quote:${clientIp(request.headers)}`, { limit: 30, windowMs: 10 * 60 * 1000 })) {
    return NextResponse.json(
      { error: 'Demasiados intentos. Esperá unos minutos.' },
      { status: 429 },
    )
  }

  try {
    const result = await quoteCheckout(parsed.data.tematica, parsed.data.cupon)
    if (!result) return NextResponse.json({ error: 'Esa temática no existe.' }, { status: 404 })
    return NextResponse.json({
      listPriceCents: result.quote.listPriceCents,
      discountCents: result.quote.discountCents,
      totalCents: result.quote.totalCents,
      coupon: result.quote.coupon
        ? { code: result.quote.coupon.code, label: result.couponLabel }
        : null,
      couponError: result.couponError,
    })
  } catch (error) {
    log.error('No se pudo cotizar el checkout', error)
    return NextResponse.json(
      { error: 'No pudimos calcular el precio. Probá de nuevo.' },
      { status: 500 },
    )
  }
}
