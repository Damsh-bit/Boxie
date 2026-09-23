import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  applyOffer,
  getPublishedTheme,
  getUrgencyOffer,
  listPublishedThemes,
} from '@/server/catalog'
import { BuyBox } from './BuyBox'
import { ProductGallery } from './ProductGallery'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: PageProps<'/tematicas/[slug]'>): Promise<Metadata> {
  const theme = await getPublishedTheme((await params).slug)
  if (!theme) return { title: 'Temática no encontrada' }
  const title = `${theme.listing.title} ${theme.listing.highlight}`
  return {
    title,
    description: theme.listing.subtitle || theme.description,
    openGraph: { title, description: theme.listing.subtitle, images: [theme.listing.images[0]!] },
  }
}

const MARQUEE =
  'REGALÁ EL MOTIVO / PERSONALIZÁ / REGALÁ / ELEGÍ EL MOTIVO / PERSONALIZÁ / REGALÁ / ELEGÍ EL MOTIVO / '

export default async function ThemePage({ params }: PageProps<'/tematicas/[slug]'>) {
  const { slug } = await params
  const [theme, all, offer] = await Promise.all([
    getPublishedTheme(slug),
    listPublishedThemes(),
    getUrgencyOffer(),
  ])
  if (!theme) notFound()

  const others = all.filter((t) => t.id !== theme.id)

  return (
    <div className="bg-[#f8f9fa]">
      <div
        className="mt-[75px] w-full overflow-hidden bg-ink py-2 text-[11px] font-bold tracking-[2px] whitespace-nowrap text-brand uppercase lg:mt-[90px]"
        aria-hidden
      >
        <div className="inline-block animate-marquee">
          {MARQUEE}
          {MARQUEE}
        </div>
      </div>

      <div className="flex w-full justify-center px-2.5 pt-2.5 lg:px-5 lg:pt-8">
        <div className="flex w-full max-w-[900px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:min-h-[500px] lg:flex-row">
          <ProductGallery images={theme.listing.images} alt={theme.listing.highlight} />

          <div className="flex w-full flex-col justify-center gap-4 p-6 lg:w-1/2 lg:gap-0 lg:px-10 lg:py-8">
            <div className="mb-1">
              <h1 className="mb-1 font-display text-[28px] leading-tight font-bold text-ink">
                {theme.listing.title} <span className="text-brand">{theme.listing.highlight}</span>
              </h1>
              <p className="text-[13px] text-neutral-400">{theme.listing.subtitle}</p>
            </div>

            <BuyBox
              key={theme.slug}
              slug={theme.slug}
              priceCents={theme.priceCents}
              offer={
                offer
                  ? {
                      code: offer.code,
                      label: offer.label,
                      delaySeconds: offer.delaySeconds,
                      priceCents: applyOffer(offer, theme.priceCents),
                    }
                  : null
              }
            >
              {theme.listing.features.length > 0 && (
                <ul className="mt-2.5 mb-5 flex flex-col gap-2">
                  {theme.listing.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-3 text-[13px] leading-snug text-neutral-600"
                    >
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" /> {f}
                    </li>
                  ))}
                </ul>
              )}
            </BuyBox>

            <div className="mt-3 flex flex-col items-center gap-1.5 text-sm font-semibold">
              <Link
                href={`/ejemplo/${theme.slug}`}
                className="text-brand underline-offset-4 hover:underline"
              >
                Ver cómo queda una Boxie {theme.name} ▸
              </Link>
              <Link
                href={`/ejemplo/${theme.slug}/personalizar`}
                className="text-neutral-500 underline-offset-4 hover:text-brand hover:underline"
              >
                Probá cómo se personaliza ▸
              </Link>
            </div>

            <div className="mt-5 border-t border-dashed border-neutral-200 pt-4">
              <h2 className="mb-2.5 text-center font-display text-[11px] font-bold text-ink">
                ¿Por qué elegir Boxie?
              </h2>
              <div className="flex justify-between gap-2.5">
                {[
                  ['🚀', 'Envío', 'Inmediato'],
                  ['🌎', 'Sin', 'Distancias'],
                  ['💖', 'Emoción', 'Garantizada'],
                ].map(([icon, a, b]) => (
                  <div
                    key={a}
                    className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-neutral-100 bg-neutral-50 p-2"
                  >
                    <span className="text-base">{icon}</span>
                    <p className="text-center text-[10px] leading-tight font-semibold text-neutral-500">
                      {a}
                      <br />
                      {b}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <section className="w-full px-5 pt-8 pb-16 text-center">
          <h2 className="mb-5 font-display text-xl font-bold text-ink">Otras opciones</h2>
          <div className="flex flex-wrap justify-center gap-5">
            {others.map((t) => (
              <Link
                key={t.id}
                href={`/tematicas/${t.slug}`}
                className="relative h-[200px] w-[150px] overflow-hidden rounded-2xl shadow-[0_5px_15px_rgba(0,0,0,0.05)]"
              >
                <Image
                  src={t.listing.images[0]!}
                  alt={t.listing.highlight}
                  fill
                  sizes="150px"
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/70 to-transparent p-2.5 text-left">
                  <h3 className="font-display text-sm font-bold text-white">
                    {t.listing.highlight}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
