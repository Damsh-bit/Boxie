'use client'

import { motion } from 'framer-motion'
import { ArrowRight, CalendarHeart, Eye, Gamepad2, Layers, Play } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { GalleryView } from '@/domain/gallery'
import { describeDaysUntil } from '@/domain/gallery'
import { cn } from '@/ui/cn'
import { useCurrency } from '@/ui/currency/CurrencyContext'
import { ease, spring } from '@/ui/motion'
import { contentsOf, exampleHref, priceOf, shortDate, themeHref } from './helpers'
import type { GalleryPlan, GalleryTheme } from './types'

/**
 * Una temática en la grilla. Toda la tarjeta lleva a la ficha; encima van la
 * vista rápida y el ejemplo. Al pasar el mouse la foto se acerca y muestra la
 * segunda imagen; en pantallas táctiles la vista rápida queda siempre a mano.
 */
export function GalleryCard({
  theme,
  view,
  plans,
  plan,
  priceFromCents,
  priority,
  delay,
  onQuickView,
}: {
  theme: GalleryTheme
  view: GalleryView
  plans: GalleryPlan[]
  plan: string | null
  priceFromCents: number
  priority: boolean
  delay: number
  onQuickView(slug: string): void
}) {
  const { formatPrice } = useCurrency()
  const price = priceOf(theme, plans, plan, priceFromCents)
  const { contents, upTo } = contentsOf(theme, plans, plan)
  const planName = plans.length > 1 ? plans.find((p) => p.slug === plan)?.name : undefined
  const priceText = `${price.from ? 'Desde ' : ''}${formatPrice(price.cents)}`
  const compact = view === 'compacta'
  const [cover, second] = theme.images

  return (
    <motion.li
      layout="position"
      className="list-none"
      initial={{ opacity: 0, y: 32, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: { ...spring.soft, delay } }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.18 } }}
      transition={spring.soft}
    >
      <motion.article
        className={cn(
          'group relative flex h-full flex-col overflow-hidden bg-white ring-1 ring-black/[0.06] transition-shadow duration-300',
          compact
            ? 'rounded-[22px] shadow-[0_2px_10px_rgba(42,36,51,0.05)] hover:shadow-[0_18px_40px_-12px_var(--glow)]'
            : 'rounded-[28px] shadow-[0_2px_12px_rgba(42,36,51,0.05)] hover:shadow-[0_30px_60px_-18px_var(--glow)]',
        )}
        style={{
          ['--glow' as string]: `color-mix(in srgb, ${theme.color} 55%, rgb(42 36 51 / 0.35))`,
        }}
        initial="rest"
        animate="rest"
        whileHover="hover"
        variants={{ rest: { y: 0 }, hover: { y: compact ? -4 : -8 } }}
        transition={spring.soft}
      >
        <div
          className={cn(
            'relative w-full overflow-hidden',
            compact ? 'aspect-square' : 'aspect-[4/3]',
          )}
          style={{ backgroundColor: theme.color }}
        >
          <motion.div
            className="absolute inset-0"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.07 } }}
            transition={{ duration: 0.8, ease: ease.out }}
          >
            {cover && (
              <Image
                src={cover}
                alt=""
                fill
                priority={priority}
                sizes={
                  compact
                    ? '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 280px'
                    : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px'
                }
                className="object-cover"
              />
            )}
            {/* La segunda foto aparece al pasar el mouse (solo donde hay mouse). */}
            {second && (
              <Image
                src={second}
                alt=""
                fill
                sizes={compact ? '280px' : '380px'}
                className="object-cover opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100"
              />
            )}
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

          {theme.next?.hot && (
            <span
              className={cn(
                'absolute top-3 left-3 flex max-w-[calc(100%-4.5rem)] items-center gap-1.5 rounded-full bg-white/95 font-bold text-ink shadow-md backdrop-blur',
                compact ? 'px-2 py-1 text-[0.65rem]' : 'px-3 py-1.5 text-xs',
              )}
            >
              <span className="relative flex size-2 shrink-0" aria-hidden>
                <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative size-2 rounded-full bg-brand" />
              </span>
              <span className="truncate">
                {compact
                  ? `${theme.next.daysUntil} días`
                  : `${theme.next.name} · ${describeDaysUntil(theme.next.daysUntil)}`}
              </span>
            </span>
          )}

          <button
            type="button"
            onClick={() => onQuickView(theme.slug)}
            aria-label={`Vista rápida de ${theme.name}`}
            className={cn(
              'absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 font-bold text-ink shadow-md backdrop-blur transition-[opacity,background-color,color] duration-200 hover:bg-ink hover:text-white focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100',
              compact ? 'size-8 justify-center' : 'h-9 px-3 text-xs',
            )}
          >
            <Eye className="size-4" aria-hidden />
            {!compact && <span>Vista rápida</span>}
          </button>

          {!compact && (
            <span className="absolute bottom-3 left-3 flex items-baseline gap-1.5 rounded-full bg-white px-3 py-1 font-display text-base font-bold text-ink shadow-md">
              {priceText}
              {planName && (
                <span className="font-sans text-[0.7rem] font-semibold text-ink/55">
                  {planName}
                </span>
              )}
            </span>
          )}
        </div>

        <div className={cn('flex flex-1 flex-col', compact ? 'p-3 sm:p-4' : 'p-5 sm:p-6')}>
          <span
            className={cn(
              'flex items-center gap-1.5 font-extrabold tracking-wider text-brand uppercase',
              compact ? 'mb-1 text-[0.62rem]' : 'mb-1.5 text-xs',
            )}
          >
            <span
              className="size-2 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: theme.color }}
              aria-hidden
            />
            <span className="truncate">{theme.category}</span>
          </span>
          <h2
            className={cn(
              'font-display leading-tight font-bold text-ink',
              // En el mosaico el nombre puede ocupar dos líneas: el emoji lo sigue en el texto.
              compact ? 'text-lg' : 'flex items-center gap-2 text-2xl',
            )}
          >
            {/* Toda la tarjeta es el link a la ficha. */}
            <Link
              href={themeHref(theme.slug, plan)}
              className="min-w-0 after:absolute after:inset-0 after:content-[''] focus-visible:outline-none after:focus-visible:rounded-[inherit] after:focus-visible:ring-2 after:focus-visible:ring-brand"
            >
              {theme.name}
            </Link>
            <motion.span
              aria-hidden
              className={compact ? 'ml-1.5 inline-block text-base' : 'text-xl'}
              variants={{
                rest: { rotate: 0, scale: 1 },
                hover: { rotate: [0, -14, 10, 0], scale: 1.2 },
              }}
              transition={{ duration: 0.5 }}
            >
              {theme.emoji}
            </motion.span>
          </h2>

          {compact ? (
            <p className="mt-1 text-sm font-bold text-ink/80">{priceText}</p>
          ) : (
            <>
              <p className="mt-2 line-clamp-2 text-[0.95rem] leading-relaxed text-ink/65">
                {theme.description}
              </p>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.82rem] font-medium text-ink/70">
                {contents.screens > 0 && (
                  <li className="flex items-center gap-1.5">
                    <Layers className="size-4 text-brand" aria-hidden />
                    {upTo ? 'Hasta ' : ''}
                    {contents.screens} pantallas
                  </li>
                )}
                {contents.games > 0 && (
                  <li className="flex items-center gap-1.5">
                    <Gamepad2 className="size-4 text-brand" aria-hidden />
                    {contents.games} {contents.games === 1 ? 'juego' : 'juegos'}
                  </li>
                )}
                <li className="flex items-center gap-1.5">
                  <CalendarHeart className="size-4 text-brand" aria-hidden />
                  {theme.next
                    ? `${theme.next.name} · ${shortDate(theme.next.date)}`
                    : 'Todo el año'}
                </li>
              </ul>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                  Elegir esta Ribbly
                  <motion.span
                    className="inline-flex"
                    variants={{ rest: { x: 0 }, hover: { x: 4 } }}
                    transition={spring.snappy}
                  >
                    <ArrowRight className="size-4" aria-hidden />
                  </motion.span>
                </span>
                {/* Encima del link de la tarjeta: lleva a la Boxie de ejemplo. */}
                <Link
                  href={exampleHref(theme.slug, plan)}
                  className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-paper/70 px-3 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-ink hover:text-white"
                >
                  <Play className="size-3 fill-current" aria-hidden /> Ver ejemplo
                </Link>
              </div>
            </>
          )}
        </div>
      </motion.article>
    </motion.li>
  )
}
