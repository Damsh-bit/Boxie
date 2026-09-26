'use client'

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { themeDetail } from '@/content/social-proof'
import { isFresh, timeAgo, type PurchaseEvent } from '@/domain/social-proof'
import { cn } from '@/ui/cn'
import { MercadoPagoLogo } from '@/ui/MercadoPagoLogo'
import { ease, spring, useCalm } from '@/ui/motion'
import { avatarGradient, type HomeTheme } from './theme-look'

/** Cuánto queda cada compra a la vista. */
const EVERY = 4800

/**
 * La cinta de compras de la portada: "María acaba de comprar una Boxie · para
 * su mejor amiga · con Mercado Pago", una por vez y sin repetir hasta dar la
 * vuelta. Se frena con el mouse encima, fuera de pantalla y con la pestaña en
 * segundo plano; las horas siguen corriendo mientras la página está abierta.
 */
export function PurchaseTicker({
  events,
  themes,
  className,
}: {
  events: PurchaseEvent[]
  themes: HomeTheme[]
  className?: string
}) {
  const calm = useCalm()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref)
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(false)
  // Minutos desde que se abrió la página: "hace 3 min" no puede quedar fijo.
  const [elapsed, setElapsed] = useState(0)
  const openedAt = useRef(0)

  useEffect(() => {
    openedAt.current = Date.now()
    const onVisibility = () => setHidden(document.hidden)
    onVisibility()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const running = events.length > 1 && inView && !hovered && !hidden
  useEffect(() => {
    if (!running) return
    const timer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % events.length)
      setElapsed(Math.floor((Date.now() - openedAt.current) / 60_000))
    }, EVERY)
    return () => window.clearTimeout(timer)
  }, [running, index, events.length])

  const event = events[index % events.length]
  if (!event) return null

  const theme = themes.find((t) => t.slug === event.theme)
  const minutes = event.minutesAgo + elapsed
  const fresh = isFresh(minutes)
  const detail =
    event.detail ?? themeDetail[event.theme] ?? (theme ? `temática ${theme.name}` : 'de regalo')
  const color = theme?.color ?? '#F44E63'

  return (
    <div
      ref={ref}
      role="marquee"
      aria-label="Últimas compras"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      className={cn(
        'relative h-14 w-full max-w-[25rem] overflow-hidden rounded-full bg-white/80 shadow-[0_10px_30px_-8px_rgba(42,36,51,0.18)] ring-1 ring-black/5 backdrop-blur',
        className,
      )}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={`${event.id}-${index}`}
          className="absolute inset-0 flex items-center gap-2.5 pr-4 pl-2 sm:gap-3 sm:pr-5"
          initial={calm ? { opacity: 0 } : { opacity: 0, y: 26, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={calm ? { opacity: 0 } : { opacity: 0, y: -26, filter: 'blur(3px)' }}
          transition={{ duration: 0.6, ease: ease.out }}
        >
          <span className="relative shrink-0">
            <motion.span
              className="grid size-10 place-items-center rounded-full font-fun text-lg font-semibold text-white shadow-[inset_0_-2px_6px_rgba(0,0,0,0.15)] [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
              style={{
                background: avatarGradient(color),
              }}
              initial={calm ? false : { scale: 0.5, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring.bouncy, delay: 0.08 }}
            >
              {event.name.charAt(0)}
            </motion.span>
            <span className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,158,227,0.35)]">
              <MercadoPagoLogo className="size-4 text-[#00B1EA]" />
            </span>
          </span>

          <span className="min-w-0 flex-1 text-left leading-tight">
            <span className="flex items-baseline gap-2 text-[13px] text-ink sm:text-sm">
              <span className="truncate">
                <b className="font-bold">{event.name}</b> {fresh ? 'acaba de comprar' : 'compró'}{' '}
                una Boxie <span aria-hidden>{theme?.emoji ?? '🎁'}</span>
              </span>
              {!fresh && (
                <span className="shrink-0 text-[11px] font-medium text-ink/45">
                  {timeAgo(minutes)}
                </span>
              )}
            </span>
            <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-ink/60">
              <span className="truncate">{detail}</span>
              <span aria-hidden className="shrink-0 text-ink/30">
                ·
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {/* En pantallas chicas el logo ya dice "con": la bajada gana lugar. */}
                <span className="max-sm:sr-only">con</span>
                <MercadoPagoLogo className="size-4 text-[#00B1EA]" />
                <span className="font-semibold text-ink/75">Mercado Pago</span>
              </span>
            </span>
          </span>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
