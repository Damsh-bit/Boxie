import type { Metadata } from 'next'
import { profitabilityBy } from '@/domain/admin/finance'
import { mixBy } from '@/domain/admin/metrics'
import { rangeFromPreset } from '@/domain/admin/range'
import { planIssues, sortPlans } from '@/domain/plans'
import { parseThemeConfig } from '@/slides/config'
import { planContents } from '@/slides/plans'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { PlansBoard } from './PlansBoard'

export const metadata: Metadata = { title: 'Planes' }

export default async function PlansPage() {
  await requireAdmin('/admin/planes')
  const repo = await adminRepo()
  const data = await repo.dataset()
  const range = rangeFromPreset('30d')
  const plans = sortPlans(data.plans)
  const mix = new Map(mixBy(data.orders, range, (o) => o.planId).map((r) => [r.key, r]))
  const profit = new Map(
    profitabilityBy(data.orders, data.settings, range, (o) => o.planId).map((r) => [r.key, r]),
  )
  const salesAll = new Map<string, number>()
  for (const o of data.orders)
    if (o.planId) salesAll.set(o.planId, (salesAll.get(o.planId) ?? 0) + 1)

  const themes = await Promise.all(
    data.themes
      .filter((t) => t.status !== 'archived')
      .map(async (t) => {
        const full = await repo.getTheme(t.id)
        const parsed = parseThemeConfig(full?.draftConfig)
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          contents: parsed.success
            ? planContents(parsed.data, plans).map((c) => ({
                planSlug: c.planSlug,
                screens: c.screens,
                modules: c.modules,
                games: c.games,
              }))
            : [],
        }
      }),
  )

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Producto{' '}
            {repo.mode === 'demo' && (
              <NeedsDb what="plans, orders.plan_id (migración admin_backoffice)" />
            )}
          </span>
        }
        title="Planes"
        description="El mismo regalo en distintos niveles de precio: cuanto más caro, más pantallas, más días online y más extras. Qué pantalla entra en cada plan se define en cada temática."
      />
      <PlansBoard
        plans={plans}
        issues={planIssues(plans)}
        stats={Object.fromEntries(
          plans.map((p) => [
            p.id,
            {
              sales30: mix.get(p.id)?.sales ?? 0,
              revenue30: mix.get(p.id)?.revenueCents ?? 0,
              share30: mix.get(p.id)?.share ?? 0,
              contribution30: profit.get(p.id)?.contributionCents ?? 0,
              margin30: profit.get(p.id)?.margin ?? 0,
              salesAll: salesAll.get(p.id) ?? 0,
            },
          ]),
        )}
        themes={themes}
      />
    </>
  )
}
