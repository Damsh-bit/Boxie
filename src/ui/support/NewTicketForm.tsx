'use client'

import { AnimatePresence } from 'framer-motion'
import { Send } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useId, useState, type FormEvent } from 'react'
import { TOPIC_INFO, type NewTicketInput, type SupportTopic } from '@/domain/support'
import { Button } from '../Button'
import { Field, Input, Textarea } from '../form'
import { Notice, Spinner, spring } from '../motion'
import { SupportRequestError, type Conversation } from './client'

/** Nombre y mail que se recuerdan en este navegador (para no volver a escribirlos). */
const CONTACT_KEY = 'boxie:soporte:contacto'

function rememberedContact(): { name: string; email: string } {
  try {
    const saved = JSON.parse(localStorage.getItem(CONTACT_KEY) ?? 'null') as {
      name?: string
      email?: string
    } | null
    return { name: saved?.name ?? '', email: saved?.email ?? '' }
  } catch {
    return { name: '', email: '' }
  }
}

/**
 * La página donde está la persona, sin nada que sea una credencial: los
 * links del regalo o del editor llevan el token en la dirección.
 */
function pageContext() {
  const path = window.location.pathname.replace(
    /^\/(g|editor|soporte)\/[A-Za-z0-9_-]{16,}/,
    '/$1/•••',
  )
  return {
    url: `${window.location.origin}${path}`.slice(0, 500),
    userAgent: navigator.userAgent.slice(0, 400),
    viewport: `${window.innerWidth}x${window.innerHeight}`,
  }
}

export interface NewTicketDefaults {
  boxieCode?: string
  message?: string
}

/**
 * Abrir una consulta: los datos para responder (nombre y mail), el código de
 * la Boxie si es sobre una, el mensaje y, en un error, el detalle técnico de
 * la página (con permiso).
 */
export function NewTicketForm({
  topic,
  defaults = {},
  create,
  onCreated,
}: {
  topic: SupportTopic
  defaults?: NewTicketDefaults
  create(input: NewTicketInput): Promise<Conversation>
  onCreated(conversation: Conversation): void
}) {
  const id = useId()
  const info = TOPIC_INFO[topic]
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [boxieCode, setBoxieCode] = useState(defaults.boxieCode ?? '')
  const [message, setMessage] = useState(defaults.message ?? '')
  const [attach, setAttach] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})

  // El nombre y el mail de la última vez (se lee después de hidratar).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = rememberedContact()
      setName((n) => n || saved.name)
      setEmail((e) => e || saved.email)
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    setFields({})
    try {
      const conversation = await create({
        topic,
        name,
        email,
        boxieCode: topic === 'boxie' || topic === 'pago' ? boxieCode : undefined,
        message,
        context: topic === 'error' && attach ? pageContext() : null,
        website: String(form.get('website') ?? ''),
      })
      try {
        localStorage.setItem(CONTACT_KEY, JSON.stringify({ name, email }))
      } catch {
        // Sin almacenamiento: la próxima vez se vuelven a escribir.
      }
      onCreated(conversation)
    } catch (e) {
      if (e instanceof SupportRequestError) {
        setError(e.message)
        setFields(e.fields)
      } else setError('No pudimos enviar la consulta. Probá de nuevo.')
      setBusy(false)
    }
  }

  const withCode = topic === 'boxie' || topic === 'pago'

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <p className="flex items-center gap-2 rounded-2xl bg-brand-soft px-3.5 py-2.5 text-sm font-semibold text-ink">
        <span aria-hidden className="text-lg">
          {info.emoji}
        </span>
        {info.prompt}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tu nombre" htmlFor={`${id}-name`} error={fields.name}>
          <Input
            id={`${id}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
            maxLength={80}
            required
            aria-invalid={Boolean(fields.name)}
          />
        </Field>
        <Field label="Tu mail" htmlFor={`${id}-email`} error={fields.email}>
          <Input
            id={`${id}-email`}
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            required
            aria-invalid={Boolean(fields.email)}
          />
        </Field>
      </div>

      {withCode && (
        <Field
          label="Código de tu Boxie (opcional)"
          htmlFor={`${id}-code`}
          hint={fields.boxieCode ? undefined : 'Está en el mail de compra. Ej.: K7M2-Q9XD'}
          error={fields.boxieCode}
        >
          <Input
            id={`${id}-code`}
            value={boxieCode}
            onChange={(e) => setBoxieCode(e.target.value.toUpperCase())}
            autoComplete="off"
            maxLength={12}
            placeholder="XXXX-XXXX"
            className="font-mono tracking-wider uppercase placeholder:font-sans placeholder:tracking-normal"
            aria-invalid={Boolean(fields.boxieCode)}
          />
        </Field>
      )}

      <Field label="Tu mensaje" htmlFor={`${id}-message`} error={fields.message}>
        <Textarea
          id={`${id}-message`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={info.placeholder}
          rows={4}
          maxLength={4000}
          required
          aria-invalid={Boolean(fields.message)}
        />
      </Field>

      {topic === 'error' && (
        <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/70">
          <input
            type="checkbox"
            checked={attach}
            onChange={(e) => setAttach(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-brand"
          />
          Sumar los datos de esta página (dirección, navegador y tamaño de pantalla) para encontrar
          el error más rápido.
        </label>
      )}

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
        {error && (
          <Notice.p
            role="alert"
            className="overflow-hidden rounded-xl bg-red-50 px-3 text-sm text-red-700"
            initial={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', paddingTop: 10, paddingBottom: 10 }}
            exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
            transition={spring.soft}
          >
            {error}
          </Notice.p>
        )}
      </AnimatePresence>

      <Button type="submit" block size="lg" disabled={busy}>
        {busy ? (
          <>
            <Spinner className="size-5" /> Enviando…
          </>
        ) : (
          <>
            <Send className="size-5" aria-hidden /> Enviar consulta
          </>
        )}
      </Button>
      <p className="text-center text-xs leading-relaxed text-ink/50">
        Te responde una persona del equipo por acá y te avisamos por mail. Usamos tus datos solo
        para responderte (
        <Link href="/legales/privacidad" className="underline underline-offset-2">
          privacidad
        </Link>
        ).
      </p>
    </form>
  )
}
