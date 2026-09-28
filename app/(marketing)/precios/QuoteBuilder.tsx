'use client'

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
} from 'framer-motion'
import {
  Check,
  Gift,
  Images,
  KeyRound,
  Layers,
  Lock,
  Play,
  Sparkles,
  TicketPercent,
  Timer,
  Wand2,
  X,
} from 'lucide-react'
import Image from 'next/image'
import type { Route } from 'next'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { modulesOf, nextStep, pickPlan, savingsOf, type Reason } from '@/domain/quote-builder'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { useCurrency } from '@/ui/currency/CurrencyContext'
import { Swap, ease, spring } from '@/ui/motion'
import { useBottomBar } from '@/ui/use-bottom-bar'
import type { QuoteGroup, QuoteModule, QuotePlan, QuoteTheme } from './builder-types'

interface QuoteResult {
  /** Para qué selección se calculó (temática, plan y cupón): uno viejo no se muestra. */
  key: string
  listPriceCents: number
  discountCents: number
  totalCents: number
  label: string
}

/**
 * El cotizador: elegís la temática y lo que querés que tenga tu Boxie
 * (juegos, recuerdos, fotos, días online, clave) y te dice en qué plan
 * entra, por qué y cuánto sale. El precio con cupón lo calcula el servidor
 * (el mismo que cobra el checkout).
 */
export function QuoteBuilder({
  themes,
  plans,
  groups,
  tiered,
  recommendedIndex,
  initialTheme,
  initialPlan,
  welcome,
  salesPaused,
}: {
  themes: QuoteTheme[]
  plans: QuotePlan[]
  groups: QuoteGroup[]
  /** Hay más de un plan (si no, el precio es fijo y todo viene incluido). */
  tiered: boolean
  recommendedIndex: number
  initialTheme: string | null
  initialPlan: string | null
  welcome: { code: string; discount: string } | null
  salesPaused: boolean
}) {
  const [slug, setSlug] = useState(
    themes.some((t) => t.slug === initialTheme) ? initialTheme! : themes[0]!.slug,
  )
  const theme = themes.find((t) => t.slug === slug) ?? themes[0]!
  const startIndex = Math.max(
    0,
    initialPlan ? plans.findIndex((p) => p.slug === initialPlan) : recommendedIndex,
  )
  const [selected, setSelected] = useState<string[]>(() =>
    modulesOf(theme.modules, startIndex).filter((k) => isOptional(theme.modules, k)),
  )
  const [photos, setPhotos] = useState(0)
  const [days, setDays] = useState(0)
  const [password, setPassword] = useState(false)

  // Lo elegido que la temática actual tiene (al cambiar de temática, se conserva lo que exista).
  const wanted = selected.filter((k) => theme.modules.some((m) => m.kind === k))
  const choice = pickPlan(plans, theme.modules, { modules: wanted, photos, days, password }) ?? {
    index: plans.length - 1,
    reasons: [],
  }
  const plan = plans[choice.index]!
  const inPlan = new Set(modulesOf(theme.modules, choice.index))
  const step = tiered ? nextStep(plans, theme.modules, choice.index) : null
  const basePrice = tiered ? plan.priceCents : theme.priceCents

  const applyPlan = (index: number) => {
    setSelected(modulesOf(theme.modules, index).filter((k) => isOptional(theme.modules, k)))
    setPhotos(0)
    setDays(0)
    setPassword(false)
  }
  const toggle = (kind: string) =>
    setSelected((list) => (list.includes(kind) ? list.filter((k) => k !== kind) : [...list, kind]))

  // ── Cupón (lo calcula el servidor) ──
  const [code, setCode] = useState('')
  const [appliedCode, setAppliedCode] = useState<string | null>(null)
  const [result, setResult] = useState<QuoteResult | null>(null)
  const [couponError, setCouponError] = useState('')
  const [checking, setChecking] = useState(false)
  const quoteKey = `${slug}|${plan.slug}|${appliedCode ?? ''}`

  useEffect(() => {
    if (!appliedCode) return
    let cancelled = false
    const timer = window.setTimeout(async () => {
      setChecking(true)
      const response = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tematica: slug, cupon: appliedCode, plan: plan.slug || null }),
      }).catch(() => null)
      const data = (await response?.json().catch(() => null)) as {
        listPriceCents?: number
        discountCents?: number
        totalCents?: number
        coupon?: { code: string; label: string } | null
        couponError?: string | null
        error?: string
      } | null
      if (cancelled) return
      setChecking(false)
      if (!response?.ok || !data || data.couponError || !data.coupon) {
        setCouponError(data?.couponError ?? data?.error ?? 'No pudimos validar el cupón.')
        setAppliedCode(null)
        return
      }
      setCouponError('')
      setResult({
        key: `${slug}|${plan.slug}|${appliedCode}`,
        listPriceCents: data.listPriceCents ?? 0,
        discountCents: data.discountCents ?? 0,
        totalCents: data.totalCents ?? 0,
        label: data.coupon.label,
      })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [slug, plan.slug, appliedCode])

  const quote = appliedCode && result?.key === quoteKey ? result : null
  const total = quote ? quote.totalCents : basePrice
  const applyCoupon = (value: string) => {
    const clean = value.trim().toUpperCase()
    if (!clean) return
    setCode(clean)
    setCouponError('')
    setAppliedCode(clean)
  }

  const params = new URLSearchParams({ tematica: slug })
  if (plan.slug) params.set('plan', plan.slug)
  if (quote && appliedCode) params.set('cupon', appliedCode)
  const checkoutHref = `/checkout?${params.toString()}` as Route
  const tryHref = `/ejemplo/${slug}/personalizar${plan.slug ? `?plan=${plan.slug}` : ''}` as Route
  const exampleHref = `/ejemplo/${slug}${plan.slug ? `?plan=${plan.slug}` : ''}` as Route

  // En el celular, una barra con el precio mientras se arma (si el resumen no se ve).
  const root = useRef<HTMLDivElement>(null)
  const summary = useRef<HTMLDivElement>(null)
  const building = useInView(root, { margin: '0px 0px -30% 0px' })
  const summaryVisible = useInView(summary)

  const photoSteps = useMemo(() => unique(plans.map((p) => p.maxPhotos)), [plans])
  const daySteps = useMemo(() => unique(plans.map((p) => p.days)), [plans])
  const passwordVaries = plans.some((p) => !p.allowPassword) && plans.some((p) => p.allowPassword)

  return (
    <div
      ref={root}
      className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-8"
    >
      <div className="space-y-5">
        <Step
          n={1}
          title="Elegí la temática"
          hint="Cambia el diseño; lo que trae cada plan es igual en todas."
        >
          <div
            role="radiogroup"
            aria-label="Temática"
            className="-mx-1 flex [scrollbar-width:none] gap-2 overflow-x-auto px-1 pt-1 pb-2 [&::-webkit-scrollbar]:hidden"
          >
            {themes.map((t) => {
              const on = t.slug === slug
              return (
                <button
                  key={t.slug}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setSlug(t.slug)}
                  className={cn(
                    'relative flex shrink-0 items-center gap-3 rounded-2xl bg-white p-2 pr-4 text-left ring-1 transition-[box-shadow,transform] duration-200',
                    on
                      ? 'shadow-[0_12px_28px_-14px_rgba(42,36,51,0.5)] ring-2 ring-ink'
                      : 'ring-black/10 hover:ring-black/25',
                  )}
                >
                  <span
                    className="relative size-12 shrink-0 overflow-hidden rounded-xl"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.image && (
                      <Image src={t.image} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </span>
                  <span className="font-semibold whitespace-nowrap text-ink">
                    {t.name} <span aria-hidden>{t.emoji}</span>
                  </span>
                  <AnimatePresence>
                    {on && (
                      <motion.span
                        className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-white"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={spring.bouncy}
                      >
                        <Check className="size-3" strokeWidth={3} aria-hidden />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </div>
        </Step>

        <Step
          n={2}
          title="¿Qué querés que tenga?"
          hint={
            tiered
              ? 'Tocá lo que quieras sumar: el plan y el precio se acomodan solos.'
              : 'Todo esto viene incluido.'
          }
          action={
            tiered && (
              <div className="flex flex-wrap gap-1.5">
                {plans.map((p, i) => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => applyPlan(i)}
                    className="rounded-full bg-canvas px-3 py-1.5 text-xs font-bold text-ink/70 transition-colors hover:bg-ink hover:text-white"
                  >
                    {i === 0 ? 'Lo esencial' : i === plans.length - 1 ? 'Todo' : p.name}
                    {i === recommendedIndex && ' ⭐'}
                  </button>
                ))}
              </div>
            )
          }
        >
          <div className="space-y-5">
            {groups.map((g) => {
              const list = theme.modules.filter((m) => m.group === g.id)
              if (list.length === 0) return null
              return (
                <div key={g.id}>
                  <p className="mb-2 flex items-center gap-2 text-xs font-extrabold tracking-wider text-ink/45 uppercase">
                    <span aria-hidden>{g.emoji}</span> {g.label}
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {list.map((m) => (
                      <ModuleToggle
                        key={m.kind}
                        module={m}
                        plans={plans}
                        tiered={tiered}
                        state={
                          m.from === 0 || !tiered
                            ? 'always'
                            : wanted.includes(m.kind)
                              ? 'on'
                              : inPlan.has(m.kind)
                                ? 'bonus'
                                : 'off'
                        }
                        extraCents={Math.max(0, (plans[m.from]?.priceCents ?? 0) - plan.priceCents)}
                        onToggle={() => toggle(m.kind)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Step>

        {tiered && (photoSteps.length > 1 || daySteps.length > 1 || passwordVaries) && (
          <Step
            n={3}
            title="Detalles"
            hint="Si necesitás más fotos, más tiempo online o una clave."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {photoSteps.length > 1 && (
                <div className="rounded-2xl bg-canvas p-4 sm:col-span-2">
                  <label
                    htmlFor="cotizador-fotos"
                    className="flex items-center justify-between gap-3 text-sm font-semibold text-ink"
                  >
                    <span className="flex items-center gap-2">
                      <Images className="size-4 text-brand" aria-hidden /> ¿Cuántas fotos querés
                      subir?
                    </span>
                    <span className="font-display text-base font-bold tabular-nums">
                      {photos === 0 ? `Hasta ${plan.maxPhotos}` : photos}
                    </span>
                  </label>
                  <input
                    id="cotizador-fotos"
                    type="range"
                    min={0}
                    max={Math.max(...photoSteps)}
                    value={photos}
                    onChange={(e) => setPhotos(Number(e.target.value))}
                    className="mt-3 w-full accent-brand"
                  />
                  <div className="mt-1 flex justify-between text-[0.7rem] text-ink/45">
                    <span>Las del plan</span>
                    {photoSteps.map((n) => (
                      <span key={n}>{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {daySteps.length > 1 && (
                <div className="rounded-2xl bg-canvas p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <Timer className="size-4 text-brand" aria-hidden /> ¿Cuánto tiempo online?
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="Días online"
                    className="mt-3 flex flex-wrap gap-1.5"
                  >
                    {[0, ...daySteps].map((d) => (
                      <button
                        key={d}
                        type="button"
                        role="radio"
                        aria-checked={days === d}
                        onClick={() => setDays(d)}
                        className={cn(
                          'h-9 rounded-full px-3 text-sm font-semibold transition-colors',
                          days === d
                            ? 'bg-ink text-white'
                            : 'bg-white text-ink ring-1 ring-black/10 hover:ring-black/25',
                        )}
                      >
                        {d === 0 ? 'Me da igual' : `${d} días`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {passwordVaries && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={password}
                  onClick={() => setPassword((v) => !v)}
                  className="flex items-center justify-between gap-4 rounded-2xl bg-canvas p-4 text-left"
                >
                  <span>
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <KeyRound className="size-4 text-brand" aria-hidden /> Que se abra con clave
                    </span>
                    <span className="mt-1 block text-xs text-ink/55">
                      Solo la abre quien sabe la clave.
                    </span>
                  </span>
                  <span
                    className={cn(
                      'relative h-7 w-12 shrink-0 rounded-full transition-colors',
                      password ? 'bg-brand' : 'bg-black/15',
                    )}
                  >
                    <motion.span
                      className="absolute top-1 left-1 size-5 rounded-full bg-white shadow"
                      animate={{ x: password ? 20 : 0 }}
                      transition={spring.snappy}
                    />
                  </span>
                </button>
              )}
            </div>
          </Step>
        )}
      </div>

      {/* ── Resumen ── */}
      <div ref={summary} className="lg:sticky lg:top-24">
        <div className="overflow-hidden rounded-[32px] bg-white shadow-[0_40px_80px_-40px_rgba(42,36,51,0.45)] ring-1 ring-black/5">
          <div
            className="relative flex items-center gap-3 px-5 py-4 text-white"
            style={{
              background: `linear-gradient(120deg, color-mix(in srgb, ${theme.color} 70%, #2a2433), ${theme.color})`,
            }}
          >
            <span
              className="relative size-11 shrink-0 overflow-hidden rounded-xl ring-2 ring-white/60"
              style={{ backgroundColor: theme.color }}
            >
              {theme.image && (
                <Image src={theme.image} alt="" fill sizes="44px" className="object-cover" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-white/70 uppercase">
                Tu Boxie
              </p>
              <p className="truncate font-display text-lg font-bold">
                <Swap id={theme.slug}>
                  {theme.name} {theme.emoji}
                </Swap>
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {tiered && (
              <>
                <p className="text-xs font-extrabold tracking-wider text-ink/45 uppercase">
                  Entra en el plan
                </p>
                <div
                  role="radiogroup"
                  aria-label="Plan"
                  className="relative mt-2 grid rounded-2xl bg-canvas p-1"
                  style={{ gridTemplateColumns: `repeat(${plans.length}, minmax(0, 1fr))` }}
                >
                  {plans.map((p, i) => {
                    const on = i === choice.index
                    return (
                      <button
                        key={p.slug}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => applyPlan(i)}
                        className={cn(
                          'relative rounded-xl px-1 py-2 text-center transition-colors',
                          on ? 'text-white' : 'text-ink/60 hover:text-ink',
                        )}
                      >
                        {on && (
                          <motion.span
                            layoutId="cotizador-plan"
                            className="absolute inset-0 rounded-xl bg-ink shadow-[0_10px_24px_-12px_rgba(42,36,51,0.7)]"
                            transition={spring.snappy}
                            aria-hidden
                          />
                        )}
                        <span className="relative block text-sm leading-tight font-bold">
                          {p.name}
                          {i === recommendedIndex && <span aria-label="(el más elegido)"> ⭐</span>}
                        </span>
                        <PlanPrice
                          cents={p.priceCents}
                          className={cn(
                            'relative block text-[0.7rem]',
                            on ? 'text-white/65' : 'text-ink/45',
                          )}
                        />
                      </button>
                    )
                  })}
                </div>
                <Reasons reasons={choice.reasons} plan={plan} modules={theme.modules} />
              </>
            )}

            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold tracking-wider text-ink/45 uppercase">
                  {quote ? 'Total con cupón' : 'Total'}
                </p>
                <AnimatedPrice
                  cents={total}
                  className="font-display text-[2.6rem] leading-none font-bold text-ink"
                />
              </div>
              <div className="pb-1 text-right text-sm">
                {quote ? (
                  <p className="text-ink/45 line-through">
                    <PlanPrice cents={quote.listPriceCents} />
                  </p>
                ) : (
                  tiered &&
                  plan.compareAtCents &&
                  plan.compareAtCents > plan.priceCents && (
                    <p className="text-ink/45 line-through">
                      <PlanPrice cents={plan.compareAtCents} />
                    </p>
                  )
                )}
                {quote ? (
                  <p className="font-bold text-good-ink">{quote.label}</p>
                ) : (
                  tiered &&
                  savingsOf(plan) > 0 && (
                    <p className="font-bold text-good-ink">Ahorrás {savingsOf(plan)}%</p>
                  )
                )}
              </div>
            </div>
            <p className="mt-1 text-xs text-ink/50">
              Pago único con Mercado Pago · sin suscripción
            </p>

            <ul className="mt-5 grid grid-cols-2 gap-2 text-sm text-ink/75">
              <Fact icon={<Layers className="size-4" />}>
                {theme.screens[choice.index] ?? 0} pantallas
              </Fact>
              <Fact icon={<Sparkles className="size-4" />}>
                {theme.games[choice.index] ?? 0}{' '}
                {theme.games[choice.index] === 1 ? 'juego' : 'juegos'}
              </Fact>
              <Fact icon={<Images className="size-4" />}>Hasta {plan.maxPhotos} fotos</Fact>
              <Fact icon={<Timer className="size-4" />}>{plan.days} días online</Fact>
              <Fact
                icon={
                  plan.allowPassword ? <KeyRound className="size-4" /> : <Lock className="size-4" />
                }
              >
                {plan.allowPassword ? 'Con clave' : 'Sin clave'}
              </Fact>
            </ul>

            {step && (
              <button
                type="button"
                onClick={() => applyPlan(step.index)}
                className="group mt-5 w-full rounded-2xl border-2 border-dashed border-brand/30 bg-brand-soft/60 p-3.5 text-left transition-colors hover:border-brand/60"
              >
                <p className="text-sm text-ink/70">
                  Por{' '}
                  <strong className="text-ink">
                    +<PlanPrice cents={step.extraCents} />
                  </strong>
                  , {step.plan.name} suma{' '}
                  {step.adds.length > 0 ? (
                    <>
                      {step.adds.length} {step.adds.length === 1 ? 'módulo' : 'módulos'}{' '}
                      <span aria-hidden>
                        {step.adds
                          .map((k) => theme.modules.find((m) => m.kind === k)?.emoji)
                          .filter(Boolean)
                          .slice(0, 5)
                          .join(' ')}
                      </span>
                    </>
                  ) : (
                    'más fotos y días online'
                  )}
                  {step.plan.days > plan.days && ` y ${step.plan.days} días online`}.
                </p>
                <p className="mt-1 text-sm font-bold text-brand group-hover:underline">
                  Pasar a {step.plan.name} →
                </p>
              </button>
            )}

            <CouponBox
              code={code}
              onCode={setCode}
              onApply={applyCoupon}
              onClear={() => {
                setAppliedCode(null)
                setCode('')
                setCouponError('')
              }}
              applied={quote ? appliedCode : null}
              checking={checking}
              error={couponError}
              welcome={welcome}
            />

            <div className="mt-5 grid gap-2">
              {salesPaused ? (
                <p
                  role="status"
                  className="rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 ring-1 ring-amber-200"
                >
                  Pausamos las ventas por un rato. Mientras tanto, probá el editor gratis.
                </p>
              ) : (
                <ButtonLink href={checkoutHref} size="lg" block>
                  <Gift className="size-5" aria-hidden /> Comprar por <PlanPrice cents={total} />
                </ButtonLink>
              )}
              <div className="grid grid-cols-2 gap-2">
                <ButtonLink href={tryHref} variant="secondary" size="md">
                  <Wand2 className="size-4 text-brand" aria-hidden /> Probar gratis
                </ButtonLink>
                <ButtonLink href={exampleHref} variant="secondary" size="md">
                  <Play className="size-4 fill-current" aria-hidden /> Ver ejemplo
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileBar
        show={building && !summaryVisible}
        plan={tiered ? plan.name : theme.name}
        cents={total}
        href={salesPaused ? tryHref : checkoutHref}
        cta={salesPaused ? 'Probar gratis' : 'Comprar'}
      />
    </div>
  )
}

/** Un módulo optativo (no viene en el plan más básico). */
function isOptional(modules: QuoteModule[], kind: string) {
  return (modules.find((m) => m.kind === kind)?.from ?? 0) > 0
}

const unique = (values: number[]) => [...new Set(values)].sort((a, b) => a - b)

function Step({
  n,
  title,
  hint,
  action,
  children,
}: {
  n: number
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[28px] bg-white p-5 ring-1 ring-black/5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand font-display text-sm font-bold text-white">
            {n}
          </span>
          <div>
            <h2 className="font-display text-xl leading-tight font-bold text-ink">{title}</h2>
            {hint && <p className="mt-0.5 text-sm text-ink/55">{hint}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

type ToggleState = 'always' | 'on' | 'bonus' | 'off'

function ModuleToggle({
  module: m,
  plans,
  tiered,
  state,
  extraCents,
  onToggle,
}: {
  module: QuoteModule
  plans: QuotePlan[]
  tiered: boolean
  state: ToggleState
  extraCents: number
  onToggle(): void
}) {
  const from = plans[m.from]
  const content = (
    <>
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-xl text-xl',
          state === 'on' ? 'bg-white/10' : 'bg-canvas',
        )}
        aria-hidden
      >
        {m.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-tight font-semibold">{m.label}</span>
        <span
          className={cn(
            'mt-0.5 block text-xs leading-snug',
            state === 'on' ? 'text-white/65' : 'text-ink/55',
          )}
        >
          {m.blurb}
        </span>
      </span>
      <span className="shrink-0 text-right text-[0.68rem] font-bold">
        {state === 'always' && (
          <span className="text-ink/40">{tiered ? 'Siempre' : 'Incluido'}</span>
        )}
        {state === 'bonus' && <span className="text-good-ink">Viene con tu plan</span>}
        {state === 'on' && (
          <motion.span
            className="grid size-6 place-items-center rounded-full bg-brand text-white"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={spring.bouncy}
          >
            <Check className="size-3.5" strokeWidth={3} aria-hidden />
          </motion.span>
        )}
        {state === 'off' && from && (
          <span className="flex flex-col items-end gap-0.5">
            <span
              className="rounded-full px-2 py-0.5 text-white"
              style={{ backgroundColor: from.color }}
            >
              {from.name}
            </span>
            {extraCents > 0 && (
              <span className="text-ink/50">
                +<PlanPrice cents={extraCents} />
              </span>
            )}
          </span>
        )}
      </span>
    </>
  )

  if (state === 'always') {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-canvas/60 p-2.5 pr-3 text-ink ring-1 ring-black/[0.04]">
        {content}
      </div>
    )
  }
  return (
    <motion.button
      type="button"
      aria-pressed={state === 'on'}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-3 rounded-2xl p-2.5 pr-3 text-left ring-1 transition-colors duration-200',
        state === 'on' && 'bg-ink text-white ring-ink',
        state === 'bonus' && 'bg-[#f1faf1] text-ink ring-good/25 hover:ring-good/50',
        state === 'off' && 'bg-white text-ink ring-black/10 hover:ring-black/25',
      )}
      whileTap={{ scale: 0.97 }}
      transition={spring.snappy}
    >
      {content}
    </motion.button>
  )
}

function Reasons({
  reasons,
  plan,
  modules,
}: {
  reasons: Reason[]
  plan: QuotePlan
  modules: QuoteModule[]
}) {
  const parts = reasons.map((r) => {
    if (r.type === 'module') {
      const m = modules.find((x) => x.kind === r.kind)
      return m ? `${m.emoji} ${m.label}` : r.kind
    }
    if (r.type === 'photos') return `📷 ${r.photos} fotos`
    if (r.type === 'days') return `⏳ ${r.days} días online`
    return '🔐 la clave'
  })
  return (
    <p className="mt-3 min-h-[2.5rem] text-sm leading-snug text-ink/60" aria-live="polite">
      <Swap id={`${plan.slug}-${parts.join()}`} className="block">
        {parts.length === 0 ? (
          <>
            Con <strong className="text-ink">{plan.name}</strong> ya tenés lo esencial para
            emocionar.
          </>
        ) : (
          <>
            <strong className="text-ink">{plan.name}</strong> porque elegiste{' '}
            {listing(parts.slice(0, 3))}
            {parts.length > 3 && ` y ${parts.length - 3} más`}.
          </>
        )}
      </Swap>
    </p>
  )
}

/** "a, b y c" */
function listing(items: string[]) {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} y ${items.at(-1)}`
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2">
      <span className="text-brand" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 truncate">{children}</span>
    </li>
  )
}

function PlanPrice({ cents, className }: { cents: number; className?: string }) {
  const { formatPrice } = useCurrency()
  return <span className={className}>{formatPrice(cents)}</span>
}

/** El total: cuenta hasta el precio nuevo cuando cambia (el servidor ya manda el valor final). */
function AnimatedPrice({ cents, className }: { cents: number; className?: string }) {
  const { formatPrice } = useCurrency()
  const ref = useRef<HTMLSpanElement>(null)
  const value = useMotionValue(cents)
  // El texto lo escribe la animación: React solo pone el primero (así no se pisan).
  const [first] = useState(() => formatPrice(cents))
  useEffect(() => {
    const controls = animate(value, cents, { duration: 0.6, ease: ease.out })
    return () => controls.stop()
  }, [cents, value])
  useMotionValueEvent(value, 'change', (v) => {
    if (ref.current) ref.current.textContent = formatPrice(Math.round(v))
  })
  // Al cambiar de moneda (pesos o dólares) se reescribe sin animar.
  useEffect(() => {
    if (ref.current) ref.current.textContent = formatPrice(Math.round(value.get()))
  }, [formatPrice, value])
  return (
    <span ref={ref} className={cn('block tabular-nums', className)}>
      {first}
    </span>
  )
}

function CouponBox({
  code,
  onCode,
  onApply,
  onClear,
  applied,
  checking,
  error,
  welcome,
}: {
  code: string
  onCode(code: string): void
  onApply(code: string): void
  onClear(): void
  applied: string | null
  checking: boolean
  error: string
  welcome: { code: string; discount: string } | null
}) {
  return (
    <div className="mt-5">
      {applied ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#f1faf1] px-4 py-3 ring-1 ring-good/25">
          <span className="flex items-center gap-2 text-sm font-semibold text-good-ink">
            <TicketPercent className="size-4" aria-hidden /> {applied}
          </span>
          <button
            type="button"
            onClick={onClear}
            aria-label="Quitar el cupón"
            className="grid size-7 place-items-center rounded-full text-ink/50 hover:bg-white hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onApply(code)
          }}
          className="flex gap-2"
        >
          <label className="sr-only" htmlFor="cotizador-cupon">
            Código de cupón
          </label>
          <input
            id="cotizador-cupon"
            value={code}
            onChange={(e) => onCode(e.target.value.toUpperCase())}
            placeholder="¿Tenés un cupón?"
            maxLength={32}
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-full bg-canvas px-4 font-mono text-sm tracking-wide text-ink uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:normal-case focus:bg-white focus:shadow-[0_0_0_2px_rgb(244_78_99/0.45)]"
          />
          <button
            type="submit"
            disabled={!code.trim() || checking}
            className="h-11 shrink-0 rounded-full bg-ink px-4 text-sm font-bold text-white transition-opacity disabled:opacity-40"
          >
            {checking ? '…' : 'Aplicar'}
          </button>
        </form>
      )}
      <AnimatePresence initial={false}>
        {error && !applied && (
          <motion.p
            className="mt-2 text-xs font-medium text-red-600"
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
      {welcome && !applied && (
        <button
          type="button"
          onClick={() => onApply(welcome.code)}
          className="mt-2 text-xs text-ink/55 hover:text-brand"
        >
          ¿Primera Boxie? Usá <strong className="font-mono text-ink">{welcome.code}</strong> (
          {welcome.discount})
        </button>
      )}
    </div>
  )
}

/** En el celular: el plan y el precio siempre a mano mientras se arma. */
function MobileBar({
  show,
  plan,
  cents,
  href,
  cta,
}: {
  show: boolean
  plan: string
  cents: number
  href: Route
  cta: string
}) {
  const bar = useRef<HTMLDivElement>(null)
  useBottomBar(bar, show)
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={bar}
          className="fixed inset-x-3 z-30 lg:hidden"
          style={{ bottom: 'calc(var(--dock) + 12px)' }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={spring.soft}
        >
          <div className="flex items-center gap-3 rounded-full bg-ink p-2 pl-5 text-white shadow-[0_18px_40px_-12px_rgba(42,36,51,0.6)]">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.7rem] font-semibold text-white/60">{plan}</p>
              <AnimatedPrice
                cents={cents}
                className="font-display text-lg leading-tight font-bold"
              />
            </div>
            <ButtonLink href={href} size="md" className="shrink-0">
              {cta}
            </ButtonLink>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
