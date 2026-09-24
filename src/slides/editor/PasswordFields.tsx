'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/ui/Button'
import { Input, Label } from '@/ui/form'
import { AutoHeight, ease, Notice, Spinner, spring } from '@/ui/motion'
import { GIFT_PASSWORD_MAX, GIFT_PASSWORD_MIN, type PasswordResult } from './contract'

const swap = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.22, ease: ease.out },
}

/**
 * Clave opcional del regalo (pregunta abierta 1: sin clave por defecto). La
 * clave se guarda hasheada: una vez activada no se vuelve a mostrar, solo se
 * cambia o se quita.
 */
export function PasswordFields({
  hasPassword,
  onSave,
  disabled,
}: {
  hasPassword: boolean
  onSave(password: string | null): Promise<PasswordResult>
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const clean = value.trim()
  const valid = clean.length >= GIFT_PASSWORD_MIN && clean.length <= GIFT_PASSWORD_MAX

  async function submit(password: string | null) {
    setBusy(true)
    setMessage(null)
    const result = await onSave(password).catch((): PasswordResult => ({
      ok: false,
      error: 'Sin conexión. Probá de nuevo.',
    }))
    setBusy(false)
    if (!result.ok) return setMessage({ ok: false, text: result.error })
    setEditing(false)
    setValue('')
    setMessage({
      ok: true,
      text: result.hasPassword
        ? 'Listo: el regalo va a pedir la clave.'
        : 'Listo: el regalo se abre sin clave.',
    })
  }

  const view = editing ? 'editing' : hasPassword ? 'active' : 'off'

  return (
    <AutoHeight>
      <AnimatePresence mode="wait" initial={false}>
        {view === 'active' && (
          <motion.div key="active" {...swap} className="space-y-4">
            <div className="flex items-center gap-3 rounded-2xl bg-green-50 p-4 text-sm text-green-800">
              <motion.span
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ ...spring.bouncy, delay: 0.1 }}
              >
                <LockKeyhole className="size-5 shrink-0" aria-hidden />
              </motion.span>
              <p>
                <strong>La clave está activada.</strong> Por seguridad no la mostramos: si no te la
                acordás, poné una nueva.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={disabled || busy}
                onClick={() => setEditing(true)}
              >
                Cambiar la clave
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || busy}
                onClick={() => void submit(null)}
              >
                {busy && <Spinner />} Quitar la clave
              </Button>
            </div>
          </motion.div>
        )}

        {view === 'off' && (
          <motion.div key="off" {...swap} className="space-y-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => setEditing(true)}
            >
              <LockKeyhole className="size-4" aria-hidden /> Ponerle una clave
            </Button>
          </motion.div>
        )}

        {view === 'editing' && (
          <motion.form
            key="editing"
            {...swap}
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (valid) void submit(clean)
            }}
          >
            <div>
              <Label htmlFor="clave-regalo">Clave para abrir el regalo</Label>
              <Input
                id="clave-regalo"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                minLength={GIFT_PASSWORD_MIN}
                maxLength={GIFT_PASSWORD_MAX}
                autoComplete="off"
                autoFocus
                placeholder="Ej: nuestroaniversario"
                disabled={disabled || busy}
              />
              <p className="mt-1.5 text-xs text-neutral-500">
                De {GIFT_PASSWORD_MIN} a {GIFT_PASSWORD_MAX} caracteres. No distingue mayúsculas.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm" disabled={!valid || busy || disabled}>
                {busy ? (
                  <>
                    <Spinner /> Guardando…
                  </>
                ) : (
                  'Guardar clave'
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setEditing(false)
                  setValue('')
                }}
              >
                Cancelar
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      <AnimatePresence initial={false}>
        {message && (
          <Notice.p
            key={message.text}
            role={message.ok ? 'status' : 'alert'}
            className={message.ok ? 'mt-3 text-sm text-green-700' : 'mt-3 text-sm text-red-600'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: ease.out }}
          >
            {message.text}
          </Notice.p>
        )}
      </AnimatePresence>
    </AutoHeight>
  )
}
