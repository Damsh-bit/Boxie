'use client'

import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { ArrowRight, Check, Copy, Gift, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { giftComparisons, welcomeCoupon } from '@/content/home'
import { formatARS } from '@/domain/money'
import { ButtonLink, Nudge } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Stagger, StaggerItem, Swap, ease, spring, useCalm } from '@/ui/motion'
import { Magnetic, Mark, SectionHeading } from './primitives'

/** Un plan como lo muestra la home (lo que incluye, en la temática más completa). */
export interface HomePlan {
  slug: string
  name: string
  tagline: string
  priceCents: number
  compareAtCents: number | null
  highlighted: boolean
  screens: number
  games: number
  days: number
  allowPassword: boolean
  features: string[]
}

function includedFor(plan: HomePlan): string[] {
  return [
    `Hasta ${plan.screens} pantallas interactivas`,
    'Fotos, dedicatoria y su canción',
    plan.games > 1
      ? 'Trivia, tragamonedas, cuponera y más juegos'
      : plan.games === 1
        ? 'Un juego para jugar juntos'
        : 'Las razones que la hacen especial',
    'Link único para mandar por WhatsApp o mail',
    ...(plan.allowPassword ? ['Clave opcional para que solo la abra quien vos quieras'] : []),
    `Online ${plan.days} días: la abre las veces que quiera`,
    ...plan.features,
  ]
}

/**
 * Precio: una tarjeta con todo lo que incluye (el precio sale del catálogo, el
 * mismo que cobra el checkout), un comparador contra otros regalos y el cupón
 * de bienvenida para copiar. Si la tienda vende por planes, la tarjeta se
 * puede cambiar de plan y el precio y lo incluido la acompañan.
 */
export function Pricing({
  priceCents: basePrice,
  lifetimeDays,
  plans = [],
}: {
  priceCents: number
  lifetimeDays: number
  plans?: HomePlan[]
}) {
  const [planSlug, setPlanSlug] = useState(
    () => (plans.find((p) => p.highlighted) ?? plans[Math.floor(plans.length / 2)])?.slug,
  )
  const plan = plans.find((p) => p.slug === planSlug)
  const priceCents = plan?.priceCents ?? basePrice
  const cheapest = plans.length ? Math.min(...plans.map((p) => p.priceCents)) : basePrice
  const included = plan
    ? includedFor(plan)
    : [
        '20 pantallas interactivas para personalizar',
        'Fotos, dedicatoria y su canción',
        'Trivia, tragamonedas, cuponera y más juegos',
        'Link único para mandar por WhatsApp o mail',
        'Clave opcional para que solo la abra quien vos quieras',
        `Online ${lifetimeDays} días: la abre las veces que quiera`,
        'La editás todas las veces que quieras hasta regalarla',
      ]

  return (
    <section
      id="precio"
      aria-labelledby="precio-title"
      className="relative scroll-mt-24 overflow-hidden rounded-b-[40px] bg-white px-5 py-20 sm:px-8 sm:py-24"
    >
      <SectionHeading
        eyebrow="Las sorpresas van adentro"
        title={
          <span id="precio-title">
            Un regalo original, <Mark>todo incluido</Mark>
          </span>
        }
        text={
          plans.length > 1
            ? `Un solo pago, desde ${formatARS(cheapest)}, con Mercado Pago. Elegí el plan: sin suscripciones, sin costo de envío y sin letra chica.`
            : `Un solo pago de ${formatARS(priceCents)} con Mercado Pago. Sin suscripciones, sin costo de envío y sin letra chica.`
        }
      />

      <div className="mx-auto grid max-w-5xl items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <PriceCard
          priceCents={priceCents}
          included={included}
          plans={plans}
          plan={plan}
          onPlan={setPlanSlug}
        />
        <Comparator priceCents={priceCents} />
      </div>
    </section>
  )
}

function PriceCard({
  priceCents,
  included,
  plans,
  plan,
  onPlan,
}: {
  priceCents: number
  included: string[]
  plans: HomePlan[]
  plan: HomePlan | undefined
  onPlan(slug: string): void
}) {
  return (
    <motion.div
      data-reveal=""
      className="relative flex flex-col overflow-clip rounded-[32px] bg-white p-7 shadow-[0_30px_70px_-30px_rgba(244,78,99,0.45)] ring-2 ring-brand sm:p-9"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: ease.out }}
      whileHover={{ y: -6 }}
    >
      <div
        aria-hidden
        className="absolute -top-20 -right-20 size-56 rounded-full bg-brand/10 blur-2xl"
      />
      <span className="relative inline-flex self-start rounded-full bg-brand px-3 py-1 text-xs font-bold tracking-wide text-white uppercase">
        Pago único
      </span>
      {plans.length > 1 && (
        <div
          role="radiogroup"
          aria-label="Plan"
          className="relative mt-5 grid gap-1 rounded-full bg-brand-soft p-1"
          style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}
        >
          {plans.map((p) => {
            const selected = p.slug === plan?.slug
            return (
              <button
                key={p.slug}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onPlan(p.slug)}
                className={cn(
                  'relative rounded-full py-2 text-sm font-bold transition-colors',
                  selected ? 'text-white' : 'text-brand hover:text-brand-dark',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="home-plan"
                    className="absolute inset-0 rounded-full bg-brand shadow-[0_6px_16px_rgba(244,78,99,0.35)]"
                    transition={spring.snappy}
                  />
                )}
                <span className="relative">{p.name}</span>
              </button>
            )
          })}
        </div>
      )}
      <h3 className="relative mt-4 font-display text-2xl font-bold text-ink">
        <Swap id={plan?.slug ?? 'unica'}>{plan ? `Plan ${plan.name}` : 'Tu Boxie completa'}</Swap>
      </h3>
      <p className="relative mt-1 text-sm text-ink/60">
        {plan?.tagline || 'Cualquier temática: Pareja, Cumpleaños o Amistad.'}
      </p>

      <p className="relative mt-5 flex flex-wrap items-end gap-x-2">
        <span className="font-display text-6xl leading-none font-bold text-ink sm:text-7xl">
          <Swap id={priceCents} y={16}>
            {formatARS(priceCents)}
          </Swap>
        </span>
        <span className="mb-1.5 text-sm font-semibold text-ink/50">ARS</span>
        {plan?.compareAtCents && (
          <span className="mb-1.5 text-base text-ink/40 line-through">
            {formatARS(plan.compareAtCents)}
          </span>
        )}
      </p>

      <Stagger key={plan?.slug ?? 'unica'} as="ul" className="relative mt-7 space-y-3" step={0.06}>
        {included.map((item) => (
          <StaggerItem
            as="li"
            key={item}
            x={-12}
            y={0}
            className="flex items-start gap-3 text-[0.95rem] text-ink/80"
          >
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand text-white">
              <Check className="size-3" strokeWidth={3.5} aria-hidden />
            </span>
            {item}
          </StaggerItem>
        ))}
      </Stagger>

      <div className="relative mt-8 flex flex-col gap-3">
        <Magnetic className="w-full" strength={0.15}>
          <ButtonLink href="/galeria" size="lg" block>
            <Gift className="size-5" aria-hidden /> Elegir mi Boxie
            <Nudge x={4}>
              <ArrowRight className="size-5" aria-hidden />
            </Nudge>
          </ButtonLink>
        </Magnetic>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-ink/55">
          <ShieldCheck className="size-4 text-green-600" aria-hidden />
          Pagás seguro con Mercado Pago: tarjeta, débito o dinero en cuenta.
        </p>
      </div>

      <CouponTicket />
    </motion.div>
  )
}

function CouponTicket() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(welcomeCoupon.code)
    } catch {
      // Sin permiso para el portapapeles: el código queda a la vista igual.
    }
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2200)
  }

  return (
    <div className="relative mt-7 flex items-center gap-3 rounded-2xl border-2 border-dashed border-brand/35 bg-brand-soft p-3 pl-4">
      <motion.span
        aria-hidden
        className="text-2xl"
        animate={{ rotate: [0, -12, 10, -6, 0] }}
        transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }}
      >
        🎁
      </motion.span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="text-sm font-bold text-ink">{welcomeCoupon.label}</p>
        <p className="text-xs text-ink/60">
          Usá el código <strong className="font-mono text-brand">{welcomeCoupon.code}</strong> al
          pagar
        </p>
      </div>
      <motion.button
        type="button"
        onClick={copy}
        className={cn(
          'relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-colors duration-200',
          copied ? 'bg-green-600 text-white' : 'bg-ink text-white hover:bg-ink/90',
        )}
        whileTap={{ scale: 0.9 }}
        transition={spring.snappy}
        aria-live="polite"
      >
        <span className="relative inline-flex">
          <Swap id={copied ? 'ok' : 'copy'}>
            {copied ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3.5" strokeWidth={3} aria-hidden /> ¡Copiado!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Copy className="size-3.5" aria-hidden /> Copiar
              </span>
            )}
          </Swap>
        </span>
      </motion.button>
    </div>
  )
}

function Comparator({ priceCents }: { priceCents: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const calm = useCalm()
  const [id, setId] = useState<string>(giftComparisons[0].id)
  const other = giftComparisons.find((g) => g.id === id) ?? giftComparisons[0]
  const saving = Math.max(0, other.priceCents - priceCents)
  const percent = Math.round((saving / other.priceCents) * 100)
  const boxieWidth = Math.max(6, (priceCents / other.priceCents) * 100)

  const savingValue = useMotionValue(saving)
  const savingText = useTransform(savingValue, (v) => formatARS(Math.round(v / 100) * 100))

  useEffect(() => {
    if (calm) {
      savingValue.set(saving)
      return
    }
    if (!inView) return
    const controls = animate(savingValue, saving, { duration: 0.9, ease: ease.out })
    return () => controls.stop()
  }, [saving, inView, calm, savingValue])

  // Antes de verse, el ahorro arranca en cero para contar al aparecer.
  useEffect(() => {
    if (!calm && !inView) savingValue.set(0)
  }, [calm, inView, savingValue])

  return (
    <motion.div
      ref={ref}
      data-reveal=""
      className="flex flex-col rounded-[32px] bg-ink p-7 text-white shadow-[0_30px_70px_-30px_rgba(42,36,51,0.6)] sm:p-9"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.8, ease: ease.out, delay: 0.1 }}
    >
      <h3 className="font-display text-2xl font-bold">¿Cuánto cuesta sorprender?</h3>
      <p className="mt-1 text-sm text-white/60">Compará una Boxie con otros regalos clásicos.</p>

      <div
        role="group"
        aria-label="Comparar con"
        className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {giftComparisons.map((g) => {
          const selected = g.id === id
          return (
            <motion.button
              key={g.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setId(g.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold transition-colors duration-200',
                selected
                  ? 'text-ink'
                  : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white',
              )}
              whileTap={{ scale: 0.94 }}
              transition={spring.snappy}
            >
              {selected && (
                <motion.span
                  layoutId="compare-pill"
                  className="absolute inset-0 rounded-2xl bg-white"
                  transition={spring.snappy}
                  aria-hidden
                />
              )}
              <motion.span
                aria-hidden
                className="relative text-2xl"
                animate={selected ? { scale: [1, 1.3, 1], rotate: [0, -10, 0] } : {}}
                transition={{ duration: 0.4 }}
              >
                {g.emoji}
              </motion.span>
              <span className="relative text-center leading-tight">{g.label}</span>
            </motion.button>
          )
        })}
      </div>

      <div className="mt-7 space-y-4">
        <Bar
          label={`${other.emoji} ${other.label}`}
          value={formatARS(other.priceCents)}
          width={100}
          className="bg-white/25"
          note={other.note}
          visible={inView}
        />
        <Bar
          label="🎁 Boxie"
          value={formatARS(priceCents)}
          width={boxieWidth}
          className="bg-[linear-gradient(90deg,#f44e63,#ff9a9e)]"
          note="llega hoy, esté donde esté, y no se marchita"
          visible={inView}
          highlight
        />
      </div>

      <ul className="mt-7 grid gap-2 text-sm text-white/75 sm:grid-cols-2">
        {[
          'No se marchita ni se termina',
          'Llega a cualquier ciudad o país',
          'La abre las veces que quiera',
          'Sin envío ni esperas',
        ].map((t) => (
          <li key={t} className="flex items-center gap-2">
            <Check className="size-4 shrink-0 text-brand-muted" strokeWidth={3} aria-hidden /> {t}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-8">
        <p className="text-sm text-white/60">Con una Boxie ahorrás</p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-3 font-display font-bold">
          <motion.span className="text-5xl text-brand-muted tabular-nums">{savingText}</motion.span>
          <span className="relative inline-flex text-xl text-white/80">
            <Swap id={percent}>{`(${percent}% menos)`}</Swap>
          </span>
        </p>
        <p className="mt-4 text-[0.7rem] text-white/40">
          Valores de referencia aproximados de otros regalos, solo para comparar.
        </p>
      </div>
    </motion.div>
  )
}

function Bar({
  label,
  value,
  width,
  className,
  note,
  visible,
  highlight = false,
}: {
  label: string
  value: string
  width: number
  className: string
  note: string
  visible: boolean
  highlight?: boolean
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className={cn('font-semibold', highlight ? 'text-white' : 'text-white/80')}>
          {label}
        </span>
        <span className="relative inline-flex font-display font-bold">
          <Swap id={value}>{value}</Swap>
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className={cn('h-full rounded-full', className)}
          initial={false}
          animate={{ width: visible ? `${width}%` : '0%' }}
          transition={spring.gentle}
        />
      </div>
      <p className="relative mt-1 text-xs text-white/45">
        <Swap id={note}>{note}</Swap>
      </p>
    </div>
  )
}
