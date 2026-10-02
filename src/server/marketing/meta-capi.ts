import 'server-only'
import { createHash } from 'node:crypto'
import { serviceDb } from '../db/client'
import { env, siteUrl } from '../env'
import { log } from '../log'

/**
 * La compra, a la API de conversiones de Meta: así Meta sabe qué anuncio
 * terminó en una venta (aunque el navegador bloquee el píxel) y puede
 * optimizar por compras y no por clics.
 *
 * Apagada salvo que estén NEXT_PUBLIC_META_PIXEL_ID y META_CAPI_TOKEN. El
 * mail y el teléfono viajan cifrados con SHA-256 (como pide Meta). OJO: antes
 * de activarla, la Política de Privacidad tiene que decir que se comparten
 * datos con Meta para medir la publicidad (hoy dice lo contrario).
 *
 * Nunca frena el pago: si Meta no responde en 3 segundos o da error, se
 * anota en el log y sigue.
 */

const GRAPH = 'https://graph.facebook.com/v21.0'

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex')

/** Normalización que pide Meta: mail en minúsculas; teléfono solo dígitos con código de país. */
export function metaUserData(email: string, phone: string | null) {
  const em = email.trim().toLowerCase()
  let digits = (phone ?? '').replace(/\D/g, '')
  if (digits && !digits.startsWith('54')) digits = `54${digits.replace(/^0/, '')}`
  return {
    em: em ? [sha256(em)] : [],
    ph: digits ? [sha256(digits)] : [],
    external_id: em ? [sha256(em)] : [],
    country: [sha256('ar')],
  }
}

export function metaCapiEnabled(): boolean {
  const e = env()
  return Boolean(e.META_CAPI_TOKEN && e.NEXT_PUBLIC_META_PIXEL_ID)
}

/** Manda "Purchase" de la Boxie recién creada (event_id = "compra-<código>"). */
export async function reportPurchaseToMeta(boxieId: string): Promise<void> {
  if (!metaCapiEnabled()) return
  const e = env()
  try {
    const { data, error } = await serviceDb()
      .from('boxies')
      .select(
        'code, created_at, order:orders(amount_cents, currency, buyer_email, buyer_phone, theme:themes(slug))',
      )
      .eq('id', boxieId)
      .maybeSingle()
    if (error || !data?.order) {
      log.warn('Meta: no se encontró la compra', { boxieId, error: error?.message })
      return
    }
    const order = data.order
    const body = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.parse(data.created_at) / 1000),
          event_id: `compra-${data.code}`,
          action_source: 'website',
          event_source_url: siteUrl('/checkout'),
          user_data: metaUserData(order.buyer_email, order.buyer_phone),
          custom_data: {
            value: order.amount_cents / 100,
            currency: order.currency,
            content_ids: order.theme?.slug ? [order.theme.slug] : [],
            content_type: 'product',
            num_items: 1,
          },
        },
      ],
      ...(e.META_TEST_EVENT_CODE ? { test_event_code: e.META_TEST_EVENT_CODE } : {}),
    }
    const pixel = e.NEXT_PUBLIC_META_PIXEL_ID!.replace(/\D/g, '')
    const response = await fetch(
      `${GRAPH}/${pixel}/events?access_token=${encodeURIComponent(e.META_CAPI_TOKEN!)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(3000),
      },
    )
    if (!response.ok) log.warn('Meta rechazó la compra', { boxieId, status: response.status })
  } catch (error) {
    log.warn('No se pudo mandar la compra a Meta', {
      boxieId,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
