import crypto from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type * as DbClient from '@/server/db/client'
import type * as MercadoPago from '@/server/mercadopago'

/**
 * Pasarela de pago de punta a punta, con los handlers reales de las rutas.
 * Se simulan solo los bordes: la API de Mercado Pago, la base y el
 * aprovisionamiento (apply_payment tiene sus propios tests contra Postgres en
 * tests/db/payments.test.ts). Lo que se prueba acá es lo que decide la ruta:
 * qué acepta, qué rechaza, qué monto y moneda le pasa a apply_payment y adónde
 * manda al comprador.
 */

const WEBHOOK_SECRET = 'secreto-de-prueba-del-webhook'

vi.hoisted(() => {
  Object.assign(process.env, {
    NEXT_PUBLIC_SITE_URL: 'https://ribbly.test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://db.ribbly.test',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    SUPABASE_SERVICE_ROLE_KEY: 'service',
    SESSION_SECRET: 'x'.repeat(40),
    TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString('base64'),
    PAYMENTS_PROVIDER: 'mercadopago',
    MP_ACCESS_TOKEN: 'APP_USR-test',
    MP_WEBHOOK_SECRET: 'secreto-de-prueba-del-webhook',
    VERCEL_ENV: '',
  })
})

const mp = vi.hoisted(() => ({
  getPayment: vi.fn(),
  createPreference: vi.fn(),
}))
const payments = vi.hoisted(() => ({ applyPaymentNotice: vi.fn() }))
const checkout = vi.hoisted(() => ({ quoteCheckout: vi.fn() }))
const catalog = vi.hoisted(() => ({ getPublicSettings: vi.fn() }))
const db = vi.hoisted(() => ({
  inserted: [] as Record<string, unknown>[],
  updated: [] as Record<string, unknown>[],
}))

vi.mock('@/server/mercadopago', async (importOriginal) => ({
  ...(await importOriginal<typeof MercadoPago>()),
  getPayment: mp.getPayment,
  createPreference: mp.createPreference,
}))
vi.mock('@/server/payments', () => payments)
vi.mock('@/server/checkout', () => checkout)
vi.mock('@/server/catalog', () => catalog)
vi.mock('@/server/log', () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }))
vi.mock('@/server/marketing/repo', () => ({
  marketingRepo: async () => ({ saveAttribution: vi.fn() }),
}))
vi.mock('@/server/db/client', async (importOriginal) => {
  const original = await importOriginal<typeof DbClient>()
  const fake = {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        db.inserted.push(row)
        return {
          select: () => ({
            single: async () => ({ data: { id: ORDER_ID }, error: null }),
          }),
        }
      },
      update: (row: Record<string, unknown>) => {
        db.updated.push(row)
        return { eq: async () => ({ data: null, error: null }) }
      },
    }),
  }
  return { ...original, serviceDb: () => fake }
})

const ORDER_ID = '3f2a1b9c-1111-4222-8333-444455556666'

const { POST: webhook } = await import('../../app/api/webhooks/mercadopago/route')
const { GET: checkoutReturn } = await import('../../app/api/checkout/return/route')
const { POST: preference } = await import('../../app/api/checkout/preference/route')

function mpPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 123456789,
    status: 'approved',
    status_detail: 'accredited',
    transaction_amount: 15000,
    currency_id: 'ARS',
    external_reference: ORDER_ID,
    order: { id: 1, type: 'mercadopago' },
    payment_type_id: 'credit_card',
    payment_method_id: 'visa',
    installments: 3,
    card: { last_four_digits: '4242' },
    payer: { email: 'comprador@example.com', identification: { number: '30111222' } },
    ...overrides,
  }
}

function signedWebhook(
  dataId: string,
  opts: { secret?: string; ts?: string; body?: unknown } = {},
) {
  const ts = opts.ts ?? String(Math.floor(Date.now() / 1000))
  const requestId = 'req-1'
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const v1 = crypto
    .createHmac('sha256', opts.secret ?? WEBHOOK_SECRET)
    .update(manifest)
    .digest('hex')
  return new Request(
    `https://ribbly.test/api/webhooks/mercadopago?data.id=${dataId}&type=payment`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signature': `ts=${ts},v1=${v1}`,
        'x-request-id': requestId,
      },
      body: JSON.stringify(
        opts.body ?? { type: 'payment', action: 'payment.updated', data: { id: dataId } },
      ),
    },
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  db.inserted.length = 0
  db.updated.length = 0
  payments.applyPaymentNotice.mockResolvedValue({
    outcome: 'paid',
    boxieId: 'b1',
    created: true,
    links: {
      editor: 'https://ribbly.test/editor/tok-editor',
      gift: 'https://ribbly.test/g/tok-gift',
    },
  })
  catalog.getPublicSettings.mockResolvedValue({ salesPaused: false })
})

// ─── Webhook ────────────────────────────────────────────────────────────────

describe('webhook de Mercado Pago', () => {
  it('con firma válida consulta el pago en MP y lo aplica con monto y moneda reales', async () => {
    mp.getPayment.mockResolvedValue(mpPayment({ transaction_amount: 13500.5 }))
    const res = await webhook(signedWebhook('123456789'))

    expect(res.status).toBe(200)
    expect(mp.getPayment).toHaveBeenCalledWith('123456789')
    expect(payments.applyPaymentNotice).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: ORDER_ID,
        provider: 'mercadopago',
        paymentId: '123456789',
        status: 'approved',
        amountCents: 1350050,
        currency: 'ARS',
        source: 'webhook',
      }),
    )
  })

  it('guarda solo un resumen del pago, sin DNI ni mail del pagador', async () => {
    mp.getPayment.mockResolvedValue(mpPayment())
    await webhook(signedWebhook('123456789'))
    const raw = payments.applyPaymentNotice.mock.calls[0]![0].raw as Record<string, unknown>
    expect(raw).toMatchObject({
      payment_type_id: 'credit_card',
      installments: 3,
      card: { last_four_digits: '4242' },
    })
    expect(JSON.stringify(raw)).not.toContain('30111222')
    expect(JSON.stringify(raw)).not.toContain('comprador@example.com')
  })

  it('rechaza una firma hecha con otro secreto (401) y no consulta a MP', async () => {
    const res = await webhook(signedWebhook('123456789', { secret: 'otro-secreto' }))
    expect(res.status).toBe(401)
    expect(mp.getPayment).not.toHaveBeenCalled()
    expect(payments.applyPaymentNotice).not.toHaveBeenCalled()
  })

  it('rechaza un aviso sin firma', async () => {
    const res = await webhook(
      new Request('https://ribbly.test/api/webhooks/mercadopago', {
        method: 'POST',
        body: JSON.stringify({ type: 'payment', data: { id: '123456789' } }),
      }),
    )
    expect(res.status).toBe(401)
    expect(mp.getPayment).not.toHaveBeenCalled()
  })

  it('no acepta una firma válida de un pago con el cuerpo cambiado a otro pago', async () => {
    // Firma legítima para el pago 111, cuerpo apuntando al 222.
    const req = signedWebhook('111', { body: { type: 'payment', data: { id: '222' } } })
    const res = await webhook(req)
    expect(res.status).toBe(401)
    expect(mp.getPayment).not.toHaveBeenCalled()
  })

  it('ignora eventos que no son de pagos', async () => {
    const res = await webhook(
      signedWebhook('987', { body: { type: 'merchant_order', data: { id: '987' } } }),
    )
    expect(res.status).toBe(200)
    expect(mp.getPayment).not.toHaveBeenCalled()
  })

  it('ignora ids que no son numéricos (nada de rutas raras hacia la API de MP)', async () => {
    const res = await webhook(signedWebhook('../users/me'))
    expect(res.status).toBe(200)
    expect(mp.getPayment).not.toHaveBeenCalled()
  })

  it('ignora pagos sin external_reference (no son de este checkout)', async () => {
    mp.getPayment.mockResolvedValue(mpPayment({ external_reference: null }))
    const res = await webhook(signedWebhook('123456789'))
    expect(res.status).toBe(200)
    expect(payments.applyPaymentNotice).not.toHaveBeenCalled()
  })

  it('si MP o la base fallan responde 500 para que MP reintente', async () => {
    mp.getPayment.mockRejectedValue(new Error('MP caído'))
    const res = await webhook(signedWebhook('123456789'))
    expect(res.status).toBe(500)
  })
})

// ─── Retorno del checkout ───────────────────────────────────────────────────

const returnUrl = (params: Record<string, string>) =>
  new Request(`https://ribbly.test/api/checkout/return?${new URLSearchParams(params)}`)

describe('retorno de Mercado Pago', () => {
  it('pago aprobado que crea la Ribbly: va directo al editor', async () => {
    mp.getPayment.mockResolvedValue(mpPayment())
    const res = await checkoutReturn(
      returnUrl({ payment_id: '123456789', external_reference: ORDER_ID, status: 'approved' }),
    )
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('https://ribbly.test/editor/tok-editor')
    expect(payments.applyPaymentNotice).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents: 1500000, currency: 'ARS', source: 'return' }),
    )
  })

  it('no le cree al status de la URL: verifica en MP (rechazado aunque diga approved)', async () => {
    mp.getPayment.mockResolvedValue(mpPayment({ status: 'rejected' }))
    payments.applyPaymentNotice.mockResolvedValue({
      outcome: 'recorded',
      boxieId: null,
      created: false,
      links: null,
    })
    const res = await checkoutReturn(
      returnUrl({ payment_id: '123456789', external_reference: ORDER_ID, status: 'approved' }),
    )
    expect(res.headers.get('location')).toContain('/checkout/error?razon=pago-rechazado')
  })

  it('rechaza un pago real de otra orden (external_reference cambiado en la URL)', async () => {
    mp.getPayment.mockResolvedValue(
      mpPayment({ external_reference: 'aaaaaaaa-1111-4222-8333-444455556666' }),
    )
    const res = await checkoutReturn(
      returnUrl({ payment_id: '123456789', external_reference: ORDER_ID }),
    )
    expect(res.headers.get('location')).toContain('referencia-invalida')
    expect(payments.applyPaymentNotice).not.toHaveBeenCalled()
  })

  it('ya aplicado por el webhook: pantalla de éxito (el link llegó por mail)', async () => {
    mp.getPayment.mockResolvedValue(mpPayment())
    payments.applyPaymentNotice.mockResolvedValue({
      outcome: 'duplicate',
      boxieId: 'b1',
      created: false,
      links: null,
    })
    const res = await checkoutReturn(
      returnUrl({ payment_id: '123456789', external_reference: ORDER_ID }),
    )
    expect(res.headers.get('location')).toBe('https://ribbly.test/checkout/exito')
  })

  it('pendiente (efectivo, en revisión): pantalla de pendiente', async () => {
    mp.getPayment.mockResolvedValue(mpPayment({ status: 'in_process' }))
    payments.applyPaymentNotice.mockResolvedValue({
      outcome: 'recorded',
      boxieId: null,
      created: false,
      links: null,
    })
    const res = await checkoutReturn(
      returnUrl({ payment_id: '123456789', external_reference: ORDER_ID }),
    )
    expect(res.headers.get('location')).toBe('https://ribbly.test/checkout/pendiente')
  })

  it.each([
    ['sin datos', {}],
    ['payment_id con ruta', { payment_id: '../../users/me', external_reference: ORDER_ID }],
    ['referencia que no es UUID', { payment_id: '123', external_reference: "1' or '1'='1" }],
  ])('rechaza parámetros inválidos (%s) sin llamar a MP', async (_name, params) => {
    const res = await checkoutReturn(returnUrl(params as Record<string, string>))
    expect(res.headers.get('location')).toContain('/checkout/error')
    expect(mp.getPayment).not.toHaveBeenCalled()
  })

  it('si MP falla, error interno sin romper', async () => {
    mp.getPayment.mockRejectedValue(new Error('timeout'))
    const res = await checkoutReturn(
      returnUrl({ payment_id: '123456789', external_reference: ORDER_ID }),
    )
    expect(res.headers.get('location')).toContain('error-interno')
  })
})

// ─── Crear preferencia ──────────────────────────────────────────────────────

let ipCounter = 0
function preferenceRequest(body: unknown, ip = `10.0.0.${++ipCounter}`) {
  return new Request('https://ribbly.test/api/checkout/preference', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(body),
  })
}

const validBody = {
  tematica: 'pareja',
  nombre: 'Leandro Pérez',
  email: 'leandro@example.com',
  telefono: '1123456789',
}

function mockQuote(totalCents: number, coupon: { id: string; code: string } | null = null) {
  checkout.quoteCheckout.mockResolvedValue({
    theme: { id: 't1', slug: 'pareja', name: 'Pareja', versionId: 'v1' },
    quote: {
      listPriceCents: 1500000,
      discountCents: 1500000 - totalCents,
      totalCents,
      coupon: coupon ? { ...coupon, kind: 'percent', value: 10, affiliateId: null } : null,
    },
    plan: null,
  })
}

describe('crear preferencia de pago', () => {
  it('cobra el precio del servidor, no lo que mande el navegador', async () => {
    mockQuote(1500000)
    mp.createPreference.mockResolvedValue({
      id: 'pref-1',
      init_point: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-1',
      sandbox_init_point: '',
    })

    const res = await preference(
      preferenceRequest({ ...validBody, amount: 1, unit_price: 1, totalCents: 100 }),
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      initPoint: 'https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=pref-1',
    })

    const input = mp.createPreference.mock.calls[0]![0]
    expect(input.items[0]).toMatchObject({ unit_price: 15000, currency_id: 'ARS', quantity: 1 })
    expect(input.external_reference).toBe(ORDER_ID)
    expect(input.notification_url).toBe('https://ribbly.test/api/webhooks/mercadopago')
    expect(input.back_urls.success).toBe('https://ribbly.test/api/checkout/return')
    expect(input.statement_descriptor).toBe('RIBBLY')
    expect(input.expires).toBe(true)
    expect(input.expiration_date_to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}-03:00$/)

    expect(db.inserted[0]).toMatchObject({
      amount_cents: 1500000,
      currency: 'ARS',
      buyer_email: 'leandro@example.com',
    })
    expect(db.updated[0]).toEqual({ mp_preference_id: 'pref-1' })
  })

  it('guarda el cupón de la cotización en la orden', async () => {
    mockQuote(1350000, { id: 'c-10', code: 'RIBBLY10' })
    mp.createPreference.mockResolvedValue({
      id: 'p',
      init_point: 'https://mp/x',
      sandbox_init_point: '',
    })
    await preference(preferenceRequest({ ...validBody, cupon: 'ribbly10' }))
    expect(db.inserted[0]).toMatchObject({
      coupon_id: 'c-10',
      coupon_code: 'RIBBLY10',
      amount_cents: 1350000,
    })
  })

  it('orden gratis (cupón 100%): se aprueba sin MP y va al editor', async () => {
    mockQuote(0, { id: 'c-100', code: 'GRATIS' })
    const res = await preference(preferenceRequest(validBody))
    expect(await res.json()).toEqual({ initPoint: 'https://ribbly.test/editor/tok-editor' })
    expect(mp.createPreference).not.toHaveBeenCalled()
    expect(payments.applyPaymentNotice).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'free', amountCents: 0, paymentId: `free-${ORDER_ID}` }),
    )
  })

  it('orden gratis con el cupón agotado entre medio: 409 y no hay editor', async () => {
    mockQuote(0, { id: 'c-100', code: 'GRATIS' })
    payments.applyPaymentNotice.mockResolvedValue({
      outcome: 'coupon_exhausted',
      boxieId: null,
      created: false,
      links: null,
    })
    const res = await preference(preferenceRequest(validBody))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toMatch(/límite de usos/)
  })

  it.each([
    ['temática con caracteres raros', { ...validBody, tematica: '../admin' }],
    ['mail inválido', { ...validBody, email: 'no-es-mail' }],
    ['nombre vacío', { ...validBody, nombre: '' }],
    ['cuerpo vacío', null],
  ])('rechaza datos inválidos: %s', async (_name, body) => {
    const res = await preference(preferenceRequest(body))
    expect(res.status).toBe(400)
    expect(db.inserted).toHaveLength(0)
  })

  it('temática inexistente: 404 sin crear orden', async () => {
    checkout.quoteCheckout.mockResolvedValue(null)
    const res = await preference(preferenceRequest(validBody))
    expect(res.status).toBe(404)
    expect(db.inserted).toHaveLength(0)
  })

  it('ventas pausadas desde el panel: 409 sin crear orden', async () => {
    mockQuote(1500000)
    catalog.getPublicSettings.mockResolvedValue({ salesPaused: true })
    const res = await preference(preferenceRequest(validBody))
    expect(res.status).toBe(409)
    expect(db.inserted).toHaveLength(0)
  })

  it('limita los intentos por IP (10 cada 10 minutos)', async () => {
    mockQuote(1500000)
    mp.createPreference.mockResolvedValue({
      id: 'p',
      init_point: 'https://mp/x',
      sandbox_init_point: '',
    })
    const statuses: number[] = []
    for (let i = 0; i < 11; i++) {
      statuses.push((await preference(preferenceRequest(validBody, '203.0.113.9'))).status)
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true)
    expect(statuses[10]).toBe(429)
  })

  it('si MP falla, 500 con mensaje genérico (sin detalles internos)', async () => {
    mockQuote(1500000)
    mp.createPreference.mockRejectedValue(
      new Error('MP API /checkout/preferences → 401: invalid token'),
    )
    const res = await preference(preferenceRequest(validBody))
    expect(res.status).toBe(500)
    expect(JSON.stringify(await res.json())).not.toMatch(/token|401/)
  })
})
