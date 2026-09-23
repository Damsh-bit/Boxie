import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getPublicSettings, getPublishedTheme, getThemeVersionConfig } from '@/server/catalog'
import { SandboxLoader } from './SandboxLoader'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: PageProps<'/ejemplo/[slug]/personalizar'>): Promise<Metadata> {
  const theme = await getPublishedTheme((await params).slug)
  return theme
    ? {
        title: `Probá el editor · Boxie ${theme.name}`,
        description: `Personalizá una Boxie ${theme.name} de prueba: fotos, dedicatoria, música y más, con la vista previa en vivo.`,
      }
    : {}
}

/**
 * El editor en modo prueba: el mismo del comprador, sin comprar. Todo queda
 * en el navegador de quien lo usa.
 */
export default async function SandboxPage({ params }: PageProps<'/ejemplo/[slug]/personalizar'>) {
  const theme = await getPublishedTheme((await params).slug)
  if (!theme) notFound()
  const [config, settings] = await Promise.all([
    getThemeVersionConfig(theme.versionId),
    getPublicSettings(),
  ])
  if (!config) notFound()

  return (
    <SandboxLoader
      config={config}
      theme={{ name: theme.name, slug: theme.slug }}
      lifetimeDays={settings.giftLifetimeDays}
    />
  )
}
