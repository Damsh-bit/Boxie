import { ArrowRight, MessageCircleHeart } from 'lucide-react'
import type { Metadata, Route } from 'next'
import { experiences, homeFaqs, occasions, type FaqItem, type Occasion } from '@/content/home'
import { site, siteUrl } from '@/content/site'
import { formatARS } from '@/domain/money'
import { describeLifetime } from '@/domain/plans'
import type { SlideKind } from '@/slides/schemas'
import { getSocialProof } from '@/server/social-proof'
import { getStorefront, type Storefront } from '@/server/storefront'
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
import { themeEmoji, type HomeTheme } from './_home/theme-look'
import { ThemeShowcase } from './_home/ThemeShowcase'
import { WhyBoxie } from './_home/WhyBoxie'
import { Faq } from './ayuda/Faq'

export const dynamic = 'force-dynamic'

const TITLE = 'Boxie · Regalo digital personalizado con fotos, música y juegos'

/** "desde $ 3.490" si hay planes; si no, el precio. */
function priceText(sf: Storefront) {
  const price = formatARS(sf.priceFromCents)
  return sf.plans.length > 1 ? `desde ${price}` : price
}

function faqsOf(sf: Storefront): FaqItem[] {
  return homeFaqs({
    price: priceText(sf),
    lifetime: describeLifetime(sf.lifetimeDays),
    plans: sf.plans.length > 1,
    passwordByPlan: sf.plans.some((p) => !p.allowPassword),
  })
}

/**
 * Las ocasiones del catálogo: las de la home cuya temática está publicada y
 * una por cada temática que el panel publicó y no tiene ocasión propia.
 */
function occasionsOf(themes: Storefront['themes']): Occasion[] {
  const published = new Set(themes.map((t) => t.slug))
  const covered = new Set(occasions.map((o) => o.theme))
  return [
    ...occasions.filter((o) => published.has(o.theme)),
    ...themes
      .filter((t) => !covered.has(t.slug))
      .map((t) => ({
        id: `tematica-${t.slug}`,
        emoji: themeEmoji(t.slug, t.listing.guide?.emoji),
        label: t.name,
        theme: t.slug,
        pitch: t.listing.subtitle || t.listing.guide?.text || t.description,
      })),
  ]
}

export async function generateMetadata(): Promise<Metadata> {
  const sf = await getStorefront()
  const description = `Regalá una Boxie: un regalo digital personalizado con fotos, dedicatoria, su canción y juegos, que se abre desde el celular. Ideal para aniversarios, cumpleaños y regalos a distancia. Llega al instante por WhatsApp, desde ${formatARS(sf.priceFromCents)}.`
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
      images: sf.themes[0]
        ? [{ url: sf.themes[0].listing.images[0]!, alt: 'Una Boxie de regalo' }]
        : [],
    },
    twitter: { card: 'summary_large_image', title: TITLE, description },
  }
}

/** Datos estructurados: la marca, el producto con su precio y las preguntas frecuentes. */
function structuredData(sf: Storefront, faqs: FaqItem[]) {
  const url = siteUrl()
  const absolute = (path: string) => (path.startsWith('http') ? path : `${url}${path}`)
  const prices = sf.plans.length
    ? sf.plans.map((p) => p.priceCents / 100)
    : sf.themes.map((t) => t.priceCents / 100)
  const low = prices.length ? Math.min(...prices) : sf.priceFromCents / 100
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${url}/#organizacion`,
        name: sf.business.name,
        url,
        logo: absolute('/brand/boxie-logo.png'),
        email: site.emails.hello,
        sameAs: [sf.business.instagram?.url ?? site.social.instagram],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: sf.business.supportEmail,
          availableLanguage: 'es',
          ...(sf.business.whatsapp && { url: sf.business.whatsapp.url }),
        },
      },
      {
        '@type': 'WebSite',
        '@id': `${url}/#sitio`,
        url,
        name: sf.business.name,
        inLanguage: 'es-AR',
        publisher: { '@id': `${url}/#organizacion` },
      },
      {
        '@type': 'Product',
        name: 'Boxie · Regalo digital personalizado',
        description:
          'Experiencia digital personalizada con fotos, dedicatoria, música y juegos, que se regala con un link y se abre desde el celular.',
        brand: { '@type': 'Brand', name: site.shortName },
        image: sf.themes.map((t) => absolute(t.listing.images[0]!)),
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'ARS',
          lowPrice: low,
          highPrice: prices.length ? Math.max(...prices) : low,
          offerCount: Math.max(sf.plans.length || sf.themes.length, 1),
          availability: sf.salesPaused
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
          url: absolute('/galeria'),
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  }
}

export default async function HomePage() {
  const sf = await getStorefront()
  const proof = await getSocialProof({ themes: sf.themes, salesPaused: sf.salesPaused })
  const byPlans = sf.plans.length > 1
  const price = formatARS(sf.priceFromCents)
  const sample = sf.themes[0]
  const exampleHref = `/ejemplo/${sample?.slug ?? 'pareja'}` as Route
  const editorHref = `/ejemplo/${sample?.slug ?? 'pareja'}/personalizar` as Route
  const faqs = faqsOf(sf)

  const homeThemes: HomeTheme[] = sf.themes.map((t) => {
    // Con planes, cada temática se vende desde el plan más barato.
    const themePrice = formatARS(byPlans ? sf.priceFromCents : t.priceCents)
    return {
      slug: t.slug,
      name: t.name,
      description: t.description,
      color: t.listing.cardColor,
      tone: t.listing.cardTone,
      images: t.listing.images,
      features: t.listing.features,
      emoji: themeEmoji(t.slug, t.listing.guide?.emoji),
      price: themePrice,
      priceLabel: byPlans ? `Desde ${themePrice}` : themePrice,
    }
  })

  // Tres fotos para la demo de la galería: primero la principal de cada temática.
  const photos = [
    ...sf.themes.map((t) => t.listing.images[0]!),
    ...sf.themes.flatMap((t) => t.listing.images.slice(1)),
  ].slice(0, 3)

  // Las sorpresas que no vienen en el plan más simple llevan "Desde {plan}".
  const fromPlan = Object.fromEntries(
    experiences.flatMap((e) => {
      const plan = sf.kindFromPlan[e.kind as SlideKind]
      return plan ? [[e.id, plan]] : []
    }),
  )

  const jsonLd = JSON.stringify(structuredData(sf, faqs)).replace(/</g, '\\u003c')

  return (
    <div className="overflow-x-clip bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <Hero themes={homeThemes} salesPaused={sf.salesPaused} proof={proof} />
      <OccasionMarquee />
      <ThemeShowcase
        themes={homeThemes}
        occasions={occasionsOf(sf.themes)}
        maxScreens={sf.maxScreens}
      />
      <InsideBoxie
        photos={photos}
        exampleHref={exampleHref}
        maxScreens={sf.maxScreens}
        fromPlan={fromPlan}
      />
      <HowItWorks
        price={byPlans ? `desde ${price}` : price}
        editorHref={editorHref}
        exampleHref={exampleHref}
        sample={{ name: homeThemes[0]?.name ?? 'Pareja', emoji: homeThemes[0]?.emoji ?? '💘' }}
      />
      <Reaction maxScreens={sf.maxScreens} lifetimeDays={sf.lifetimeDays} />
      <Pricing
        priceCents={sf.priceFromCents}
        lifetimeDays={sf.lifetimeDays.max}
        maxScreens={sf.maxScreens}
        plans={sf.plans}
        welcome={sf.welcome}
        editorHref={editorHref}
        salesPaused={sf.salesPaused}
      />
      <WhyBoxie passwordByPlan={sf.plans.some((p) => !p.allowPassword)} />

      <section
        id="preguntas"
        aria-labelledby="preguntas-title"
        className="scroll-mt-24 rounded-t-[40px] bg-white px-5 pt-20 pb-14 sm:px-8 sm:pt-24"
      >
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
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
              href="/ayuda"
              className="mx-auto flex max-w-md items-center gap-4 rounded-3xl bg-paper/60 p-5 ring-1 ring-black/5 lg:mx-0"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand text-white">
                <MessageCircleHeart className="size-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">¿Te quedó alguna duda?</span>
                <span className="block text-sm text-ink/60">
                  En el centro de ayuda está todo, y si no, te respondemos por chat.
                </span>
              </span>
              <ArrowRight className="size-5 shrink-0 text-brand" aria-hidden />
            </LiftLink>
          </div>
          <Faq items={faqs} />
        </div>
      </section>

      <FinalCta price={price} editorHref={editorHref} />
      <StickyBuyBar
        price={byPlans ? `Desde ${price}` : price}
        salesPaused={sf.salesPaused}
        editorHref={editorHref}
      />
    </div>
  )
}
