import { ArrowRight, MessageCircleHeart } from 'lucide-react'
import type { Metadata, Route } from 'next'
import { homeFaqs } from '@/content/home'
import { site, siteUrl } from '@/content/site'
import type { CatalogTheme } from '@/domain/catalog'
import { formatARS } from '@/domain/money'
import { getPublicSettings, listPublishedThemes } from '@/server/catalog'
import { LiftLink } from '@/ui/LiftLink'
import { FinalCta } from './_home/FinalCta'
import { Hero } from './_home/Hero'
import { HowItWorks } from './_home/HowItWorks'
import { InsideBoxie } from './_home/InsideBoxie'
import { OccasionMarquee } from './_home/OccasionMarquee'
import { Pricing } from './_home/Pricing'
import { Mark, SectionHeading } from './_home/primitives'
import { Reaction } from './_home/Reaction'
import { StickyBuyBar } from './_home/StickyBuyBar'
import type { HomeTheme } from './_home/theme-look'
import { ThemeShowcase } from './_home/ThemeShowcase'
import { WhyBoxie } from './_home/WhyBoxie'
import { Faq } from './ayuda/Faq'

export const dynamic = 'force-dynamic'

const TITLE = 'Boxie · Regalo digital personalizado con fotos, música y juegos'

/** El precio más bajo del catálogo (el "desde" de la home). */
function fromPrice(themes: CatalogTheme[], fallback: number) {
  return themes.length ? Math.min(...themes.map((t) => t.priceCents)) : fallback
}

export async function generateMetadata(): Promise<Metadata> {
  const [themes, settings] = await Promise.all([listPublishedThemes(), getPublicSettings()])
  const price = formatARS(fromPrice(themes, settings.basePriceCents))
  const description = `Regalá una Boxie: un regalo digital personalizado con fotos, dedicatoria, su canción y juegos, que se abre desde el celular. Ideal para aniversarios, cumpleaños y regalos a distancia. Llega al instante por WhatsApp, desde ${price}.`
  return {
    title: { absolute: TITLE },
    description,
    keywords: [
      'regalo digital',
      'regalo virtual',
      'regalo personalizado',
      'regalo original',
      'regalo para mi novia',
      'regalo para mi novio',
      'regalo de cumpleaños',
      'regalo de aniversario',
      'regalo a distancia',
      'regalo de último momento',
    ],
    alternates: { canonical: '/' },
    openGraph: {
      title: TITLE,
      description,
      url: '/',
      type: 'website',
      images: themes[0] ? [{ url: themes[0].listing.images[0]!, alt: 'Una Boxie de regalo' }] : [],
    },
    twitter: { card: 'summary_large_image', title: TITLE, description },
  }
}

/** Datos estructurados: la marca, el producto con su precio y las preguntas frecuentes. */
function structuredData(themes: CatalogTheme[], priceCents: number) {
  const url = siteUrl()
  const absolute = (path: string) => (path.startsWith('http') ? path : `${url}${path}`)
  const prices = themes.map((t) => t.priceCents / 100)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}/#organizacion`,
        name: site.name,
        url,
        logo: absolute('/brand/boxie-logo.png'),
        email: site.emails.hello,
        sameAs: [site.social.instagram],
      },
      {
        '@type': 'WebSite',
        '@id': `${url}/#sitio`,
        url,
        name: site.name,
        inLanguage: 'es-AR',
        publisher: { '@id': `${url}/#organizacion` },
      },
      {
        '@type': 'Product',
        name: 'Boxie · Regalo digital personalizado',
        description:
          'Experiencia digital personalizada con fotos, dedicatoria, música y juegos, que se regala con un link y se abre desde el celular.',
        brand: { '@type': 'Brand', name: site.shortName },
        image: themes.map((t) => absolute(t.listing.images[0]!)),
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'ARS',
          lowPrice: prices.length ? Math.min(...prices) : priceCents / 100,
          highPrice: prices.length ? Math.max(...prices) : priceCents / 100,
          offerCount: Math.max(themes.length, 1),
          availability: 'https://schema.org/InStock',
          url: absolute('/galeria'),
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: homeFaqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  }
}

export default async function HomePage() {
  const [themes, settings] = await Promise.all([listPublishedThemes(), getPublicSettings()])
  const priceCents = fromPrice(themes, settings.basePriceCents)
  const price = formatARS(priceCents)
  const sample = themes[0]?.slug ?? 'pareja'
  const exampleHref = `/ejemplo/${sample}` as Route
  const editorHref = `/ejemplo/${sample}/personalizar` as Route

  const homeThemes: HomeTheme[] = themes.map((t) => ({
    slug: t.slug,
    name: t.name,
    description: t.description,
    color: t.listing.cardColor,
    tone: t.listing.cardTone,
    images: t.listing.images,
    features: t.listing.features,
    price: formatARS(t.priceCents),
  }))

  // Tres fotos para la demo de la galería: primero la principal de cada temática.
  const photos = [
    ...themes.map((t) => t.listing.images[0]!),
    ...themes.flatMap((t) => t.listing.images.slice(1)),
  ].slice(0, 3)

  const jsonLd = JSON.stringify(structuredData(themes, priceCents)).replace(/</g, '\\u003c')

  return (
    <div className="overflow-x-clip bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Hero themes={homeThemes} />
      <OccasionMarquee />
      <ThemeShowcase themes={homeThemes} />
      <InsideBoxie photos={photos} exampleHref={exampleHref} />
      <HowItWorks price={price} editorHref={editorHref} exampleHref={exampleHref} />
      <Reaction lifetimeDays={settings.giftLifetimeDays} />
      <Pricing priceCents={priceCents} lifetimeDays={settings.giftLifetimeDays} />
      <WhyBoxie />

      <section
        id="preguntas"
        aria-labelledby="preguntas-title"
        className="scroll-mt-24 rounded-t-[40px] bg-white px-5 pt-20 pb-14 sm:px-8 sm:pt-24"
      >
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Preguntas frecuentes"
              title={
                <span id="preguntas-title">
                  Todo sobre tu <Mark>regalo digital</Mark>
                </span>
              }
              text="Lo que más nos preguntan antes de regalar una Boxie."
              className="lg:mb-8"
            />
            <LiftLink
              href="/contacto"
              className="mx-auto flex max-w-md items-center gap-4 rounded-3xl bg-paper/60 p-5 ring-1 ring-black/5 lg:mx-0"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white">
                <MessageCircleHeart className="size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">¿Te quedó alguna duda?</span>
                <span className="block text-sm text-ink/60">
                  Escribinos y te ayudamos a elegir.
                </span>
              </span>
              <ArrowRight className="size-5 text-brand" aria-hidden />
            </LiftLink>
          </div>
          <Faq items={[...homeFaqs]} />
        </div>
      </section>

      <FinalCta price={price} editorHref={editorHref} />
      <StickyBuyBar price={price} />
    </div>
  )
}
