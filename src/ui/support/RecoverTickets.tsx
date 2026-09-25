'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { MailCheck, Send } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '../Button'
import { Field, Input } from '../form'
import { Notice, Spinner, spring } from '../motion'
import { supportApi, SupportRequestError } from './client'

/**
 * Las consultas se ven en el navegador desde el que se escribieron. Desde
 * otro, se piden por mail: llega el link personal de cada consulta abierta.
 */
export function RecoverTickets() {
  const id = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setStatus('sending')
    setError(null)
    try {
      await supportApi.recover(email)
      setStatus('sent')
    } catch (e) {
      setError(e instanceof SupportRequestError ? e.message : 'No pudimos procesar el pedido.')
      setStatus('idle')
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'sent' ? (
        <motion.div
          key="sent"
          role="status"
          className="rounded-2xl bg-green-50 p-5 text-green-900 ring-1 ring-green-200"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring.soft}
        >
          <p className="flex items-center gap-2 font-semibold">
            <MailCheck className="size-5 shrink-0" aria-hidden /> Revisá tu mail
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            Si escribiste con <strong>{email}</strong>, te mandamos el link de cada consulta
            abierta. Abrilo en este dispositivo y seguís la charla desde acá.
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={submit}
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <p className="text-sm leading-relaxed text-ink/70">
            Tus consultas se ven en el dispositivo desde el que las escribiste. Para seguirlas desde
            acá, te mandamos el link por mail.
          </p>
          <Field label="Tu mail" htmlFor={`${id}-email`}>
            <Input
              id={`${id}-email`}
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <AnimatePresence initial={false}>
            {error && (
              <Notice.p
                role="alert"
                className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                {error}
              </Notice.p>
            )}
          </AnimatePresence>
          <Button type="submit" block disabled={status === 'sending'}>
            {status === 'sending' ? (
              <>
                <Spinner className="size-5" /> Enviando…
              </>
            ) : (
              <>
                <Send className="size-4" aria-hidden /> Mandame los links
              </>
            )}
          </Button>
        </motion.form>
      )}
    </AnimatePresence>
  )
}
