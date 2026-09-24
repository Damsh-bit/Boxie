import type { Metadata } from 'next'
import type { Route } from 'next'
import { listPublishedThemes } from '@/server/catalog'
import { GuideCard } from '@/ui/GuideCard'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { GalleryGrid } from './GalleryGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Galería de Boxies',
  description:
    'Elegí la temática perfecta para emocionar: pareja, cumpleaños, amistad y más. Regalos digitales personalizados.',
}

export default async function GalleryPage() {
  const themes = await listPublishedThemes()
  const guides = themes.filter((t) => t.listing.guide)

  return (
    <div className="bg-white pt-[90px] pb-20">
      <Stagger as="header" immediate className="px-5 pt-20 pb-10 text-center" step={0.1}>
        <StaggerItem
          as="h1"
          className="mb-2.5 text-5xl font-semibold tracking-tight text-black sm:text-6xl"
        >
          Inspirate
        </StaggerItem>
        <StaggerItem as="p" className="text-xl text-neutral-500">
          Elegí el estilo perfecto para emocionar.
        </StaggerItem>
      </Stagger>

      <GalleryGrid themes={themes} />

      {guides.length > 0 && (
        <section className="mt-10 rounded-t-[40px] bg-neutral-50 px-5 py-20 text-center">
          <Reveal as="h2" className="mb-2.5 text-4xl font-semibold text-black">
            ¿Qué Boxie elegir?
          </Reveal>
          <Reveal as="p" delay={0.08} className="mx-auto mb-12 max-w-xl text-lg text-neutral-500">
            Cada momento tiene su magia. Encontrá la tuya.
          </Reveal>
          <Stagger
            className="mx-auto flex max-w-5xl flex-col flex-wrap items-center justify-center gap-8 md:flex-row md:items-stretch"
            step={0.12}
          >
            {guides.map((t) => (
              <StaggerItem key={t.id} className="w-full max-w-[340px] md:w-[300px]" y={40}>
                <GuideCard
                  href={`/tematicas/${t.slug}` as Route}
                  emoji={t.listing.guide!.emoji}
                  title={t.listing.guide!.title}
                  text={t.listing.guide!.text}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
    </div>
  )
}
