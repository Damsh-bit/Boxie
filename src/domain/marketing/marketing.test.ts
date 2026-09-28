import { describe, expect, it } from 'vitest'
import type { DateRange } from '../admin/range'
import type { AdminOrder, FinanceSettings } from '../admin/types'
import {
  detectDevice,
  mergeTouch,
  normalizeLanding,
  parseAttributionPayload,
  touchFromLanding,
  type Touch,
} from './attribution'
import { eventLift, eventsOfYear, upcomingEvents } from './calendar'
import { classifyChannel } from './channels'
import {
  extraSalesForDiscount,
  ltvCurve,
  longestLtv,
  paybackDays,
  salesMix,
  targetCpa,
  targetRoas,
  unitEconomics,
} from './economics'
import { parseDay, parseNumber, parseSpendCsv } from './import'
import {
  blended,
  buildIndex,
  campaignPerformance,
  channelPerformance,
  ctrTrend,
  derive,
  monthPacing,
  orderCredits,
  verdict,
  type MarketingInput,
} from './performance'
import {
  abTest,
  buildUtmUrl,
  cpaAt,
  optimalSpend,
  sampleSizePerVariant,
  slugify,
  spendForSales,
  salesForSpend,
  utmValue,
} from './tools'
import type { Campaign } from './types'

const NOW = new Date('2026-09-27T15:00:00.000-03:00')
const RANGE: DateRange = {
  from: new Date('2026-09-01T00:00:00.000-03:00'),
  to: new Date('2026-09-28T00:00:00.000-03:00'),
  preset: 'custom',
}
const SETTINGS: FinanceSettings = {
  gatewayFeeBps: 629,
  gatewayVatBps: 2100,
  gatewayFixedCents: 0,
  taxBps: 350,
  variableCostCents: 2_500,
  monthlyGoalCents: 0,
}

let seq = 0
function order(p: Partial<AdminOrder> = {}): AdminOrder {
  seq++
  return {
    id: `o${seq}`,
    status: 'paid',
    themeId: 't1',
    themeVersionId: 'v1',
    planId: 'p1',
    currency: 'ARS',
    listPriceCents: 500_000,
    discountCents: 0,
    amountCents: 500_000,
    couponId: null,
    couponCode: null,
    affiliateId: null,
    buyerName: 'Ana',
    buyerEmail: `ana${seq}@ejemplo.com`,
    buyerPhone: null,
    paymentProvider: 'mercadopago',
    mpPaymentId: null,
    providerStatus: 'approved',
    paidAt: '2026-09-10T15:00:00.000Z',
    refundedAt: null,
    createdAt: '2026-09-10T14:50:00.000Z',
    updatedAt: '2026-09-10T15:00:00.000Z',
    ...p,
  }
}

function campaign(p: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    name: 'Meta · Prospección',
    channel: 'meta',
    objective: 'ventas',
    status: 'active',
    utmCampaign: 'meta-prospeccion',
    startsOn: '2026-08-01',
    endsOn: null,
    dailyBudgetCents: 500_000,
    themeId: null,
    couponId: null,
    audience: '',
    notes: '',
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
    ...p,
  }
}

const touch = (p: Partial<Touch> = {}): Touch => ({
  source: 'ig',
  medium: 'paid_social',
  campaign: 'meta-prospeccion',
  content: '',
  term: '',
  landing: '/',
  at: '2026-09-10T14:40:00.000Z',
  ...p,
})

describe('canales', () => {
  it('clasifica los orígenes como Google Analytics, adaptado a Boxie', () => {
    expect(classifyChannel({ source: 'ig', medium: 'paid_social' })).toBe('meta')
    expect(classifyChannel({ source: 'facebook', medium: 'cpc' })).toBe('meta')
    expect(classifyChannel({ source: 'google', medium: 'cpc' })).toBe('google')
    expect(classifyChannel({ source: 'tiktok', medium: 'paid-social' })).toBe('tiktok')
    expect(classifyChannel({ source: 'instagram', medium: 'influencer' })).toBe('influencers')
    expect(classifyChannel({ source: 'sofi', medium: 'affiliate' })).toBe('afiliados')
    expect(classifyChannel({ source: 'newsletter', medium: 'email' })).toBe('email')
    expect(classifyChannel({ source: 'whatsapp', medium: 'social' })).toBe('whatsapp')
    expect(classifyChannel({ source: 'boxie', medium: 'regalo' })).toBe('regalos')
    expect(classifyChannel({ source: 'instagram', medium: 'bio' })).toBe('social')
    expect(classifyChannel({ source: 'google', medium: 'organic' })).toBe('seo')
    expect(classifyChannel({ source: 'blog.com', medium: 'referral' })).toBe('referral')
    expect(classifyChannel({ source: '(direct)', medium: '(none)' })).toBe('directo')
    expect(classifyChannel({ source: 'raro', medium: 'cpc' })).toBe('otros')
  })
})

describe('atribución', () => {
  const at = (search: string, referrer = '', path = '/') =>
    touchFromLanding({
      params: new URLSearchParams(search),
      referrer,
      path,
      siteHost: 'boxie.com.ar',
      now: NOW,
    })

  it('las UTM mandan y se normalizan', () => {
    const t = at(
      '?utm_source=IG&utm_medium=Paid_Social&utm_campaign=Madre%202026',
      '',
      '/tematicas/pareja?x=1',
    )
    expect(t).toMatchObject({
      source: 'ig',
      medium: 'paid_social',
      campaign: 'madre 2026',
      landing: '/tematicas/pareja',
    })
  })

  it('sin UTM: identificadores de clic de anuncios, sitio de origen o directo', () => {
    expect(at('?gclid=abc')).toMatchObject({ source: 'google', medium: 'cpc' })
    expect(at('?ttclid=abc')).toMatchObject({ source: 'tiktok', medium: 'paid_social' })
    // fbclid no alcanza para decir que fue un anuncio.
    expect(at('?fbclid=abc', 'https://l.instagram.com/')).toMatchObject({
      source: 'instagram',
      medium: 'social',
    })
    expect(at('', 'https://www.google.com.ar/')).toMatchObject({
      source: 'google',
      medium: 'organic',
    })
    expect(at('', 'https://wa.me/')).toMatchObject({ source: 'whatsapp' })
    expect(at('')).toMatchObject({ source: '(direct)', medium: '(none)' })
    expect(at('?ref=sofi')).toMatchObject({ source: 'sofi', medium: 'affiliate' })
  })

  it('la navegación dentro del sitio no es un origen nuevo', () => {
    expect(at('', 'https://boxie.com.ar/precios')).toBeNull()
    expect(at('', 'https://www.boxie.com.ar/')).toBeNull()
  })

  it('último clic no directo: un directo no pisa a un origen reciente', () => {
    const first = touch({ at: '2026-09-20T12:00:00.000Z' })
    const stored = mergeTouch(null, first, NOW)
    const direct = touch({
      source: '(direct)',
      medium: '(none)',
      campaign: '',
      at: NOW.toISOString(),
    })
    expect(mergeTouch(stored, direct, NOW)).toBe(stored)
    const google = touch({ source: 'google', medium: 'cpc', campaign: '', at: NOW.toISOString() })
    expect(mergeTouch(stored, google, NOW)).toEqual({ first, last: google })
    // Pasados 90 días, el primer toque se renueva.
    const old = { first: touch({ at: '2026-05-01T12:00:00.000Z' }), last: first }
    expect(mergeTouch(old, google, NOW).first).toEqual(google)
  })

  it('valida lo que manda el navegador', () => {
    const ok = parseAttributionPayload({ first: touch(), last: touch(), device: 'mobile' }, NOW)
    expect(ok?.last?.source).toBe('ig')
    expect(parseAttributionPayload({ first: null, last: null, device: null }, NOW)).toBeNull()
    expect(
      parseAttributionPayload(
        { first: touch({ at: '2030-01-01T00:00:00.000Z' }), last: null, device: null },
        NOW,
      ),
    ).toBeNull()
    expect(parseAttributionPayload('cualquier cosa', NOW)).toBeNull()
    expect(normalizeLanding('/Tematicas/Pareja/extra/mas?utm=1')).toBe('/tematicas/pareja')
    expect(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 390)).toBe('mobile')
    expect(detectDevice('Mozilla/5.0 (Windows NT 10.0)', 1440)).toBe('desktop')
  })
})

describe('performance', () => {
  const orders = [
    order({ id: 'a' }),
    order({ id: 'b', couponId: 'cup-madre', couponCode: 'MAMA15' }),
    order({ id: 'c' }),
    order({ id: 'd', status: 'pending', paidAt: null }),
  ]
  const input: MarketingInput = {
    orders,
    affiliates: [],
    expenses: [],
    settings: SETTINGS,
    campaigns: [
      campaign(),
      campaign({ id: 'c2', name: 'Madre', utmCampaign: 'madre', couponId: 'cup-madre' }),
    ],
    spend: [
      {
        id: 's1',
        campaignId: 'c1',
        day: '2026-09-10',
        spendCents: 300_000,
        impressions: 100_000,
        clicks: 1_000,
        platformConversions: 3,
      },
      {
        id: 's2',
        campaignId: 'c2',
        day: '2026-09-10',
        spendCents: 100_000,
        impressions: 20_000,
        clicks: 300,
        platformConversions: 1,
      },
    ],
    traffic: [
      {
        day: '2026-09-10',
        source: 'ig',
        medium: 'paid_social',
        campaign: 'meta-prospeccion',
        device: 'mobile',
        landing: '/',
        sessions: 800,
        themeViews: 500,
        checkouts: 40,
      },
      {
        day: '2026-09-10',
        source: '(direct)',
        medium: '(none)',
        campaign: '',
        device: 'mobile',
        landing: '/',
        sessions: 200,
        themeViews: 100,
        checkouts: 10,
      },
    ],
    attributions: [
      {
        orderId: 'a',
        first: touch({ source: 'google', medium: 'organic', campaign: '' }),
        last: touch(),
        device: 'mobile',
        createdAt: '',
      },
      { orderId: 'b', first: touch(), last: touch(), device: 'mobile', createdAt: '' },
      { orderId: 'd', first: touch(), last: touch(), device: 'mobile', createdAt: '' },
    ],
  }
  const idx = buildIndex(input)

  it('un cupón de campaña manda sobre el último clic', () => {
    expect(orderCredits(orders[1]!, idx).last).toEqual({ channel: 'meta', campaignId: 'c2' })
    expect(orderCredits(orders[0]!, idx).first.channel).toBe('seo')
    expect(orderCredits(orders[2]!, idx).last.channel).toBe('sin-datos')
  })

  it('suma por canal con cada modelo', () => {
    const last = channelPerformance(input, RANGE, 'last', idx)
    const meta = last.rows.find((r) => r.channel === 'meta')!
    expect(meta.sales).toBe(2)
    expect(meta.spendCents).toBe(400_000)
    expect(meta.cpaCents).toBe(200_000)
    expect(meta.roas).toBe(2.5)
    expect(meta.sessions).toBe(800)
    expect(meta.paymentStarts).toBe(3)
    const first = channelPerformance(input, RANGE, 'first', idx)
    expect(first.rows.find((r) => r.channel === 'seo')?.sales).toBe(1)
    const linear = channelPerformance(input, RANGE, 'linear', idx)
    expect(linear.rows.find((r) => r.channel === 'seo')?.sales).toBe(0.5)
    expect(linear.total.sales).toBe(3)
  })

  it('sin inversión no hay CPA (no es $ 0)', () => {
    const d = derive({
      sessions: 10,
      themeViews: 0,
      checkoutViews: 0,
      paymentStarts: 0,
      sales: 2,
      newCustomers: 2,
      revenueCents: 1,
      contributionCents: 1,
      spendCents: 0,
      impressions: 0,
      clicks: 0,
      platformConversions: 0,
    })
    expect(d.cpaCents).toBeNull()
    expect(d.roas).toBeNull()
  })

  it('combinado: MER, CAC y cobertura', () => {
    const b = blended(input, RANGE, 'last', idx)
    expect(b.adSpendCents).toBe(400_000)
    expect(b.sales).toBe(3)
    expect(b.mer).toBeCloseTo(1_500_000 / 400_000)
    expect(b.coverage).toBeCloseTo(2 / 3)
    expect(b.paidSales).toBe(2)
  })

  it('campañas: veredicto contra el objetivo', () => {
    const rows = campaignPerformance(input, RANGE, 'last', NOW, idx)
    const c1 = rows.find((r) => r.campaign.id === 'c1')!
    expect(c1.sales).toBe(1)
    expect(c1.ctr).toBeCloseTo(0.01)
    expect(verdict(c1, { maxCpaCents: 440_000, targetPoas: 1.5 })).toBe('aprendiendo')
    expect(
      verdict(
        { ...c1, sales: 10, spendCents: 1_000_000, poas: 0.5 },
        { maxCpaCents: 440_000, targetPoas: 1.5 },
      ),
    ).toBe('pausar')
    expect(
      verdict(
        { ...c1, sales: 10, spendCents: 1_000_000, poas: 3 },
        { maxCpaCents: 440_000, targetPoas: 1.5 },
      ),
    ).toBe('escalar')
  })

  it('fatiga: el CTR de la última semana contra las tres anteriores', () => {
    const spend = Array.from({ length: 28 }, (_, i) => {
      const day = new Date(NOW.getTime() - i * 86_400_000 - 3 * 3_600_000)
        .toISOString()
        .slice(0, 10)
      return {
        id: `f${i}`,
        campaignId: 'c1',
        day,
        spendCents: 1,
        impressions: 1_000,
        clicks: i < 7 ? 5 : 10,
        platformConversions: 0,
      }
    })
    expect(ctrTrend(spend, 'c1', NOW)).toBeCloseTo(-0.5)
  })

  it('ritmo del mes', () => {
    const p = monthPacing(
      [
        {
          id: 'x',
          campaignId: 'c1',
          day: '2026-09-05',
          spendCents: 900_000,
          impressions: 0,
          clicks: 0,
          platformConversions: 0,
        },
      ],
      3_000_000,
      NOW,
    )
    expect(p.spentCents).toBe(900_000)
    expect(p.daysInMonth).toBe(30)
    expect(p.projectedCents).toBeGreaterThan(900_000)
  })
})

describe('economía de una venta', () => {
  it('de precio de lista a resultado', () => {
    const u = unitEconomics({
      listPriceCents: 500_000,
      discountRate: 0.1,
      affiliateCents: 5_000,
      settings: SETTINGS,
      acquisitionCents: 150_000,
      fixedPerSaleCents: 50_000,
    })
    expect(u.chargedCents).toBe(450_000)
    const gateway = u.lines.find((l) => l.key === 'gateway')!.cents
    // 6,29 % + 21 % de IVA sobre la comisión.
    expect(gateway).toBe(-(28_305 + 5_944))
    expect(u.contributionCents).toBe(450_000 - 34_249 - 15_750 - 2_500 - 5_000)
    expect(u.profitCents).toBe(u.contributionCents - 150_000)
    expect(u.netCents).toBe(u.profitCents - 50_000)
    expect(u.maxCpaCents).toBe(u.contributionCents)
    expect(u.breakEvenRoas).toBeCloseTo(450_000 / u.contributionCents)
    const cpa = targetCpa(u, 3000)
    expect(cpa).toBe(u.contributionCents - 135_000)
    expect(targetRoas(u, 3000)).toBeCloseTo(450_000 / cpa)
  })

  it('mezcla de lo vendido, LTV y recuperación', () => {
    const orders = [
      order({
        buyerEmail: 'x@e.com',
        paidAt: '2026-01-10T12:00:00.000Z',
        listPriceCents: 500_000,
        discountCents: 50_000,
        amountCents: 450_000,
      }),
      order({ buyerEmail: 'x@e.com', paidAt: '2026-03-10T12:00:00.000Z' }),
      order({ buyerEmail: 'y@e.com', paidAt: '2026-01-15T12:00:00.000Z' }),
    ]
    const mix = salesMix(orders, [], {
      from: new Date('2026-01-01'),
      to: new Date('2026-12-31'),
      preset: 'custom',
    })
    expect(mix.all.sales).toBe(3)
    expect(mix.all.discountRate).toBeCloseTo(50_000 / 1_500_000)
    const curve = ltvCurve(orders, (o) => o.amountCents, NOW, [0, 90, 365])
    expect(curve[0]!.revenueCents).toBe(475_000)
    expect(curve[1]!.revenueCents).toBe(725_000)
    expect(curve[1]!.repeatRate).toBe(0.5)
    expect(curve[2]!.customers).toBe(0)
    expect(longestLtv(curve, 2)?.days).toBe(90)
    expect(paybackDays(curve, 400_000)).toBe(0)
    expect(paybackDays(curve, 600_000)).toBe(90)
    expect(paybackDays(curve, 900_000)).toBeNull()
    expect(extraSalesForDiscount(0.8, 0.2)).toBeCloseTo(1 / 3)
    expect(extraSalesForDiscount(0.2, 0.3)).toBeNull()
  })
})

describe('importar resultados', () => {
  it('lee la exportación de Meta en castellano', () => {
    const csv = `Día,Nombre de la campaña,Importe gastado (ARS),Impresiones,Clics en el enlace,Compras
2026-09-20,"Meta · Madre, video","3.850,40",142310,1580,21
Total,,,,,
2026-09-21,Meta · Madre,4012.1,150220,1602,19`
    const r = parseSpendCsv(csv)
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0]).toMatchObject({
      day: '2026-09-20',
      campaignName: 'Meta · Madre, video',
      spendCents: 385_040,
      impressions: 142_310,
      clicks: 1_580,
      platformConversions: 21,
    })
    expect(r.rows[1]!.spendCents).toBe(401_210)
    expect(r.errors).toHaveLength(1)
  })

  it('lee Google Ads con punto y coma y fechas dd/mm/aaaa', () => {
    const r = parseSpendCsv(
      'Campaña;Día;Costo;Impr.;Clics;Conversiones\nBúsqueda;20/09/2026;1.234,50;900;60;3',
    )
    expect(r.rows[0]).toMatchObject({ day: '2026-09-20', spendCents: 123_450, clicks: 60 })
  })

  it('sin día o sin gasto no importa nada', () => {
    expect(parseSpendCsv('Campaña,Clics\nA,3').errors[0]?.message).toMatch(/día y del gasto/)
  })

  it('números y fechas', () => {
    expect(parseNumber('1.234,56')).toBe(1234.56)
    expect(parseNumber('1,234.56')).toBe(1234.56)
    expect(parseNumber('$ 12.500')).toBe(12500)
    expect(parseNumber('1,5')).toBe(1.5)
    expect(parseNumber('')).toBeNull()
    expect(parseDay('2026-02-30')).toBeNull()
    expect(parseDay('5/9/26')).toBe('2026-09-05')
  })
})

describe('calendario', () => {
  it('fechas móviles argentinas', () => {
    const y2026 = eventsOfYear(2026)
    expect(y2026.find((e) => e.id === 'madre')?.date).toBe('2026-10-18')
    expect(y2026.find((e) => e.id === 'padre')?.date).toBe('2026-06-21')
    expect(eventsOfYear(2025).find((e) => e.id === 'madre')?.date).toBe('2025-10-19')
  })

  it('próximas fechas con su ventana y el alza del año pasado', () => {
    const next = upcomingEvents(NOW, 60)
    expect(next[0]).toMatchObject({ id: 'madre', daysUntil: 21, rampStart: '2026-09-27' })
    const orders = [
      ...Array.from({ length: 28 }, (_, i) =>
        order({
          paidAt: new Date(Date.parse('2025-08-31T15:00:00Z') + i * 86_400_000).toISOString(),
        }),
      ),
      ...Array.from({ length: 44 }, (_, i) =>
        order({
          paidAt: new Date(
            Date.parse('2025-09-28T15:00:00Z') + (i % 22) * 86_400_000,
          ).toISOString(),
        }),
      ),
    ]
    const lift = eventLift(
      orders,
      eventsOfYear(2025).find((e) => e.id === 'madre')!,
    )
    expect(lift.baselinePerDay).toBeCloseTo(1)
    expect(lift.lift).toBeCloseTo(2)
  })
})

describe('herramientas', () => {
  it('links con UTM', () => {
    expect(slugify('Día de la Madre 2026 · Video')).toBe('dia-de-la-madre-2026-video')
    expect(utmValue('Paid Social')).toBe('paid-social')
    expect(utmValue('paid_social')).toBe('paid_social')
    expect(
      buildUtmUrl('https://boxie.com.ar/tematicas/pareja?cupon=MAMA15', {
        source: 'Meta',
        medium: 'paid_social',
        campaign: 'Madre 2026',
      }),
    ).toBe(
      'https://boxie.com.ar/tematicas/pareja?cupon=MAMA15&utm_source=meta&utm_medium=paid_social&utm_campaign=madre-2026',
    )
    expect(
      buildUtmUrl('javascript:alert(1)', { source: 'a', medium: 'b', campaign: 'c' }),
    ).toBeNull()
  })

  it('prueba A/B y tamaño de muestra', () => {
    const r = abTest({ visitors: 4200, conversions: 84 }, { visitors: 4150, conversions: 108 })!
    expect(r.rateA).toBeCloseTo(0.02)
    expect(r.pValue).toBeGreaterThan(0.05)
    const big = abTest(
      { visitors: 10_000, conversions: 200 },
      { visitors: 10_000, conversions: 280 },
    )!
    expect(big.significant).toBe(true)
    expect(big.winner).toBe('B')
    const n = sampleSizePerVariant(0.02, 0.2)!
    expect(n).toBeGreaterThan(20_000)
    expect(n).toBeLessThan(22_000)
  })

  it('rendimientos decrecientes', () => {
    const base = { spendCents: 1_000_000, cpaCents: 150_000 }
    expect(cpaAt(2_000_000, base)).toBeGreaterThan(150_000)
    expect(cpaAt(1_000_000, base)).toBe(150_000)
    const needed = spendForSales(20, base)!
    expect(salesForSpend(needed, base)).toBeCloseTo(20, 1)
    const best = optimalSpend({ base, contributionPerSaleCents: 440_000 })
    expect(best).toBeGreaterThan(base.spendCents)
  })
})
