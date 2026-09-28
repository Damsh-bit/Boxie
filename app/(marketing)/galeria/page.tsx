import type { Metadata } from 'next'
import { searchHints } from '@/content/gallery'
import { occasions } from '@/content/home'
import { screenName } from '@/content/screens'
import { foldText, galleryCategories, readGalleryParams } from '@/domain/gallery'
import { upcomingEvents } from '@/domain/marketing/calendar'
import type { Plan } from '@/domain/plans'
import { getThemeVersionConfig, listPublicPlans } from '@/server/catalog'
import { getStorefront } from '@/server/storefront'
import type { ParsedSlide, ParsedThemeConfig } from '@/slides/config'
import { isStructural, planContents } from '@/slides/plans'
import { slideDefinitions } from '@/slides/schemas'
import { themeEmoji } from '../_home/theme-look'
import { Gallery } from './Gallery'
import type { GalleryContents, GalleryPlan, GallerySeason, GalleryTheme } from './types'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Galería de Boxies',
  description:
    'Elegí la temática perfecta para emocionar: pareja, cumpleaños, amistad, mamá y más. Buscá por ocasión, compará qué trae cada plan y mirá un ejemplo antes de comprar.',
  alternates: { canonical: '/galeria' },
}

/** Las pantallas que se venden de una lista de slides, sin repetir tipo. */
function contentsOf(slides: ParsedSlide[]): GalleryContents {
  const seen = new Set<string>()
  const items = slides.flatMap((s) => {
    if (isStructural(s.kind) || seen.has(s.kind)) return []
    seen.add(s.kind)
    const def = slideDefinitions[s.kind]
    const name = screenName(s.kind, def.label)
    return [
      {
        kind: s.kind,
        emoji: name.emoji,
        label: name.label,
        game: def.category === 'game' && s.kind !== 'connector.gamer',
      },
    ]
  })
  return { screens: slides.length, games: items.filter((i) => i.game).length, items }
}

/** Qué trae la temática en cada plan (o entera, si no hay planes). */
function contentsByPlan(config: ParsedThemeConfig | null, plans: Plan[]) {
  if (!config) return {}
  if (plans.length === 0) return { '': contentsOf(config.slides) }
  return Object.fromEntries(
    planContents(config, plans).map((c) => [c.planSlug, contentsOf(c.slides)]),
  )
}

export default async function GalleryPage({ searchParams }: PageProps<'/galeria'>) {
  const [sf, rawPlans, params] = await Promise.all([
    getStorefront(),
    listPublicPlans(),
    searchParams,
  ])
  const configs = await Promise.all(sf.themes.map((t) => getThemeVersionConfig(t.versionId)))

  // Las fechas fuertes del año que viene, con la temática que le va a cada una.
  const events = upcomingEvents(new Date(), 366)

  const themes: GalleryTheme[] = sf.themes.map((t, i) => {
    const ownEvents = events.filter((e) => e.theme === t.slug)
    const next = ownEvents[0]
    const ownOccasions = occasions.filter((o) => o.theme === t.slug)
    const occasionLabels = [
      ...new Set([...ownOccasions.map((o) => o.label), ...ownEvents.map((e) => e.name)]),
    ]
    const guide = t.listing.guide
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      category: t.category,
      order: i,
      description: t.listing.cardDescription || t.description,
      subtitle: t.listing.subtitle,
      images: t.listing.images.slice(0, 4),
      color: t.listing.cardColor,
      tone: t.listing.cardTone,
      emoji: themeEmoji(t.slug, guide?.emoji),
      features: t.listing.features,
      guide,
      occasions: occasionLabels,
      priceCents: t.priceCents,
      contents: contentsByPlan(configs[i] ?? null, rawPlans),
      daysUntil: next?.daysUntil ?? null,
      next: next
        ? {
            name: next.name,
            date: next.date,
            daysUntil: next.daysUntil,
            hot: next.daysUntil <= next.leadDays + 7,
          }
        : null,
      search: foldText(
        [
          t.name,
          t.category,
          t.description,
          t.listing.highlight,
          t.listing.subtitle,
          t.listing.cardDescription,
          ...t.listing.features,
          guide?.title,
          guide?.text,
          ...occasionLabels,
          ...ownOccasions.map((o) => o.pitch),
          searchHints[t.slug],
        ]
          .filter(Boolean)
          .join(' '),
      ),
    }
  })

  const plans: GalleryPlan[] = sf.plans.map((p) => ({
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    highlighted: p.highlighted,
  }))

  // Arriba se destaca la fecha que ya se está buscando (la más cercana).
  const season: GallerySeason | null =
    themes
      .flatMap((t) => (t.next?.hot ? [{ ...t.next, slug: t.slug }] : []))
      .sort((a, b) => a.daysUntil - b.daysUntil)[0] ?? null

  const initial = readGalleryParams(params, {
    categories: galleryCategories(themes).map((c) => c.name),
    plans: plans.map((p) => p.slug),
  })

  return (
    <Gallery
      themes={themes}
      plans={plans}
      recommendedPlan={sf.recommended?.slug ?? null}
      priceFromCents={sf.priceFromCents}
      maxScreens={sf.maxScreens}
      season={season}
      initial={initial}
    />
  )
}
