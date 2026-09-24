import { Check, Play, Wand2 } from 'lucide-react'
import type { Metadata } from 'next'
import type { Route } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  applyOffer,
  getPublishedTheme,
  getUrgencyOffer,
  listPublishedThemes,
} from '@/server/catalog'
import { HoverZoom, LiftLink } from '@/ui/LiftLink'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { BuyBox } from './BuyBox'
import { Marquee } from './Marquee'
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

const WHY = [
  ['🚀', 'Envío inmediato'],
  ['🌎', 'Sin distancias'],
  ['💖', 'Emoción garantizada'],
] as const

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
      <Marquee />

      <div className="flex w-full justify-center px-2.5 pt-2.5 lg:px-5 lg:pt-8">
        <div className="flex w-full max-w-[980px] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] lg:flex-row">
          <ProductGallery images={theme.listing.images} alt={theme.listing.highlight} />

          <Stagger
            immediate
            delay={0.15}
            step={0.07}
            className="flex w-full flex-col justify-center gap-1 p-6 sm:p-8 lg:w-1/2 lg:px-10 lg:py-9"
          >
            <StaggerItem y={14}>
              <h1 className="mb-1.5 font-display text-[30px] leading-tight font-bold text-ink">
                {theme.listing.title} <span className="text-brand">{theme.listing.highlight}</span>
              </h1>
              {theme.listing.subtitle && (
                <p className="text-[0.95rem] text-neutral-500">{theme.listing.subtitle}</p>
              )}
            </StaggerItem>

            <StaggerItem y={14}>
              <BuyBox
                key={theme.slug}
                slug={theme.slug}
                name={theme.name}
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
                  <ul className="mt-1 mb-6 flex flex-col gap-2.5">
                    {theme.listing.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-3 text-[0.92rem] leading-snug text-neutral-700"
                      >
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                          <Check className="size-3.5" strokeWidth={3} aria-hidden />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </BuyBox>
            </StaggerItem>

            <StaggerItem y={14} className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <LiftLink
                href={`/ejemplo/${theme.slug}`}
                lift={3}
                className="group flex items-center gap-2.5 rounded-2xl border border-neutral-200 p-3 text-left text-sm leading-tight font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
                  <Play className="size-3.5 translate-x-px fill-current" aria-hidden />
                </span>
                <span>Ver cómo queda una Boxie {theme.name}</span>
              </LiftLink>
              <LiftLink
                href={`/ejemplo/${theme.slug}/personalizar`}
                lift={3}
                className="group flex items-center gap-2.5 rounded-2xl border border-neutral-200 p-3 text-left text-sm leading-tight font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-white">
                  <Wand2 className="size-4" aria-hidden />
                </span>
                <span>Probá cómo se personaliza</span>
              </LiftLink>
            </StaggerItem>

            <StaggerItem y={14} className="mt-5 border-t border-dashed border-neutral-200 pt-4">
              <h2 className="mb-3 text-center text-xs font-bold tracking-widest text-neutral-500 uppercase">
                ¿Por qué elegir Boxie?
              </h2>
              <ul className="grid grid-cols-3 gap-2.5">
                {WHY.map(([icon, text]) => (
                  <li
                    key={text}
                    className="flex flex-col items-center gap-1.5 rounded-xl border border-neutral-100 bg-neutral-50 px-2 py-3"
                  >
                    <span className="text-xl" aria-hidden>
                      {icon}
                    </span>
                    <p className="text-center text-xs leading-tight font-semibold text-neutral-600">
                      {text}
                    </p>
                  </li>
                ))}
              </ul>
            </StaggerItem>
          </Stagger>
        </div>
      </div>

      {others.length > 0 && (
        <section className="w-full px-5 pt-12 pb-20 text-center">
          <Reveal as="h2" className="mb-6 font-display text-2xl font-bold text-ink">
            Otras opciones
          </Reveal>
          <Stagger className="flex flex-wrap justify-center gap-5" step={0.1}>
            {others.map((t) => (
              <StaggerItem key={t.id} y={30}>
                <LiftLink
                  href={`/tematicas/${t.slug}` as Route}
                  className="group relative block h-[220px] w-[165px] overflow-hidden rounded-2xl shadow-[0_8px_20px_rgba(0,0,0,0.08)] transition-shadow duration-300 hover:shadow-[0_18px_40px_rgba(0,0,0,0.16)]"
                >
                  <HoverZoom className="absolute inset-0">
                    <Image
                      src={t.listing.images[0]!}
                      alt={t.listing.highlight}
                      fill
                      sizes="165px"
                      className="object-cover"
                    />
                  </HoverZoom>
                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-left">
                    <h3 className="font-display text-base font-bold text-white">
                      {t.listing.highlight}
                    </h3>
                  </div>
                </LiftLink>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}
    </div>
  )
}
