'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  SPONSOR_INTERESTS,
  SPONSOR_INTEREST_LABELS,
  SPONSOR_KINDS,
  SPONSOR_KIND_LABELS,
  type SponsorInterest,
} from '@/domain/sponsors'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { ConfettiBurst } from '@/ui/ConfettiBurst'
import { Field, Input, Select, Textarea } from '@/ui/form'
import { Notice, Spinner, spring } from '@/ui/motion'

type Status = 'idle' | 'sending' | 'sent' | 'error'

/**
 * "Quiero ser aliado": el pedido entra al panel (Sponsors, nuevo contacto) y
 * le llega un mail al área comercial. Los intereses se eligen tocando.
 */
export function LeadForm() {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [interests, setInterests] = useState<SponsorInterest[]>(['sponsor'])
  const [sentTo, setSentTo] = useState('')

  const toggle = (i: SponsorInterest) =>
    setInterests((list) => (list.includes(i) ? list.filter((x) => x !== i) : [...list, i]))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = {
      name: String(form.get('name') ?? ''),
      business: String(form.get('business') ?? ''),
      kind: String(form.get('kind') ?? 'local'),
      city: String(form.get('city') ?? ''),
      email: String(form.get('email') ?? ''),
      phone: String(form.get('phone') ?? ''),
      message: String(form.get('message') ?? ''),
      website: String(form.get('website') ?? ''),
      interests,
    }
    setStatus('sending')
    setError('')
    const response = await fetch('/api/marcas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null)
    if (response?.ok) {
      setSentTo(body.business)
      setStatus('sent')
      return
    }
    const data = (await response?.json().catch(() => null)) as { error?: string } | null
    setError(data?.error ?? 'No pudimos enviar tu pedido. Probá de nuevo en un rato.')
    setStatus('error')
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === 'sent' ? (
        <motion.div
          key="enviado"
          className="relative py-10 text-center"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={spring.soft}
        >
          <ConfettiBurst className="pointer-events-none absolute inset-0" />
          <motion.span
            className="mx-auto grid size-16 place-items-center rounded-full bg-brand text-white"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...spring.bouncy, delay: 0.15 }}
          >
            <Check className="size-8" strokeWidth={3} aria-hidden />
          </motion.span>
          <h3 className="mt-5 font-display text-3xl font-bold text-ink">¡Qué bueno!</h3>
          <p className="mx-auto mt-2 max-w-sm leading-relaxed text-ink/65">
            Recibimos el pedido de <strong className="text-ink">{sentTo}</strong>. Te escribimos en
            los próximos días para contarte cómo seguimos.
          </p>
          <Button variant="outline" className="mt-6" onClick={() => setStatus('idle')}>
            Enviar otro
          </Button>
        </motion.div>
      ) : (
        <motion.form
          key="formulario"
          onSubmit={submit}
          className="grid gap-5 sm:grid-cols-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
        >
          <Field label="Tu nombre" htmlFor="lead-name">
            <Input id="lead-name" name="name" required maxLength={120} autoComplete="name" />
          </Field>
          <Field label="Negocio o marca" htmlFor="lead-business">
            <Input
              id="lead-business"
              name="business"
              required
              maxLength={80}
              autoComplete="organization"
            />
          </Field>
          <Field label="¿Qué sos?" htmlFor="lead-kind">
            <Select id="lead-kind" name="kind" defaultValue="local">
              {SPONSOR_KINDS.map((k) => (
                <option key={k} value={k}>
                  {SPONSOR_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ciudad" htmlFor="lead-city">
            <Input
              id="lead-city"
              name="city"
              maxLength={80}
              autoComplete="address-level2"
              placeholder="Ej.: Palermo, CABA"
            />
          </Field>
          <Field label="Mail" htmlFor="lead-email">
            <Input id="lead-email" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="WhatsApp (opcional)" htmlFor="lead-phone">
            <Input
              id="lead-phone"
              name="phone"
              type="tel"
              maxLength={40}
              autoComplete="tel"
              placeholder="+54 9 11…"
            />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="mb-2 block text-xs font-bold tracking-wide text-neutral-500 uppercase">
              ¿Qué te interesa?
            </legend>
            <div className="flex flex-wrap gap-2">
              {SPONSOR_INTERESTS.map((i) => {
                const selected = interests.includes(i)
                return (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(i)}
                    className={cn(
                      'inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors',
                      selected
                        ? 'bg-ink text-white'
                        : 'bg-neutral-50 text-ink ring-1 ring-neutral-200 hover:ring-neutral-300',
                    )}
                  >
                    <AnimatePresence initial={false}>
                      {selected && (
                        <motion.span
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 'auto', opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          className="inline-flex overflow-hidden"
                        >
                          <Check className="size-4" aria-hidden />
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {SPONSOR_INTEREST_LABELS[i]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Field
            label="Contanos un poco (opcional)"
            htmlFor="lead-message"
            className="sm:col-span-2"
          >
            <Textarea
              id="lead-message"
              name="message"
              rows={4}
              maxLength={2000}
              placeholder="Qué vendés, cuándo abrís, qué fecha querés empujar…"
            />
          </Field>

          {/* Trampa para bots: una persona no la ve ni la completa. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="hidden"
            aria-hidden
          />

          <div className="flex flex-col items-start gap-3 sm:col-span-2">
            <AnimatePresence>
              {status === 'error' && error && (
                <Notice.p
                  role="alert"
                  className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {error}
                </Notice.p>
              )}
            </AnimatePresence>
            <Button type="submit" size="lg" disabled={status === 'sending'}>
              {status === 'sending' ? <Spinner /> : <Send className="size-5" aria-hidden />}
              Quiero ser aliado
            </Button>
            <p className="text-xs text-ink/45">
              Solo usamos tus datos para responderte sobre Boxie para marcas.
            </p>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  )
}
