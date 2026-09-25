import { WandSparkles } from 'lucide-react'
import type { Metadata } from 'next'
import { ThemeListingSchema } from '@/domain/catalog'
import { mixBy } from '@/domain/admin/metrics'
import { rangeFromPreset } from '@/domain/admin/range'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { ButtonLink } from '@/ui/Button'
import { one } from '../../_lib/range'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { NewThemeButton, ThemeGrid, type ThemeCard } from './ThemeGrid'

export const metadata: Metadata = { title: 'Temáticas' }

export default async function ThemesPage({ searchParams }: PageProps<'/admin/tematicas'>) {
  await requireAdmin('/admin/tematicas')
  const repo = await adminRepo()
  const data = await repo.dataset()
  const params = await searchParams
  const last30 = rangeFromPreset('30d')
  const sales = new Map(mixBy(data.orders, last30, (o) => o.themeId).map((r) => [r.key, r]))
  const allTime = new Map(
    mixBy(
      data.orders,
      { from: new Date(0), to: new Date(), preset: 'custom' },
      (o) => o.themeId,
    ).map((r) => [r.key, r]),
  )

  const cards: ThemeCard[] = data.themes
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((t) => {
      const listing = ThemeListingSchema.safeParse(t.listing)
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        category: t.category,
        status: t.status,
        origin: t.origin,
        image: listing.success ? (listing.data.images[0] ?? null) : null,
        cardColor: listing.success ? listing.data.cardColor : '#F44E63',
        emoji: listing.success ? (listing.data.guide?.emoji ?? '🎁') : '🎁',
        version: t.currentVersion,
        slides: t.slides,
        hasUnpublishedChanges: t.hasUnpublishedChanges,
        sales30: sales.get(t.id)?.sales ?? 0,
        revenue30: sales.get(t.id)?.revenueCents ?? 0,
        salesAll: allTime.get(t.id)?.sales ?? 0,
        updatedAt: t.updatedAt,
      }
    })

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Producto {repo.mode === 'demo' && <NeedsDb what="themes, theme_versions" />}
          </span>
        }
        title="Temáticas"
        description="Cada temática es un regalo distinto: sus pantallas, textos, fotos y en qué plan va cada módulo."
        actions={
          <>
            <ButtonLink href="/admin/generador" variant="secondary" size="sm" className="h-10">
              <WandSparkles className="size-4" aria-hidden /> Generar en lote
            </ButtonLink>
            <NewThemeButton />
          </>
        }
      />
      <ThemeGrid themes={cards} initialStatus={one(params.estado)} />
    </>
  )
}
