import type { MetadataRoute } from 'next'
import { siteUrl } from '@/content/site'

/**
 * Qué pueden indexar los buscadores. Lo privado (panel, editor, regalos,
 * conversaciones de soporte, checkout y la API) queda afuera; igual cada una
 * de esas rutas manda `noindex` por su cuenta: esto solo ahorra el rastreo.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/editor', '/g/', '/api/', '/checkout', '/soporte'],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  }
}
