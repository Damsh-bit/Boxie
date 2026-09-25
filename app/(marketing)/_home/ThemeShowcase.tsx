'use client'

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowRight, ArrowUpRight, Check } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import { useRef, useState } from 'react'
import { occasions, type Occasion } from '@/content/home'
import { Nudge } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Swap, ease, spring } from '@/ui/motion'
import { Mark, SectionHeading, useTilt } from './primitives'
import { lookOf, type HomeTheme } from './theme-look'

const MotionLink = motion.create(Link)

/**
 * "¿A quién querés emocionar hoy?": elegís la ocasión y se destaca la Boxie
 * que mejor le va (las otras se apagan un poco). En el celular es un carrusel
 * con imán que además se corre solo hasta la recomendada.
 */
export function ThemeShowcase({ themes }: { themes: HomeTheme[] }) {
  const slugs = new Set(themes.map((t) => t.slug))
  const available = occasions.filter((o) => slugs.has(o.theme))
  const [occasion, setOccasion] = useState<Occasion | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const { scrollXProgress } = useScroll({ container: scroller })

  useMotionValueEvent(scrollXProgress, 'change', (p) => {
    setActive(Math.round(p * Math.max(themes.length - 1, 0)))
  })

  const goTo = (i: number) => {
    const el = scroller.current
    const card = el?.children[i] as HTMLElement | undefined
    if (!el || !card || el.scrollWidth <= el.clientWidth) return
    el.scrollTo({
      left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2,
      behavior: 'smooth',
    })
  }

  const choose = (o: Occasion) => {
    const next = occasion?.id === o.id ? null : o
    setOccasion(next)
    if (next) goTo(themes.findIndex((t) => t.slug === next.theme))
  }

  return (
    <section
      id="emocionar"
      aria-labelledby="emocionar-title"
      className="relative z-10 scroll-mt-24 rounded-b-[40px] bg-gradient-to-b from-paper to-mauve pt-16 pb-14 sm:pt-20"
    >
      <div className="px-5">
        <SectionHeading
          eyebrow="Regalos para cada ocasión"
          title={
            <span id="emocionar-title">
              ¿A quién querés <Mark>emocionar</Mark> hoy?
            </span>
          }
          text="Elegí la ocasión y te mostramos la Boxie ideal. Cada temática trae 20 sorpresas listas para personalizar con tus fotos y tus palabras."
          className="mb-8 sm:mb-10"
        />
      </div>

      <motion.div
        role="group"
        aria-label="Ocasión"
        className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-2 sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      >
        {available.map((o) => {
          const selected = occasion?.id === o.id
          return (
            <motion.button
              key={o.id}
              type="button"
              data-reveal=""
              aria-pressed={selected}
              onClick={() => choose(o)}
              className={cn(
                'relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors duration-200',
                selected ? 'text-white' : 'bg-white/70 text-ink hover:bg-white',
              )}
              variants={{
                hidden: { opacity: 0, y: 14, scale: 0.9 },
                show: { opacity: 1, y: 0, scale: 1, transition: spring.bouncy },
              }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.94 }}
            >
              {selected && (
                <motion.span
                  layoutId="occasion-pill"
                  className="absolute inset-0 rounded-full bg-ink shadow-[0_8px_20px_rgba(42,36,51,0.25)]"
                  transition={spring.snappy}
                  aria-hidden
                />
              )}
              <motion.span
                aria-hidden
                className="relative"
                animate={selected ? { rotate: [0, -16, 12, 0], scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                {o.emoji}
              </motion.span>
              <span className="relative">{o.label}</span>
            </motion.button>
          )
        })}
      </motion.div>

      <p
        className="relative mx-auto mt-4 mb-6 flex min-h-[3rem] max-w-xl items-start justify-center px-5 text-center text-base text-ink/75 sm:min-h-[1.75rem]"
        aria-live="polite"
      >
        <Swap id={occasion?.id ?? 'todas'} className="block">
          {occasion ? (
            <>
              <strong className="text-ink">
                {occasion.emoji} {occasion.label}:
              </strong>{' '}
              {occasion.pitch}
            </>
          ) : (
            'Tocá una ocasión y te recomendamos la temática perfecta 👆'
          )}
        </Swap>
      </p>

      <motion.div
        ref={scroller}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto px-6 pt-4 pb-10 md:justify-center [&::-webkit-scrollbar]:hidden"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
      >
        {themes.map((theme, i) => (
          <motion.div
            key={theme.slug}
            data-reveal=""
            className="flex shrink-0 snap-center"
            variants={{
              hidden: { opacity: 0, y: 50, rotate: i % 2 ? 2 : -2 },
              show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.8, ease: ease.out } },
            }}
          >
            <ThemeTile
              theme={theme}
              priority={i === 0}
              occasion={occasion}
              dimmed={occasion !== null && occasion.theme !== theme.slug}
            />
          </motion.div>
        ))}
      </motion.div>

      {themes.length > 1 && (
        <div className="-mt-4 mb-6 flex justify-center gap-2 md:hidden" aria-hidden>
          {themes.map((theme, i) => (
            <motion.button
              key={theme.slug}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className="h-2 rounded-full"
              initial={false}
              animate={{
                width: i === active ? 28 : 8,
                backgroundColor: i === active ? '#2a2433' : 'rgba(42, 36, 51, 0.2)',
              }}
              transition={spring.snappy}
            />
          ))}
        </div>
      )}

      <div className="flex justify-center px-5">
        <MotionLink
          href="/galeria"
          className="inline-flex items-center gap-2 rounded-full bg-white/60 px-5 py-2.5 text-sm font-bold text-ink backdrop-blur transition-colors hover:bg-white"
          initial="rest"
          animate="rest"
          whileHover="hover"
          whileTap={{ scale: 0.96 }}
        >
          Ver todas en la galería
          <Nudge x={4}>
            <ArrowRight className="size-4" aria-hidden />
          </Nudge>
        </MotionLink>
      </div>
    </section>
  )
}

function ThemeTile({
  theme,
  priority,
  occasion,
  dimmed,
}: {
  theme: HomeTheme
  priority: boolean
  occasion: Occasion | null
  dimmed: boolean
}) {
  const tilt = useTilt(7)
  const light = theme.tone === 'light'
  const recommended = occasion?.theme === theme.slug

  return (
    <motion.div
      className="flex [perspective:1000px]"
      animate={{
        opacity: dimmed ? 0.5 : 1,
        scale: dimmed ? 0.95 : recommended ? 1.03 : 1,
        filter: dimmed ? 'saturate(0.55)' : 'saturate(1)',
      }}
      transition={spring.soft}
    >
      <MotionLink
        href={`/tematicas/${theme.slug}` as Route}
        aria-label={`Boxie de ${theme.name}: ${theme.price}`}
        className="group relative flex w-[292px] flex-col overflow-hidden rounded-[28px] border-2 shadow-[0_10px_30px_rgba(42,36,51,0.12)] transition-shadow duration-300 hover:shadow-[0_32px_70px_rgba(42,36,51,0.25)] sm:w-[312px]"
        style={{ backgroundColor: theme.color, borderColor: theme.color, ...tilt.style }}
        {...tilt.handlers}
        initial="rest"
        animate="rest"
        whileHover="hover"
        whileTap="tap"
        variants={{ rest: { y: 0, scale: 1 }, hover: { y: -10 }, tap: { scale: 0.97 } }}
        transition={spring.soft}
      >
        <div className="relative h-[250px] w-full overflow-hidden">
          <motion.div
            className="absolute inset-0"
            variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
            transition={{ duration: 0.8, ease: ease.out }}
          >
            <Image
              src={theme.images[0]!}
              alt={`Regalo digital de ${theme.name}`}
              fill
              sizes="312px"
              priority={priority}
              className="object-cover"
            />
          </motion.div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />

          <span className="absolute bottom-3 left-4 rounded-full bg-white px-3 py-1 font-display text-lg font-bold text-ink shadow-md">
            {theme.price}
          </span>

          <motion.span
            className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur"
            variants={{
              rest: { opacity: 0, scale: 0.6, rotate: -45 },
              hover: { opacity: 1, scale: 1, rotate: 0 },
            }}
            transition={spring.bouncy}
            aria-hidden
          >
            <ArrowUpRight className="size-5" />
          </motion.span>

          <AnimatePresence>
            {recommended && occasion && (
              <motion.span
                key={occasion.id}
                className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white shadow-lg"
                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={spring.bouncy}
              >
                ✨ Ideal para {occasion.label}
              </motion.span>
            )}
          </AnimatePresence>

          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-soft-light"
            style={{ background: tilt.glare }}
          />
        </div>

        <div className="flex flex-1 flex-col p-6 text-left">
          <h3 className="flex items-center gap-2 font-display text-[30px] leading-tight font-bold text-ink">
            {theme.name}
            <motion.span
              aria-hidden
              className="text-2xl"
              variants={{
                rest: { rotate: 0, scale: 1 },
                hover: { rotate: [0, -15, 12, 0], scale: 1.2 },
              }}
              transition={{ duration: 0.5 }}
            >
              {lookOf(theme.slug).emoji}
            </motion.span>
          </h3>
          <p className={cn('mt-1 text-base font-medium', light ? 'text-white' : 'text-ink/85')}>
            {theme.description}
          </p>
          <ul
            className={cn('mt-4 mb-6 space-y-1.5 text-sm', light ? 'text-white/95' : 'text-ink/80')}
          >
            {theme.features.slice(0, 3).map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check
                  className={cn('mt-0.5 size-4 shrink-0', light ? 'text-white' : 'text-ink')}
                  strokeWidth={3}
                  aria-hidden
                />
                {f}
              </li>
            ))}
          </ul>
          <span
            className={cn(
              'mt-auto inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-bold transition-colors',
              light ? 'bg-white text-brand' : 'bg-ink text-white',
            )}
          >
            Elegir esta Boxie
            <Nudge x={4}>
              <ArrowRight className="size-4" aria-hidden />
            </Nudge>
          </span>
        </div>
      </MotionLink>
    </motion.div>
  )
}
