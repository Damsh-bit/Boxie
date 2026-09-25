'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Crown, Eye, Gift } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { couponDiscount } from '@/domain/coupons'
import { formatARS } from '@/domain/money'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { ease, spring, useCalm } from '@/ui/motion'

/** Un plan tal como lo muestra la ficha (lo que incluye en esta temática). */
export interface BuyPlan {
  slug: string
  name: string
  tagline: string
  priceCents: number
  compareAtCents: number | null
  highlighted: boolean
  /** "14 pantallas · 5 para personalizar · 3 juegos". */
  summary: string
  days: number
}

interface Props {
  slug: string
  name: string
  priceCents: number
  offer: {
    code: string
    label: string
    delaySeconds: number
    kind: 'percent' | 'fixed'
    value: number
  } | null
  /** Planes a la venta (vacío = un solo precio, como antes). */
  plans?: BuyPlan[]
  /** El plan que viene elegido (de la home o /precios: ?plan=). */
  initialPlan?: string | null
  /** Lo que va entre el precio y el botón (la lista de características). */
  children?: ReactNode
}

/**
 * Precio y botón de compra. A los N segundos aparece la oferta de urgencia:
 * el monto que se muestra es el del cupón real, y el cupón viaja al checkout,
 * donde el servidor lo vuelve a validar (acá solo se muestra).
 *
 * En el celular, cuando el botón queda fuera de la pantalla, aparece una
 * barra fija abajo para comprar sin volver a subir.
 */
export function BuyBox({
  slug,
  name,
  priceCents: basePrice,
  offer,
  plans = [],
  initialPlan = null,
  children,
}: Props) {
  const [showOffer, setShowOffer] = useState(false)
  const [planSlug, setPlanSlug] = useState(
    () =>
      (
        plans.find((p) => p.slug === initialPlan) ??
        plans.find((p) => p.highlighted) ??
        plans[Math.floor(plans.length / 2)]
      )?.slug ?? null,
  )
  const plan = plans.find((p) => p.slug === planSlug) ?? null
  const priceCents = plan ? plan.priceCents : basePrice
  const cta = useRef<HTMLDivElement>(null)
  const ctaHidden = useOutOfView(cta)
  const calm = useCalm()

  const delay = offer?.delaySeconds
  useEffect(() => {
    if (delay === undefined) return
    const timer = setTimeout(() => setShowOffer(true), delay * 1000)
    return () => clearTimeout(timer)
  }, [delay])

  const active = showOffer && offer
  const href =
    `/checkout?tematica=${slug}${plan ? `&plan=${plan.slug}` : ''}${active ? `&cupon=${offer.code}` : ''}` as Route
  const label = active ? 'Quiero mi Boxie con descuento' : 'Quiero mi Boxie'
  const offerPrice = offer ? priceCents - couponDiscount(offer, priceCents) : priceCents
  const price = active ? offerPrice : priceCents

  return (
    <>
      {plans.length > 0 && (
        <PlanPicker plans={plans} value={planSlug} onChange={setPlanSlug} slug={slug} />
      )}
      <div className="mt-1 mb-3 flex min-h-12 flex-wrap items-baseline gap-x-3" aria-live="polite">
        <motion.span
          layout="position"
          className={cn(
            'relative font-display font-bold transition-[color,font-size] duration-500',
            active ? 'text-lg text-neutral-400' : 'text-[32px] text-ink',
          )}
          transition={spring.soft}
        >
          {formatARS(priceCents)}
          <motion.span
            aria-hidden
            className="absolute top-1/2 left-0 h-0.5 w-full origin-left rounded-full bg-neutral-400"
            initial={false}
            animate={{ scaleX: active ? 1 : 0 }}
            transition={{ duration: 0.45, ease: ease.out, delay: active ? 0.15 : 0 }}
          />
        </motion.span>
        <AnimatePresence>
          {active && (
            <motion.span
              className="font-display text-[34px] font-bold text-brand"
              initial={{ opacity: 0, scale: 0.5, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ ...spring.bouncy, delay: 0.25 }}
            >
              {formatARS(offerPrice)}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {children}

      <div className="w-full" ref={cta}>
        <AnimatePresence initial={false}>
          {active && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.9 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0 }}
              transition={spring.bouncy}
              className="origin-bottom"
            >
              <div className="mb-3 flex items-center gap-3 rounded-2xl border border-amber-300 bg-[#FFFBEA] p-3 text-left text-[#5d4037] shadow-[0_4px_10px_rgba(0,0,0,0.05)]">
                <motion.span
                  className="text-2xl"
                  aria-hidden
                  animate={calm ? undefined : { rotate: [0, -14, 12, -8, 0] }}
                  transition={{ duration: 0.9, delay: 0.5 }}
                >
                  🎁
                </motion.span>
                <div className="flex flex-col">
                  <strong className="text-[13px] tracking-wide text-red-700 uppercase">
                    ¡Oferta especial para vos!
                  </strong>
                  <p className="mt-0.5 text-xs leading-tight">
                    Si comprás ya, tenés un{' '}
                    <span className="rounded bg-red-700 px-1 font-extrabold text-white">
                      {offer.label}
                    </span>{' '}
                    aplicado.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="relative">
          {active && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-brand opacity-0 motion-reduce:hidden"
              animate={
                calm ? undefined : { opacity: [0.7, 0], transform: ['scale(1)', 'scale(1.08)'] }
              }
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <ButtonLink
            href={href}
            block
            className="h-auto rounded-2xl py-4 font-display text-base tracking-wider uppercase"
          >
            <Gift className="size-5" aria-hidden /> {label}
          </ButtonLink>
        </div>
      </div>

      <AnimatePresence>
        {ctaHidden && (
          <motion.div
            className="fixed inset-x-3 z-30 lg:hidden"
            style={{ bottom: 'calc(var(--dock) + 12px)' }}
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={spring.gentle}
          >
            <div className="mx-auto flex max-w-md items-center gap-3 rounded-[22px] bg-white/95 p-2 pl-4 shadow-[0_18px_50px_rgba(42,36,51,0.22)] ring-1 ring-black/5 backdrop-blur">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-xs font-semibold text-neutral-500">
                  Boxie {name}
                  {plan ? ` · ${plan.name}` : ''}
                </p>
                <p className="font-display text-xl font-bold text-ink">{formatARS(price)}</p>
              </div>
              <ButtonLink href={href} size="md" className="px-5">
                <Gift className="size-4" aria-hidden /> Quiero la mía
              </ButtonLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Elegir el plan: cada uno con lo que incluye en esta temática. La marca se
 * desliza al plan elegido y el precio de abajo lo acompaña.
 */
function PlanPicker({
  plans,
  value,
  onChange,
  slug,
}: {
  plans: BuyPlan[]
  value: string | null
  onChange(slug: string): void
  slug: string
}) {
  return (
    <div className="mt-3 mb-4">
      <div role="radiogroup" aria-label="Elegí el plan" className="flex flex-col gap-2">
        {plans.map((p) => {
          const selected = p.slug === value
          return (
            <motion.button
              key={p.slug}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(p.slug)}
              className={cn(
                'relative flex items-center gap-3 rounded-2xl border-2 px-3.5 py-3 text-left transition-colors duration-200',
                selected ? 'border-brand' : 'border-neutral-200 hover:border-brand/40',
              )}
              whileTap={{ scale: 0.98 }}
              transition={spring.snappy}
            >
              {selected && (
                <motion.span
                  layoutId={`plan-bg-${slug}`}
                  className="absolute inset-0 rounded-[14px] bg-brand-soft"
                  transition={spring.soft}
                />
              )}
              <span
                className={cn(
                  'relative grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                  selected ? 'border-brand bg-brand text-white' : 'border-neutral-300',
                )}
                aria-hidden
              >
                {selected && <Check className="size-3" strokeWidth={3.5} />}
              </span>
              <span className="relative min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
                  {p.name}
                  {p.highlighted && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                      <Crown className="size-2.5" aria-hidden /> Más elegido
                    </span>
                  )}
                </span>
                <span className="block text-xs text-neutral-500">
                  {p.summary} · online {p.days} días
                </span>
              </span>
              <span className="relative shrink-0 text-right">
                <span className="block font-display text-lg font-bold text-ink">
                  {formatARS(p.priceCents)}
                </span>
                {p.compareAtCents && (
                  <span className="block text-xs text-neutral-400 line-through">
                    {formatARS(p.compareAtCents)}
                  </span>
                )}
              </span>
            </motion.button>
          )
        })}
      </div>
      {value && (
        <Link
          href={`/ejemplo/${slug}?plan=${value}` as Route}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
        >
          <Eye className="size-3.5" aria-hidden /> Ver qué incluye este plan
        </Link>
      )}
    </div>
  )
}

/** true cuando el elemento salió de la pantalla (arranca en false: sin parpadeo al cargar). */
function useOutOfView(ref: RefObject<HTMLElement | null>) {
  const [out, setOut] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => setOut(!entry!.isIntersecting), {
      rootMargin: '0px 0px -40px 0px',
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])
  return out
}
