import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublishedTheme, getThemeVersionConfig } from '@/server/catalog'
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

/** Una Boxie de ejemplo con la temática publicada: lo que recibe el destinatario. */
export default async function ExamplePage({ params }: PageProps<'/ejemplo/[slug]'>) {
  const theme = await getPublishedTheme((await params).slug)
  if (!theme) notFound()
  const config = await getThemeVersionConfig(theme.versionId)
  if (!config) notFound()

  return (
    <ExamplePlayer config={config} data={sampleGift(config)} slug={theme.slug} name={theme.name} />
  )
}
