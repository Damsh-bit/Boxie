import type { MetadataRoute } from 'next'

/** Manifest web: nombre, colores e ícono al agregar Boxie a la pantalla de inicio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Boxie Digital · Regalos digitales que emocionan',
    short_name: 'Boxie',
    description:
      'Regalos digitales personalizados con fotos, música y juegos, que se abren desde el celular.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#F44E63',
    lang: 'es-AR',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
