'use client'

import { Check, Copy, ExternalLink, Gift, Mail, MonitorSmartphone, Star } from 'lucide-react'
import Link from 'next/link'
import type { Route } from 'next'
import { useState, type ReactNode } from 'react'
import { formatBoxieCode } from '@/domain/boxie'
import { formatARS } from '@/domain/money'
import {
  describeDevice,
  firstResponseMinutes,
  STATUS_INFO,
  ticketLabel,
  type SupportTicket,
} from '@/domain/support'
import { Spinner } from '@/ui/motion'
import { timeAgo } from '@/ui/support/format'
import { Badge } from '../../_ui/primitives'
import { orderStatus } from '../../_ui/status'
import type { TicketDetail } from './actions'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-4 last:border-b-0">
      <h3 className="mb-2.5 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value).catch(() => {})
        setCopied(true)
        setTimeout(() => setCopied(false), 1_500)
      }}
      className="grid size-7 shrink-0 place-items-center rounded-full text-neutral-400 hover:bg-canvas hover:text-ink"
      aria-label={copied ? 'Copiado' : label}
    >
      {copied ? (
        <Check className="size-3.5 text-good" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </button>
  )
}

const minutesText = (minutes: number) =>
  minutes < 60
    ? `${minutes} min`
    : minutes < 60 * 24
      ? `${Math.round(minutes / 60)} h`
      : `${Math.round(minutes / 1440)} días`

/** Lo que el equipo necesita para responder: quién es, qué compró y dónde le pasó. */
export function TicketDetails({
  ticket,
  detail,
}: {
  ticket: SupportTicket
  detail: TicketDetail | undefined
}) {
  const response = firstResponseMinutes(ticket)
  const device = describeDevice(ticket.context?.userAgent)

  return (
    <div className="pb-6">
      <div className="flex items-center gap-3 border-b border-line px-5 pt-5 pb-4">
        <span
          aria-hidden
          className="grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand to-lilac text-lg font-bold text-white"
        >
          {ticket.customerName.trim().charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{ticket.customerName}</p>
          <div className="flex items-center gap-1">
            <a
              href={`mailto:${ticket.customerEmail}?subject=${encodeURIComponent(`Tu consulta ${ticketLabel(ticket.number)}`)}`}
              className="truncate text-sm text-neutral-500 hover:text-brand"
            >
              {ticket.customerEmail}
            </a>
            <CopyButton value={ticket.customerEmail} label="Copiar el mail" />
          </div>
        </div>
      </div>

      {!detail ? (
        <div className="grid place-items-center py-10">
          <Spinner className="size-5 text-brand" />
        </div>
      ) : (
        <>
          <Section title="La Boxie">
            {detail.boxie ? (
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Gift className="size-4 text-brand" aria-hidden />
                  <span className="font-mono font-semibold text-ink">
                    {formatBoxieCode(detail.boxie.code)}
                  </span>
                  <CopyButton value={formatBoxieCode(detail.boxie.code)} label="Copiar el código" />
                </p>
                <p className="text-neutral-600">
                  {detail.boxie.theme ?? 'Temática'}
                  {detail.boxie.plan ? ` · Plan ${detail.boxie.plan}` : ''}
                  {detail.boxie.recipientName ? ` · para ${detail.boxie.recipientName}` : ''}
                </p>
                <p className="flex flex-wrap gap-1.5">
                  <Badge tone={detail.boxie.lockedAt ? 'good' : 'info'}>
                    {detail.boxie.lockedAt ? 'Ya regalada' : 'En edición'}
                  </Badge>
                  {detail.boxie.status !== 'active' && (
                    <Badge tone="critical">
                      {detail.boxie.status === 'refunded' ? 'Reembolsada' : 'Vencida'}
                    </Badge>
                  )}
                  {detail.boxie.openCount > 0 && (
                    <Badge tone="violet">Abierta {detail.boxie.openCount} veces</Badge>
                  )}
                </p>
                <Link
                  href={`/admin/boxies/${detail.boxie.id}` as Route}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                >
                  Ver la Boxie y sus acciones <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              </div>
            ) : ticket.boxieCode ? (
              <p className="text-sm text-neutral-600">
                Escribió el código{' '}
                <span className="font-mono font-semibold text-ink">
                  {formatBoxieCode(ticket.boxieCode)}
                </span>
                , pero no existe: puede estar mal copiado.
              </p>
            ) : (
              <p className="text-sm text-neutral-500">No dejó código de Boxie.</p>
            )}
          </Section>

          <Section title={`Compras con este mail (${detail.orders.length})`}>
            {detail.orders.length ? (
              <ul className="space-y-1.5">
                {detail.orders.map((order) => {
                  const status = orderStatus(order)
                  return (
                    <li key={order.id}>
                      <Link
                        href={`/admin/ventas/${order.id}` as Route}
                        className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-canvas"
                      >
                        <span className="font-semibold text-ink tabular-nums">
                          {formatARS(order.amountCents)}
                        </span>
                        <Badge tone={status.tone} className="px-2 text-[10px]">
                          {status.label}
                        </Badge>
                        <span className="ml-auto text-xs text-neutral-400">
                          {timeAgo(order.createdAt)}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">Todavía no compró con este mail.</p>
            )}
          </Section>

          {detail.history.length > 0 && (
            <Section title="Consultas anteriores">
              <ul className="space-y-1.5 text-sm">
                {detail.history.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-400">{ticketLabel(t.number)}</span>
                    <Link
                      href={`/admin/soporte?ticket=${t.id}` as Route}
                      className="min-w-0 flex-1 truncate text-ink hover:text-brand"
                    >
                      {t.subject}
                    </Link>
                    <span className="text-xs text-neutral-400">{STATUS_INFO[t.status].label}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </>
      )}

      {ticket.context && (
        <Section title="Dónde pasó">
          <dl className="space-y-1.5 text-sm">
            {ticket.context.url && (
              <div className="flex gap-2">
                <dt className="sr-only">Página</dt>
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden />
                <dd className="min-w-0 break-all text-ink">{ticket.context.url}</dd>
              </div>
            )}
            {(device || ticket.context.viewport) && (
              <div className="flex gap-2">
                <dt className="sr-only">Dispositivo</dt>
                <MonitorSmartphone
                  className="mt-0.5 size-4 shrink-0 text-neutral-400"
                  aria-hidden
                />
                <dd className="text-ink">
                  {[device, ticket.context.viewport && `pantalla ${ticket.context.viewport}`]
                    .filter(Boolean)
                    .join(' · ')}
                </dd>
              </div>
            )}
          </dl>
        </Section>
      )}

      <Section title="Seguimiento">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-neutral-400">Abierta</dt>
            <dd className="text-ink">{timeAgo(ticket.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-400">Primera respuesta</dt>
            <dd className="text-ink">{response === null ? 'Todavía no' : minutesText(response)}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-400">Asignada a</dt>
            <dd className="truncate text-ink">{ticket.assignee ?? 'Nadie'}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral-400">Calificación</dt>
            <dd className="flex items-center gap-1 text-ink">
              {ticket.rating ? (
                <>
                  <Star
                    className={
                      ticket.rating === 'good'
                        ? 'size-4 fill-gold text-gold'
                        : 'size-4 text-neutral-400'
                    }
                    aria-hidden
                  />
                  {ticket.rating === 'good' ? 'Le sirvió' : 'No le sirvió'}
                </>
              ) : (
                'Sin calificar'
              )}
            </dd>
          </div>
        </dl>
        <a
          href={`mailto:${ticket.customerEmail}?subject=${encodeURIComponent(`Tu consulta ${ticketLabel(ticket.number)}`)}`}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-500 hover:text-brand"
        >
          <Mail className="size-4" aria-hidden /> Escribirle por mail
        </a>
      </Section>
    </div>
  )
}
