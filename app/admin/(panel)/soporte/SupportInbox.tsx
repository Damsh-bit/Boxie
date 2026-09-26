'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, Inbox, PanelRightOpen, Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { formatBoxieCode } from '@/domain/boxie'
import {
  isOverdue,
  PRIORITY_INFO,
  STATUS_INFO,
  TOPIC_INFO,
  ticketLabel,
  unreadByAgent,
  type SupportMessage,
  type SupportTicket,
} from '@/domain/support'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'
import { timeAgo } from '@/ui/support/format'
import { useEventStream } from '@/ui/support/use-event-stream'
import { Segmented } from '../../_ui/fields'
import { Badge, EmptyState } from '../../_ui/primitives'
import { useToast } from '../../_ui/Toast'
import { loadTickets, markTicketRead, openTicket, type TicketDetail } from './actions'
import { TicketDetails } from './TicketDetails'
import { TicketThread } from './TicketThread'
import { useInboxAlerts } from './use-inbox-alerts'

type Tab = 'open' | 'pending' | 'done' | 'all'
type Scope = 'all' | 'mine' | 'unassigned'

type StreamEvent =
  | { type: 'ticket'; ticket: SupportTicket }
  | { type: 'message'; message: SupportMessage }
  | { type: 'typing'; ticketId: string; who: 'customer' | 'agent'; name: string }

export interface TeamMember {
  email: string
  name: string
}

const inTab = (t: SupportTicket, tab: Tab) =>
  tab === 'all'
    ? true
    : tab === 'done'
      ? t.status === 'resolved' || t.status === 'closed'
      : t.status === tab

/** Sin tildes ni mayúsculas, para buscar. */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const sortTickets = (list: SupportTicket[]) =>
  [...list].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))

/**
 * La bandeja de soporte del panel. Tres columnas en escritorio (consultas,
 * conversación, datos del cliente); en el celular, una por vez. Todo se
 * actualiza en vivo por el stream: mensajes, estados y "escribiendo…".
 */
export function SupportInbox({
  initialTickets,
  initialTicketId,
  me,
  team,
}: {
  initialTickets: SupportTicket[]
  initialTicketId: string | null
  me: TeamMember
  team: TeamMember[]
}) {
  const toast = useToast()
  const [tickets, setTickets] = useState(() => sortTickets(initialTickets))
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId)
  const [details, setDetails] = useState<Record<string, TicketDetail>>({})
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [typing, setTyping] = useState<Record<string, string>>({})
  const [tab, setTab] = useState<Tab>(() =>
    initialTickets.some((t) => t.status === 'open') ? 'open' : 'all',
  )
  const [scope, setScope] = useState<Scope>('all')
  const [query, setQuery] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const selectedRef = useRef(selectedId)
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  const unreadCount = tickets.filter((t) => t.status !== 'closed' && unreadByAgent(t)).length
  const alerts = useInboxAlerts(unreadCount)
  const overdueCount = tickets.filter((t) => isOverdue(t, new Date())).length
  const scopeCount = (scope: Scope) =>
    tickets.filter(
      (t) =>
        inTab(t, tab) &&
        (scope === 'all' || (scope === 'mine' ? t.assignee === me.email : t.assignee === null)),
    ).length

  // El número de sin leer en la pestaña del navegador, para verlo desde otra pestaña.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\+?\) /, '')
    document.title = unreadCount ? `(${unreadCount > 99 ? '99+' : unreadCount}) ${base}` : base
    return () => {
      document.title = base
    }
  }, [unreadCount])

  const upsert = useCallback((ticket: SupportTicket) => {
    setTickets((list) => sortTickets([ticket, ...list.filter((t) => t.id !== ticket.id)]))
    setDetails((all) =>
      all[ticket.id] ? { ...all, [ticket.id]: { ...all[ticket.id]!, ticket } } : all,
    )
  }, [])

  const select = useCallback(
    async (id: string) => {
      setSelectedId(id)
      window.history.replaceState(null, '', `/admin/soporte?ticket=${id}`)
      setLoadingId(id)
      const result = await openTicket(id)
      setLoadingId((current) => (current === id ? null : current))
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      const detail = result.data!
      setDetails((all) => ({ ...all, [id]: detail }))
      upsert(detail.ticket)
    },
    [toast, upsert],
  )

  // La consulta que viene en la dirección (el link del mail al equipo).
  useEffect(() => {
    if (!initialTicketId) return
    const frame = requestAnimationFrame(() => void select(initialTicketId))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resync = useCallback(async () => {
    const result = await loadTickets()
    if (result.ok && result.data) setTickets(sortTickets(result.data))
    const current = selectedRef.current
    if (current) {
      const detail = await openTicket(current)
      if (detail.ok && detail.data) setDetails((all) => ({ ...all, [current]: detail.data! }))
    }
  }, [])

  const status = useEventStream<StreamEvent>(
    '/admin/soporte/eventos',
    {
      onOpen: () => void resync(),
      onEvent(event) {
        if (event.type === 'ticket') {
          upsert(event.ticket)
          return
        }
        if (event.type === 'typing') {
          setTyping((all) => ({ ...all, [event.ticketId]: event.name }))
          clearTimeout(typingTimers.current[event.ticketId])
          typingTimers.current[event.ticketId] = setTimeout(
            () => setTyping(({ [event.ticketId]: _gone, ...rest }) => rest),
            4_500,
          )
          return
        }
        const { message } = event
        setDetails((all) => {
          const detail = all[message.ticketId]
          if (!detail || detail.messages.some((m) => m.id === message.id)) return all
          return {
            ...all,
            [message.ticketId]: { ...detail, messages: [...detail.messages, message] },
          }
        })
        if (message.author !== 'customer') return
        setTyping(({ [message.ticketId]: _gone, ...rest }) => rest)
        const viewing =
          selectedRef.current === message.ticketId && document.visibilityState === 'visible'
        if (viewing) {
          void markTicketRead(message.ticketId).then((r) => r.ok && r.data && upsert(r.data))
          return
        }
        const ticket = tickets.find((t) => t.id === message.ticketId)
        const title = ticket
          ? `${ticket.customerName} · ${ticketLabel(ticket.number)}`
          : 'Nuevo mensaje de soporte'
        alerts.alert(title, message.body.slice(0, 140), message.ticketId)
        toast.info(title, message.body.slice(0, 90))
      },
    },
    { pauseWhenHidden: false },
  )

  useEffect(() => {
    const timers = typingTimers.current
    return () => Object.values(timers).forEach(clearTimeout)
  }, [])

  const needle = fold(query.trim())
  const visible = useMemo(
    () =>
      tickets.filter((t) => {
        if (!inTab(t, tab)) return false
        if (scope === 'mine' && t.assignee !== me.email) return false
        if (scope === 'unassigned' && t.assignee) return false
        if (!needle) return true
        return fold(
          `${t.number} #${t.number} ${t.subject} ${t.customerName} ${t.customerEmail} ${t.boxieCode ?? ''} ${t.boxieCode ? formatBoxieCode(t.boxieCode) : ''}`,
        ).includes(needle)
      }),
    [tickets, tab, scope, me.email, needle],
  )

  const count = (tab: Tab) => tickets.filter((t) => inTab(t, tab)).length
  const selected = selectedId ? tickets.find((t) => t.id === selectedId) : undefined
  const detail = selectedId ? details[selectedId] : undefined

  return (
    <div className="relative grid min-h-[560px] grid-cols-1 overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_1px_2px_rgba(42,36,51,0.04),0_8px_24px_rgba(42,36,51,0.04)] lg:h-[calc(100dvh-14rem)] lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)_320px]">
      {/* Consultas */}
      <aside
        className={cn(
          'flex min-h-0 flex-col border-line lg:border-r',
          selectedId ? 'hidden lg:flex' : 'flex',
        )}
        aria-label="Consultas"
      >
        <div className="space-y-3 border-b border-line p-3">
          <div className="flex items-center gap-2">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Buscar consultas</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="#1042, nombre, mail o código"
                className="h-10 w-full rounded-full border border-line bg-canvas pr-3 pl-9 text-sm text-ink outline-none placeholder:text-neutral-400 focus:border-brand focus:bg-white"
              />
            </label>
            <button
              type="button"
              onClick={() => void alerts.toggle()}
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-full border transition-colors',
                alerts.enabled
                  ? 'border-brand/30 bg-brand-soft text-brand'
                  : 'border-line text-neutral-500 hover:text-ink',
              )}
              aria-pressed={alerts.enabled}
              aria-label={alerts.enabled ? 'Apagar los avisos' : 'Avisarme de mensajes nuevos'}
              title={
                alerts.enabled
                  ? 'Avisos activos (sonido y notificación)'
                  : 'Activar avisos con sonido y notificación'
              }
            >
              {alerts.enabled ? (
                <Bell className="size-4" aria-hidden />
              ) : (
                <BellOff className="size-4" aria-hidden />
              )}
            </button>
          </div>
          <div className="[scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden">
            <Segmented<Tab>
              id="support-tab"
              size="sm"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'open', label: 'Por responder', count: count('open') },
                { value: 'pending', label: 'Esperando', count: count('pending') },
                { value: 'done', label: 'Resueltas', count: count('done') },
                { value: 'all', label: 'Todas' },
              ]}
            />
          </div>
          <div className="flex gap-1.5 text-xs">
            {(
              [
                ['all', 'Todas'],
                ['mine', 'Mías'],
                ['unassigned', 'Sin asignar'],
              ] as const
            ).map(([value, label]) => {
              const n = scopeCount(value)
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScope(value)}
                  aria-pressed={scope === value}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold transition-colors',
                    scope === value
                      ? 'bg-ink text-white'
                      : 'text-neutral-500 hover:bg-canvas hover:text-ink',
                  )}
                >
                  {label}
                  {n > 0 && (
                    <span
                      className={cn(
                        'min-w-4 rounded-full px-1 text-center text-[10px] leading-4 tabular-nums',
                        scope === value
                          ? 'bg-white/20 text-white'
                          : value === 'unassigned' && tab === 'open'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-canvas text-neutral-600',
                      )}
                    >
                      {n}
                    </span>
                  )}
                </button>
              )
            })}
            {status === 'open' && (
              <span
                className="ml-auto inline-flex items-center gap-1.5 self-center text-neutral-400"
                title="Conectado: los mensajes llegan en vivo"
              >
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
                  <span className="relative size-2 rounded-full bg-emerald-500" />
                </span>
                En vivo
              </span>
            )}
            {status === 'offline' && (
              <span className="ml-auto self-center font-semibold text-amber-700">
                Reconectando…
              </span>
            )}
          </div>
        </div>

        {(unreadCount > 0 || overdueCount > 0) && (
          <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2 text-xs font-semibold">
            {unreadCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-brand">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                {unreadCount} sin leer
              </span>
            )}
            {overdueCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setTab('open')
                  setScope('all')
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-red-700 transition-colors hover:bg-red-100"
              >
                <span className="size-1.5 animate-pulse rounded-full bg-red-500" aria-hidden />
                {overdueCount} {overdueCount === 1 ? 'atrasada' : 'atrasadas'}
              </button>
            )}
          </div>
        )}

        <ul
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
          aria-label="Lista de consultas"
        >
          <AnimatePresence initial={false}>
            {visible.map((ticket) => (
              <motion.li
                key={ticket.id}
                layout="position"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring.soft}
              >
                <TicketListItem
                  ticket={ticket}
                  active={ticket.id === selectedId}
                  typing={Boolean(typing[ticket.id])}
                  onSelect={() => void select(ticket.id)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
          {visible.length === 0 && (
            <li>
              <EmptyState
                icon={<Inbox className="size-6" aria-hidden />}
                title={query ? 'No hay consultas que coincidan' : 'Nada por acá'}
                text={
                  tab === 'open' && !query
                    ? 'Ninguna consulta espera respuesta. ¡Bandeja al día!'
                    : 'Probá con otro filtro.'
                }
              />
            </li>
          )}
        </ul>
      </aside>

      {/* Conversación */}
      <section
        className={cn('min-h-0 min-w-0 flex-col', selectedId ? 'flex' : 'hidden lg:flex')}
        aria-label="Conversación"
      >
        {selected ? (
          <TicketThread
            key={selected.id}
            ticket={selected}
            detail={detail}
            loading={loadingId === selected.id && !detail}
            typing={typing[selected.id]}
            me={me}
            team={team}
            onBack={() => {
              setSelectedId(null)
              window.history.replaceState(null, '', '/admin/soporte')
            }}
            onTicket={upsert}
            onMessage={(message) =>
              setDetails((all) => {
                const current = all[message.ticketId]
                if (!current || current.messages.some((m) => m.id === message.id)) return all
                return {
                  ...all,
                  [message.ticketId]: { ...current, messages: [...current.messages, message] },
                }
              })
            }
            detailsToggle={
              <button
                type="button"
                onClick={() => setShowDetails(true)}
                className="grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-canvas hover:text-ink 2xl:hidden"
                aria-label="Ver los datos del cliente"
              >
                <PanelRightOpen className="size-5" aria-hidden />
              </button>
            }
          />
        ) : (
          <div className="m-auto hidden max-w-sm p-8 text-center lg:block">
            <EmptyState
              icon={<Inbox className="size-6" aria-hidden />}
              title="Elegí una consulta"
              text="Las nuevas aparecen arriba en vivo. Activá los avisos (🔔) para enterarte aunque estés en otra pestaña."
            />
          </div>
        )}
      </section>

      {/* Datos del cliente: columna en pantallas grandes, panel deslizable en las demás. */}
      {selected && (
        <aside
          className="hidden min-h-0 overflow-y-auto border-l border-line 2xl:block"
          aria-label="Datos del cliente"
        >
          <TicketDetails ticket={selected} detail={detail} />
        </aside>
      )}
      <AnimatePresence>
        {selected && showDetails && (
          <>
            <motion.div
              className="fixed inset-0 z-[90] bg-ink/30 2xl:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDetails(false)}
            />
            <motion.aside
              className="fixed inset-y-0 right-0 z-[91] w-[min(360px,92vw)] overflow-y-auto bg-white shadow-2xl 2xl:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={spring.gentle}
              aria-label="Datos del cliente"
            >
              <button
                type="button"
                onClick={() => setShowDetails(false)}
                className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-neutral-500 hover:bg-canvas"
                aria-label="Cerrar"
              >
                <X className="size-5" aria-hidden />
              </button>
              <TicketDetails ticket={selected} detail={detail} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function TicketListItem({
  ticket,
  active,
  typing,
  onSelect,
}: {
  ticket: SupportTicket
  active: boolean
  typing: boolean
  onSelect(): void
}) {
  const unread = ticket.status !== 'closed' && unreadByAgent(ticket)
  const overdue = isOverdue(ticket, new Date())
  const status = STATUS_INFO[ticket.status]
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'relative flex w-full gap-3 rounded-2xl p-3 text-left transition-colors',
        active ? 'bg-brand-soft' : overdue ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-canvas',
      )}
    >
      {active && (
        <motion.span
          layoutId="support-active"
          className="absolute inset-y-3 left-0 w-1 rounded-full bg-brand"
          transition={spring.snappy}
          aria-hidden
        />
      )}
      <span
        aria-hidden
        className="relative grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-sm font-bold text-white"
      >
        {ticket.customerName.trim().charAt(0).toUpperCase()}
        {/* Estado de un vistazo: rojo atrasada, ámbar le toca al equipo, gris esperando al cliente. */}
        <span
          className={cn(
            'absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-white',
            overdue
              ? 'bg-red-500'
              : ticket.status === 'open'
                ? 'bg-amber-400'
                : ticket.status === 'pending'
                  ? 'bg-sky-400'
                  : 'bg-emerald-500',
          )}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={cn('truncate text-sm text-ink', unread ? 'font-bold' : 'font-semibold')}>
            {ticket.customerName}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-neutral-400">
            {timeAgo(ticket.lastMessageAt)}
          </span>
        </span>
        <span
          className={cn(
            'mt-0.5 block truncate text-[13px]',
            unread ? 'text-ink' : 'text-neutral-600',
          )}
        >
          <span aria-hidden>{TOPIC_INFO[ticket.topic].emoji} </span>
          {ticket.subject}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-neutral-400">
            {ticketLabel(ticket.number)}
          </span>
          <Badge
            tone={status.tone === 'brand' ? 'brand' : status.tone}
            className="px-2 text-[10px]"
          >
            {status.label}
          </Badge>
          {ticket.priority !== 'normal' && (
            <Badge tone={PRIORITY_INFO[ticket.priority].tone} className="px-2 text-[10px]">
              {PRIORITY_INFO[ticket.priority].label}
            </Badge>
          )}
          {overdue && (
            <Badge tone="critical" dot className="px-2 text-[10px]">
              Atrasada
            </Badge>
          )}
          {typing && <span className="text-[11px] font-semibold text-good-ink">escribiendo…</span>}
        </span>
      </span>
      {unread && (
        <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" aria-label="Sin leer" />
      )}
    </button>
  )
}
