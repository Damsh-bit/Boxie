'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Eye, Layers } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { describeDaysUntil } from '@/domain/gallery'
import { ButtonLink } from '@/ui/Button'
import { useCurrency } from '@/ui/currency/CurrencyContext'
import { Stagger, StaggerItem, spring } from '@/ui/motion'
import { CountUp, Mark } from '../_home/primitives'
import { longDate, themeHref } from './helpers'
import type { GalleryPlan, GallerySeason, GalleryTheme } from './types'

/**
 * Arriba de la galería: el título a la izquierda y, a la derecha, la fecha que
 * ya se está buscando (Día de la Madre, San Valentín…) con la temática que le
 * va. Fuera de temporada, un abanico con las temáticas.
 */
export function GalleryHeader({
  themes,
  maxScreens,
  plans,
  plan,
  season,
  onQuickView,
}: {
  themes: GalleryTheme[]
  maxScreens: number
  plans: GalleryPlan[]
  plan: string | null
  season: GallerySeason | null
  onQuickView(slug: string): void
}) {
  const { formatPrice } = useCurrency()
  const seasonTheme = season ? themes.find((t) => t.slug === season.slug) : undefined
  const chosen = plans.find((p) => p.slug === plan)

  return (
    <header className="relative isolate px-5 pt-[104px] pb-7 sm:px-8 sm:pt-[136px] sm:pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute top-6 left-[20%] -z-10 size-[26rem] rounded-full bg-brand/10 blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-[1.25fr_1fr] lg:gap-14">
        <Stagger immediate step={0.08} className="text-center lg:text-left">
          <StaggerItem
            as="span"
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.18em] text-brand uppercase"
          >
            Galería de temáticas
          </StaggerItem>
          <StaggerItem
            as="h1"
            className="font-display text-[2.35rem] leading-[1.06] font-bold text-balance text-ink sm:text-5xl lg:text-[3.6rem]"
          >
            Elegí la Boxie <Mark>perfecta</Mark>
          </StaggerItem>
          <StaggerItem
            as="p"
            className="mx-auto mt-3 max-w-xl text-[1.05rem] leading-relaxed text-pretty text-ink/70 sm:mt-4 sm:text-lg lg:mx-0"
          >
            {themes.length} temáticas listas para personalizar con tus fotos, tu dedicatoria y su
            canción. Cada una trae hasta {maxScreens} sorpresas.
          </StaggerItem>
          <StaggerItem className="mt-5 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
            {chosen ? (
              <p className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-brand-soft px-4 py-2 text-sm text-ink">
                <Layers className="size-4 text-brand" aria-hidden />
                Estás viendo el plan <strong>{chosen.name}</strong> (
                {formatPrice(chosen.priceCents)})
                <Link
                  href="/precios"
                  className="font-bold text-brand underline-offset-4 hover:underline"
                >
                  Comparar planes
                </Link>
              </p>
            ) : plans.length > 1 ? (
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
          </StaggerItem>
        </Stagger>

        {season && seasonTheme ? (
          <SeasonSpotlight
            season={season}
            theme={seasonTheme}
            plan={plan}
            onQuickView={() => onQuickView(seasonTheme.slug)}
          />
        ) : (
          <ThemeFan themes={themes} />
        )}
      </div>
    </header>
  )
}

/** La fecha que se viene: grande en la computadora, una tira en el celular. */
function SeasonSpotlight({
  season,
  theme,
  plan,
  onQuickView,
}: {
  season: GallerySeason
  theme: GalleryTheme
  plan: string | null
  onQuickView(): void
}) {
  const href = themeHref(theme.slug, plan)
  const soon = season.daysUntil <= 1
  const shade = `linear-gradient(160deg, color-mix(in srgb, ${theme.color} 45%, rgb(42 36 51 / 0.2)) 0%, rgb(42 36 51 / 0.88) 78%)`

  return (
    <>
      {/* Celular y tablet: una tira que no empuja la grilla muy abajo. */}
      <motion.div
        className="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-ink p-2.5 pr-4 text-left text-white shadow-[0_18px_40px_-18px_rgba(42,36,51,0.6)] lg:hidden"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring.soft, delay: 0.35 }}
      >
        <div
          className="relative size-16 shrink-0 overflow-hidden rounded-2xl"
          style={{ backgroundColor: theme.color }}
        >
          {theme.images[0] && (
            <Image src={theme.images[0]} alt="" fill sizes="64px" className="object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[0.65rem] font-extrabold tracking-[0.16em] text-brand-muted uppercase">
            <PulseDot /> Se viene
          </p>
          <p className="truncate font-display text-lg leading-tight font-bold">{season.name}</p>
          <p className="text-sm text-white/70">{describeDaysUntil(season.daysUntil)}</p>
        </div>
        <Link
          href={href}
          className="relative grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink after:absolute after:-inset-[200%] after:content-['']"
          aria-label={`Ver la Boxie para ${season.name}`}
        >
          <ArrowRight className="size-5" aria-hidden />
        </Link>
      </motion.div>

      {/* Computadora: la tarjeta grande con la cuenta regresiva. */}
      <motion.aside
        aria-label={`Se viene ${season.name}`}
        className="relative hidden overflow-hidden rounded-[36px] text-white shadow-[0_40px_80px_-30px_rgba(42,36,51,0.6)] lg:block"
        initial={{ opacity: 0, y: 30, rotate: 2.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ ...spring.gentle, delay: 0.3 }}
        style={{ backgroundColor: theme.color }}
      >
        {theme.images[0] && (
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={theme.images[0]}
              alt=""
              fill
              priority
              sizes="440px"
              className="object-cover"
            />
          </motion.div>
        )}
        <div className="absolute inset-0" style={{ background: shade }} />
        <div className="relative flex min-h-[380px] flex-col justify-end p-8">
          <span className="mb-auto inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[0.68rem] font-extrabold tracking-[0.18em] uppercase backdrop-blur">
            <PulseDot /> Se viene
          </span>
          <p className="font-display text-[2.4rem] leading-[1.05] font-bold">{season.name}</p>
          <p className="mt-1 text-white/75 first-letter:uppercase">{longDate(season.date)}</p>
          <div className="mt-5 flex items-end gap-3">
            {soon ? (
              <span className="font-display text-5xl leading-none font-bold">
                ¡{describeDaysUntil(season.daysUntil).replace('es ', 'Es ')}!
              </span>
            ) : (
              <>
                <CountUp
                  to={season.daysUntil}
                  className="font-display text-7xl leading-[0.8] font-bold"
                />
                <span className="pb-0.5 text-sm leading-snug font-semibold text-white/80">
                  días para
                  <br />
                  regalarle algo lindo
                </span>
              </>
            )}
          </div>
          <div className="mt-7 flex flex-wrap gap-2">
            <ButtonLink href={href} variant="white" size="md">
              Ver la Boxie <span aria-hidden>{theme.emoji}</span>
            </ButtonLink>
            <button
              type="button"
              onClick={onQuickView}
              className="inline-flex h-11 items-center gap-2 rounded-full border border-white/35 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              <Eye className="size-4" aria-hidden /> Vista rápida
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}

function PulseDot() {
  return (
    <span className="relative flex size-2 shrink-0" aria-hidden>
      <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-70" />
      <span className="relative size-2 rounded-full bg-brand" />
    </span>
  )
}

/** Fuera de temporada: las portadas en abanico, que se abren al pasar el mouse. */
function ThemeFan({ themes }: { themes: GalleryTheme[] }) {
  const cards = themes.slice(0, 3)
  if (cards.length === 0) return null
  const spread = [-1, 0, 1].slice(0, cards.length)
  const middle = (cards.length - 1) / 2
  return (
    <motion.div
      aria-hidden
      className="relative hidden h-[360px] lg:block"
      initial={{ opacity: 0, y: 36 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring.gentle, delay: 0.3 }}
    >
      <motion.div
        className="flex size-full items-center justify-center"
        initial="rest"
        animate="rest"
        whileHover="open"
      >
        {cards.map((t, i) => {
          const pos = cards.length === 3 ? spread[i]! : i - middle
          return (
            <motion.div
              key={t.id}
              className="absolute h-[300px] w-[220px] overflow-hidden rounded-[28px] border-[6px] border-white shadow-[0_30px_60px_-25px_rgba(42,36,51,0.5)]"
              style={{ backgroundColor: t.color, zIndex: pos === 0 ? 3 : 2 - i }}
              variants={{
                rest: { rotate: pos * 9, x: pos * 70, y: 0 },
                open: { rotate: pos * 12, x: pos * 120, y: pos === 0 ? -12 : 6 },
              }}
              transition={spring.soft}
            >
              {t.images[0] && (
                <Image src={t.images[0]} alt="" fill sizes="220px" className="object-cover" />
              )}
              <span className="absolute inset-x-3 bottom-3 rounded-full bg-white/95 px-3 py-1.5 text-center font-display text-sm font-bold text-ink">
                {t.name} {t.emoji}
              </span>
            </motion.div>
          )
        })}
      </motion.div>
    </motion.div>
  )
}
