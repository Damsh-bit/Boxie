'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, CircleAlert, LockKeyhole } from 'lucide-react'
import { Button, Nudge } from '@/ui/Button'
import { Modal } from '@/ui/Modal'
import { ease, Spinner, spring } from '@/ui/motion'

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

const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } },
}
const row = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.out } },
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
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      locked={busy}
      icon={ready ? '🎁' : '🧐'}
      title="Revisión final"
      description={
        ready
          ? 'Chequeá que esté todo como querés antes de regalarla.'
          : 'Todavía falta completar algunas cosas.'
      }
    >
      {!ready && (
        <motion.ul className="mt-6 space-y-2" initial="hidden" animate="show" variants={list}>
          {missing.map((m) => (
            <motion.li key={`${m.moduleId}-${m.label}`} variants={row}>
              <motion.button
                type="button"
                onClick={() => onGoTo(m.moduleId)}
                className="flex w-full items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-left text-sm text-amber-900 transition-colors hover:bg-amber-100"
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileTap={{ scale: 0.98 }}
                transition={spring.snappy}
              >
                <CircleAlert className="size-5 shrink-0" aria-hidden />
                <span className="flex-1">
                  <strong>{m.module}:</strong> {m.label}
                </span>
                <span className="flex items-center gap-1 font-semibold">
                  Completar
                  <Nudge x={3}>
                    <ArrowRight className="size-4" aria-hidden />
                  </Nudge>
                </span>
              </motion.button>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {ready && (
        <motion.div initial="hidden" animate="show" variants={list}>
          <motion.dl
            variants={row}
            className="mt-6 divide-y divide-dashed divide-neutral-200 rounded-2xl bg-neutral-50 px-5 py-2 text-sm"
          >
            <Row label="Para" value={recipientName} strong />
            <Row label="De parte de" value={senderName} />
            <Row label="Fotos" value={`${photos} ${photos === 1 ? 'cargada' : 'cargadas'} ✓`} />
            <Row label="Clave" value={hasPassword ? 'Sí, se la pasás aparte' : 'Sin clave'} />
          </motion.dl>

          <motion.div
            variants={row}
            className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900"
          >
            <p className="mb-2 font-bold">Antes de confirmar</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                La Boxie se <strong>bloquea</strong> y ya <strong>no se puede editar</strong>.
              </li>
              <li>
                El regalo queda disponible <strong>{lifetimeDays} días</strong>, hasta el {until}.
              </li>
              {sandbox && (
                <li>
                  Estás en el <strong>modo prueba</strong>: no se crea ningún link real.
                </li>
              )}
            </ul>
          </motion.div>
        </motion.div>
      )}

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            role="alert"
            className="overflow-hidden rounded-xl bg-red-50 px-4 text-sm text-red-700"
            initial={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
            animate={{
              opacity: 1,
              height: 'auto',
              marginTop: 16,
              paddingTop: 12,
              paddingBottom: 12,
            }}
            exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={spring.soft}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

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
          {busy ? <Spinner /> : <LockKeyhole className="size-4" aria-hidden />}
          {busy ? 'Bloqueando…' : 'Bloquear y regalar'}
        </Button>
      </div>
    </Modal>
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
