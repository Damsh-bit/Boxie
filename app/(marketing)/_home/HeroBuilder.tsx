'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Check, PauseCircle, Play, Smartphone, Wand2, Zap } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ButtonLink, Nudge } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Emoji, Icon } from '@/ui/Icon'
import { MercadoPagoLogo } from '@/ui/MercadoPagoLogo'
import { Swap, spring, useCalm } from '@/ui/motion'
import { rememberRecipient } from '@/ui/recipient'
import { Magnetic } from './primitives'
import { lookOf, type HomeTheme } from './theme-look'

/** La bandera en SVG: Windows no dibuja los emojis de banderas. */
function FlagAR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" aria-hidden className={className}>
      <rect width="18" height="12" rx="2.5" fill="#74ACDF" />
      <rect y="4" width="18" height="4" fill="#fff" />
      <circle cx="9" cy="6" r="1.3" fill="#F6B40E" />
    </svg>
  )
}

/** Lo que da confianza, debajo del armador (el pago seguro va junto al precio). */
const TRUST: { icon: ReactNode; label: string }[] = [
  { icon: <Zap className="size-3.5 text-brand" aria-hidden />, label: 'Llega al instante' },
  {
    icon: <Smartphone className="size-3.5 text-brand" aria-hidden />,
    label: 'Sin apps ni cuentas',
  },
  {
    icon: <FlagAR className="h-2.5 w-[15px] shadow-[0_0_0_1px_rgba(42,36,51,0.08)]" />,
    label: 'Hecho en Argentina',
  },
]

/** El texto sobre el color de una temática: blanco o tinta, según su tarjeta. */
const inkOn = (theme: HomeTheme) => (theme.tone === 'light' ? '#ffffff' : '#2a2433')

/**
 * El armador de la portada: elegís la ocasión, escribís el nombre y el
 * celular de al lado lo muestra en vivo. Un borde con una luz que da vueltas
 * del color de la temática, los pasos que se tildan al completarse, el
 * nombre de ejemplo que se escribe solo y el botón con un brillo que pasa.
 */
export function HeroBuilder({
  themes,
  theme,
  chosen,
  name,
  onName,
  onChoose,
  salesPaused,
  hasPreviousPurchases,
}: {
  themes: HomeTheme[]
  theme: HomeTheme
  /** Ya eligieron una temática (no es la que viene marcada). */
  chosen: boolean
  name: string
  onName(name: string): void
  onChoose(slug: string): void
  salesPaused: boolean
  hasPreviousPurchases: boolean
}) {
  const router = useRouter()
  const calm = useCalm()
  const [focused, setFocused] = useState(false)
  const short = name.trim()

  // El nombre viaja a la ficha, al checkout y al editor: no se vuelve a pedir.
  const para = short ? `?para=${encodeURIComponent(short)}` : ''
  const href = `/tematicas/${theme.slug}${para}` as Route
  const base = hasPreviousPurchases ? 'Crear otra Ribbly' : 'Crear su Ribbly'
  const cta = short && short.length <= 10 ? `Crear la Ribbly de ${short}` : base

  return (
    <>
      <div className="relative isolate overflow-hidden rounded-[30px] bg-white/55 p-[2px] shadow-[0_30px_70px_-26px_rgba(42,36,51,0.42)] ring-1 ring-black/5">
        {/* El borde: una luz del color de la temática que da vueltas. */}
        <motion.div
          aria-hidden
          className="absolute top-1/2 left-1/2 -z-10 aspect-square w-[200%] -translate-x-1/2 -translate-y-1/2"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg 210deg, ${theme.color} 285deg, #F44E63 335deg, transparent 360deg)`,
          }}
          animate={calm ? undefined : { rotate: 360 }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
        />

        <form
          id="armador"
          className="relative isolate overflow-hidden rounded-[28px] bg-white/95 p-3.5 backdrop-blur-xl min-[380px]:p-4 sm:px-5"
          onSubmit={(e) => {
            e.preventDefault()
            rememberRecipient(short)
            router.push(href)
          }}
        >
          {/* Un resplandor del color de la temática, arriba a la derecha. */}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-28 -right-24 -z-10 size-72 rounded-full opacity-30 blur-3xl"
            initial={false}
            animate={{ backgroundColor: theme.color }}
            transition={{ duration: 0.6 }}
          />

          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-sm font-bold text-ink">
              <motion.span
                aria-hidden
                className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_6px_14px_-4px_rgba(244,78,99,0.6)]"
                animate={calm ? undefined : { rotate: [0, -16, 12, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 3.2 }}
              >
                <Wand2 className="size-3.5" />
              </motion.span>
              <span className="leading-tight text-balance">Armala acá y mirá cómo queda</span>
            </p>
            <LiveBadge />
          </div>

          <Step n={1} done={chosen}>
            ¿Qué festejan?
          </Step>
          <ThemePicker themes={themes} value={theme.slug} onChange={onChoose} />

          <Step n={2} done={!!short} className="mt-3">
            ¿Para quién es?
          </Step>
          <label className="relative block">
            <span className="sr-only">¿Para quién es la Ribbly?</span>
            <input
              type="text"
              value={name}
              onChange={(e) => onName(e.target.value.slice(0, 16))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              maxLength={16}
              autoComplete="off"
              enterKeyHint="go"
              placeholder="¿Para quién es? Ej: Sofi"
              className="h-12 w-full rounded-2xl border-2 bg-white px-4 pr-13 text-base font-semibold text-ink transition-[border-color,box-shadow] duration-200 outline-none placeholder:text-transparent"
              style={{
                borderColor: focused ? theme.color : 'transparent',
                boxShadow: focused
                  ? `0 0 0 4px color-mix(in srgb, ${theme.color} 24%, transparent)`
                  : 'inset 0 0 0 1px rgba(42,36,51,0.12)',
              }}
            />
            {!name && (
              <TypedPlaceholder
                key={theme.slug}
                names={lookOf(theme.slug).names}
                paused={focused || calm}
              />
            )}
            <motion.span
              aria-hidden
              key={short.length}
              className="pointer-events-none absolute top-1/2 right-2.5 grid size-8 -translate-y-1/2 place-items-center rounded-xl"
              style={{ backgroundColor: `color-mix(in srgb, ${theme.color} 18%, white)` }}
              animate={short ? { scale: [1, 1.3, 1], rotate: [0, -12, 0] } : { scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <Icon name={short ? 'corazon-brillo' : 'escribir'} size={18} />
            </motion.span>
          </label>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Magnetic strength={0.18} className="min-w-0 sm:flex-1">
              <ButtonLink
                href={href}
                onClick={() => rememberRecipient(short)}
                size="lg"
                block
                className="relative h-12 min-w-0 overflow-hidden px-6 text-base sm:text-[17px]"
              >
                {!calm && <Shine />}
                <span className="relative inline-flex min-w-0">
                  <Swap id={cta} className="truncate">
                    {cta}
                  </Swap>
                </span>
                <Nudge x={4}>
                  <ArrowRight className="size-5" aria-hidden />
                </Nudge>
              </ButtonLink>
            </Magnetic>
            <ButtonLink
              href={`/ejemplo/${theme.slug}${para}` as Route}
              onClick={() => rememberRecipient(short)}
              variant="white"
              size="lg"
              block
              className="h-12 px-5 text-base sm:w-auto"
            >
              <span className="relative grid size-7 place-items-center rounded-full bg-brand text-white">
                {!calm && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-brand"
                    animate={{ scale: [1, 1.7], opacity: [0.5, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 1.6 }}
                  />
                )}
                <Play className="relative size-3 translate-x-px fill-current" aria-hidden />
              </span>
              Ver ejemplo
            </ButtonLink>
          </div>

          {salesPaused ? (
            <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <PauseCircle className="size-4 shrink-0" aria-hidden />
              Pausamos las ventas por un rato: podés armarla y probarla igual.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-dashed border-ink/10 pt-3 sm:justify-between">
              <p className="flex items-baseline gap-1.5 text-sm text-ink/60">
                <span className="relative inline-block font-display text-lg font-bold text-ink">
                  <Swap id={theme.priceLabel}>{theme.priceLabel}</Swap>
                </span>
                · pago único
              </p>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/60">
                <MercadoPagoLogo className="size-[18px] text-[#00B1EA]" />
                Pago seguro con Mercado Pago
              </p>
            </div>
          )}
        </form>
      </div>

      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 px-1 text-[13px] leading-tight font-semibold text-ink/70 lg:justify-start">
        {TRUST.map(({ icon, label }) => (
          <motion.li
            key={label}
            className="flex cursor-default items-center gap-2 transition-colors hover:text-ink"
            whileHover="hover"
          >
            <motion.span
              className="grid size-6 shrink-0 place-items-center rounded-full bg-white shadow-[0_4px_12px_rgba(42,36,51,0.08)] ring-1 ring-black/5"
              variants={{ hover: { rotate: [0, -14, 10, 0], scale: [1, 1.2, 1.1] } }}
              transition={{ duration: 0.5 }}
            >
              {icon}
            </motion.span>
            {label}
          </motion.li>
        ))}
      </ul>
    </>
  )
}

/** "En vivo": lo que elegís se ve en el celular de al lado. */
function LiveBadge() {
  const calm = useCalm()
  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand uppercase">
      <span className="relative flex size-2">
        {!calm && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full bg-brand"
            animate={{ scale: [1, 2.4], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
        <span className="relative size-2 rounded-full bg-brand" />
      </span>
      En vivo
    </span>
  )
}

/** El título de un paso: el número, que se vuelve una tilde cuando está hecho. */
function Step({
  n,
  done,
  className,
  children,
}: {
  n: number
  done: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn(
        'mb-1.5 flex items-center gap-2 text-xs font-bold tracking-wide text-ink/55 uppercase',
        className,
      )}
    >
      <span
        className={cn(
          'relative grid size-5 place-items-center overflow-hidden rounded-full text-[11px] transition-colors duration-300',
          done ? 'bg-brand text-white' : 'bg-ink/10 text-ink/60',
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {done ? (
            <motion.span
              key="hecho"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={spring.bouncy}
            >
              <Check className="size-3" strokeWidth={3.5} aria-hidden />
            </motion.span>
          ) : (
            <motion.span
              key="numero"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              {n}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {children}
      {done && <span className="sr-only">(listo)</span>}
    </p>
  )
}

/**
 * El "¿Para quién es?" del campo vacío, con nombres de ejemplo de la temática
 * que se escriben y se borran solos. Con el campo en foco, se queda quieto.
 */
function TypedPlaceholder({ names, paused }: { names: string[]; paused: boolean }) {
  // Arranca con el primero entero (es lo que se ve sin JavaScript).
  const [state, setState] = useState({ word: 0, chars: names[0]?.length ?? 0, erasing: false })
  const word = names[state.word % names.length] ?? ''

  useEffect(() => {
    if (paused) return
    const { chars, erasing } = state
    const full = !erasing && chars >= word.length
    const empty = erasing && chars <= 0
    const timer = setTimeout(
      () =>
        setState((s) =>
          full
            ? { ...s, erasing: true }
            : empty
              ? { word: s.word + 1, chars: 0, erasing: false }
              : { ...s, chars: s.chars + (s.erasing ? -1 : 1) },
        ),
      full ? 1600 : empty ? 300 : erasing ? 45 : 95,
    )
    return () => clearTimeout(timer)
  }, [state, word.length, paused])

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-base font-medium whitespace-nowrap text-ink/40"
    >
      {paused ? (
        'Escribí su nombre…'
      ) : (
        <>
          ¿Para quién es? Ej:&nbsp;
          <span className="text-ink/70">{word.slice(0, state.chars)}</span>
          <motion.span
            className="ml-px inline-block h-5 w-[2px] rounded-full bg-brand"
            animate={{ opacity: [1, 1, 0, 0] }}
            transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        </>
      )}
    </span>
  )
}

/** Un brillo que cruza el botón cada tanto. */
function Shine() {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)]"
      style={{ skewX: -20 }}
      initial={{ x: '-120%' }}
      animate={{ x: '360%' }}
      transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
    />
  )
}

/**
 * Las temáticas del armador: cada una con su color. La elegida se llena del
 * color de su tarjeta (el resaltado se desliza de una a otra). Con varias,
 * es una fila que se desliza con el dedo, con los bordes difuminados y la
 * elegida siempre a la vista.
 */
function ThemePicker({
  themes,
  value,
  onChange,
}: {
  themes: HomeTheme[]
  value: string
  onChange(slug: string): void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ start: false, end: true })

  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const update = () =>
      setEdges({
        start: el.scrollLeft > 4,
        end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [])

  // La temática elegida (o la que eligió otra sección) queda centrada.
  useEffect(() => {
    const el = scroller.current
    const selected = el?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!el || !selected || el.scrollWidth <= el.clientWidth) return
    el.scrollTo({
      left: selected.offsetLeft - (el.clientWidth - selected.offsetWidth) / 2,
      behavior: 'smooth',
    })
  }, [value])

  const fade = 28
  const mask = `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edges.end ? 'transparent' : '#000'} 100%)`

  return (
    <div
      ref={scroller}
      role="group"
      aria-label="Temática"
      className="-mx-1 flex snap-x snap-proximity scroll-px-2 [scrollbar-width:none] gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 [&::-webkit-scrollbar]:hidden"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {themes.map((t) => {
        const selected = t.slug === value
        return (
          <motion.button
            key={t.slug}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(t.slug)}
            className={cn(
              'relative shrink-0 snap-center rounded-2xl py-1 pr-3 pl-1 text-sm font-semibold transition-[color,box-shadow] duration-200',
              selected
                ? ''
                : 'bg-white text-ink/75 shadow-[0_2px_8px_rgba(42,36,51,0.06)] ring-1 ring-black/5 hover:text-ink hover:ring-black/10',
            )}
            style={selected ? { color: inkOn(t) } : undefined}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.94 }}
            transition={spring.snappy}
          >
            {selected && (
              <motion.span
                layoutId="hero-theme"
                aria-hidden
                className="absolute inset-0 rounded-2xl"
                style={{
                  backgroundColor: t.color,
                  boxShadow: `0 10px 22px -10px ${t.color}`,
                }}
                transition={spring.snappy}
              />
            )}
            <span className="relative flex items-center gap-2 whitespace-nowrap">
              <motion.span
                aria-hidden
                className="grid size-7 place-items-center rounded-xl"
                style={{
                  backgroundColor: selected
                    ? 'rgba(255,255,255,0.38)'
                    : `color-mix(in srgb, ${t.color} 24%, white)`,
                }}
                animate={selected ? { rotate: [0, -14, 10, 0], scale: [1, 1.18, 1] } : {}}
                transition={{ duration: 0.5 }}
              >
                <Emoji value={t.emoji} size={18} />
              </motion.span>
              {t.name}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
