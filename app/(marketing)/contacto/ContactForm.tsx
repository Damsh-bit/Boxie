'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Send } from 'lucide-react'
import { useState } from 'react'
import { contactAreas } from '@/content/site'
import { Button } from '@/ui/Button'
import { Field, Input, Select, Textarea } from '@/ui/form'
import { ease, Spinner, spring } from '@/ui/motion'

type Status = 'idle' | 'sending' | 'sent' | 'error'

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: ease.out } },
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState({ name: '', email: '' })

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus('sending')
    setError('')
    const response = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(form)),
    }).catch(() => null)
    if (response?.ok) {
      setSentTo({ name: String(form.get('name')), email: String(form.get('email')) })
      setStatus('sent')
    } else {
      const body = (await response?.json().catch(() => null)) as { error?: string } | null
      setError(body?.error ?? 'No pudimos enviar el mensaje. Probá de nuevo en un rato.')
      setStatus('error')
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'sent' ? (
        <motion.div
          key="sent"
          className="py-8 text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={spring.soft}
        >
          <motion.div
            className="mb-4 inline-block text-6xl"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...spring.bouncy, delay: 0.15 }}
            aria-hidden
          >
            ✨
          </motion.div>
          <h2 className="mb-3 text-3xl font-semibold text-ink">¡Mensaje Enviado!</h2>
          <p className="mb-6 leading-relaxed text-neutral-600">
            Gracias por escribirnos, <strong>{sentTo.name}</strong>.<br />
            Derivamos tu consulta al área correspondiente. Te respondemos a <u>{sentTo.email}</u>.
          </p>
          <Button variant="outline" onClick={() => setStatus('idle')}>
            Enviar otro mensaje
          </Button>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={submit}
          className="space-y-5"
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
          variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
        >
          <motion.div variants={item}>
            <Field label="Nombre Completo" htmlFor="name">
              <Input
                id="name"
                name="name"
                placeholder="Tu nombre"
                required
                maxLength={120}
                autoComplete="name"
              />
            </Field>
          </motion.div>
          <motion.div variants={item}>
            <Field label="Email de contacto" htmlFor="email">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tucorreo@ejemplo.com"
                required
                autoComplete="email"
              />
            </Field>
          </motion.div>
          <motion.div variants={item}>
            <Field label="¿Con qué área querés hablar?" htmlFor="area">
              <Select id="area" name="area" required defaultValue="">
                <option value="" disabled>
                  Seleccioná el motivo...
                </option>
                {contactAreas.map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          </motion.div>
          <motion.div variants={item}>
            <Field label="Mensaje" htmlFor="message">
              <Textarea
                id="message"
                name="message"
                rows={5}
                placeholder="Contanos, ¿en qué podemos ayudarte?"
                required
                maxLength={3000}
              />
            </Field>
          </motion.div>
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
              <motion.p
                role="alert"
                className="overflow-hidden rounded-xl bg-red-50 px-3 text-sm text-red-700"
                initial={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', paddingTop: 12, paddingBottom: 12 }}
                exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={spring.soft}
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>
          <motion.div variants={item}>
            <Button type="submit" block size="lg" disabled={status === 'sending'}>
              {status === 'sending' ? (
                <>
                  <Spinner className="size-5" /> Enviando…
                </>
              ) : (
                <>
                  <Send className="size-5" aria-hidden /> Enviar Mensaje
                </>
              )}
            </Button>
          </motion.div>
        </motion.form>
      )}
    </AnimatePresence>
  )
}
