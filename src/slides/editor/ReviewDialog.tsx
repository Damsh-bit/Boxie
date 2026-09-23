'use client'

import { CircleAlert, LockKeyhole, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { Button } from '@/ui/Button'

export interface ReviewItem {
  moduleId: string
  module: string
  label: string
}

interface Props {
  open: boolean
  onOpenChange(open: boolean): void
  recipientName: string
  senderName: string
  hasPassword: boolean
  photos: number
  missing: ReviewItem[]
  lifetimeDays: number
  /** Hasta cuándo quedaría disponible si se bloquea ahora ("22 de noviembre de 2026"). */
  until: string
  sandbox: boolean
  busy: boolean
  error: string | null
  onGoTo(moduleId: string): void
  onConfirm(): void
}

/**
 * Revisión final antes de bloquear (como el modal del prototipo): qué falta,
 * qué se va a regalar y qué pasa al confirmar.
 */
export function ReviewDialog({
  open,
  onOpenChange,
  recipientName,
  senderName,
  hasPassword,
  photos,
  missing,
  lifetimeDays,
  until,
  sandbox,
  busy,
  error,
  onGoTo,
  onConfirm,
}: Props) {
  const ready = missing.length === 0

  return (
    <Dialog.Root open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-[101] max-h-[92dvh] w-[calc(100%-24px)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:zoom-in-95 sm:p-8">
          <Dialog.Close
            className="absolute top-4 right-4 grid size-9 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-ink"
            aria-label="Cerrar"
            disabled={busy}
          >
            <X className="size-5" aria-hidden />
          </Dialog.Close>

          <div className="mb-2 text-center text-4xl" aria-hidden>
            {ready ? '🎁' : '🧐'}
          </div>
          <Dialog.Title className="text-center font-display text-2xl font-bold text-ink">
            Revisión final
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-center text-sm text-neutral-600">
            {ready
              ? 'Chequeá que esté todo como querés antes de regalarla.'
              : 'Todavía falta completar algunas cosas.'}
          </Dialog.Description>

          {!ready && (
            <ul className="mt-6 space-y-2">
              {missing.map((m) => (
                <li key={`${m.moduleId}-${m.label}`}>
                  <button
                    type="button"
                    onClick={() => onGoTo(m.moduleId)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 hover:bg-amber-100"
                  >
                    <CircleAlert className="size-5 shrink-0" aria-hidden />
                    <span className="flex-1">
                      <strong>{m.module}:</strong> {m.label}
                    </span>
                    <span className="font-semibold underline">Completar</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {ready && (
            <>
              <dl className="mt-6 divide-y divide-dashed divide-neutral-200 rounded-2xl bg-neutral-50 px-5 py-2 text-sm">
                <Row label="Para" value={recipientName} strong />
                <Row label="De parte de" value={senderName} />
                <Row label="Fotos" value={`${photos} ${photos === 1 ? 'cargada' : 'cargadas'} ✓`} />
                <Row label="Clave" value={hasPassword ? 'Sí, se la pasás aparte' : 'Sin clave'} />
              </dl>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                <p className="mb-2 font-bold">Antes de confirmar</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    La Boxie se <strong>bloquea</strong> y ya <strong>no se puede editar</strong>.
                  </li>
                  <li>
                    El regalo queda disponible <strong>{lifetimeDays} días</strong>, hasta el{' '}
                    {until}.
                  </li>
                  {sandbox && (
                    <li>
                      Estás en el <strong>modo prueba</strong>: no se crea ningún link real.
                    </li>
                  )}
                </ul>
              </div>
            </>
          )}

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button
              type="button"
              variant="secondary"
              block
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Seguir editando
            </Button>
            <Button type="button" block disabled={!ready || busy} onClick={onConfirm}>
              <LockKeyhole className="size-4" aria-hidden />
              {busy ? 'Bloqueando…' : 'Bloquear y regalar'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="font-semibold text-neutral-500">{label}</dt>
      <dd className={strong ? 'font-bold text-brand' : 'font-medium text-ink'}>{value}</dd>
    </div>
  )
}
