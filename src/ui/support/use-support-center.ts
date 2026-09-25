'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CustomerTicket,
  NewTicketInput,
  SupportMessage,
  SupportRating,
} from '@/domain/support'
import { supportApi, SupportRequestError } from './client'
import { useEventStream, type StreamStatus } from './use-event-stream'

/** Un mensaje en pantalla: los que manda el cliente aparecen antes de que confirme el servidor. */
export interface ChatMessage extends SupportMessage {
  pending?: boolean
  failed?: boolean
}

type StreamEvent =
  | { type: 'ticket'; ticket: CustomerTicket }
  | { type: 'message'; message: SupportMessage }
  | { type: 'typing'; ticketId: string; who: 'customer' | 'agent'; name: string }

const byDate = (a: { createdAt: string }, b: { createdAt: string }) =>
  a.createdAt.localeCompare(b.createdAt)

/** Suma mensajes sin repetir (y reemplaza el "enviando…" por el confirmado). */
function merge(current: ChatMessage[] = [], incoming: ChatMessage[]): ChatMessage[] {
  const next = [...current]
  for (const message of incoming) {
    if (next.some((m) => m.id === message.id)) continue
    const optimistic = next.findIndex(
      (m) => m.pending && m.author === message.author && m.body === message.body,
    )
    if (optimistic >= 0) next[optimistic] = message
    else next.push(message)
  }
  return next.sort(byDate)
}

/**
 * El estado del soporte del lado del cliente (widget y /soporte): sus
 * consultas, las conversaciones abiertas, "escribiendo…" y el stream en vivo.
 * Solo se conecta en vivo si hay alguna consulta sin cerrar.
 */
export function useSupportCenter({ enabled }: { enabled: boolean }) {
  const [tickets, setTickets] = useState<CustomerTicket[] | null>(null)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [typing, setTyping] = useState<Record<string, string>>({})
  const [streamKey, setStreamKey] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  /** La conversación que está en pantalla (para marcarla leída al llegar algo). */
  const onScreen = useRef<string | null>(null)
  const lastTyping = useRef(0)

  const upsertTicket = useCallback((ticket: CustomerTicket) => {
    setTickets((list) => {
      const rest = (list ?? []).filter((t) => t.id !== ticket.id)
      return [ticket, ...rest].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))
    })
  }, [])

  const markRead = useCallback((id: string) => {
    setTickets((list) => list?.map((t) => (t.id === id ? { ...t, unread: false } : t)) ?? list)
    void supportApi.read(id).catch(() => {})
  }, [])

  const loadConversation = useCallback(
    async (id: string) => {
      const conversation = await supportApi.conversation(id)
      upsertTicket(conversation.ticket)
      setMessages((all) => ({
        ...all,
        [id]: merge(
          all[id]?.filter((m) => m.pending),
          conversation.messages,
        ),
      }))
      if (conversation.ticket.unread && onScreen.current === id) markRead(id)
      return conversation
    },
    [markRead, upsertTicket],
  )

  const refresh = useCallback(async () => {
    try {
      setTickets(await supportApi.tickets())
      setLoadError(null)
      if (onScreen.current) await loadConversation(onScreen.current).catch(() => {})
    } catch (error) {
      setLoadError(error instanceof SupportRequestError ? error.message : 'No pudimos cargar.')
      setTickets((list) => list ?? [])
    }
  }, [loadConversation])

  useEffect(() => {
    if (!enabled || tickets !== null) return
    const frame = requestAnimationFrame(() => void refresh())
    return () => cancelAnimationFrame(frame)
  }, [enabled, tickets, refresh])

  const live = enabled && Boolean(tickets?.some((t) => t.status !== 'closed'))
  const status: StreamStatus = useEventStream<StreamEvent>(
    live ? `/api/soporte/eventos?v=${streamKey}` : null,
    {
      onOpen: () => void refresh(),
      onEvent(event) {
        if (event.type === 'ticket') {
          upsertTicket(event.ticket)
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
        setMessages((all) => ({
          ...all,
          [message.ticketId]: merge(all[message.ticketId], [message]),
        }))
        if (message.author !== 'customer') {
          setTyping(({ [message.ticketId]: _gone, ...rest }) => rest)
          if (onScreen.current === message.ticketId && document.visibilityState === 'visible')
            markRead(message.ticketId)
        }
      },
    },
  )

  useEffect(() => {
    const timers = typingTimers.current
    return () => Object.values(timers).forEach(clearTimeout)
  }, [])

  const create = useCallback(
    async (input: NewTicketInput) => {
      const conversation = await supportApi.create(input)
      upsertTicket(conversation.ticket)
      setMessages((all) => ({ ...all, [conversation.ticket.id]: conversation.messages }))
      // El stream se vuelve a abrir para sumar la consulta nueva.
      setStreamKey((k) => k + 1)
      return conversation
    },
    [upsertTicket],
  )

  const send = useCallback(async (id: string, body: string) => {
    const temp: ChatMessage = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      ticketId: id,
      author: 'customer',
      authorName: 'Vos',
      body,
      internal: false,
      createdAt: new Date().toISOString(),
      pending: true,
    }
    setMessages((all) => ({ ...all, [id]: [...(all[id] ?? []), temp] }))
    try {
      const message = await supportApi.send(id, body)
      setMessages((all) => ({
        ...all,
        [id]: merge(
          (all[id] ?? []).filter((m) => m.id !== temp.id),
          [message],
        ),
      }))
      setTickets(
        (list) =>
          list?.map((t) =>
            t.id === id ? { ...t, status: 'open' as const, lastMessageAt: message.createdAt } : t,
          ) ?? list,
      )
    } catch (error) {
      setMessages((all) => ({
        ...all,
        [id]: (all[id] ?? []).map((m) =>
          m.id === temp.id ? { ...m, pending: false, failed: true } : m,
        ),
      }))
      throw error
    }
  }, [])

  const discard = useCallback((id: string, messageId: string) => {
    setMessages((all) => ({ ...all, [id]: (all[id] ?? []).filter((m) => m.id !== messageId) }))
  }, [])

  const rate = useCallback(
    async (id: string, rating: SupportRating) => upsertTicket(await supportApi.rate(id, rating)),
    [upsertTicket],
  )

  /** Avisa "escribiendo…" como mucho cada 2,5 s. */
  const notifyTyping = useCallback((id: string) => {
    const now = Date.now()
    if (now - lastTyping.current < 2_500) return
    lastTyping.current = now
    void supportApi.typing(id).catch(() => {})
  }, [])

  // Estable (no depende de la lista): la conversación la llama al montarse y
  // cargarla actualiza la lista; si cambiara con ella, se llamaría en loop.
  const ticketsRef = useRef(tickets)
  useEffect(() => {
    ticketsRef.current = tickets
  }, [tickets])
  const setOnScreen = useCallback(
    (id: string | null) => {
      onScreen.current = id
      if (id && ticketsRef.current?.find((t) => t.id === id)?.unread) markRead(id)
    },
    [markRead],
  )

  const unread = useMemo(() => tickets?.filter((t) => t.unread).length ?? 0, [tickets])

  return {
    tickets,
    messages,
    typing,
    unread,
    status,
    loadError,
    refresh,
    loadConversation,
    create,
    send,
    discard,
    rate,
    notifyTyping,
    setOnScreen,
  }
}

export type SupportCenter = ReturnType<typeof useSupportCenter>
