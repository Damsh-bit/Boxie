import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { configForPlan } from '@/slides/plans'
import { getPublishedTheme, getThemeVersionConfig, listPublicPlans } from '@/server/catalog'
import { sampleGift } from '@/server/sample-gift'
import { ExamplePlayer } from './ExamplePlayer'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: PageProps<'/ejemplo/[slug]'>): Promise<Metadata> {
  const theme = await getPublishedTheme((await params).slug)
  return theme
    ? {
        title: `Boxie ${theme.name} de ejemplo`,
        description: `Así se ve una Boxie ${theme.name} por dentro.`,
      }
    : {}
}

/** Una Boxie de ejemplo con la temática publicada: lo que recibe el destinatario (por plan, si se pide). */
export default async function ExamplePage({ params, searchParams }: PageProps<'/ejemplo/[slug]'>) {
  const theme = await getPublishedTheme((await params).slug)
  if (!theme) notFound()
  const [full, plans, query] = await Promise.all([
    getThemeVersionConfig(theme.versionId),
    listPublicPlans(),
    searchParams,
  ])
  if (!full) notFound()
  // ?plan=clasica muestra solo lo que incluye ese plan (desde la ficha: "Ver qué incluye").
  const plan = plans.find((p) => p.slug === query.plan)
  const config = plan ? configForPlan(full, plan, plans) : full

  return (
    <ExamplePlayer config={config} data={sampleGift(config)} slug={theme.slug} name={theme.name} />
  )
}
