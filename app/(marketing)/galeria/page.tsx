import { Layers } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { formatARS } from '@/domain/money'
import { getStorefront } from '@/server/storefront'
import { GuideCard } from '@/ui/GuideCard'
import { Stagger, StaggerItem } from '@/ui/motion'
import { PageIntro } from '../_components/PageIntro'
import { Mark, SectionHeading } from '../_home/primitives'
import { themeEmoji } from '../_home/theme-look'
import { GalleryGrid, type GalleryTheme } from './GalleryGrid'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Galería de Boxies',
  description:
    'Elegí la temática perfecta para emocionar: pareja, cumpleaños, amistad y más. Regalos digitales personalizados que llegan al instante.',
  alternates: { canonical: '/galeria' },
}

export default async function GalleryPage({ searchParams }: PageProps<'/galeria'>) {
  const sf = await getStorefront()
  const { plan: planParam } = await searchParams
  // El plan elegido en la home o en /precios viaja a la ficha (solo si existe).
  const plan = sf.plans.find((p) => p.slug === planParam) ?? null
  const byPlans = sf.plans.length > 1
  const price = formatARS(sf.priceFromCents)

  const themes: GalleryTheme[] = sf.themes.map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    category: t.category,
    description: t.listing.cardDescription || t.description,
    image: t.listing.images[1] ?? t.listing.images[0]!,
    emoji: themeEmoji(t.slug, t.listing.guide?.emoji),
    priceLabel: plan
      ? formatARS(plan.priceCents)
      : byPlans
        ? `Desde ${price}`
        : formatARS(t.priceCents),
  }))
  const guides = sf.themes.filter((t) => t.listing.guide)

  return (
    <div className="overflow-x-clip bg-white pb-8">
      <PageIntro
        eyebrow="Galería de temáticas"
        title={
          <>
            Elegí la Boxie <Mark>perfecta</Mark>
          </>
        }
        text={`${themes.length} temáticas listas para personalizar con tus fotos, tu dedicatoria y su canción. Cada una trae hasta ${sf.maxScreens} sorpresas.`}
      >
        {plan ? (
          <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-brand-soft px-4 py-2 text-sm text-ink">
            <Layers className="size-4 text-brand" aria-hidden />
            Elegiste el plan <strong>{plan.name}</strong> ({formatARS(plan.priceCents)})
            <Link
              href="/precios"
              className="font-bold text-brand underline-offset-4 hover:underline"
            >
              Cambiar
            </Link>
          </p>
        ) : byPlans ? (
          <p className="text-sm text-ink/60">
            Todas traen lo mismo en cada plan ·{' '}
            <Link
              href="/precios"
              className="font-bold text-brand underline-offset-4 hover:underline"
            >
              Ver planes y precios
            </Link>
          </p>
        ) : null}
      </PageIntro>

      <GalleryGrid themes={themes} plan={plan?.slug ?? null} />

      {guides.length > 0 && (
        <section
          aria-labelledby="elegir-title"
          className="mt-6 rounded-t-[40px] bg-paper/60 px-5 pt-20 pb-16 sm:px-8"
        >
          <SectionHeading
            eyebrow="¿Dudás entre dos?"
            title={
              <span id="elegir-title">
                ¿Qué Boxie <Mark>elegir</Mark>?
              </span>
            }
            text="Cada momento tiene su magia. Encontrá la tuya."
          />
          <Stagger
            className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
            step={0.1}
          >
            {guides.map((t) => (
              <StaggerItem key={t.id} className="h-full" y={36}>
                <GuideCard
                  href={`/tematicas/${t.slug}${plan ? `?plan=${plan.slug}` : ''}` as Route}
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
