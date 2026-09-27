import {
  ArrowLeft,
  BadgeDollarSign,
  Eye,
  Gauge,
  Link2,
  MousePointerClick,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { siteUrl } from '@/content/site'
import {
  formatARS,
  formatCompactARS,
  formatDate,
  formatMultiple,
  formatNumber,
  formatPercent,
} from '@/domain/admin/format'
import { channelInfo } from '@/domain/marketing/channels'
import {
  campaignDaily,
  campaignPerformance,
  CAMPAIGN_STATE_LABEL,
  VERDICT_HINT,
  verdict,
} from '@/domain/marketing/performance'
import { buildUtmUrl, UTM_PRESETS } from '@/domain/marketing/tools'
import { CAMPAIGN_OBJECTIVES } from '@/domain/marketing/types'
import { requireAdmin } from '@/server/admin/session'
import { ColumnChart, Legend, LineChart, WithTable } from '../../../../_ui/charts'
import { SERIES } from '../../../../_ui/palette'
import { Card, CardHeader, KeyValue, NeedsDb, PageHeader } from '../../../../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../../../../_ui/RangePicker'
import { Stat } from '../../../../_ui/Stat'
import { loadMarketing, MODEL_SLUG } from '../../_lib/load'
import { ChannelTag, ModelPicker, StateBadge, VerdictBadge } from '../../_ui/bits'
import { CampaignActions, CopyButton, DailyTable } from './CampaignActions'

export const metadata: Metadata = { title: 'Campaña · Marketing' }

export default async function CampaignPage({
  params,
  searchParams,
}: PageProps<'/admin/marketing/campanas/[id]'>) {
  const { id } = await params
  await requireAdmin(`/admin/marketing/campanas/${id}`)
  const ctx = await loadMarketing(await searchParams, '90d')
  const { input, idx, range, model, targets, m, now, data, label } = ctx
  const campaign = m.campaigns.find((c) => c.id === id)
  if (!campaign) notFound()

  const row = campaignPerformance(input, range, model, now, idx).find((r) => r.campaign.id === id)
  const daily = campaignDaily(input, id, range, model, idx)
  const v = row ? verdict(row, targets) : 'sin-inversion'
  const theme = data.themes.find((t) => t.id === campaign.themeId)
  const coupon = data.coupons.find((c) => c.id === campaign.couponId)
  const preset = UTM_PRESETS.find((p) => p.channel === campaign.channel)
  const landing = theme ? `/tematicas/${theme.slug}` : '/'
  const link = buildUtmUrl(`${siteUrl()}${landing}`, {
    source: preset?.source ?? campaign.channel,
    medium: preset?.medium ?? 'paid',
    campaign: campaign.utmCampaign,
  })
  const spendRows = m.spend
    .filter((e) => e.campaignId === id)
    .sort((a, b) => b.day.localeCompare(a.day))
  const byDay = new Map(daily.map((d) => [d.key, d]))
  const tableRows = spendRows
    .filter((e) => byDay.has(e.day))
    .map((e) => ({
      ...e,
      sales: byDay.get(e.day)!.sales,
      revenueCents: byDay.get(e.day)!.revenueCents,
    }))
  const objective = CAMPAIGN_OBJECTIVES.find((o) => o.value === campaign.objective)
  const platformGap =
    row && row.sales > 0 && row.platformConversions > 0
      ? row.platformConversions / row.sales - 1
      : null

  const optionThemes = data.themes
    .filter((t) => t.status !== 'archived' || t.id === campaign.themeId)
    .map((t) => ({ id: t.id, name: t.name }))
  const optionCoupons = data.coupons.map((c) => ({
    id: c.id,
    name: `${c.code}${c.description ? ` · ${c.description}` : ''}`,
  }))

  return (
    <RangeScope>
      <Link
        href="/admin/marketing/campanas"
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Campañas
      </Link>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            Campaña · {channelInfo(campaign.channel).label}
            {ctx.mode === 'demo' && <NeedsDb what="marketing_campaigns, marketing_spend" />}
          </span>
        }
        title={campaign.name}
        description={`${objective?.label ?? ''} · desde ${formatDate(`${campaign.startsOn}T12:00:00-03:00`)}${campaign.endsOn ? ` hasta ${formatDate(`${campaign.endsOn}T12:00:00-03:00`)}` : ''}${campaign.dailyBudgetCents ? ` · ${formatARS(campaign.dailyBudgetCents)} por día` : ''}`}
        actions={
          <>
            <RangePicker {...ctx.picker} />
            <ModelPicker model={model} slugs={MODEL_SLUG} />
            <CampaignActions
              campaign={campaign}
              themes={optionThemes}
              coupons={optionCoupons}
              spend={m.spend.filter((e) => e.campaignId === id)}
              readOnly={!m.available}
            />
          </>
        }
      >
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StateBadge state={row?.state ?? (campaign.status === 'draft' ? 'draft' : 'active')} />
          <VerdictBadge verdict={v} />
        </div>
      </PageHeader>

      <RangeContent>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat
            label="Inversión"
            value={row?.spendCents ?? 0}
            format="ars"
            icon={<Wallet />}
            hint={
              row?.budgetCents
                ? `${formatPercent(row.spendCents / row.budgetCents, 0)} del presupuesto del período`
                : undefined
            }
          />
          <Stat
            label="Ventas"
            value={row?.sales ?? 0}
            format="number"
            icon={<Target />}
            delay={0.04}
            hint={`${formatCompactARS(row?.revenueCents ?? 0)} facturados`}
          />
          <Stat
            label="Costo por venta"
            value={row?.cpaCents ?? 0}
            format="ars"
            icon={<BadgeDollarSign />}
            delay={0.08}
            hint={`objetivo ${formatARS(Math.round(targets.targetCpaCents / 100) * 100)}`}
          />
          <Stat
            label="ROAS"
            value={row?.roas ?? 0}
            format="multiple"
            icon={<TrendingUp />}
            delay={0.12}
            hint={`POAS ${formatMultiple(row?.poas)} · objetivo ${formatMultiple(targets.targetPoas)}`}
          />
          <Stat
            label="CTR"
            value={row?.ctr ?? 0}
            format="percent"
            icon={<MousePointerClick />}
            delay={0.16}
            hint={`${formatNumber(row?.clicks ?? 0)} clics de ${formatNumber(row?.impressions ?? 0)} impresiones`}
          />
          <Stat
            label="CPC"
            value={row?.cpcCents ?? 0}
            format="ars"
            icon={<Gauge />}
            delay={0.2}
            hint={`CPM ${row?.cpmCents ? formatARS(Math.round(row.cpmCents / 100) * 100) : '—'}`}
          />
          <Stat
            label="Visitas"
            value={row?.sessions ?? 0}
            format="number"
            icon={<Eye />}
            delay={0.24}
            hint={
              row?.clicks
                ? `${formatPercent(row.sessions / row.clicks, 0)} de los clics llegaron`
                : undefined
            }
          />
          <Stat
            label="Conversión del clic"
            value={row?.clicks ? row.sales / row.clicks : 0}
            format="percent"
            icon={<Target />}
            delay={0.28}
            hint="ventas ÷ clics"
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card delay={0.08}>
            <CardHeader
              title="Día por día"
              description="Inversión contra lo facturado por sus ventas"
            />
            <div className="mb-6">
              <Legend
                items={[
                  { label: 'Inversión', color: SERIES[1]!, shape: 'box' },
                  { label: 'Facturación', color: SERIES[0]!, shape: 'box' },
                ]}
              />
            </div>
            <WithTable
              caption="Inversión y facturación por día"
              columns={['Día', 'Inversión', 'Facturación', 'Ventas']}
              rows={daily.map((d) => [
                label(d.key),
                formatARS(d.spendCents),
                formatARS(Math.round(d.revenueCents)),
                d.sales,
              ])}
              chart={
                <ColumnChart
                  ariaLabel="Inversión y facturación por día"
                  format="ars"
                  series={[
                    { name: 'Inversión', color: SERIES[1] },
                    { name: 'Facturación', color: SERIES[0] },
                  ]}
                  data={daily.map((d) => ({
                    label: label(d.key),
                    values: [d.spendCents, d.revenueCents],
                  }))}
                />
              }
            />
            <div className="mt-6 border-t border-line pt-5">
              <p className="text-sm font-semibold text-ink">CTR por día</p>
              <p className="mb-4 text-xs text-neutral-500">
                Si baja semana a semana con el mismo público, los anuncios se gastaron: toca
                renovarlos.
              </p>
              <LineChart
                ariaLabel="CTR por día"
                format="percent"
                height={180}
                area={false}
                series={[{ name: 'CTR', color: SERIES[4] }]}
                data={daily
                  .filter((d) => d.impressions > 0)
                  .map((d) => ({ label: label(d.key), values: [d.clicks / d.impressions] }))}
              />
            </div>
          </Card>

          <div className="space-y-5">
            <Card delay={0.12}>
              <CardHeader title="Qué hacer" />
              <VerdictBadge verdict={v} />
              <p className="mt-3 text-sm text-neutral-600">{VERDICT_HINT[v]}</p>
              {platformGap !== null && (
                <p className="mt-3 rounded-xl bg-canvas px-3 py-2 text-xs text-neutral-600">
                  La plataforma reporta <b>{formatNumber(row!.platformConversions)}</b> compras; la
                  tienda cuenta <b>{formatNumber(Math.round(row!.sales))}</b> (
                  {platformGap >= 0 ? '+' : ''}
                  {formatPercent(platformGap, 0)} de diferencia).
                </p>
              )}
            </Card>
            <Card delay={0.16}>
              <CardHeader
                icon={<Link2 />}
                title="Link para los anuncios"
                description="Con sus UTM, listo para pegar"
              />
              {link && (
                <div className="flex items-start gap-2">
                  <code className="min-w-0 flex-1 rounded-xl bg-canvas px-3 py-2 font-mono text-[11px] break-all text-neutral-700">
                    {link}
                  </code>
                  <CopyButton text={link} />
                </div>
              )}
              {preset?.platformTemplate && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold text-neutral-500">
                    Parámetros para la plataforma
                  </p>
                  <div className="flex items-start gap-2">
                    <code className="min-w-0 flex-1 rounded-xl bg-canvas px-3 py-2 font-mono text-[11px] break-all text-neutral-700">
                      {preset.platformTemplate.replace(
                        'NOMBRE-DE-LA-CAMPANA',
                        campaign.utmCampaign,
                      )}
                    </code>
                    <CopyButton
                      text={preset.platformTemplate.replace(
                        'NOMBRE-DE-LA-CAMPANA',
                        campaign.utmCampaign,
                      )}
                    />
                  </div>
                  <p className="mt-2 text-xs text-neutral-500">{preset.tip}</p>
                </div>
              )}
            </Card>
            <Card delay={0.2}>
              <CardHeader title="Datos" />
              <KeyValue
                className="sm:grid-cols-1"
                items={[
                  { label: 'Canal', value: <ChannelTag channel={campaign.channel} /> },
                  { label: 'Estado', value: CAMPAIGN_STATE_LABEL[row?.state ?? 'active'] },
                  {
                    label: 'utm_campaign',
                    value: <code className="font-mono text-sm">{campaign.utmCampaign}</code>,
                  },
                  { label: 'Temática', value: theme?.name ?? 'Todas' },
                  { label: 'Cupón', value: coupon ? coupon.code : 'Sin cupón' },
                  { label: 'Público', value: campaign.audience || '—' },
                  ...(campaign.notes ? [{ label: 'Notas', value: campaign.notes }] : []),
                ]}
              />
            </Card>
          </div>
        </div>

        <Card className="mt-5" padded={false} delay={0.14}>
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <CardHeader
              className="mb-0"
              title="Resultados cargados"
              description="Lo que se cargó del administrador de anuncios en el período, con las ventas que la tienda le atribuye"
            />
          </div>
          <DailyTable campaignId={campaign.id} rows={tableRows} readOnly={!m.available} />
        </Card>
      </RangeContent>
    </RangeScope>
  )
}
