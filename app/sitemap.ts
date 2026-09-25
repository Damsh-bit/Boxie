import type { MetadataRoute } from 'next'
import { legalDocs } from '@/content/legal'
import { siteUrl } from '@/content/site'
import { listPublishedThemes } from '@/server/catalog'
import { log } from '@/server/log'

// Las temáticas salen de la base: se arma en cada pedido (el build no depende de ella).
export const dynamic = 'force-dynamic'

/** El mapa del sitio: las páginas públicas y una ficha y un ejemplo por temática publicada. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = siteUrl()
  const now = new Date()
  const pages: MetadataRoute.Sitemap = [
    { url: `${url}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${url}/galeria`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${url}/precios`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${url}/ayuda`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${url}/nosotros`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${url}/contacto`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${url}/mi-boxie`, changeFrequency: 'yearly', priority: 0.3 },
    ...legalDocs.map((d) => ({
      url: `${url}/legales/${d.slug}`,
      lastModified: new Date(`${d.updated}T12:00:00-03:00`),
      changeFrequency: 'yearly' as const,
      priority: 0.2,
    })),
  ]
  try {
    const themes = await listPublishedThemes()
    return [
      ...pages,
      ...themes.flatMap((t) => [
        {
          url: `${url}/tematicas/${t.slug}`,
          lastModified: now,
          changeFrequency: 'weekly' as const,
          priority: 0.8,
          images: t.listing.images
            .slice(0, 3)
            .map((src) => (src.startsWith('http') ? src : `${url}${src}`)),
        },
        {
          url: `${url}/ejemplo/${t.slug}`,
          changeFrequency: 'monthly' as const,
          priority: 0.5,
        },
      ]),
    ]
  } catch (error) {
    log.warn('Mapa del sitio sin temáticas: no se pudo leer el catálogo', {
      error: error instanceof Error ? error.message : String(error),
    })
    return pages
  }
}
