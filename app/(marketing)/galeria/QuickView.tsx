'use client'

import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight, Gift, Play, X } from 'lucide-react'
import Image from 'next/image'
import { Dialog } from 'radix-ui'
import { useEffect, useRef, useState } from 'react'
import { describeDaysUntil } from '@/domain/gallery'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { useCurrency } from '@/ui/currency/CurrencyContext'
import { useIsDesktop } from '@/ui/Modal'
import { ease, spring } from '@/ui/motion'
import { contentsOf, exampleHref, isTiered, priceOf, themeHref } from './helpers'
import type { GalleryPlan, GalleryTheme } from './types'

/**
 * La vista rápida: fotos, para qué ocasiones va y qué trae en cada plan, sin
 * salir de la galería. En la computadora es una ventana en el centro (con ← y
 * → se pasa a la temática de al lado); en el celular sube desde abajo y se
 * cierra arrastrándola.
 */
export function QuickView({
  themes,
  slug,
  onSlug,
  onClose,
  plans,
  plan,
  onPlan,
  recommendedPlan,
  priceFromCents,
}: {
  /** Las temáticas entre las que se navega (las que se ven en la grilla). */
  themes: GalleryTheme[]
  slug: string | null
  onSlug(slug: string): void
  onClose(): void
  plans: GalleryPlan[]
  plan: string | null
  onPlan(plan: string): void
  recommendedPlan: string | null
  priceFromCents: number
}) {
  const desktop = useIsDesktop()
  const drag = useDragControls()
  const index = themes.findIndex((t) => t.slug === slug)
  const current = index >= 0 ? themes[index]! : null
  // Mientras se cierra se sigue viendo la última (el slug ya es null).
  const [shown, setShown] = useState(current)
  if (current && current !== shown) setShown(current)
  const [direction, setDirection] = useState(0)
  const open = current !== null
  const scroller = useRef<HTMLDivElement>(null)

  // En el celular todo scrollea junto: cada temática nueva arranca desde la foto.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 })
  }, [shown?.slug])

  const go = (delta: number) => {
    if (themes.length < 2 || index < 0) return
    setDirection(delta)
    onSlug(themes[(index + delta + themes.length) % themes.length]!.slug)
  }

  // ← y → pasan de temática (salvo escribiendo en un campo).
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const onDragEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    if (offset.y > 120 || velocity.y > 600) onClose()
  }

  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <AnimatePresence>
        {open && shown && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[100] bg-ink/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed z-[101] flex flex-col overflow-hidden bg-white shadow-2xl outline-none',
                  desktop
                    ? 'top-1/2 left-1/2 max-h-[min(88dvh,720px)] w-[calc(100%-32px)] max-w-[960px] rounded-[32px]'
                    : 'inset-x-0 bottom-0 max-h-[94dvh] rounded-t-[28px]',
                )}
                style={desktop ? { x: '-50%', y: '-50%' } : undefined}
                initial={desktop ? { opacity: 0, scale: 0.95 } : { y: '100%' }}
                animate={desktop ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={
                  desktop
                    ? { opacity: 0, scale: 0.97, transition: { duration: 0.15 } }
                    : { y: '100%', transition: { duration: 0.25, ease: ease.in } }
                }
                transition={desktop ? spring.soft : spring.gentle}
                drag={desktop ? false : 'y'}
                dragListener={false}
                dragControls={drag}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={onDragEnd}
              >
                {!desktop && (
                  <div
                    className="absolute inset-x-0 top-0 z-30 flex cursor-grab touch-none justify-center pt-2.5 pb-3 active:cursor-grabbing"
                    onPointerDown={(e) => drag.start(e)}
                    aria-hidden
                  >
                    <span className="h-1.5 w-10 rounded-full bg-white/80 shadow" />
                  </div>
                )}
                <Dialog.Close
                  className="absolute top-3 right-3 z-30 grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-md backdrop-blur transition-colors hover:bg-ink hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="size-5" aria-hidden />
                </Dialog.Close>

                <div
                  ref={scroller}
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain md:flex-row md:overflow-hidden"
                >
                  <AnimatePresence mode="wait" initial={false} custom={direction}>
                    <motion.div
                      key={shown.slug}
                      className="flex min-h-0 flex-col md:flex-1 md:flex-row"
                      custom={direction}
                      variants={{
                        enter: (d: number) => ({ opacity: 0, x: d * 40 }),
                        center: { opacity: 1, x: 0 },
                        exit: (d: number) => ({
                          opacity: 0,
                          x: d * -40,
                          transition: { duration: 0.14, ease: ease.in },
                        }),
                      }}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{ duration: 0.28, ease: ease.out }}
                    >
                      <ImageStage theme={shown} />
                      <Details
                        theme={shown}
                        position={{ index, total: themes.length }}
                        onPrev={() => go(-1)}
                        onNext={() => go(1)}
                        plans={plans}
                        plan={plan}
                        onPlan={onPlan}
                        recommendedPlan={recommendedPlan}
                        priceFromCents={priceFromCents}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

/** Las fotos de la temática: se pasan deslizando, con los puntos o con las flechas. */
function ImageStage({ theme }: { theme: GalleryTheme }) {
  const [active, setActive] = useState(0)
  const images = theme.images
  const step = (delta: number) => setActive((i) => (i + delta + images.length) % images.length)

  return (
    <div
      className="group/stage relative aspect-[4/3] w-full shrink-0 overflow-hidden md:aspect-auto md:min-h-[480px] md:w-[48%]"
      style={{ backgroundColor: theme.color }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={active}
          className="absolute inset-0 touch-pan-y"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: ease.out }}
          drag={images.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) step(1)
            else if (info.offset.x > 50) step(-1)
          }}
        >
          <Image
            src={images[active]!}
            alt={`${theme.name}: foto ${active + 1} de ${images.length}`}
            fill
            sizes="(max-width: 768px) 100vw, 460px"
            className="pointer-events-none object-cover select-none"
            draggable={false}
          />
        </motion.div>
      </AnimatePresence>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 to-transparent" />

      {images.length > 1 && (
        <>
          {(['prev', 'next'] as const).map((side) => (
            <button
              key={side}
              type="button"
              onClick={() => step(side === 'prev' ? -1 : 1)}
              aria-label={side === 'prev' ? 'Foto anterior' : 'Foto siguiente'}
              className={cn(
                'absolute top-1/2 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink opacity-0 shadow-md backdrop-blur transition-opacity group-hover/stage:opacity-100 focus-visible:opacity-100 md:grid',
                side === 'prev' ? 'left-3' : 'right-3',
              )}
            >
              {side === 'prev' ? (
                <ChevronLeft className="size-5" aria-hidden />
              ) : (
                <ChevronRight className="size-5" aria-hidden />
              )}
            </button>
          ))}
          <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1.5">
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === active}
                className="grid h-6 place-items-center px-0.5"
              >
                <motion.span
                  className="block h-1.5 rounded-full bg-white"
                  initial={false}
                  animate={{ width: i === active ? 22 : 6, opacity: i === active ? 1 : 0.6 }}
                  transition={spring.snappy}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function Details({
  theme,
  position,
  onPrev,
  onNext,
  plans,
  plan,
  onPlan,
  recommendedPlan,
  priceFromCents,
}: {
  theme: GalleryTheme
  position: { index: number; total: number }
  onPrev(): void
  onNext(): void
  plans: GalleryPlan[]
  plan: string | null
  onPlan(plan: string): void
  recommendedPlan: string | null
  priceFromCents: number
}) {
  const { formatPrice } = useCurrency()
  const tiered = isTiered(plans)
  // En la vista rápida siempre se muestra un plan: el elegido, el recomendado o el más completo.
  const shownPlan = tiered ? (plan ?? recommendedPlan ?? plans.at(-1)!.slug) : plan
  const { contents } = contentsOf(theme, plans, shownPlan)
  const price = priceOf(theme, plans, shownPlan, priceFromCents)
  const chosen = plans.find((p) => p.slug === shownPlan)
  const top = plans.at(-1)
  const extra =
    tiered && top && top.slug !== shownPlan
      ? contentsOf(theme, plans, top.slug).contents.items.filter(
          (i) => !contents.items.some((c) => c.kind === i.kind),
        )
      : []

  return (
    <div className="@container flex min-w-0 flex-1 flex-col md:overflow-y-auto md:overscroll-contain">
      <div className="flex-1 px-5 pt-5 pb-6 md:pt-7 @[460px]:px-8">
        <div className="mb-3 flex items-center justify-between gap-3 md:pr-12">
          <span className="flex items-center gap-2 text-xs font-extrabold tracking-wider text-brand uppercase">
            <span
              className="size-2 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: theme.color }}
              aria-hidden
            />
            {theme.category}
          </span>
          {position.total > 1 && position.index >= 0 && (
            <div className="flex items-center gap-1 text-xs font-semibold text-ink/50">
              <button
                type="button"
                onClick={onPrev}
                aria-label="Temática anterior"
                className="grid size-8 place-items-center rounded-full text-ink/70 transition-colors hover:bg-paper hover:text-ink"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <span className="tabular-nums">
                {position.index + 1} / {position.total}
              </span>
              <button
                type="button"
                onClick={onNext}
                aria-label="Temática siguiente"
                className="grid size-8 place-items-center rounded-full text-ink/70 transition-colors hover:bg-paper hover:text-ink"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          )}
        </div>

        <Dialog.Title className="flex items-center gap-2 font-display text-[1.9rem] leading-tight font-bold text-ink">
          {theme.name}
          <span aria-hidden className="text-2xl">
            {theme.emoji}
          </span>
        </Dialog.Title>
        <Dialog.Description className="mt-2 text-[0.98rem] leading-relaxed text-ink/70">
          {theme.subtitle || theme.description}
        </Dialog.Description>

        {theme.next?.hot && (
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand-dark">
            <span aria-hidden>🗓️</span> {theme.next.name}: {describeDaysUntil(theme.next.daysUntil)}
          </p>
        )}

        {theme.occasions.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-xs font-extrabold tracking-wider text-ink/45 uppercase">
              Ideal para
            </h3>
            <ul className="flex flex-wrap gap-1.5">
              {theme.occasions.map((o) => (
                <li
                  key={o}
                  className="rounded-full bg-paper/60 px-3 py-1 text-sm font-semibold text-ink/80"
                >
                  {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {theme.features.length > 0 && (
          <ul className="mt-5 space-y-2">
            {theme.features.slice(0, 5).map((f) => (
              <li
                key={f}
                className="flex items-start gap-2.5 text-[0.92rem] leading-snug text-ink/75"
              >
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                {f}
              </li>
            ))}
          </ul>
        )}

        {contents.items.length > 0 && (
          <section className="mt-6 rounded-3xl bg-canvas p-4 sm:p-5" aria-label="Qué trae">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h3 className="font-display text-lg font-bold text-ink">Qué trae</h3>
              <span className="text-sm text-ink/55">
                {contents.screens} pantallas
                {contents.games > 0 &&
                  ` · ${contents.games} ${contents.games === 1 ? 'juego' : 'juegos'}`}
              </span>
            </div>
            {tiered && (
              <div
                role="group"
                aria-label="Plan"
                className="mb-3 flex gap-1 rounded-full bg-white p-1 ring-1 ring-black/5"
              >
                {plans.map((p) => {
                  const selected = p.slug === shownPlan
                  return (
                    <button
                      key={p.slug}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onPlan(p.slug)}
                      className={cn(
                        'relative flex-1 rounded-full px-2 py-1.5 text-sm font-semibold transition-colors',
                        selected ? 'text-white' : 'text-ink/65 hover:text-ink',
                      )}
                    >
                      {selected && (
                        <motion.span
                          layoutId="vista-rapida-plan"
                          className="absolute inset-0 rounded-full bg-ink"
                          transition={spring.snappy}
                          aria-hidden
                        />
                      )}
                      <span className="relative">{p.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <motion.ul layout className="grid grid-cols-2 gap-1.5">
              <AnimatePresence initial={false} mode="popLayout">
                {contents.items.map((item) => (
                  <motion.li
                    key={item.kind}
                    layout
                    className="flex items-center gap-2 rounded-2xl bg-white px-2.5 py-2 text-[0.85rem] font-medium text-ink/80 ring-1 ring-black/[0.04]"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={spring.snappy}
                  >
                    <span aria-hidden>{item.emoji}</span>
                    <span className="min-w-0 leading-tight">{item.label}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </motion.ul>
            {extra.length > 0 && top && (
              <button
                type="button"
                onClick={() => onPlan(top.slug)}
                className="mt-3 text-left text-sm text-ink/60 underline-offset-4 hover:text-brand hover:underline"
              >
                Con <strong className="text-ink">{top.name}</strong> suma {extra.length} más:{' '}
                {extra
                  .slice(0, 4)
                  .map((i) => i.emoji)
                  .join(' ')}
                {extra.length > 4 && '…'}
              </button>
            )}
          </section>
        )}
      </div>

      <div className="sticky bottom-0 z-10 mt-auto border-t border-black/[0.06] bg-white/95 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur @[460px]:px-8">
        <div className="mb-2.5 flex items-baseline gap-2">
          <span className="font-display text-2xl font-bold text-ink">
            {price.from ? 'Desde ' : ''}
            {formatPrice(price.cents)}
          </span>
          {chosen?.compareAtCents && chosen.compareAtCents > chosen.priceCents && (
            <span className="text-sm text-ink/40 line-through">
              {formatPrice(chosen.compareAtCents)}
            </span>
          )}
          {chosen && tiered && <span className="text-sm text-ink/55">· Plan {chosen.name}</span>}
        </div>
        <div className="flex gap-2">
          <ButtonLink href={themeHref(theme.slug, shownPlan)} size="md" className="flex-1">
            <Gift className="size-4" aria-hidden /> Elegir esta Ribbly
          </ButtonLink>
          <ButtonLink href={exampleHref(theme.slug, shownPlan)} variant="secondary" size="md">
            <Play className="size-4 fill-current" aria-hidden />
            <span className="hidden @[420px]:inline">Ver ejemplo</span>
            <span className="@[420px]:hidden">Ejemplo</span>
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
