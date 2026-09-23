import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { formatBoxieCode } from '@/domain/boxie'
import { getPublicSettings, getPublishedTheme, listPublishedThemes } from '@/server/catalog'
import { serviceDb, unwrap } from '@/server/db/client'
import { isDemoMode } from '@/server/demo'
import { env } from '@/server/env'
import { applyPaymentNotice } from '@/server/payments'

/**
 * Solo desarrollo y E2E (PAYMENTS_PROVIDER=fake, que la validación del
 * entorno rechaza en producción): crea una orden y la da por pagada con el
 * proveedor falso, por el mismo camino que va a usar el webhook de Mercado
 * Pago. Devuelve los links que en la vida real llegan por mail.
 */

const Body = z.object({
  tematica: z
    .string()
    .regex(/^[a-z0-9-]{1,60}$/)
    .optional(),
  nombre: z.string().min(2).max(120).default('Comprador de Prueba'),
  email: z.email().default('prueba@boxie.test'),
})

function enabled() {
  if (isDemoMode()) return false
  const { PAYMENTS_PROVIDER, VERCEL_ENV } = env()
  return PAYMENTS_PROVIDER === 'fake' && VERCEL_ENV !== 'production'
}

export async function POST(request: Request) {
  if (!enabled()) return NextResponse.json({ error: 'No encontrado.' }, { status: 404 })

  const parsed = Body.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
  const { tematica, nombre, email } = parsed.data

  const theme = tematica
    ? await getPublishedTheme(tematica)
    : ((await listPublishedThemes())[0] ?? null)
  if (!theme) return NextResponse.json({ error: 'Esa temática no existe.' }, { status: 404 })

  const settings = await getPublicSettings()
  const price = theme.priceCents
  const order = unwrap(
    await serviceDb()
      .from('orders')
      .insert({
        theme_id: theme.id,
        theme_version_id: theme.versionId,
        currency: settings.currency,
        list_price_cents: price,
        discount_cents: 0,
        amount_cents: price,
        buyer_name: nombre,
        buyer_email: email,
        payment_provider: 'fake',
      })
      .select('id')
      .single(),
    'orden de prueba',
  )

  const result = await applyPaymentNotice({
    orderId: order.id,
    provider: 'fake',
    paymentId: `fake-${randomUUID()}`,
    status: 'approved',
    amountCents: price,
    currency: settings.currency,
    source: 'checkout',
  })
  if (!result.created || !result.links) {
    return NextResponse.json({ error: `No se creó la Boxie (${result.outcome}).` }, { status: 500 })
  }

  const boxie = unwrap(
    await serviceDb().from('boxies').select('code').eq('id', result.boxieId!).single(),
    'Boxie de prueba',
  )
  return NextResponse.json({
    code: formatBoxieCode(boxie.code),
    editorUrl: result.links.editor,
    giftUrl: result.links.gift,
  })
}
