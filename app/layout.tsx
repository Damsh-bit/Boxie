import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import { siteUrl } from '@/content/site'
import { AttributionTracker } from '@/ui/marketing/AttributionTracker'
import { MetaPixel } from '@/ui/marketing/MetaPixel'
import { MotionProvider, NoScriptReveal } from '@/ui/motion'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { fontVariables } from './fonts'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Boxie Digital · Regalos digitales que emocionan',
    template: '%s · Boxie Digital',
  },
  description:
    'Regalá una Boxie: una experiencia digital personalizada con fotos, música, juegos y dedicatorias. Llega al instante y se abre desde el celular.',
  applicationName: 'Boxie Digital',
  openGraph: {
    siteName: 'Boxie Digital',
    locale: 'es_AR',
    type: 'website',
  },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#F44E63',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-AR" className={fontVariables}>
      <body className="flex min-h-dvh flex-col">
        <NoScriptReveal />
        <MotionProvider>{children}</MotionProvider>
        <Suspense fallback={null}>
          <AttributionTracker />
        </Suspense>
        <MetaPixel />
        <SpeedInsights />
      </body>
    </html>
  )
}
