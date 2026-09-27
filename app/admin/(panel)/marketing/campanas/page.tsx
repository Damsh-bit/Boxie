import { Info, Megaphone, MousePointerClick, Target, TrendingUp, Wallet } from 'lucide-react'
import type { Metadata } from 'next'
import { formatARS, formatCompactARS, formatNumber, formatPercent } from '@/domain/admin/format'
import { arDayKey } from '@/domain/admin/range'
import type { CampaignInput } from '@/domain/marketing/inputs'
import { campaignPerformance, verdict } from '@/domain/marketing/performance'
import { requireAdmin } from '@/server/admin/session'
import { one } from '../../../_lib/range'
import { Card, CardHeader, NeedsDb, PageHeader } from '../../../_ui/primitives'
import { RangeContent, RangePicker, RangeScope } from '../../../_ui/RangePicker'
import { Stat } from '../../../_ui/Stat'
import { loadMarketing, MODEL_SLUG } from '../_lib/load'
import { ModelPicker } from '../_ui/bits'
import { MarketingNav } from '../_ui/MarketingNav'
import { SchemaNotice } from '../_ui/SchemaNotice'
import { CampaignsBoard } from './CampaignsBoard'

export const metadata: Metadata = { title: 'Campañas · Marketing' }

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/

export default async function CampaignsPage({
  searchParams,
}: PageProps<'/admin/marketing/campanas'>) {
  await requireAdmin('/admin/marketing/campanas')
  const params = await searchParams
  const ctx = await loadMarketing(params, '30d')
  const { input, idx, range, model, targets, m, now, data } = ctx

  const rows = campaignPerformance(input, range, model, now, idx).map((r) => ({
    ...r,
    verdict: verdict(r, targets),
  }))
  const paid = rows.filter((r) => r.spendCents > 0)
  const spend = paid.reduce((s, r) => s + r.spendCents, 0)
  const impressions = paid.reduce((s, r) => s + r.impressions, 0)
  const clicks = paid.reduce((s, r) => s + r.clicks, 0)
  const sales = paid.reduce((s, r) => s + r.sales, 0)
  const revenue = paid.reduce((s, r) => s + r.revenueCents, 0)
  const platform = paid.reduce((s, r) => s + r.platformConversions, 0)
  const active = rows.filter((r) => r.state === 'active').length

  // Los últimos 60 días de resultados (para precargar la carga diaria).
  const since = arDayKey(now.getTime() - 60 * 86_400_000)
  const recentSpend = m.spend.filter((e) => e.day >= since)

  // "Nueva campaña" desde otra página (planificador: ?nueva=1&nombre=…&inicio=…&fin=…&tematica=…).
  const initial: Partial<CampaignInput> | null =
    one(params.nueva) === '1'
      ? {
          name: one(params.nombre).slice(0, 120),
          ...(DAY_KEY.test(one(params.inicio)) ? { startsOn: one(params.inicio) } : {}),
          ...(DAY_KEY.test(one(params.fin)) ? { endsOn: one(params.fin) } : {}),
          ...(data.themes.some((t) => t.id === one(params.tematica))
            ? { themeId: one(params.tematica) }
            : {}),
        }
      : null

  return (
    <RangeScope>
      <PageHeader
        eyebrow={
          <span className="flex flex-wrap items-center gap-2">
            Marketing
            {ctx.mode === 'demo' && <NeedsDb what="marketing_campaigns, marketing_spend" />}
          </span>
        }
        title="Campañas"
        description="Cada campaña con lo que invirtió, lo que trajo y qué conviene hacer con ella. Los resultados se cargan del administrador de anuncios (a mano o importando el CSV)."
        actions={
          <>
            <RangePicker {...ctx.picker} />
            <ModelPicker model={model} slugs={MODEL_SLUG} />
          </>
        }
      >
        <MarketingNav />
      </PageHeader>

      <RangeContent>
        {!m.available && <SchemaNotice />}

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat
            label="Inversión del período"
            value={spend}
            format="ars"
            icon={<Wallet />}
            hint={`${active} ${active === 1 ? 'campaña activa' : 'campañas activas'}`}
          />
          <Stat
            label="CTR promedio"
            value={impressions ? clicks / impressions : 0}
            format="percent"
            icon={<MousePointerClick />}
            delay={0.04}
            hint={`${formatNumber(clicks)} clics · CPC ${clicks ? formatARS(Math.round(spend / clicks / 100) * 100) : '—'}`}
          />
          <Stat
            label="Ventas de campañas pagas"
            value={sales}
            format="number"
            icon={<Target />}
            delay={0.08}
            hint={
              platform
                ? `las plataformas dicen ${formatNumber(platform)} (${formatPercent(sales ? platform / sales - 1 : 0, 0)} más)`
                : undefined
            }
          />
          <Stat
            label="ROAS de campañas pagas"
            value={spend ? revenue / spend : 0}
            format="multiple"
            icon={<TrendingUp />}
            delay={0.12}
            hint={`${formatCompactARS(revenue)} facturados`}
          />
        </div>

        <Card className="mt-5" padded={false} delay={0.08}>
          <div className="px-5 pt-5 sm:px-6 sm:pt-6">
            <CardHeader
              className="mb-0"
              icon={<Megaphone />}
              title="Campañas del período"
              description={`CPA máximo ${formatARS(Math.round(targets.maxCpaCents / 100) * 100)} · objetivo ${formatARS(Math.round(targets.targetCpaCents / 100) * 100)} por venta`}
            />
          </div>
          <CampaignsBoard
            rows={rows}
            themes={data.themes
              .filter((t) => t.status !== 'archived')
              .map((t) => ({ id: t.id, name: t.name }))}
            coupons={data.coupons.map((c) => ({
              id: c.id,
              name: `${c.code}${c.description ? ` · ${c.description}` : ''}`,
            }))}
            recentSpend={recentSpend}
            initial={initial}
            readOnly={!m.available}
          />
        </Card>

        <Card className="mt-5" delay={0.12}>
          <CardHeader icon={<Info />} title="Cómo se le atribuye una venta a una campaña" />
          <ol className="grid gap-3 text-sm text-neutral-600 md:grid-cols-3">
            <li className="rounded-2xl bg-canvas p-4">
              <p className="font-semibold text-ink">1. Por el link</p>
              La visita llega con <code className="rounded bg-white px-1">utm_campaign</code> igual
              al de la campaña. Armá los links en Herramientas.
            </li>
            <li className="rounded-2xl bg-canvas p-4">
              <p className="font-semibold text-ink">2. Por el cupón</p>
              Si la campaña tiene cupón, toda venta con ese cupón es suya (sirve para creadoras y
              para lo que se comparte sin link).
            </li>
            <li className="rounded-2xl bg-canvas p-4">
              <p className="font-semibold text-ink">3. Con el modelo elegido</p>
              Último clic premia a la que cerró; primer clic, a la que presentó Boxie; repartido,
              mitad y mitad.
            </li>
          </ol>
          <p className="mt-4 text-xs text-neutral-500">
            Las plataformas suelen reportar más compras que las reales (cuentan vistas y clics de
            días anteriores, y a veces la misma compra dos veces). Acá se cuentan las ventas pagadas
            de la tienda.
          </p>
        </Card>
      </RangeContent>
    </RangeScope>
  )
}
