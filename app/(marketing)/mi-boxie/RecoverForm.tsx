'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MailCheck, Send } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/form'
import { Notice, Spinner, spring } from '@/ui/motion'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/** "Mandame el link de nuevo": pide el mail de la compra y responde siempre igual. */
export function RecoverForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus('sending')
    setError('')
    const response = await fetch('/api/mi-boxie/acceso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, website: form.get('website') }),
    }).catch(() => null)
    if (response?.ok) {
      setStatus('sent')
      return
    }
    const body = (await response?.json().catch(() => null)) as { error?: string } | null
    setError(body?.error ?? 'No pudimos procesar el pedido. Probá de nuevo en un rato.')
    setStatus('error')
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'sent' ? (
        <motion.div
          key="sent"
          role="status"
          className="rounded-2xl bg-green-50 p-5 text-left text-green-900 ring-1 ring-green-200"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={spring.soft}
        >
          <p className="flex items-center gap-2 font-semibold">
            <MailCheck className="size-5 shrink-0" aria-hidden /> ¡Listo! Revisá tu mail
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            Si hay Boxies compradas con <strong>{email}</strong>, en unos minutos te llega el link
            (revisá spam y promociones). El link de edición anterior deja de funcionar.
          </p>
          <button
            type="button"
            onClick={() => setStatus('idle')}
            className="mt-3 text-sm font-semibold underline underline-offset-4"
          >
            Usar otro mail
          </button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={submit}
          className="space-y-4 text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Field label="El mail con el que compraste" htmlFor="recover-email">
            <Input
              id="recover-email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          {/* Trampa para bots: los humanos no ven este campo. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden
          />
          <AnimatePresence initial={false}>
            {status === 'error' && (
              <Notice.p
                role="alert"
                className="overflow-hidden rounded-xl bg-red-50 px-3 text-sm text-red-700"
                initial={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', paddingTop: 12, paddingBottom: 12 }}
                exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={spring.soft}
              >
                {error}
              </Notice.p>
            )}
          </AnimatePresence>
          <Button type="submit" block size="lg" disabled={status === 'sending'}>
            {status === 'sending' ? (
              <>
                <Spinner className="size-5" /> Enviando…
              </>
            ) : (
              <>
                <Send className="size-5" aria-hidden /> Mandame el link
              </>
            )}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  )
}
