import 'server-only'
import { serviceDb } from './db/client'
import { env, siteUrl } from './env'
import { log } from './log'
import { sendMail } from './mail/send'
import { editorAccessEmail, giftReadyEmail } from './mail/templates'
import { decryptToken, generateToken, hashToken } from './security/tokens'

/**
 * "Perdí el link de mi Boxie": el comprador pone su mail y le reenviamos el
 * acceso de sus Boxies vigentes. La que todavía se edita recibe un link de
 * edición nuevo (el viejo se guarda solo hasheado, así que reenviar es rotar:
 * el anterior deja de funcionar); la que ya se regaló, el link del regalo.
 *
 * Nunca dice si el mail existe (la respuesta es la misma haya o no compras):
 * así nadie puede averiguar quién compró. El límite de pedidos lo pone la ruta.
 */

/** Las Boxies más nuevas primero; más que esto no tiene sentido en un solo pedido. */
const MAX_BOXIES = 5

/** `ilike` sin comodines: el mail se busca tal cual, sin importar mayúsculas. */
export function exactIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`)
}

export async function resendAccessByEmail(email: string): Promise<{ sent: number }> {
  const db = serviceDb()
  const { data: orders, error } = await db
    .from('orders')
    .select('id, buyer_name, theme:themes(name)')
    .ilike('buyer_email', exactIlike(email))
    .eq('status', 'paid')
    .order('paid_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(`orders: ${error.message}`)
  if (!orders?.length) return { sent: 0 }

  const { data: boxies, error: boxieError } = await db
    .from('boxies')
    .select('id, code, order_id, status, locked_at, expires_at, gift_token_enc, recipient_name')
    .in(
      'order_id',
      orders.map((o) => o.id),
    )
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(MAX_BOXIES)
  if (boxieError) throw new Error(`boxies: ${boxieError.message}`)

  let sent = 0
  for (const boxie of boxies ?? []) {
    const order = orders.find((o) => o.id === boxie.order_id)!
    try {
      if (!boxie.locked_at) {
        const token = generateToken()
        const { error: rotateError } = await db
          .from('boxies')
          .update({
            edit_token_hash: hashToken(token),
            access_email_sent_at: new Date().toISOString(),
          })
          .eq('id', boxie.id)
          .is('locked_at', null)
        if (rotateError) throw new Error(rotateError.message)
        const mail = editorAccessEmail({
          buyerName: order.buyer_name,
          themeName: order.theme?.name ?? 'Boxie',
          editorUrl: siteUrl(`/editor/${token}`),
          code: boxie.code,
          expiresAt: new Date(boxie.expires_at),
          resent: true,
        })
        await sendMail({ ...mail, to: email, tag: 'editor-access' })
      } else {
        const gift = decryptToken(boxie.gift_token_enc, env().TOKEN_ENCRYPTION_KEY)
        const { data: stats } = await db
          .from('admin_boxie_stats')
          .select('has_password')
          .eq('boxie_id', boxie.id)
          .maybeSingle()
        const mail = giftReadyEmail({
          buyerName: order.buyer_name,
          recipientName: boxie.recipient_name || 'quien la recibe',
          giftUrl: siteUrl(`/g/${gift}`),
          expiresAt: new Date(boxie.expires_at),
          hasPassword: stats?.has_password === true,
        })
        await sendMail({ ...mail, to: email, tag: 'gift-ready' })
      }
      sent += 1
    } catch (sendError) {
      // Una Boxie que falla no frena las otras.
      log.error('No se pudo reenviar el acceso de una Boxie', sendError, { boxieId: boxie.id })
    }
  }
  return { sent }
}
