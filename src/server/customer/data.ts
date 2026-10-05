import 'server-only'
import { serviceDb, escapeIlike } from '../db/client'
import { env, siteUrl } from '../env'
import { decryptToken, generateToken, hashToken } from '../security/tokens'

import type { User } from '@supabase/supabase-js'
import { getCustomerSpecialDates, type CustomerSpecialDate } from './reminders'

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
  fullId: string
  date: string
  time: string
  amount: number
  listPrice: number
  discount: number
  couponCode: string | null
  themeName: string
  planName: string | null
  status: string
  isPaid: boolean
  paymentProvider: string
  mpPaymentId: string | null
  paymentMethodDetail: string
  buyerName: string
  buyerEmail: string
  buyerPhone: string | null
  boxie: {
    id: string
    code: string
    recipientName: string
    status: 'draft' | 'ready' | 'opened'
    statusLabel: string
    editUrl: string | null
    giftUrl: string | null
  } | null
}

function formatPaymentMethod(
  provider: string,
  mpPaymentId: string | null,
  raw: Record<string, unknown> | null,
): string {
  if (provider === 'fake') return 'Pago simulado (Prueba)'
  if (provider === 'free') return 'Gratuito / Promoción'

  if (raw) {
    const paymentTypeId = String(raw.payment_type_id || '').toLowerCase()
    const paymentMethodId = String(raw.payment_method_id || '').toLowerCase()
    const installments = typeof raw.installments === 'number' ? raw.installments : 1
    const card = raw.card as { last_four_digits?: string } | undefined
    const lastFour = card?.last_four_digits

    if (paymentTypeId === 'account_money' || paymentMethodId === 'account_money') {
      return 'Mercado Pago · Dinero en cuenta'
    }

    const cardBrand = paymentMethodId ? paymentMethodId.toUpperCase() : 'Tarjeta'
    if (paymentTypeId === 'credit_card') {
      const cuotasText = installments > 1 ? ` (${installments} cuotas)` : ' (1 pago)'
      return lastFour
        ? `Tarjeta de crédito ${cardBrand} **** ${lastFour}${cuotasText}`
        : `Tarjeta de crédito ${cardBrand}${cuotasText}`
    }

    if (paymentTypeId === 'debit_card') {
      return lastFour
        ? `Tarjeta de débito ${cardBrand} **** ${lastFour}`
        : `Tarjeta de débito ${cardBrand}`
    }

    if (paymentTypeId === 'ticket') {
      return `Efectivo (${paymentMethodId.toUpperCase()})`
    }

    if (paymentTypeId === 'bank_transfer') {
      return 'Transferencia bancaria'
    }
  }

  if (mpPaymentId) {
    return 'Mercado Pago'
  }

  return 'Online'
}

export interface CustomerPortalData {
  stats: {
    totalBoxies: number
    openedCount: number
    inDraftCount: number
  }
  boxies: CustomerBoxieItem[]
  orders: CustomerOrderReceipt[]
  specialDates: CustomerSpecialDate[]
}

export async function getCustomerPortalData(
  customerEmail: string,
  user?: User | null,
): Promise<CustomerPortalData> {
  const email = customerEmail.toLowerCase().trim()
  const db = serviceDb()
  const base = siteUrl()
  const specialDates = getCustomerSpecialDates(user)

  // 1. Obtener órdenes del comprador
  const { data: ordersData, error: ordersError } = await db
    .from('orders')
    .select(
      'id, amount_cents, list_price_cents, discount_cents, coupon_code, payment_provider, mp_payment_id, buyer_name, buyer_email, buyer_phone, created_at, status, paid_at, theme:themes(name), plan:plans(name)',
    )
    .ilike('buyer_email', escapeIlike(email))
    .order('created_at', { ascending: false })

  if (ordersError || !ordersData || ordersData.length === 0) {
    return {
      stats: { totalBoxies: 0, openedCount: 0, inDraftCount: 0 },
      boxies: [],
      orders: [],
      specialDates,
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

  // 3. Obtener eventos de pago para extraer el detalle del medio de pago
  const { data: eventsData } = await db
    .from('payment_events')
    .select('order_id, provider, provider_payment_id, status, raw, received_at')
    .in('order_id', orderIds)
    .order('received_at', { ascending: false })

  const receipts: CustomerOrderReceipt[] = ordersData.map((o) => {
    const paidDate = o.paid_at ? new Date(o.paid_at) : new Date(o.created_at)
    const dateFormatted = paidDate.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const timeFormatted = paidDate.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const orderEvents = (eventsData ?? []).filter((e) => e.order_id === o.id)
    const approvedEvent = orderEvents.find((e) => e.status === 'approved') ?? orderEvents[0]
    const raw = (
      approvedEvent?.raw && typeof approvedEvent.raw === 'object' ? approvedEvent.raw : null
    ) as Record<string, unknown> | null

    const paymentMethodDetail = formatPaymentMethod(o.payment_provider, o.mp_payment_id, raw)

    const associatedBoxie = boxies.find((b) => {
      const match = boxiesData?.find((item) => item.id === b.id)
      return match?.order_id === o.id
    })

    return {
      id: o.id.slice(0, 8),
      fullId: o.id,
      date: dateFormatted,
      time: timeFormatted,
      amount: o.amount_cents / 100,
      listPrice: o.list_price_cents / 100,
      discount: o.discount_cents / 100,
      couponCode: o.coupon_code ?? null,
      themeName: (o.theme as { name?: string } | null)?.name || 'Ribbly Digital',
      planName: (o.plan as { name?: string } | null)?.name || null,
      status:
        o.status === 'paid'
          ? 'Pagado'
          : o.status === 'pending'
            ? 'Pendiente'
            : o.status === 'refunded'
              ? 'Reembolsado'
              : o.status,
      isPaid: o.status === 'paid',
      paymentProvider: o.payment_provider,
      mpPaymentId: o.mp_payment_id ?? approvedEvent?.provider_payment_id ?? null,
      paymentMethodDetail,
      buyerName: o.buyer_name,
      buyerEmail: o.buyer_email,
      buyerPhone: o.buyer_phone ?? null,
      boxie: associatedBoxie
        ? {
            id: associatedBoxie.id,
            code: associatedBoxie.code,
            recipientName: associatedBoxie.recipientName,
            status: associatedBoxie.status,
            statusLabel: associatedBoxie.statusLabel,
            editUrl: associatedBoxie.editUrl,
            giftUrl: associatedBoxie.giftUrl,
          }
        : null,
    }
  })

  return {
    stats: {
      totalBoxies: boxies.length,
      openedCount,
      inDraftCount,
    },
    boxies,
    orders: receipts,
    specialDates,
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

  await db.from('boxies').update({ edit_token_hash: tokenHash }).eq('id', boxieId)

  return `${base}/editor/${token}`
}

export interface CustomerHeroContext {
  hasPreviousPurchases: boolean
  draft: { id: string; recipientName: string; editUrl: string } | null
}

/**
 * Consulta mínima para personalizar el Hero del home cuando el usuario está logueado.
 * Solo trae los datos imprescindibles sin cargar el portal completo.
 */
export async function getCustomerHeroContext(customerEmail: string): Promise<CustomerHeroContext> {
  const email = customerEmail.toLowerCase().trim()
  const db = serviceDb()
  const base = siteUrl()

  const { data: orders } = await db
    .from('orders')
    .select('id')
    .ilike('buyer_email', escapeIlike(email))
    .limit(1)

  if (!orders || orders.length === 0) {
    return { hasPreviousPurchases: false, draft: null }
  }

  const orderIds = orders.map((o) => o.id)

  // Buscar el primer borrador sin bloquear
  const { data: draftBoxie } = await db
    .from('boxies')
    .select('id, recipient_name, locked_at')
    .in('order_id', orderIds)
    .is('locked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const draft = draftBoxie
    ? {
        id: draftBoxie.id,
        recipientName: draftBoxie.recipient_name || 'tu regalo',
        editUrl: `${base}/cuenta/boxies/${draftBoxie.id}/editar`,
      }
    : null

  return { hasPreviousPurchases: true, draft }
}
