import type { Metadata } from 'next'
import { activePlans } from '@/domain/plans'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { NeedsDb, PageHeader } from '../../_ui/primitives'
import { Generator } from './Generator'

export const metadata: Metadata = { title: 'Generador de temáticas' }

export default async function GeneratorPage() {
  await requireAdmin('/admin/generador')
  const repo = await adminRepo()
  const [plans, themes] = await Promise.all([repo.listPlans(), repo.listThemes()])
  return (
    <>
      <PageHeader
        eyebrow={
          <span className="flex items-center gap-2">
            Producto {repo.mode === 'demo' && <NeedsDb what="themes, theme_versions" />}
          </span>
        }
        title="Generador de temáticas"
        description="Pegá una lista de ocasiones y cada Boxie se arma sola: textos, paleta, fotos, juegos y qué incluye cada plan. Después las revisás y publicás."
      />
      <Generator plans={activePlans(plans)} existingSlugs={themes.map((t) => t.slug)} />
    </>
  )
}
