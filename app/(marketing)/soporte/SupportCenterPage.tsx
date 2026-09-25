'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Inbox, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  STATUS_INFO,
  SUPPORT_TOPICS,
  TOPIC_INFO,
  ticketLabel,
  type SupportTopic,
} from '@/domain/support'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'
import { Conversation } from '@/ui/support/Conversation'
import { NewTicketForm } from '@/ui/support/NewTicketForm'
import { RecoverTickets } from '@/ui/support/RecoverTickets'
import { TicketRow } from '@/ui/support/SupportWidget'
import { useSupportCenter } from '@/ui/support/use-support-center'

type Pane =
  | { name: 'list' }
  | { name: 'chat'; id: string }
  | { name: 'new'; topic: SupportTopic | null }
  | { name: 'recover' }

const ERRORS: Record<string, string> = {
  link: 'Ese link de consulta no existe o está incompleto. Revisá que se haya copiado entero.',
  limite: 'Abriste muchos links seguidos. Esperá un momento y probá de nuevo.',
  servidor: 'No pudimos abrir la consulta. Probá de nuevo en un rato.',
}

/**
 * El centro de soporte a pantalla completa: las consultas de este navegador a
 * la izquierda y la conversación a la derecha (en el celular, una cosa por
 * vez). Es adonde llevan los links de los mails.
 */
export function SupportCenterPage({
  initial,
}: {
  initial: {
    ticketId: string | null
    /** Abrir el formulario (con el tema, si vino). */
    newTicket: boolean
    newTopic: SupportTopic | null
    code: string | null
    error: string | null
  }
}) {
  const router = useRouter()
  const center = useSupportCenter({ enabled: true })
  const [pane, setPane] = useState<Pane>(
    initial.ticketId
      ? { name: 'chat', id: initial.ticketId }
      : initial.newTicket
        ? { name: 'new', topic: initial.newTopic }
        : { name: 'list' },
  )
  const tickets = center.tickets
  const ticket = pane.name === 'chat' ? tickets?.find((t) => t.id === pane.id) : undefined
  const missing = pane.name === 'chat' && tickets !== null && !ticket

  const open = (next: Pane) => {
    setPane(next)
    // La dirección refleja la consulta abierta (se puede compartir con uno mismo o recargar).
    router.replace(next.name === 'chat' ? `/soporte?consulta=${next.id}` : '/soporte', {
      scroll: false,
    })
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 sm:px-8 lg:grid-cols-[22rem_minmax(0,1fr)]">
      {initial.error && ERRORS[initial.error] && (
        <p
          role="alert"
          className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 lg:col-span-2"
        >
          {ERRORS[initial.error]}
        </p>
      )}

      <aside
        className={cn(
          'min-w-0 rounded-[28px] bg-white p-4 ring-1 ring-black/5 lg:block',
          pane.name === 'list' ? 'block' : 'hidden',
        )}
        aria-label="Tus consultas"
      >
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="font-display text-xl font-bold text-ink">Tus consultas</h2>
          <button
            type="button"
            onClick={() => open({ name: 'new', topic: null })}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-2 text-sm font-bold text-white shadow-[0_6px_16px_rgba(244,78,99,0.3)] hover:bg-brand-dark"
          >
            <Plus className="size-4" aria-hidden /> Nueva
          </button>
        </div>
        {tickets === null ? (
          <div className="space-y-2" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl bg-ink/[0.05]" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center px-4 py-10 text-center">
            <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
              <Inbox className="size-6" aria-hidden />
            </span>
            <p className="font-semibold text-ink">Todavía no hay consultas acá</p>
            <p className="mt-1 text-sm text-ink/60">
              Abrí una y te responde una persona del equipo.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {tickets.map((t) => (
              <li
                key={t.id}
                className={cn(
                  pane.name === 'chat' && pane.id === t.id && 'rounded-2xl ring-2 ring-brand/40',
                )}
              >
                <TicketRow ticket={t} onOpen={() => open({ name: 'chat', id: t.id })} />
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => open({ name: 'recover' })}
          className="mt-4 w-full rounded-xl px-2 py-2 text-left text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          ¿Escribiste desde otro dispositivo? Traé tus consultas
        </button>
      </aside>

      <section
        className={cn(
          'min-w-0 overflow-hidden rounded-[28px] bg-canvas ring-1 ring-black/5 lg:flex lg:flex-col',
          pane.name === 'list' ? 'hidden' : 'flex flex-col',
        )}
        style={{ minHeight: 'min(640px, calc(100dvh - 180px))' }}
      >
        <div className="flex items-center gap-2 border-b border-black/5 bg-white px-4 py-3">
          <button
            type="button"
            onClick={() => open({ name: 'list' })}
            className="grid size-9 place-items-center rounded-full hover:bg-paper lg:hidden"
            aria-label="Volver a tus consultas"
          >
            <ArrowLeft className="size-5" aria-hidden />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold text-ink">
              {pane.name === 'chat'
                ? (ticket?.subject ?? 'Consulta')
                : pane.name === 'recover'
                  ? 'Traer mis consultas'
                  : pane.name === 'new'
                    ? pane.topic
                      ? TOPIC_INFO[pane.topic].label
                      : 'Nueva consulta'
                    : 'Soporte'}
            </p>
            {ticket && (
              <p className="text-xs text-ink/55">
                {ticketLabel(ticket.number)} · {STATUS_INFO[ticket.status].customerLabel}
              </p>
            )}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={
              pane.name === 'chat' ? pane.id : pane.name + (pane.name === 'new' ? pane.topic : '')
            }
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={spring.soft}
          >
            {pane.name === 'chat' &&
              (ticket ? (
                <Conversation
                  ticket={ticket}
                  center={center}
                  onNewTicket={() => open({ name: 'new', topic: null })}
                  className="h-[min(640px,calc(100dvh-240px))] lg:h-auto"
                />
              ) : missing ? (
                <div className="m-auto max-w-sm p-8 text-center">
                  <p className="font-semibold text-ink">
                    Esta consulta no está en este dispositivo
                  </p>
                  <p className="mt-1 text-sm text-ink/60">
                    Abrí el link del mail de la consulta o pedí que te lo mandemos de nuevo.
                  </p>
                  <button
                    type="button"
                    onClick={() => open({ name: 'recover' })}
                    className="mt-4 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white"
                  >
                    Mandame el link
                  </button>
                </div>
              ) : (
                <p className="m-auto p-8 text-sm text-ink/50">Cargando…</p>
              ))}

            {pane.name === 'new' && (
              <div className="overflow-y-auto p-4 sm:p-6">
                {pane.topic ? (
                  <div className="mx-auto max-w-xl">
                    <NewTicketForm
                      topic={pane.topic}
                      defaults={{ boxieCode: initial.code ?? undefined }}
                      create={center.create}
                      onCreated={(c) => open({ name: 'chat', id: c.ticket.id })}
                    />
                  </div>
                ) : (
                  <div className="mx-auto grid max-w-xl gap-3 sm:grid-cols-2">
                    <p className="text-ink/70 sm:col-span-2">¿Sobre qué es tu consulta?</p>
                    {SUPPORT_TOPICS.map((topic) => (
                      <motion.button
                        key={topic}
                        type="button"
                        onClick={() => open({ name: 'new', topic })}
                        className="flex items-center gap-3 rounded-2xl bg-white p-4 text-left ring-1 ring-black/5 hover:ring-brand/30"
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span aria-hidden className="text-2xl">
                          {TOPIC_INFO[topic].emoji}
                        </span>
                        <span className="font-semibold text-ink">{TOPIC_INFO[topic].prompt}</span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pane.name === 'recover' && (
              <div className="mx-auto w-full max-w-md p-4 sm:p-6">
                <RecoverTickets />
              </div>
            )}

            {pane.name === 'list' && (
              <div className="m-auto hidden max-w-sm p-8 text-center lg:block">
                <p className="font-display text-2xl font-bold text-ink">Elegí una consulta</p>
                <p className="mt-1 text-ink/60">
                  o abrí una nueva: te responde una persona del equipo.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  )
}
