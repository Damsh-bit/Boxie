import type { MetadataRoute } from 'next'

/** Manifest web: nombre, colores e ícono al agregar Ribbly a la pantalla de inicio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ribbly · Regalos digitales que emocionan',
    short_name: 'Ribbly',
    description:
      'Regalos digitales personalizados con fotos, música y juegos, que se abren desde el celular.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#F44E63',
    lang: 'es-AR',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/brand/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
