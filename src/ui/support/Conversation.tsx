'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Check, CheckCheck, Plus, RotateCcw, ThumbsDown, ThumbsUp, X } from 'lucide-react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import type { CustomerTicket } from '@/domain/support'
import { cn } from '../cn'
import { spring } from '../motion'
import { SupportRequestError } from './client'
import { clock, dayLabel, sameDay } from './format'
import type { ChatMessage, SupportCenter } from './use-support-center'

/**
 * La conversación de una consulta, del lado del cliente: sus mensajes a la
 * derecha, los del equipo a la izquierda (con quién respondió), los avisos
 * del sistema al centro. Los mensajes nuevos entran con un resorte y la
 * lista baja sola si la persona estaba mirando lo último.
 */
export function Conversation({
  ticket,
  center,
  onNewTicket,
  className,
}: {
  ticket: CustomerTicket
  center: SupportCenter
  /** Abrir otra consulta (cuando esta quedó cerrada). */
  onNewTicket(): void
  className?: string
}) {
  const list = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const messages = center.messages[ticket.id]
  const typing = center.typing[ticket.id]
  const [loading, setLoading] = useState(!messages)
  const [error, setError] = useState<string | null>(null)
  const { loadConversation, setOnScreen } = center

  useEffect(() => {
    setOnScreen(ticket.id)
    let alive = true
    loadConversation(ticket.id)
      .then(() => alive && setLoading(false))
      .catch((e: unknown) => {
        if (!alive) return
        setLoading(false)
        setError(e instanceof SupportRequestError ? e.message : 'No pudimos cargar la charla.')
      })
    return () => {
      alive = false
      setOnScreen(null)
    }
  }, [ticket.id, loadConversation, setOnScreen])

  // Baja al último mensaje si la persona estaba abajo (no la saca de donde leía).
  useLayoutEffect(() => {
    const el = list.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages?.length, typing])

  const onScroll = () => {
    const el = list.current
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const closed = ticket.status === 'closed'
  const resolved = ticket.status === 'resolved'

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
      <div
        ref={list}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label={`Conversación de la consulta #${ticket.number}`}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[radial-gradient(rgba(42,36,51,0.05)_1px,transparent_1px)] [background-size:16px_16px] px-4 py-4"
      >
        {loading && !messages ? (
          <ChatSkeleton />
        ) : error ? (
          <p className="mx-auto mt-10 max-w-xs text-center text-sm text-ink/60">{error}</p>
        ) : (
          <ol className="flex flex-col gap-1.5">
            {(messages ?? []).map((message, i, all) => (
              <MessageRow
                key={message.id}
                message={message}
                previous={all[i - 1]}
                onRetry={async () => {
                  center.discard(ticket.id, message.id)
                  await center.send(ticket.id, message.body).catch(() => {})
                }}
                onDiscard={() => center.discard(ticket.id, message.id)}
              />
            ))}
            <AnimatePresence>
              {typing && (
                <motion.li
                  key="typing"
                  className="mt-1 flex items-end gap-2"
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={spring.snappy}
                >
                  <Avatar name={typing} />
                  <span className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-3.5 py-3 shadow-sm ring-1 ring-black/5">
                    <span className="sr-only">{typing} está escribiendo</span>
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        aria-hidden
                        className="size-1.5 rounded-full bg-ink/40"
                        animate={{
                          transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'],
                        }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </span>
                </motion.li>
              )}
            </AnimatePresence>
          </ol>
        )}
      </div>

      <AnimatePresence initial={false}>
        {center.status === 'offline' && (
          <motion.p
            className="overflow-hidden bg-amber-50 text-center text-xs font-semibold text-amber-800"
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
          >
            <span className="block py-1.5">Reconectando…</span>
          </motion.p>
        )}
      </AnimatePresence>

      {resolved && <RatingBar ticket={ticket} center={center} />}

      {closed ? (
        <div className="border-t border-black/5 bg-white p-4 text-center">
          <p className="text-sm text-ink/60">Esta consulta está cerrada.</p>
          <button
            type="button"
            onClick={onNewTicket}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white hover:bg-ink/90"
          >
            <Plus className="size-4" aria-hidden /> Abrir una consulta nueva
          </button>
        </div>
      ) : (
        <Composer
          key={ticket.id}
          placeholder={resolved ? 'Escribí si necesitás algo más…' : 'Escribí tu mensaje…'}
          onTyping={() => center.notifyTyping(ticket.id)}
          onSend={(body) => center.send(ticket.id, body)}
        />
      )}
    </div>
  )
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-[11px] font-bold text-white',
        className,
      )}
    >
      {name.trim().charAt(0).toUpperCase() || 'B'}
    </span>
  )
}

function MessageRow({
  message,
  previous,
  onRetry,
  onDiscard,
}: {
  message: ChatMessage
  previous?: ChatMessage
  onRetry(): void
  onDiscard(): void
}) {
  const newDay = !previous || !sameDay(previous.createdAt, message.createdAt)
  const grouped = !newDay && previous?.author === message.author && message.author !== 'system'
  const mine = message.author === 'customer'

  return (
    <>
      {newDay && (
        <li className="my-3 flex justify-center" aria-hidden>
          <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-ink/50 shadow-sm ring-1 ring-black/5">
            {dayLabel(message.createdAt)}
          </span>
        </li>
      )}
      {message.author === 'system' ? (
        <motion.li
          className="my-2 flex justify-center"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={spring.soft}
        >
          <span className="max-w-[90%] rounded-2xl bg-ink/[0.06] px-3.5 py-2 text-center text-xs leading-relaxed text-ink/70">
            {message.body}
          </span>
        </motion.li>
      ) : (
        <motion.li
          className={cn(
            'flex items-end gap-2',
            mine ? 'justify-end' : 'justify-start',
            !grouped && 'mt-2',
          )}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={spring.snappy}
          style={{ transformOrigin: mine ? 'bottom right' : 'bottom left' }}
        >
          {!mine &&
            (grouped ? <span className="w-7 shrink-0" /> : <Avatar name={message.authorName} />)}
          <div className={cn('flex max-w-[82%] flex-col', mine ? 'items-end' : 'items-start')}>
            {!mine && !grouped && (
              <span className="mb-0.5 ml-1 text-[11px] font-semibold text-ink/50">
                {message.authorName} · Boxie
              </span>
            )}
            <p
              className={cn(
                'rounded-2xl px-3.5 py-2 text-[0.92rem] leading-relaxed break-words whitespace-pre-wrap shadow-sm',
                mine
                  ? 'rounded-br-md bg-brand text-white'
                  : 'rounded-bl-md bg-white text-ink ring-1 ring-black/5',
                message.pending && 'opacity-70',
                message.failed && 'bg-red-500',
              )}
            >
              {message.body}
            </p>
            <span className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-ink/40">
              {message.failed ? (
                <span className="flex items-center gap-2 font-semibold text-red-600">
                  No se envió
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex items-center gap-0.5 underline underline-offset-2"
                  >
                    <RotateCcw className="size-3" aria-hidden /> Reintentar
                  </button>
                  <button
                    type="button"
                    onClick={onDiscard}
                    aria-label="Descartar el mensaje"
                    className="grid size-4 place-items-center"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              ) : message.pending ? (
                'Enviando…'
              ) : (
                <>
                  {clock(message.createdAt)}
                  {mine &&
                    (message.id.startsWith('tmp-') ? (
                      <Check className="size-3" aria-hidden />
                    ) : (
                      <CheckCheck className="size-3" aria-hidden />
                    ))}
                </>
              )}
            </span>
          </div>
        </motion.li>
      )}
    </>
  )
}

function ChatSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      {[60, 75, 45].map((w, i) => (
        <motion.div
          key={i}
          className={cn('h-10 rounded-2xl bg-ink/[0.06]', i % 2 ? 'ml-auto' : '')}
          style={{ width: `${w}%` }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

function RatingBar({ ticket, center }: { ticket: CustomerTicket; center: SupportCenter }) {
  const [busy, setBusy] = useState(false)
  const rate = async (rating: 'good' | 'bad') => {
    setBusy(true)
    await center.rate(ticket.id, rating).catch(() => {})
    setBusy(false)
  }
  return (
    <div className="flex items-center justify-center gap-3 border-t border-black/5 bg-good/5 px-4 py-2.5 text-sm">
      <AnimatePresence mode="wait" initial={false}>
        {ticket.rating ? (
          <motion.span
            key="gracias"
            className="font-semibold text-good-ink"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ¡Gracias por contarnos! {ticket.rating === 'good' ? '💖' : '🙏'}
          </motion.span>
        ) : (
          <motion.span
            key="pregunta"
            className="flex items-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <span className="font-semibold text-ink/70">¿Te ayudamos?</span>
            {(
              [
                ['good', ThumbsUp, 'Sí, me ayudaron'],
                ['bad', ThumbsDown, 'No me ayudaron'],
              ] as const
            ).map(([value, Icon, label]) => (
              <motion.button
                key={value}
                type="button"
                disabled={busy}
                onClick={() => void rate(value)}
                aria-label={label}
                className="grid size-9 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-black/5 hover:text-brand disabled:opacity-50"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.9 }}
                transition={spring.snappy}
              >
                <Icon className="size-4" aria-hidden />
              </motion.button>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  )
}

function Composer({
  placeholder,
  onSend,
  onTyping,
}: {
  placeholder: string
  onSend(body: string): Promise<void>
  onTyping(): void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const empty = value.trim().length === 0

  // Crece con el texto hasta 5 líneas.
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`
  }, [value])

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    const body = value.trim()
    if (!body) return
    setValue('')
    setError(null)
    try {
      await onSend(body)
    } catch (e) {
      setError(e instanceof SupportRequestError ? e.message : 'No se pudo enviar.')
    }
    area.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter envía; Shift+Enter hace un salto de línea (en el celular, el botón).
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void submit()
    }
  }

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="border-t border-black/5 bg-white px-3 pt-3"
      style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
    >
      {error && (
        <p role="alert" className="mb-2 px-1 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2 rounded-[22px] bg-paper/60 p-1.5 pl-4 ring-1 ring-black/5 transition-shadow focus-within:ring-2 focus-within:ring-brand/40">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Mensaje</span>
          <textarea
            ref={area}
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (e.target.value.trim()) onTyping()
            }}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            maxLength={4000}
            className="block max-h-[132px] w-full resize-none bg-transparent py-2 text-[0.95rem] text-ink outline-none placeholder:text-ink/40"
          />
        </label>
        <motion.button
          type="submit"
          disabled={empty}
          aria-label="Enviar"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_6px_16px_rgba(244,78,99,0.35)] transition-opacity disabled:opacity-40 disabled:shadow-none"
          whileTap={{ scale: 0.88 }}
          animate={{ rotate: empty ? 0 : -8 }}
          transition={spring.snappy}
        >
          <ArrowUp className="size-5" strokeWidth={2.5} aria-hidden />
        </motion.button>
      </div>
      {value.length > 3600 && (
        <p className="mt-1 px-2 text-right text-[11px] text-ink/50">
          {4000 - value.length} caracteres
        </p>
      )}
    </form>
  )
}
