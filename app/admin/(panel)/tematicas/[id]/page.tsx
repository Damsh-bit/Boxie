import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { mixBy } from '@/domain/admin/metrics'
import { rangeFromPreset } from '@/domain/admin/range'
import { ThemeListingSchema } from '@/domain/catalog'
import { activePlans } from '@/domain/plans'
import type { ThemeConfigInput } from '@/slides/theme-config'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { ThemeEditor } from './ThemeEditor'

export async function generateMetadata({
  params,
}: PageProps<'/admin/tematicas/[id]'>): Promise<Metadata> {
  const theme = await (await adminRepo()).getTheme((await params).id)
  return { title: theme ? theme.name : 'Temática' }
}

export default async function ThemeEditorPage({ params }: PageProps<'/admin/tematicas/[id]'>) {
  const { id } = await params
  await requireAdmin(`/admin/tematicas/${id}`)
  const repo = await adminRepo()
  const [theme, data] = await Promise.all([repo.getTheme(id), repo.dataset()])
  if (!theme) notFound()

  const orders = data.orders.filter((o) => o.themeId === id)
  const last30 = rangeFromPreset('30d')
  const byPlan = mixBy(orders, last30, (o) => o.planId)
  const categories = [...new Set(data.themes.map((t) => t.category))].sort()
  const listing = ThemeListingSchema.safeParse(theme.listing)

  return (
    <ThemeEditor
      theme={{
        id: theme.id,
        slug: theme.slug,
        name: theme.name,
        category: theme.category,
        description: theme.description,
        status: theme.status,
        sortOrder: theme.sortOrder,
        priceCents: theme.priceCents,
        origin: theme.origin,
        currentVersion: theme.currentVersion,
        currentVersionId: theme.currentVersionId,
        versions: theme.versions,
        updatedAt: theme.updatedAt,
      }}
      initialConfig={theme.draftConfig as ThemeConfigInput}
      initialListing={listing.success ? listing.data : null}
      plans={activePlans(data.plans)}
      categories={categories}
      stats={{
        sales30: byPlan.reduce((s, r) => s + r.sales, 0),
        revenue30: byPlan.reduce((s, r) => s + r.revenueCents, 0),
        salesAll: orders.filter((o) => o.status === 'paid' || o.status === 'refunded').length,
        byPlan: Object.fromEntries(byPlan.map((r) => [r.key, r.sales])),
      }}
      demo={repo.mode === 'demo'}
    />
  )
}
