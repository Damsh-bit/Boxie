'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, Lock, Send, StickyNote, UserPlus, Zap } from 'lucide-react'
import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { fillReply, QUICK_REPLIES } from '@/content/support-replies'
import {
  PRIORITY_INFO,
  SUPPORT_PRIORITIES,
  SUPPORT_STATUSES,
  STATUS_INFO,
  TOPIC_INFO,
  ticketLabel,
  type SupportMessage,
  type SupportPriority,
  type SupportStatus,
  type SupportTicket,
} from '@/domain/support'
import { cn } from '@/ui/cn'
import { Spinner, spring } from '@/ui/motion'
import { clock, dayLabel, sameDay } from '@/ui/support/format'
import { Menu } from '../../_ui/Menu'
import { useAdminAction } from '../../_ui/use-action'
import { replyTicket, updateTicket, type TicketDetail } from './actions'
import type { TeamMember } from './SupportInbox'

/** Un select chiquito para la cabecera (estado, prioridad, asignación). */
function HeaderSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange(value: T): void
  disabled?: boolean
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-8 cursor-pointer appearance-none rounded-full border border-line bg-white py-0 pr-7 pl-3 text-xs font-semibold text-ink outline-none hover:border-neutral-300 focus:border-brand disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[10px] text-neutral-400"
      >
        ▼
      </span>
    </label>
  )
}

const UNASSIGNED = '__none__'

export function TicketThread({
  ticket,
  detail,
  loading,
  typing,
  me,
  team,
  onBack,
  onTicket,
  onMessage,
  detailsToggle,
}: {
  ticket: SupportTicket
  detail: TicketDetail | undefined
  loading: boolean
  typing: string | undefined
  me: TeamMember
  team: TeamMember[]
  onBack(): void
  onTicket(ticket: SupportTicket): void
  onMessage(message: SupportMessage): void
  detailsToggle: ReactNode
}) {
  const { run, pending } = useAdminAction()
  const list = useRef<HTMLDivElement>(null)
  const messages = detail?.messages ?? []

  useLayoutEffect(() => {
    const el = list.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, typing])

  const patch = (changes: {
    status?: SupportStatus
    priority?: SupportPriority
    assignee?: string | null
  }) =>
    run(() => updateTicket({ ticketId: ticket.id, ...changes }), {
      onSuccess: (data) => data && onTicket(data),
    })

  const assignees = [
    { value: UNASSIGNED, label: 'Sin asignar' },
    ...team.map((m) => ({
      value: m.email,
      label: m.email === me.email ? `${m.name} (vos)` : m.name,
    })),
    ...(ticket.assignee && !team.some((m) => m.email === ticket.assignee)
      ? [{ value: ticket.assignee, label: ticket.assignee }]
      : []),
  ]

  return (
    <div className="flex min-h-[70dvh] flex-1 flex-col lg:min-h-0">
      <header className="space-y-2.5 border-b border-line px-3 py-3 sm:px-4">
        {/* Primero el asunto (siempre legible); abajo, los controles. */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-canvas lg:hidden"
            aria-label="Volver a las consultas"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-ink">
              <span aria-hidden>{TOPIC_INFO[ticket.topic].emoji} </span>
              {ticket.subject}
            </h2>
            <p className="truncate text-xs text-neutral-500">
              {ticketLabel(ticket.number)} · {ticket.customerName} · {ticket.customerEmail}
            </p>
          </div>
          {detailsToggle}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <HeaderSelect
            label="Estado"
            value={ticket.status}
            disabled={pending}
            onChange={(status) => void patch({ status })}
            options={SUPPORT_STATUSES.map((s) => ({ value: s, label: STATUS_INFO[s].label }))}
          />
          <HeaderSelect
            label="Prioridad"
            value={ticket.priority}
            disabled={pending}
            onChange={(priority) => void patch({ priority })}
            options={SUPPORT_PRIORITIES.map((p) => ({
              value: p,
              label: `Prioridad ${PRIORITY_INFO[p].label.toLowerCase()}`,
            }))}
          />
          <HeaderSelect
            label="Asignada a"
            value={ticket.assignee ?? UNASSIGNED}
            disabled={pending}
            onChange={(value) => void patch({ assignee: value === UNASSIGNED ? null : value })}
            options={assignees}
          />
          {!ticket.assignee && (
            <button
              type="button"
              onClick={() => void patch({ assignee: me.email })}
              disabled={pending}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-xs font-semibold text-white hover:bg-ink/90 disabled:opacity-50"
            >
              <UserPlus className="size-3.5" aria-hidden /> Tomarla
            </button>
          )}
        </div>
      </header>

      <div
        ref={list}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-canvas/60 px-3 py-4 sm:px-5"
        role="log"
        aria-live="polite"
        aria-label={`Conversación ${ticketLabel(ticket.number)}`}
      >
        {loading ? (
          <div className="grid h-full place-items-center">
            <Spinner className="size-6 text-brand" />
          </div>
        ) : (
          <ol className="mx-auto flex max-w-3xl flex-col gap-2">
            {messages.map((message, i) => (
              <Bubble key={message.id} message={message} previous={messages[i - 1]} />
            ))}
            <AnimatePresence>
              {typing && (
                <motion.li
                  key="typing"
                  className="flex items-center gap-2 text-xs font-semibold text-neutral-500"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="flex gap-1 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-line">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="size-1.5 rounded-full bg-neutral-400"
                        animate={{
                          transform: ['translateY(0px)', 'translateY(-3px)', 'translateY(0px)'],
                        }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </span>
                  {typing} está escribiendo…
                </motion.li>
              )}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <Composer
        ticket={ticket}
        disabled={loading}
        onSent={(message, updated) => {
          onMessage(message)
          onTicket(updated)
        }}
      />
    </div>
  )
}

function Bubble({ message, previous }: { message: SupportMessage; previous?: SupportMessage }) {
  const newDay = !previous || !sameDay(previous.createdAt, message.createdAt)
  const team = message.author === 'agent'
  return (
    <>
      {newDay && (
        <li className="my-2 text-center text-[11px] font-semibold text-neutral-400" aria-hidden>
          {dayLabel(message.createdAt)}
        </li>
      )}
      {message.author === 'system' ? (
        <li className="my-1 text-center">
          <span className="inline-block rounded-full bg-white px-3 py-1.5 text-xs text-neutral-500 ring-1 ring-line">
            {message.body} · {clock(message.createdAt)}
          </span>
        </li>
      ) : (
        <motion.li
          className={cn('flex', team ? 'justify-end' : 'justify-start')}
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring.snappy}
        >
          <div className={cn('flex max-w-[85%] flex-col', team ? 'items-end' : 'items-start')}>
            <span className="mb-0.5 px-1 text-[11px] font-semibold text-neutral-400">
              {message.internal ? `Nota interna · ${message.authorName}` : message.authorName}
            </span>
            <p
              className={cn(
                'rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-sm',
                message.internal
                  ? 'rounded-br-md border border-dashed border-amber-300 bg-amber-50 text-amber-950'
                  : team
                    ? 'rounded-br-md bg-ink text-white'
                    : 'rounded-bl-md bg-white text-ink ring-1 ring-line',
              )}
            >
              {message.body}
            </p>
            <span className="mt-0.5 px-1 text-[10px] text-neutral-400">
              {clock(message.createdAt)}
            </span>
          </div>
        </motion.li>
      )}
    </>
  )
}

function Composer({
  ticket,
  disabled,
  onSent,
}: {
  ticket: SupportTicket
  disabled: boolean
  onSent(message: SupportMessage, ticket: SupportTicket): void
}) {
  const { run, pending } = useAdminAction()
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [text, setText] = useState('')
  const area = useRef<HTMLTextAreaElement>(null)
  const lastTyping = useRef(0)
  const closed = ticket.status === 'closed'
  const note = mode === 'note'

  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [text])

  const send = (status?: SupportStatus) => {
    const body = text.trim()
    if (!body || pending) return
    void run(() => replyTicket({ ticketId: ticket.id, body, internal: note, status }), {
      quiet: true,
      onSuccess: (data) => {
        if (!data) return
        setText('')
        onSent(data.message, data.ticket)
      },
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      send()
    }
  }

  const ping = () => {
    if (note) return
    const now = Date.now()
    if (now - lastTyping.current < 2_500) return
    lastTyping.current = now
    void fetch('/admin/soporte/escribiendo', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id }),
    }).catch(() => {})
  }

  if (closed)
    return (
      <div className="flex items-center justify-center gap-2 border-t border-line bg-white px-4 py-4 text-sm text-neutral-500">
        <Lock className="size-4" aria-hidden /> Consulta cerrada: el cliente ya no puede escribir
        acá.
      </div>
    )

  return (
    <div className="border-t border-line bg-white p-3">
      <div className="mb-2 flex items-center gap-1">
        {(
          [
            ['reply', 'Responder', Send],
            ['note', 'Nota interna', StickyNote],
          ] as const
        ).map(([value, label, Icon]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors',
              mode === value
                ? value === 'note'
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-ink text-white'
                : 'text-neutral-500 hover:bg-canvas hover:text-ink',
            )}
          >
            <Icon className="size-3.5" aria-hidden /> {label}
          </button>
        ))}
        <div className="ml-auto">
          <Menu
            label="Respuestas rápidas"
            trigger={
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold text-neutral-500 hover:bg-canvas hover:text-ink data-[state=open]:bg-canvas"
              >
                <Zap className="size-3.5" aria-hidden /> Respuestas rápidas
              </button>
            }
            items={QUICK_REPLIES.map((reply) => ({
              label: reply.label,
              onSelect: () => {
                setMode('reply')
                setText((current) =>
                  [current.trim(), fillReply(reply.text, ticket.customerName)]
                    .filter(Boolean)
                    .join('\n\n'),
                )
                requestAnimationFrame(() => area.current?.focus())
              },
            }))}
          />
        </div>
      </div>
      <div
        className={cn(
          'rounded-2xl border p-2 transition-colors focus-within:border-brand',
          note ? 'border-amber-300 bg-amber-50/60' : 'border-line bg-canvas/50',
        )}
      >
        <label className="block">
          <span className="sr-only">{note ? 'Nota interna' : 'Respuesta al cliente'}</span>
          <textarea
            ref={area}
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              ping()
            }}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={4000}
            disabled={disabled}
            placeholder={
              note
                ? 'Solo la ve el equipo: contexto, lo que revisaste, lo que falta…'
                : `Responder a ${ticket.customerName.split(' ')[0]}… (Ctrl + Enter para enviar)`
            }
            className="block max-h-[220px] w-full resize-none bg-transparent px-2 py-1.5 text-sm text-ink outline-none placeholder:text-neutral-400"
          />
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <span className="mr-auto px-2 text-[11px] text-neutral-400">
            {note
              ? 'El cliente no ve las notas.'
              : 'Le avisamos por mail (uno cada 10 min como mucho).'}
          </span>
          {!note && (
            <button
              type="button"
              onClick={() => send('resolved')}
              disabled={pending || !text.trim()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-sm font-semibold text-ink hover:border-good hover:text-good-ink disabled:opacity-40"
            >
              <CheckCircle2 className="size-4" aria-hidden /> Enviar y resolver
            </button>
          )}
          <motion.button
            type="button"
            onClick={() => send()}
            disabled={pending || !text.trim()}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white disabled:opacity-40',
              note ? 'bg-amber-500 hover:bg-amber-600' : 'bg-brand hover:bg-brand-dark',
            )}
            whileTap={{ scale: 0.95 }}
          >
            {pending ? (
              <Spinner className="size-4" />
            ) : note ? (
              <StickyNote className="size-4" aria-hidden />
            ) : (
              <Send className="size-4" aria-hidden />
            )}
            {note ? 'Guardar nota' : 'Enviar'}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
