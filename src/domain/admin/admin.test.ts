import { describe, expect, it } from 'vitest'
import {
  breakEven,
  expenseInRange,
  monthlyFixedCents,
  monthProjection,
  profitAndLoss,
  profitabilityBy,
  saleCosts,
} from './finance'
import { alerts, customers, customerSummary, funnel, kpis, mixBy, salesSeries } from './metrics'
import {
  arDayKey,
  bucketFor,
  bucketKey,
  bucketKeys,
  parseRange,
  previousRange,
  rangeDays,
  rangeFromPreset,
} from './range'
import type { AdminBoxie, AdminOrder, Expense, FinanceSettings } from './types'

const NOW = new Date('2026-09-24T15:00:00.000-03:00')

const settings: FinanceSettings = {
  gatewayFeeBps: 629,
  gatewayVatBps: 2100,
  gatewayFixedCents: 0,
  taxBps: 350,
  variableCostCents: 3_000,
  monthlyGoalCents: 100_000_00,
}

let seq = 0
function order(p: Partial<AdminOrder> = {}): AdminOrder {
  seq++
  const created = p.createdAt ?? '2026-09-20T12:00:00.000Z'
  return {
    id: `o${seq}`,
    status: 'paid',
    themeId: 'pareja',
    themeVersionId: 'v1',
    planId: 'clasica',
    currency: 'ARS',
    listPriceCents: 499_000,
    discountCents: 0,
    amountCents: 499_000,
    couponId: null,
    couponCode: null,
    affiliateId: null,
    buyerName: 'Ana Pérez',
    buyerEmail: `ana${seq}@ejemplo.com`,
    buyerPhone: null,
    paymentProvider: 'mercadopago',
    mpPaymentId: `mp${seq}`,
    providerStatus: 'approved',
    paidAt: p.status === 'pending' || p.status === 'cancelled' ? null : created,
    refundedAt: null,
    createdAt: created,
    updatedAt: created,
    ...p,
  }
}

function boxie(p: Partial<AdminBoxie> = {}): AdminBoxie {
  seq++
  return {
    id: `b${seq}`,
    code: 'K7M2Q9XD',
    orderId: 'o1',
    themeVersionId: 'v1',
    status: 'active',
    recipientName: 'Sofi',
    senderName: 'Ana',
    lockedAt: null,
    expiresAt: '2026-11-20T00:00:00.000Z',
    accessEmailSentAt: null,
    giftEmailSentAt: null,
    firstOpenedAt: null,
    openCount: 0,
    lastEditedAt: null,
    modulesDone: 0,
    modulesTotal: 6,
    photos: 0,
    createdAt: '2026-09-20T12:00:00.000Z',
    updatedAt: '2026-09-20T12:00:00.000Z',
    ...p,
  }
}

describe('rangos', () => {
  it('corta los días en hora argentina', () => {
    // 01:00 UTC del 25 son las 22:00 del 24 en Argentina.
    expect(arDayKey('2026-09-25T01:00:00.000Z')).toBe('2026-09-24')
    expect(arDayKey('2026-09-25T03:00:00.000Z')).toBe('2026-09-25')
  })

  it('los últimos 7 días terminan mañana a la medianoche e incluyen hoy', () => {
    const r = rangeFromPreset('7d', NOW)
    expect(rangeDays(r)).toBe(7)
    expect(arDayKey(r.from)).toBe('2026-09-18')
    expect(r.to.toISOString()).toBe('2026-09-25T03:00:00.000Z')
  })

  it('el mes en curso arranca el 1 a la medianoche argentina', () => {
    expect(rangeFromPreset('mtd', NOW).from.toISOString()).toBe('2026-09-01T03:00:00.000Z')
  })

  it('el período anterior tiene el mismo largo y termina donde empieza el actual', () => {
    const r = rangeFromPreset('30d', NOW)
    const p = previousRange(r)
    expect(p.to).toEqual(r.from)
    expect(rangeDays(p)).toBe(30)
  })

  it('un período de la URL inválido vuelve al default', () => {
    expect(parseRange({ periodo: 'hackeo' }, NOW).preset).toBe('30d')
    expect(parseRange({ desde: '2026-09-10', hasta: '2026-09-01' }, NOW).preset).toBe('30d')
    const custom = parseRange({ desde: '2026-09-01', hasta: '2026-09-10' }, NOW)
    expect(custom.preset).toBe('custom')
    expect(rangeDays(custom)).toBe(10)
  })

  it('agrupa por día, semana o mes según el largo', () => {
    expect(bucketFor(rangeFromPreset('30d', NOW))).toBe('day')
    expect(bucketFor(rangeFromPreset('90d', NOW))).toBe('week')
    expect(bucketFor(rangeFromPreset('12m', NOW))).toBe('month')
    expect(bucketKeys(rangeFromPreset('12m', NOW), 'month')).toHaveLength(12)
    // La semana arranca el lunes: el jueves 24/9 cae en la del lunes 21.
    expect(bucketKey(NOW, 'week')).toBe('2026-09-21')
  })
})

describe('finanzas', () => {
  it('descuenta comisión con IVA, impuestos y costo variable de cada venta', () => {
    const c = saleCosts(499_000, settings)
    // 6,29% de 4.990 = 313,87 → +21% IVA = 379,78
    expect(c.gatewayCents).toBe(31_387 + 6_591)
    expect(c.taxCents).toBe(17_465)
    expect(c.variableCents).toBe(3_000)
    expect(c.contributionCents).toBe(499_000 - 37_978 - 17_465 - 3_000)
  })

  it('una Boxie gratis igual cuesta entregarla', () => {
    expect(saleCosts(0, settings).contributionCents).toBe(-3_000)
  })

  it('prorratea un gasto mensual por los días del período', () => {
    const expense: Expense = {
      id: 'e1',
      category: 'infraestructura',
      description: 'Hosting',
      vendor: 'Vercel',
      amountCents: 30_000_00,
      recurrence: 'monthly',
      startsOn: '2026-01-01',
      endsOn: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    }
    const september = parseRange({ desde: '2026-09-01', hasta: '2026-09-30' }, NOW)
    expect(expenseInRange(expense, september)).toBe(30_000_00)
    const half = parseRange({ desde: '2026-09-01', hasta: '2026-09-15' }, NOW)
    expect(expenseInRange(expense, half)).toBe(15_000_00)
    // Un gasto único cuenta entero solo si su fecha cae en el período.
    const once: Expense = { ...expense, recurrence: 'once', startsOn: '2026-09-10' }
    expect(expenseInRange(once, half)).toBe(30_000_00)
    expect(
      expenseInRange(once, parseRange({ desde: '2026-08-01', hasta: '2026-08-31' }, NOW)),
    ).toBe(0)
    expect(monthlyFixedCents([expense, once], NOW)).toBe(30_000_00)
  })

  it('el reembolso resta en el período en que se devolvió, no en el de la venta', () => {
    const sale = order({
      status: 'refunded',
      paidAt: '2026-08-20T12:00:00.000Z',
      refundedAt: '2026-09-05T12:00:00.000Z',
      createdAt: '2026-08-20T11:00:00.000Z',
    })
    const august = parseRange({ desde: '2026-08-01', hasta: '2026-08-31' }, NOW)
    const september = parseRange({ desde: '2026-09-01', hasta: '2026-09-30' }, NOW)
    expect(profitAndLoss([sale], [], settings, august).revenueCents).toBe(499_000)
    const pnl = profitAndLoss([sale], [], settings, september)
    expect(pnl.revenueCents).toBe(0)
    expect(pnl.refundsCents).toBe(499_000)
    expect(pnl.refunds).toBe(1)
  })

  it('el resultado es la contribución menos los fijos, y el equilibrio se redondea para arriba', () => {
    const range = parseRange({ desde: '2026-09-01', hasta: '2026-09-30' }, NOW)
    const orders = [order(), order(), order({ discountCents: 99_800, amountCents: 399_200 })]
    const expenses: Expense[] = [
      {
        id: 'e1',
        category: 'marketing',
        description: 'Meta Ads',
        vendor: 'Meta',
        amountCents: 2_000_000,
        recurrence: 'monthly',
        startsOn: '2026-01-01',
        endsOn: null,
        createdAt: '',
      },
    ]
    const pnl = profitAndLoss(orders, expenses, settings, range)
    expect(pnl.sales).toBe(3)
    expect(pnl.discountCents).toBe(99_800)
    expect(pnl.grossCents - pnl.discountCents).toBe(pnl.revenueCents)
    expect(pnl.netCents).toBe(pnl.contributionCents - 2_000_000)
    const be = breakEven(pnl, 2_000_000)
    expect(be.salesPerMonth).toBe(Math.ceil(2_000_000 / be.avgContributionCents))
  })

  it('agrupa la rentabilidad por la clave pedida, de mayor a menor contribución', () => {
    const range = rangeFromPreset('30d', NOW)
    const rows = profitabilityBy(
      [order({ themeId: 'a' }), order({ themeId: 'b' }), order({ themeId: 'b' })],
      settings,
      range,
      (o) => o.themeId,
    )
    expect(rows.map((r) => r.key)).toEqual(['b', 'a'])
    expect(rows[0]!.sales).toBe(2)
  })

  it('proyecta el mes al ritmo actual', () => {
    const p = monthProjection([order({ paidAt: '2026-09-02T12:00:00.000Z' })], 1_000_000, NOW)
    expect(p.soFarCents).toBe(499_000)
    expect(p.projectedCents).toBeGreaterThan(p.soFarCents)
    expect(p.daysInMonth).toBe(30)
  })
})

describe('métricas', () => {
  const range = rangeFromPreset('30d', NOW)

  it('cuenta ventas por fecha de pago y conversión por cohorte de checkout', () => {
    const orders = [
      order(),
      order({ status: 'pending' }),
      order({ status: 'cancelled' }),
      order({ couponId: 'c1', couponCode: 'BOXIE10', discountCents: 49_900, amountCents: 449_100 }),
    ]
    const k = kpis(orders, [], range)
    expect(k.sales).toBe(2)
    expect(k.checkouts).toBe(4)
    expect(k.conversion).toBe(0.5)
    expect(k.revenueCents).toBe(499_000 + 449_100)
    expect(k.avgTicketCents).toBe(Math.round((499_000 + 449_100) / 2))
    expect(k.discountCents).toBe(49_900)
  })

  it('distingue clientes nuevos de los que ya habían comprado', () => {
    const old = order({ buyerEmail: 'vuelve@ejemplo.com', createdAt: '2026-05-01T12:00:00.000Z' })
    const again = order({ buyerEmail: 'VUELVE@ejemplo.com' })
    const k = kpis([old, again, order()], [], range)
    expect(k.customers).toBe(2)
    expect(k.newCustomers).toBe(1)
  })

  it('arma la serie con todos los días del período, aunque no haya ventas', () => {
    const series = salesSeries([order()], range, 'day')
    expect(series).toHaveLength(30)
    expect(series.reduce((s, p) => s + p.sales, 0)).toBe(1)
  })

  it('la mezcla por temática suma 100%', () => {
    const mix = mixBy(
      [order({ themeId: 'a' }), order({ themeId: 'b' }), order({ themeId: 'b' })],
      range,
      (o) => o.themeId,
    )
    expect(mix[0]!.key).toBe('b')
    expect(mix.reduce((s, r) => s + r.share, 0)).toBeCloseTo(1)
  })

  it('el embudo sigue a la cohorte: pagó → editó → bloqueó → se abrió', () => {
    const paid = order({ id: 'paid-1' })
    const orders = [paid, order({ status: 'pending' })]
    const boxies = [
      boxie({
        orderId: 'paid-1',
        lastEditedAt: '2026-09-21T12:00:00.000Z',
        lockedAt: '2026-09-22T12:00:00.000Z',
      }),
    ]
    const steps = funnel(orders, boxies, range)
    expect(steps.map((s) => s.count)).toEqual([2, 1, 1, 1, 0])
    expect(steps[1]!.ofPrevious).toBe(0.5)
  })

  it('agrupa clientes por email sin importar mayúsculas y suma lo gastado', () => {
    const rows = customers([
      order({ buyerEmail: 'Ana@ejemplo.com' }),
      order({ buyerEmail: 'ana@ejemplo.com', createdAt: '2026-09-21T12:00:00.000Z' }),
      order({ buyerEmail: 'otro@ejemplo.com', status: 'pending' }),
    ])
    expect(rows).toHaveLength(2)
    expect(rows[0]!.sales).toBe(2)
    expect(rows[0]!.spentCents).toBe(998_000)
    const summary = customerSummary(rows)
    expect(summary.repeatBuyers).toBe(1)
    expect(summary.abandoned).toBe(1)
  })

  it('avisa de pagos con monto distinto y de Boxies que vencen sin regalarse', () => {
    const list = alerts({
      orders: [order({ providerStatus: 'amount_mismatch', status: 'pending' })],
      boxies: [boxie({ expiresAt: '2026-09-27T12:00:00.000Z' })],
      coupons: [],
      draftThemes: 0,
      now: NOW,
    })
    expect(list.map((a) => a.id)).toEqual(['amount-mismatch', 'closing-editors'])
  })
})
