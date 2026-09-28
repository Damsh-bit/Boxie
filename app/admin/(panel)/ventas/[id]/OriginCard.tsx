import { Waypoints } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { formatDateTime } from '@/domain/admin/format'
import type { AdminOrder, FinanceSettings } from '@/domain/admin/types'
import type { OrderAttribution, Touch } from '@/domain/marketing/attribution'
import { buildIndex, orderCredits, type Credit } from '@/domain/marketing/performance'
import type { Campaign } from '@/domain/marketing/types'
import { log } from '@/server/log'
import { marketingRepo } from '@/server/marketing/repo'
import { Card, CardHeader } from '../../../_ui/primitives'
import { ChannelTag } from '../../marketing/_ui/bits'

const DEVICE: Record<string, string> = {
  mobile: 'celular',
  desktop: 'computadora',
  tablet: 'tablet',
}

async function origin(orderId: string) {
  try {
    return await (await marketingRepo()).orderOrigin(orderId)
  } catch (error) {
    log.warn('No se pudo leer el origen de la orden', {
      orderId,
      error: error instanceof Error ? error.message : String(error),
    })
    return { attribution: null, campaigns: [] as Campaign[] }
  }
}

function Step({
  title,
  credit,
  touch,
  campaigns,
}: {
  title: string
  credit: Credit
  touch: Touch | null
  campaigns: Campaign[]
}) {
  const campaign = campaigns.find((c) => c.id === credit.campaignId)
  return (
    <div className="rounded-2xl bg-canvas p-3.5">
      <p className="text-[11px] font-bold tracking-wide text-neutral-500 uppercase">{title}</p>
      <p className="mt-1 text-sm font-semibold text-ink">
        <ChannelTag channel={credit.channel} />
      </p>
      {campaign && (
        <Link
          href={`/admin/marketing/campanas/${campaign.id}` as Route}
          className="mt-0.5 block truncate text-sm font-semibold text-brand hover:underline"
        >
          {campaign.name}
        </Link>
      )}
      {touch && (
        <p className="mt-1 text-xs break-words text-neutral-600">
          {touch.source} / {touch.medium || '(sin medio)'}
          {touch.campaign ? ` · ${touch.campaign}` : ''}
          {touch.content ? ` · ${touch.content}` : ''} · entró por {touch.landing} ·{' '}
          {formatDateTime(touch.at)}
        </p>
      )}
    </div>
  )
}

/**
 * De dónde vino la compra: el primer origen (cómo conoció Boxie) y el último
 * (el que la cerró), con la campaña si corresponde. Un cupón de campaña
 * manda sobre el último clic.
 */
export async function OriginCard({
  order,
  settings,
}: {
  order: AdminOrder
  settings: FinanceSettings
}) {
  const { attribution, campaigns } = await origin(order.id)
  const attributions: OrderAttribution[] = attribution ? [attribution] : []
  const idx = buildIndex({
    orders: [order],
    affiliates: [],
    expenses: [],
    settings,
    campaigns,
    spend: [],
    traffic: [],
    attributions,
  })
  const credits = orderCredits(order, idx)
  const byCoupon = Boolean(order.couponId && campaigns.some((c) => c.couponId === order.couponId))
  return (
    <Card>
      <CardHeader icon={<Waypoints />} title="De dónde vino" />
      {!attribution && !byCoupon && !order.affiliateId ? (
        <p className="text-sm text-neutral-500">
          Sin datos de origen: la compra es anterior a la medición o el navegador no lo guardó.
        </p>
      ) : (
        <div className="space-y-2">
          <Step
            title={byCoupon ? 'La cerró (por el cupón)' : 'La cerró (último clic)'}
            credit={credits.last}
            touch={attribution?.last ?? null}
            campaigns={campaigns}
          />
          {attribution?.first &&
            (attribution.first.at !== attribution.last?.at ||
              credits.first.channel !== credits.last.channel) && (
              <Step
                title="La conoció (primer clic)"
                credit={credits.first}
                touch={attribution.first}
                campaigns={campaigns}
              />
            )}
          {attribution?.device && (
            <p className="text-xs text-neutral-500">Compró desde {DEVICE[attribution.device]}.</p>
          )}
        </div>
      )}
    </Card>
  )
}
