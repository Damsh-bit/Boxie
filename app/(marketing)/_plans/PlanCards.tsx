'use client'

import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { ArrowRight, Check, Crown, Gamepad2, Images, KeyRound, Layers, Timer } from 'lucide-react'
import type { Route } from 'next'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { formatARS } from '@/domain/money'
import { ButtonLink, Nudge } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'

/**
 * Los planes que se cargan en el panel, como tarjetas. En el celular son un
 * carrusel con imán que arranca en el recomendado (se ven los costados: hay
 * más opciones); en la computadora, una grilla con el recomendado resaltado.
 * Sirve para la home y para /precios.
 */

export interface PlanCardData {
  slug: string
  name: string
  tagline: string
  priceCents: number
  compareAtCents: number | null
  savingsPercent: number
  highlighted: boolean
  color: string
  screens: number
  modules: number
  games: number
  days: number
  maxPhotos: number
  allowPassword: boolean
  features: string[]
}

/** Lo que incluye un plan, en frases (las mismas en todas las tarjetas, en el mismo orden). */
export function planFacts(plan: PlanCardData) {
  return [
    { icon: Layers, text: `${plan.screens} pantallas · ${plan.modules} para personalizar` },
    {
      icon: Gamepad2,
      // El detalle de los juegos lo dicen los beneficios del plan (panel) y /precios.
      text:
        plan.games > 1
          ? `${plan.games} juegos para jugar juntos`
          : plan.games === 1
            ? 'Un juego para jugar juntos'
            : 'Sin juegos',
      muted: plan.games === 0,
    },
    {
      icon: Images,
      text: plan.maxPhotos > 0 ? `Hasta ${plan.maxPhotos} fotos` : 'Sin fotos propias',
      muted: plan.maxPhotos === 0,
    },
    {
      icon: KeyRound,
      text: plan.allowPassword ? 'Clave opcional para abrirla' : 'Sin clave (link único)',
      muted: !plan.allowPassword,
    },
    { icon: Timer, text: `Online ${plan.days} días desde que la regalás` },
  ]
}

export function PlanCards({
  plans,
  hrefs,
  cta = 'Elegir',
  className,
}: {
  plans: PlanCardData[]
  /** Adónde lleva cada plan, por slug (la galería con el plan elegido). Viene del servidor. */
  hrefs: Record<string, Route>
  cta?: string
  className?: string
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const recommended = Math.max(
    0,
    plans.findIndex((p) => p.highlighted),
  )
  const [active, setActive] = useState(recommended)
  const { scrollXProgress } = useScroll({ container: scroller })

  useMotionValueEvent(scrollXProgress, 'change', (p) => {
    const el = scroller.current
    if (!el || el.scrollWidth <= el.clientWidth) return
    setActive(Math.round(p * Math.max(plans.length - 1, 0)))
  })

  const goTo = (i: number, behavior: ScrollBehavior = 'smooth') => {
    const el = scroller.current
    const card = el?.children[i] as HTMLElement | undefined
    if (!el || !card || el.scrollWidth <= el.clientWidth) return
    el.scrollTo({ left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2, behavior })
  }

  // En el celular arranca mostrando el recomendado, con los otros asomando a los costados.
  useEffect(() => {
    goTo(recommended, 'instant')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const columns =
    plans.length >= 4 ? 'lg:grid-cols-4' : plans.length === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'

  return (
    <div className={className}>
      <div
        ref={scroller}
        className={cn(
          '-mx-5 flex snap-x snap-mandatory [scrollbar-width:none] gap-4 overflow-x-auto overscroll-x-contain px-5 pt-6 pb-8 sm:-mx-8 sm:px-8 lg:mx-auto lg:grid lg:max-w-6xl lg:snap-none lg:items-stretch lg:gap-6 lg:overflow-visible lg:px-0 lg:pt-8 lg:pb-0 [&::-webkit-scrollbar]:hidden',
          columns,
        )}
      >
        {plans.map((plan, i) => (
          <PlanCard
            key={plan.slug}
            plan={plan}
            href={hrefs[plan.slug] ?? ('/galeria' as Route)}
            cta={cta}
            delay={i * 0.08}
          />
        ))}
      </div>

      {plans.length > 1 && (
        // Atajo visual del carrusel: las tarjetas ya están todas en el orden de lectura.
        <div className="mt-1 flex justify-center gap-2 lg:hidden" aria-hidden>
          {plans.map((plan, i) => (
            <button
              key={plan.slug}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className="grid h-6 place-items-center px-0.5"
            >
              <motion.span
                className="block h-2 rounded-full"
                initial={false}
                animate={{
                  width: i === active ? 28 : 8,
                  backgroundColor: i === active ? '#f44e63' : 'rgba(42, 36, 51, 0.2)',
                }}
                transition={spring.snappy}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  href,
  cta,
  delay,
}: {
  plan: PlanCardData
  href: Route
  cta: string
  delay: number
}) {
  const facts = planFacts(plan)
  return (
    <motion.article
      data-reveal=""
      aria-label={`Plan ${plan.name}: ${formatARS(plan.priceCents)}`}
      className={cn(
        'relative flex w-[min(20rem,calc(100vw-4rem))] shrink-0 snap-center flex-col rounded-[30px] bg-white p-6 sm:p-7 lg:w-auto',
        plan.highlighted
          ? 'shadow-[0_30px_70px_-30px_rgba(244,78,99,0.55)] ring-2 ring-brand lg:-my-3 lg:py-9'
          : 'shadow-[0_18px_50px_-30px_rgba(42,36,51,0.35)] ring-1 ring-black/5',
      )}
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, ease: ease.out, delay }}
      whileHover={{ y: -6 }}
    >
      {plan.highlighted && (
        <span className="absolute -top-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-extrabold tracking-wider whitespace-nowrap text-white uppercase shadow-[0_8px_20px_rgba(244,78,99,0.35)]">
          <Crown className="size-3.5" aria-hidden /> El más elegido
        </span>
      )}

      <div className="flex items-center gap-2.5">
        <span
          className="size-3 shrink-0 rounded-full"
          style={{ backgroundColor: plan.color }}
          aria-hidden
        />
        <h3 className="font-display text-2xl font-bold text-ink">{plan.name}</h3>
        {plan.savingsPercent > 0 && (
          <span className="ml-auto rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand-dark">
            −{plan.savingsPercent}%
          </span>
        )}
      </div>
      {plan.tagline && <p className="mt-1 min-h-10 text-sm text-ink/60">{plan.tagline}</p>}

      <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-5xl leading-none font-bold text-ink">
          {formatARS(plan.priceCents)}
        </span>
        {plan.compareAtCents && (
          <span className="text-base text-ink/40 line-through">
            {formatARS(plan.compareAtCents)}
          </span>
        )}
      </p>
      <p className="mt-1 text-xs font-semibold tracking-wide text-ink/45 uppercase">
        Pago único · sin suscripción
      </p>

      <ul className="mt-6 space-y-2.5 border-t border-dashed border-black/10 pt-5 text-[0.93rem]">
        {facts.map(({ icon: Icon, text, muted }) => (
          <li
            key={text}
            className={cn('flex items-start gap-2.5', muted ? 'text-ink/40' : 'text-ink/80')}
          >
            <Icon
              className={cn('mt-0.5 size-4 shrink-0', muted ? 'text-ink/30' : 'text-brand')}
              aria-hidden
            />
            {text}
          </li>
        ))}
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-ink/80">
            <Check className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={3} aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-7">
        <ButtonLink
          href={href}
          variant={plan.highlighted ? 'primary' : 'dark'}
          size="lg"
          block
          aria-label={`${cta} el plan ${plan.name}`}
        >
          {cta} {plan.name}
          <Nudge x={4}>
            <ArrowRight className="size-5" aria-hidden />
          </Nudge>
        </ButtonLink>
      </div>
    </motion.article>
  )
}

/** Una fila de garantías debajo de los planes. */
export function PlanPromises({ children }: { children?: ReactNode }) {
  const items = [
    'Pagás una sola vez',
    'La editás hasta regalarla',
    'Llega al instante',
    'Mercado Pago: tarjeta, débito o dinero en cuenta',
  ]
  return (
    <ul className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-ink/65">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-1.5">
          <Check className="size-4 text-brand" strokeWidth={3} aria-hidden /> {t}
        </li>
      ))}
      {children}
    </ul>
  )
}
