import type { Metadata } from 'next'
import Link from 'next/link'
import { listPublishedThemes } from '@/server/catalog'
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
      <header className="animate-fade-in-up px-5 pt-20 pb-10 text-center">
        <h1 className="mb-2.5 text-5xl font-semibold tracking-tight text-black sm:text-6xl">
          Inspirate
        </h1>
        <p className="text-xl text-neutral-500">Elegí el estilo perfecto para emocionar.</p>
      </header>

      <GalleryGrid themes={themes} />

      {guides.length > 0 && (
        <section className="mt-10 rounded-t-[40px] bg-neutral-50 px-5 py-20 text-center">
          <h2 className="mb-2.5 text-4xl font-semibold text-black">¿Qué Boxie elegir?</h2>
          <p className="mx-auto mb-12 max-w-xl text-lg text-neutral-500">
            Cada momento tiene su magia. Encontrá la tuya.
          </p>
          <div className="mx-auto flex max-w-5xl flex-col flex-wrap items-center justify-center gap-8 md:flex-row md:items-stretch">
            {guides.map((t) => (
              <Link
                key={t.id}
                href={`/tematicas/${t.slug}`}
                className="w-full max-w-[340px] rounded-[25px] border border-neutral-200 bg-white px-8 py-10 text-left transition-all duration-300 hover:-translate-y-2.5 hover:border-brand hover:shadow-[0_20px_40px_rgb(244_78_99/0.1)] md:w-[300px]"
              >
                <span className="mb-5 block text-5xl">{t.listing.guide!.emoji}</span>
                <h3 className="mb-4 text-2xl font-semibold text-black">{t.listing.guide!.title}</h3>
                <p className="text-[0.95rem] leading-relaxed text-neutral-500">
                  {t.listing.guide!.text}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
