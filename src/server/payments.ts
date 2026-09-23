import 'server-only'
import { serviceDb, unwrap } from './db/client'
import type { Json } from './db/database.types'
import { env, siteUrl } from './env'
import { log } from './log'
import { sendMail } from './mail/send'
import { editorAccessEmail } from './mail/templates'
import { issueBoxieTokens } from './security/tokens'

/**
 * Aplica un aviso de pago (webhook de Mercado Pago, proveedor falso en
 * desarrollo o acción del admin). La transacción vive en la base
 * (apply_payment: idempotente por proveedor, pago y estado); acá se generan
 * los tokens —la clave de cifrado no está en la base— y, si el pago creó la
 * Boxie, se manda el mail con el link del editor.
 *
 * Los tokens crudos solo existen en memoria durante este pedido y en el mail.
 */

export type PaymentStatus =
  'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'

export interface PaymentNotice {
  orderId: string
  provider: 'mercadopago' | 'fake' | 'free'
  paymentId: string
  status: PaymentStatus
  amountCents: number
  currency: string
  source: 'webhook' | 'return' | 'admin' | 'checkout'
  raw?: Json
}

export interface PaymentOutcome {
  outcome: string
  boxieId: string | null
  created: boolean
  /** Solo si esta llamada creó la Boxie. */
  links: { editor: string; gift: string } | null
}

export async function applyPaymentNotice(notice: PaymentNotice): Promise<PaymentOutcome> {
  const tokens = issueBoxieTokens(env().TOKEN_ENCRYPTION_KEY)
  const [row] = unwrap(
    await serviceDb().rpc('apply_payment', {
      p_order_id: notice.orderId,
      p_provider: notice.provider,
      p_payment_id: notice.paymentId,
      p_status: notice.status,
      p_amount_cents: notice.amountCents,
      p_currency: notice.currency,
      p_source: notice.source,
      p_raw: notice.raw ?? {},
      p_gift_token_hash: tokens.giftHash,
      p_gift_token_enc: tokens.giftEncrypted,
      p_edit_token_hash: tokens.editHash,
    }),
    'apply_payment',
  )
  if (!row) throw new Error('apply_payment no devolvió resultado')

  if (!row.created || !row.boxie_id) {
    return { outcome: row.outcome, boxieId: row.boxie_id, created: false, links: null }
  }

  const links = { editor: siteUrl(`/editor/${tokens.edit}`), gift: siteUrl(`/g/${tokens.gift}`) }
  await sendEditorAccess(row.boxie_id, links.editor).catch((error) =>
    // El pago ya está aplicado: si el mail falla, se reenvía desde el panel.
    log.error('No se pudo mandar el mail con el link del editor', error, {
      boxieId: row.boxie_id,
    }),
  )
  return { outcome: row.outcome, boxieId: row.boxie_id, created: true, links }
}

async function sendEditorAccess(boxieId: string, editorUrl: string) {
  const boxie = unwrap(
    await serviceDb()
      .from('boxies')
      .select('code, expires_at, order:orders(buyer_name, buyer_email, theme:themes(name))')
      .eq('id', boxieId)
      .single(),
    'Boxie recién creada',
  )
  const mail = editorAccessEmail({
    buyerName: boxie.order.buyer_name,
    themeName: boxie.order.theme.name,
    editorUrl,
    code: boxie.code,
    expiresAt: new Date(boxie.expires_at),
  })
  await sendMail({ ...mail, to: boxie.order.buyer_email, tag: 'editor-access' })
  await serviceDb()
    .from('boxies')
    .update({ access_email_sent_at: new Date().toISOString() })
    .eq('id', boxieId)
}
