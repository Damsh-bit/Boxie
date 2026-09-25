'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, LifeBuoy, MessageCircle, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import {
  STATUS_INFO,
  SUPPORT_TOPICS,
  TOPIC_INFO,
  ticketLabel,
  type CustomerTicket,
  type SupportTopic,
} from '@/domain/support'
import { cn } from '../cn'
import { useIsDesktop } from '../Modal'
import { ease, spring, useCalm } from '../motion'
import { SUPPORT_EVENT, type OpenSupportDetail } from '../support-bridge'
import { Conversation } from './Conversation'
import { timeAgo } from './format'
import { NewTicketForm, type NewTicketDefaults } from './NewTicketForm'
import { RecoverTickets } from './RecoverTickets'
import { useSupportCenter } from './use-support-center'

/** Este navegador ya abrió consultas: al cargar se buscan sus respuestas (y el aviso). */
const KNOWN_KEY = 'boxie:soporte:tiene'
const NUDGE_KEY = 'boxie:soporte:saludo'

type View =
  | { name: 'home' }
  | { name: 'new'; topic: SupportTopic; defaults: NewTicketDefaults }
  | { name: 'chat'; ticketId: string }
  | { name: 'recover' }

const depth = (v: View) => (v.name === 'home' ? 0 : 1)

function readFlag(key: string) {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}
function writeFlag(key: string, on: boolean) {
  try {
    if (on) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

/**
 * El botón de ayuda: fijo abajo a la izquierda en todo el sitio, el editor y
 * el editor de prueba (no en el regalo). Abre un chat para mandar una
 * consulta sobre una Boxie, un error o un pago, y seguir la conversación con
 * el equipo en vivo.
 *
 * Se acomoda encima de lo que esté fijo abajo: el aviso de demo (`--dock`) y
 * las barras de compra o del editor (`--bar`).
 */
export function SupportWidget({
  hint,
  nudge = true,
}: {
  /** Lo que sabe la página (el código de la Boxie en el editor). */
  hint?: { boxieCode?: string; topic?: SupportTopic }
  /** El saludo de "¿Necesitás ayuda?" la primera vez (en escritorio). */
  nudge?: boolean
}) {
  const pathname = usePathname()
  const desktop = useIsDesktop()
  const calm = useCalm()
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const [known, setKnown] = useState(false)
  const [view, setView] = useState<View>({ name: 'home' })
  const [direction, setDirection] = useState(1)
  const [hovered, setHovered] = useState(false)
  const [greeting, setGreeting] = useState(false)
  const fab = useRef<HTMLButtonElement>(null)
  const center = useSupportCenter({ enabled: open || known })
  // /soporte ya es el centro de soporte: ahí el botón sobra.
  const hiddenHere = pathname.startsWith('/soporte')

  useEffect(() => {
    const frame = requestAnimationFrame(() => setKnown(readFlag(KNOWN_KEY)))
    return () => cancelAnimationFrame(frame)
  }, [])

  // Recordar (o olvidar) que hay consultas, para buscar respuestas al entrar.
  useEffect(() => {
    if (center.tickets) writeFlag(KNOWN_KEY, center.tickets.length > 0)
  }, [center.tickets])

  const go = useCallback((next: View) => {
    setView((current) => {
      setDirection(depth(next) >= depth(current) ? 1 : -1)
      return next
    })
  }, [])

  const openWith = useCallback(
    (detail: OpenSupportDetail = {}) => {
      setOpen(true)
      setGreeting(false)
      if (detail.topic)
        go({
          name: 'new',
          topic: detail.topic,
          defaults: {
            boxieCode: detail.boxieCode ?? hint?.boxieCode,
            message: detail.message,
          },
        })
    },
    [go, hint?.boxieCode],
  )

  // Cualquier botón del sitio puede abrir el chat (ver support-bridge).
  useEffect(() => {
    if (hiddenHere) return
    window.__boxieSupport = true
    const onOpen = (e: Event) => openWith((e as CustomEvent<OpenSupportDetail>).detail)
    window.addEventListener(SUPPORT_EVENT, onOpen)
    return () => {
      window.__boxieSupport = false
      window.removeEventListener(SUPPORT_EVENT, onOpen)
    }
  }, [openWith, hiddenHere])

  // Un saludo, una sola vez por navegador, a los 15 s (solo en escritorio).
  useEffect(() => {
    if (!nudge || !desktop || calm || hiddenHere || readFlag(NUDGE_KEY)) return
    const show = setTimeout(() => {
      setGreeting(true)
      writeFlag(NUDGE_KEY, true)
    }, 15_000)
    return () => clearTimeout(show)
  }, [nudge, desktop, calm, hiddenHere])
  useEffect(() => {
    if (!greeting) return
    const hide = setTimeout(() => setGreeting(false), 7_000)
    return () => clearTimeout(hide)
  }, [greeting])

  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => fab.current?.focus())
  }, [])

  // Al abrir, el foco entra al panel (con el teclado se sigue desde ahí); al cerrar vuelve al botón.
  const panel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [open])

  // Escape cierra; en el celular (pantalla completa) la página de atrás no scrollea.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    const root = document.documentElement
    const previous = root.style.overflow
    if (!desktop) root.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      root.style.overflow = previous
    }
  }, [open, desktop, close])

  if (hiddenHere) return null

  const ticket =
    view.name === 'chat' ? center.tickets?.find((t) => t.id === view.ticketId) : undefined
  const unread = center.unread
  const offset = 'calc(var(--dock, 0px) + var(--bar, 0px) + 16px)'

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            key="panel"
            ref={panel}
            id={panelId}
            role="dialog"
            aria-modal={!desktop}
            aria-label="Ayuda de Boxie"
            tabIndex={-1}
            className={cn(
              'fixed z-[70] flex flex-col overflow-hidden bg-canvas shadow-[0_30px_80px_-20px_rgba(42,36,51,0.45)] outline-none',
              desktop
                ? 'left-6 w-[400px] rounded-[28px] ring-1 ring-black/5'
                : 'inset-0 rounded-none',
            )}
            style={
              desktop
                ? {
                    bottom: `calc(var(--dock, 0px) + var(--bar, 0px) + 88px)`,
                    height: 'min(640px, calc(100dvh - var(--dock, 0px) - var(--bar, 0px) - 120px))',
                    transformOrigin: 'bottom left',
                  }
                : undefined
            }
            initial={desktop ? { opacity: 0, scale: 0.85, y: 24 } : { y: '100%' }}
            animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
            exit={
              desktop
                ? { opacity: 0, scale: 0.9, y: 16, transition: { duration: 0.18, ease: ease.in } }
                : { y: '100%', transition: { duration: 0.25, ease: ease.in } }
            }
            transition={desktop ? spring.gentle : spring.soft}
          >
            <Header
              view={view}
              ticket={ticket}
              onBack={() => go({ name: 'home' })}
              onClose={close}
            />
            <div className="relative flex min-h-0 flex-1 flex-col">
              <AnimatePresence mode="popLayout" initial={false} custom={direction}>
                <motion.div
                  key={view.name === 'chat' ? `chat-${view.ticketId}` : view.name}
                  className="absolute inset-0 flex flex-col"
                  custom={direction}
                  variants={{
                    enter: (d: number) => ({ x: d > 0 ? '30%' : '-30%', opacity: 0 }),
                    center: { x: '0%', opacity: 1 },
                    exit: (d: number) => ({ x: d > 0 ? '-20%' : '20%', opacity: 0 }),
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ x: spring.soft, opacity: { duration: 0.2 } }}
                >
                  {view.name === 'home' && (
                    <Home
                      tickets={center.tickets}
                      loadError={center.loadError}
                      onTopic={(topic) =>
                        go({
                          name: 'new',
                          topic,
                          defaults: { boxieCode: hint?.boxieCode },
                        })
                      }
                      onTicket={(id) => go({ name: 'chat', ticketId: id })}
                      onRecover={() => go({ name: 'recover' })}
                    />
                  )}
                  {view.name === 'new' && (
                    <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                      <NewTicketForm
                        topic={view.topic}
                        defaults={view.defaults}
                        create={center.create}
                        onCreated={(c) => {
                          setKnown(true)
                          go({ name: 'chat', ticketId: c.ticket.id })
                        }}
                      />
                    </div>
                  )}
                  {view.name === 'chat' &&
                    (ticket ? (
                      <Conversation
                        ticket={ticket}
                        center={center}
                        onNewTicket={() => go({ name: 'home' })}
                      />
                    ) : (
                      <p className="m-auto p-6 text-center text-sm text-ink/60">
                        Cargando la consulta…
                      </p>
                    ))}
                  {view.name === 'recover' && (
                    <div className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
                      <RecoverTickets />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="fixed left-4 z-[60] transition-[bottom] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:left-6"
        style={{ bottom: offset }}
      >
        <AnimatePresence>
          {greeting && !open && (
            <motion.button
              type="button"
              onClick={() => openWith()}
              className="absolute bottom-[calc(100%+12px)] left-0 w-max max-w-[240px] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-left text-sm text-ink shadow-[0_18px_40px_-12px_rgba(42,36,51,0.35)] ring-1 ring-black/5"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={spring.bouncy}
              style={{ transformOrigin: 'bottom left' }}
            >
              <strong className="block">¿Necesitás ayuda? 👋</strong>
              <span className="text-ink/60">Escribinos: te responde una persona.</span>
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          ref={fab}
          type="button"
          onClick={() => (open ? close() : openWith())}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          aria-label={
            open
              ? 'Cerrar la ayuda'
              : unread > 0
                ? `Ayuda: ${unread === 1 ? 'una respuesta nueva' : `${unread} respuestas nuevas`}`
                : 'Ayuda: escribinos'
          }
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          className={cn(
            'relative flex h-14 items-center overflow-hidden rounded-full text-white shadow-[0_14px_34px_-8px_rgba(244,78,99,0.6)] outline-offset-4',
            open ? 'bg-ink' : 'bg-brand',
            !desktop && open && 'hidden',
          )}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.92 }}
          transition={spring.bouncy}
        >
          <span className="grid size-14 shrink-0 place-items-center">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={open ? 'x' : 'chat'}
                className="grid place-items-center"
                initial={{ rotate: open ? -90 : 90, scale: 0.4, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                exit={{ rotate: open ? 90 : -90, scale: 0.4, opacity: 0 }}
                transition={spring.snappy}
              >
                {open ? (
                  <X className="size-6" aria-hidden />
                ) : (
                  <MessageCircle className="size-6 fill-white/20" aria-hidden />
                )}
              </motion.span>
            </AnimatePresence>
          </span>
          <motion.span
            className="overflow-hidden pr-0 text-[15px] font-bold whitespace-nowrap"
            initial={false}
            animate={{
              width: hovered && !open ? 'auto' : 0,
              paddingRight: hovered && !open ? 20 : 0,
              opacity: hovered && !open ? 1 : 0,
            }}
            transition={spring.snappy}
            aria-hidden
          >
            Ayuda
          </motion.span>
        </motion.button>

        <AnimatePresence>
          {unread > 0 && !open && (
            <motion.span
              aria-hidden
              className="pointer-events-none absolute -top-1 -right-1 grid min-w-6 place-items-center rounded-full bg-ink px-1.5 text-xs leading-6 font-bold text-white ring-2 ring-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={spring.bouncy}
            >
              {unread}
            </motion.span>
          )}
        </AnimatePresence>
        {!calm && unread > 0 && !open && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-brand"
            animate={{ opacity: [0.5, 0], transform: ['scale(1)', 'scale(1.6)'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </div>
    </>
  )
}

function Header({
  view,
  ticket,
  onBack,
  onClose,
}: {
  view: View
  ticket?: CustomerTicket
  onBack(): void
  onClose(): void
}) {
  const home = view.name === 'home'
  const title =
    view.name === 'new'
      ? TOPIC_INFO[view.topic].label
      : view.name === 'chat'
        ? ticket
          ? ticket.subject
          : 'Consulta'
        : view.name === 'recover'
          ? 'Mis consultas'
          : ''

  return (
    <div className="relative shrink-0 overflow-hidden bg-[linear-gradient(135deg,#f44e63,#ff7a8a_60%,#c893d7)] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-white/15 blur-2xl"
      />
      <div
        className="relative flex items-center gap-2 px-3 pt-3 pb-3"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        {!home && (
          <motion.button
            type="button"
            onClick={onBack}
            aria-label="Volver"
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="size-5" aria-hidden />
          </motion.button>
        )}
        <div className="min-w-0 flex-1 pl-1">
          {home ? (
            <p className="font-display text-lg leading-tight font-bold">Ayuda de Boxie</p>
          ) : (
            <>
              <p className="truncate font-display text-base leading-tight font-bold">{title}</p>
              {view.name === 'chat' && ticket && (
                <p className="truncate text-xs text-white/80">
                  {ticketLabel(ticket.number)} · {STATUS_INFO[ticket.status].customerLabel}
                </p>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la ayuda"
          className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-white/15"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      {home && (
        <motion.div
          className="relative px-5 pb-6"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: ease.out }}
        >
          <p className="font-display text-[1.7rem] leading-tight font-bold">¡Hola! 👋</p>
          <p className="mt-1 text-[0.95rem] text-white/90">
            ¿En qué te ayudamos? Te responde una persona del equipo, no un bot.
          </p>
        </motion.div>
      )}
    </div>
  )
}

function Home({
  tickets,
  loadError,
  onTopic,
  onTicket,
  onRecover,
}: {
  tickets: CustomerTicket[] | null
  loadError: string | null
  onTopic(topic: SupportTopic): void
  onTicket(id: string): void
  onRecover(): void
}) {
  const recent = (tickets ?? []).slice(0, 4)
  return (
    <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-5">
      <div className="grid grid-cols-2 gap-2.5">
        {SUPPORT_TOPICS.map((topic, i) => {
          const info = TOPIC_INFO[topic]
          return (
            <motion.button
              key={topic}
              type="button"
              onClick={() => onTopic(topic)}
              className="flex flex-col items-start gap-1.5 rounded-2xl bg-white p-3.5 text-left shadow-[0_6px_20px_-12px_rgba(42,36,51,0.35)] ring-1 ring-black/5 transition-shadow hover:shadow-[0_12px_28px_-12px_rgba(244,78,99,0.45)] hover:ring-brand/30"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: 0.04 * i }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <span aria-hidden className="text-2xl">
                {info.emoji}
              </span>
              <span className="text-sm leading-snug font-bold text-ink">{info.prompt}</span>
            </motion.button>
          )
        })}
      </div>

      {tickets === null ? (
        <div className="mt-6 h-16 animate-pulse rounded-2xl bg-ink/[0.05]" aria-hidden />
      ) : recent.length > 0 ? (
        <section aria-labelledby="mis-consultas" className="mt-6">
          <div className="mb-2 flex items-center justify-between px-1">
            <h2
              id="mis-consultas"
              className="text-xs font-bold tracking-wider text-ink/50 uppercase"
            >
              Tus consultas
            </h2>
            {(tickets?.length ?? 0) > recent.length && (
              <Link href="/soporte" className="text-xs font-bold text-brand hover:underline">
                Ver todas
              </Link>
            )}
          </div>
          <ul className="space-y-2">
            {recent.map((t) => (
              <li key={t.id}>
                <TicketRow ticket={t} onOpen={() => onTicket(t.id)} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {loadError && <p className="mt-4 text-center text-xs text-red-600">{loadError}</p>}

      <div className="mt-6 space-y-1 border-t border-black/5 pt-4">
        <Link
          href="/ayuda"
          className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm font-semibold text-ink hover:bg-white"
        >
          <LifeBuoy className="size-4 text-brand" aria-hidden />
          <span className="flex-1">Preguntas frecuentes</span>
          <ChevronRight className="size-4 text-ink/40" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={onRecover}
          className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm font-semibold text-ink hover:bg-white"
        >
          <MessageCircle className="size-4 text-brand" aria-hidden />
          <span className="flex-1">¿Escribiste desde otro dispositivo?</span>
          <ChevronRight className="size-4 text-ink/40" aria-hidden />
        </button>
      </div>
    </div>
  )
}

export function TicketRow({ ticket, onOpen }: { ticket: CustomerTicket; onOpen(): void }) {
  const info = STATUS_INFO[ticket.status]
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left ring-1 ring-black/5 transition-colors hover:ring-brand/30"
      whileTap={{ scale: 0.98 }}
      layout="position"
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper/70 text-xl"
      >
        {TOPIC_INFO[ticket.topic].emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'truncate text-sm text-ink',
              ticket.unread ? 'font-bold' : 'font-semibold',
            )}
          >
            {ticket.subject}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink/50">
          <span>{ticketLabel(ticket.number)}</span>·
          <span
            className={cn(
              ticket.status === 'pending' && 'font-semibold text-brand',
              ticket.status === 'resolved' && 'text-good-ink',
            )}
          >
            {info.customerLabel}
          </span>
          · <span>{timeAgo(ticket.lastMessageAt)}</span>
        </span>
      </span>
      {ticket.unread ? (
        <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-label="Respuesta nueva" />
      ) : (
        <ChevronRight className="size-4 shrink-0 text-ink/30" aria-hidden />
      )}
    </motion.button>
  )
}
