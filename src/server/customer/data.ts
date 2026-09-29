import 'server-only'
import { serviceDb, escapeIlike } from '../db/client'
import { env, siteUrl } from '../env'
import { decryptToken, generateToken, hashToken } from '../security/tokens'

export interface CustomerBoxieItem {
  id: string
  code: string
  themeName: string
  recipientName: string
  senderName: string
  status: 'draft' | 'ready' | 'opened'
  statusLabel: string
  openCount: number
  firstOpenedAt: string | null
  expiresAt: string
  createdAt: string
  giftUrl: string | null
  editUrl: string | null
}

export interface CustomerOrderReceipt {
  id: string
  date: string
  amount: number
  themeName: string
  status: string
}

export interface CustomerPortalData {
  stats: {
    totalBoxies: number
    openedCount: number
    inDraftCount: number
  }
  boxies: CustomerBoxieItem[]
  orders: CustomerOrderReceipt[]
}

export async function getCustomerPortalData(customerEmail: string): Promise<CustomerPortalData> {
  const email = customerEmail.toLowerCase().trim()
  const db = serviceDb()
  const base = siteUrl()

  // 1. Obtener órdenes del comprador
  const { data: ordersData, error: ordersError } = await db
    .from('orders')
    .select('id, amount_cents, created_at, status, paid_at, theme:themes(name)')
    .ilike('buyer_email', escapeIlike(email))
    .order('created_at', { ascending: false })

  if (ordersError || !ordersData || ordersData.length === 0) {
    return {
      stats: { totalBoxies: 0, openedCount: 0, inDraftCount: 0 },
      boxies: [],
      orders: [],
    }
  }

  const orderIds = ordersData.map((o) => o.id)

  // 2. Obtener Boxies correspondientes
  const { data: boxiesData, error: boxieError } = await db
    .from('boxies')
    .select(
      'id, code, order_id, status, locked_at, expires_at, gift_token_enc, recipient_name, sender_name, open_count, first_opened_at, created_at',
    )
    .in('order_id', orderIds)
    .order('created_at', { ascending: false })

  if (boxieError) {
    throw new Error(`Error al leer Boxies del cliente: ${boxieError.message}`)
  }

  const boxies: CustomerBoxieItem[] = []
  let openedCount = 0
  let inDraftCount = 0

  for (const b of boxiesData ?? []) {
    const order = ordersData.find((o) => o.id === b.order_id)
    const themeName = (order?.theme as { name?: string } | null)?.name || 'Boxie Digital'

    const isLocked = Boolean(b.locked_at)
    const isOpened = (b.open_count ?? 0) > 0 || Boolean(b.first_opened_at)

    let status: 'draft' | 'ready' | 'opened' = 'draft'
    let statusLabel = 'En edición'

    if (isOpened) {
      status = 'opened'
      statusLabel = '¡Abierta por el agasajado!'
      openedCount++
    } else if (isLocked) {
      status = 'ready'
      statusLabel = 'Lista para regalar'
    } else {
      inDraftCount++
    }

    // Link de regalo si ya está lista
    let giftUrl: string | null = null
    if (b.gift_token_enc) {
      try {
        const giftToken = decryptToken(b.gift_token_enc, env().TOKEN_ENCRYPTION_KEY)
        giftUrl = `${base}/g/${giftToken}`
      } catch {
        giftUrl = null
      }
    }

    // Link de acceso a edición
    const editUrl = `${base}/cuenta/boxies/${b.id}/editar`

    boxies.push({
      id: b.id,
      code: b.code,
      themeName,
      recipientName: b.recipient_name || 'Agasajado/a',
      senderName: b.sender_name || 'Vos',
      status,
      statusLabel,
      openCount: b.open_count ?? 0,
      firstOpenedAt: b.first_opened_at,
      expiresAt: b.expires_at,
      createdAt: b.created_at,
      giftUrl,
      editUrl,
    })
  }

  const receipts: CustomerOrderReceipt[] = ordersData.map((o) => ({
    id: o.id.slice(0, 8),
    date: new Date(o.paid_at || o.created_at).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    amount: o.amount_cents / 100,
    themeName: (o.theme as { name?: string } | null)?.name || 'Boxie Digital',
    status: o.status === 'paid' ? 'Pagado' : o.status,
  }))

  return {
    stats: {
      totalBoxies: boxies.length,
      openedCount,
      inDraftCount,
    },
    boxies,
    orders: receipts,
  }
}

/** Rota el token de edición y devuelve la URL para entrar al editor */
export async function getOrRotateEditorUrl(
  boxieId: string,
  customerEmail: string,
): Promise<string> {
  const db = serviceDb()
  const email = customerEmail.toLowerCase().trim()

  // Verificar pertenencia por email de orden
  const { data: boxie } = await db
    .from('boxies')
    .select('id, order_id, locked_at, orders!inner(buyer_email)')
    .eq('id', boxieId)
    .ilike('orders.buyer_email', escapeIlike(email))
    .maybeSingle()

  if (!boxie) throw new Error('No tenés permiso para acceder a esta Boxie.')

  const base = siteUrl()
  const token = generateToken()
  const tokenHash = hashToken(token)

  await db
    .from('boxies')
    .update({ edit_token_hash: tokenHash } as Record<string, unknown>)
    .eq('id', boxieId)

  return `${base}/editor/${token}`
}
