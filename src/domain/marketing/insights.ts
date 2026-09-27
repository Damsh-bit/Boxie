import type { Expense } from '../admin/types'
import type { Cents } from '../money'
import type { UpcomingEvent } from './calendar'
import { channelLabel } from './channels'
import type { Blended, CampaignRow, ChannelRow, Pacing, SiteFunnel, Verdict } from './performance'

/**
 * Lo que un analista de performance le diría al equipo al mirar el tablero:
 * reglas simples y explicables sobre los números del período. Cada una dice
 * qué pasa, por qué importa y dónde se arregla.
 */

export type InsightTone = 'critical' | 'warning' | 'good' | 'info'

export interface Insight {
  id: string
  tone: InsightTone
  title: string
  detail: string
  href?: string
}

const money = (cents: Cents) =>
  `$ ${Math.round(cents / 100).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`
const pct = (r: number) => `${Math.round(r * 100)} %`
const x = (r: number) => `${r.toLocaleString('es-AR', { maximumFractionDigits: 1 })}×`

/** Gastos de "marketing" que parecen pauta (se cargarían dos veces si además hay campañas). */
const AD_VENDOR = /meta|facebook|instagram|google ads|adwords|tiktok|pauta|anuncio/i

export function likelyDuplicatedAdSpend(
  expenses: readonly Expense[],
  adSpendCents: Cents,
): Expense[] {
  if (adSpendCents <= 0) return []
  return expenses.filter(
    (e) =>
      e.category === 'marketing' && (AD_VENDOR.test(e.vendor) || AD_VENDOR.test(e.description)),
  )
}

export function marketingInsights(input: {
  blended: Blended
  channels: ChannelRow[]
  campaigns: (CampaignRow & { verdict: Verdict })[]
  maxCpaCents: Cents
  targetCpaCents: Cents
  pacing: Pacing
  funnel: SiteFunnel
  upcoming: UpcomingEvent[]
  duplicated: Expense[]
  available: boolean
}): Insight[] {
  const out: Insight[] = []
  const b = input.blended

  if (!input.available)
    out.push({
      id: 'no-schema',
      tone: 'warning',
      title: 'La base todavía no tiene la parte de marketing',
      detail:
        'Se ven las métricas que salen de las ventas (CAC combinado, economía por venta, LTV). Para medir canales, campañas y visitas falta aplicar la migración de marketing.',
      href: '/admin/sistema',
    })

  if (input.duplicated.length)
    out.push({
      id: 'double-count',
      tone: 'critical',
      title: 'La pauta puede estar cargada dos veces',
      detail: `Hay gastos de marketing que parecen pauta (${input.duplicated
        .slice(0, 3)
        .map((e) => e.vendor || e.description)
        .join(
          ', ',
        )}) y además inversión cargada en campañas. La inversión de las campañas ya entra en Finanzas: si es la misma plata, poné fecha de fin a esos gastos.`,
      href: '/admin/finanzas',
    })

  if (b.sales >= 10 && b.coverage < 0.6)
    out.push({
      id: 'coverage',
      tone: 'warning',
      title: `Solo ${pct(b.coverage)} de las ventas tiene su origen`,
      detail:
        'Las ventas sin datos no se pueden repartir entre canales: el CPA de cada canal se ve peor de lo que es. Usá links con UTM en todos los anuncios, la bio y las difusiones.',
      href: '/admin/marketing/herramientas',
    })

  const direct = input.channels.find((c) => c.channel === 'directo')
  if (direct && b.sales >= 10 && direct.sales / b.sales > 0.35)
    out.push({
      id: 'direct',
      tone: 'info',
      title: `${pct(direct.sales / b.sales)} de las ventas llega como "Directo"`,
      detail:
        'Suele ser WhatsApp o links copiados sin etiqueta. Si compartís el link en difusiones o estados, generalo con UTM de WhatsApp.',
      href: '/admin/marketing/herramientas',
    })

  if (b.adSpendCents > 0 && b.paidCpaCents !== null && input.maxCpaCents > 0) {
    if (b.paidCpaCents > input.maxCpaCents)
      out.push({
        id: 'cpa-over',
        tone: 'critical',
        title: `Cada venta paga cuesta más de lo que deja`,
        detail: `El costo por venta de la pauta es ${money(b.paidCpaCents)} y cada venta deja ${money(input.maxCpaCents)} antes de publicidad. Se pierde plata en cada venta que trae la pauta.`,
        href: '/admin/marketing/campanas',
      })
    else if (b.paidCpaCents > input.targetCpaCents)
      out.push({
        id: 'cpa-target',
        tone: 'warning',
        title: 'La pauta gana, pero menos que el objetivo',
        detail: `Costo por venta ${money(b.paidCpaCents)}: el objetivo es ${money(input.targetCpaCents)} o menos para dejar el margen buscado.`,
        href: '/admin/marketing/rentabilidad',
      })
    else
      out.push({
        id: 'cpa-good',
        tone: 'good',
        title: `La pauta cumple: ${money(b.paidCpaCents)} por venta`,
        detail: `Está por debajo del objetivo (${money(input.targetCpaCents)}). Hay margen para invertir más en lo que mejor funciona.`,
        href: '/admin/marketing/planificador',
      })
  }

  for (const c of input.campaigns) {
    if (c.verdict === 'pausar')
      out.push({
        id: `pause-${c.campaign.id}`,
        tone: 'critical',
        title: `"${c.campaign.name}" pierde plata`,
        detail: `Invirtió ${money(c.spendCents)} y la contribución de sus ventas fue ${money(c.contributionCents)} (${c.poas === null ? '—' : x(c.poas)} por peso).`,
        href: `/admin/marketing/campanas/${c.campaign.id}`,
      })
    else if (c.verdict === 'escalar')
      out.push({
        id: `scale-${c.campaign.id}`,
        tone: 'good',
        title: `"${c.campaign.name}" se puede escalar`,
        detail: `ROAS ${c.roas === null ? '—' : x(c.roas)} con ${Math.round(c.sales)} ventas. Subile el presupuesto de a 20 % y mirá que el CPA no se dispare.`,
        href: `/admin/marketing/campanas/${c.campaign.id}`,
      })
    if (c.ctrTrend !== null && c.ctrTrend < -0.25 && c.state === 'active')
      out.push({
        id: `fatigue-${c.campaign.id}`,
        tone: 'warning',
        title: `Los anuncios de "${c.campaign.name}" se están gastando`,
        detail: `El CTR de la última semana cayó ${pct(-c.ctrTrend)} contra las tres anteriores. Es hora de creatividades nuevas.`,
        href: `/admin/marketing/campanas/${c.campaign.id}`,
      })
  }

  const p = input.pacing
  if (p.budgetCents > 0 && p.dayOfMonth >= 5) {
    const over = p.projectedCents / p.budgetCents
    if (over > 1.1)
      out.push({
        id: 'pacing-over',
        tone: 'warning',
        title: `A este ritmo, el mes cierra ${pct(over - 1)} arriba del presupuesto`,
        detail: `Llevás ${money(p.spentCents)} de ${money(p.budgetCents)}; la proyección es ${money(p.projectedCents)}.`,
      })
    else if (over < 0.8)
      out.push({
        id: 'pacing-under',
        tone: 'info',
        title: `Se está invirtiendo menos de lo planeado`,
        detail: `La proyección del mes es ${money(p.projectedCents)} de ${money(p.budgetCents)}. Si las campañas rinden, hay presupuesto sin usar.`,
      })
  }

  const f = input.funnel
  if (f.sessions >= 300) {
    const toCheckout = f.checkoutViews / f.sessions
    const checkoutToPay = f.checkoutViews > 0 ? f.paymentStarts / f.checkoutViews : 0
    const payToSale = f.paymentStarts > 0 ? f.sales / f.paymentStarts : 0
    if (checkoutToPay < 0.35 && f.checkoutViews >= 50)
      out.push({
        id: 'checkout-drop',
        tone: 'warning',
        title: `Solo ${pct(checkoutToPay)} de los que ven el checkout empiezan a pagar`,
        detail:
          'Es el paso con más pérdida del embudo. Revisá el precio que ven, el cupón y cuántos datos se piden.',
        href: '/admin/analitica',
      })
    if (payToSale < 0.6 && f.paymentStarts >= 30)
      out.push({
        id: 'payment-drop',
        tone: 'warning',
        title: `${pct(1 - payToSale)} de los pagos iniciados no se completa`,
        detail:
          'Pasa en Mercado Pago (tarjeta rechazada, se arrepienten). Un mail de recuperación con el link de pago suele rescatar una parte.',
        href: '/admin/clientes?segmento=abandonaron',
      })
    if (toCheckout < 0.03)
      out.push({
        id: 'low-intent',
        tone: 'info',
        title: 'Pocas visitas llegan al checkout',
        detail: `${pct(toCheckout)} de las visitas. Si la pauta trae gente poco interesada, afiná públicos o llevá los anuncios directo a la temática.`,
      })
  }

  const next = input.upcoming.find((e) => e.importance >= 2 && e.daysUntil <= e.leadDays + 21)
  if (next) {
    const ramp = next.daysUntil - next.leadDays
    out.push({
      id: `event-${next.id}`,
      tone: ramp <= 7 ? 'warning' : 'info',
      title:
        ramp > 0
          ? `${next.name} en ${next.daysUntil} días: la demanda arranca en ${ramp}`
          : `${next.name} en ${next.daysUntil} días: ya es temporada`,
      detail:
        ramp > 7
          ? `${next.idea} Tené listos anuncios, cupón y temática antes del ${next.prepareBy.split('-').reverse().slice(0, 2).join('/')}.`
          : `${next.idea} Los anuncios, el cupón y la temática ya tendrían que estar listos${ramp <= 0 ? ' y la pauta, prendida' : ''}.`,
      href: '/admin/marketing/planificador',
    })
  }

  const best = input.channels
    .filter((c) => c.spendCents > 0 && c.sales >= 5 && c.roas !== null)
    .sort((a, b2) => (b2.poas ?? 0) - (a.poas ?? 0))[0]
  if (best && best.poas !== null && best.poas > 1.5)
    out.push({
      id: `best-${best.channel}`,
      tone: 'good',
      title: `${channelLabel(best.channel)} es el canal más rentable`,
      detail: `Cada peso invertido volvió ${x(best.poas)} en contribución (ROAS ${best.roas === null ? '—' : x(best.roas)}).`,
      href: '/admin/marketing/canales',
    })

  const order: Record<InsightTone, number> = { critical: 0, warning: 1, good: 2, info: 3 }
  return out.sort((a, b2) => order[a.tone] - order[b2.tone])
}
