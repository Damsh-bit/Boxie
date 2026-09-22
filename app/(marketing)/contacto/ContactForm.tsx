'use client'

import { useState } from 'react'
import { contactAreas } from '@/content/site'
import { Button } from '@/ui/Button'
import { Field, Input, Select, Textarea } from '@/ui/form'

type Status = 'idle' | 'sending' | 'sent' | 'error'

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

  if (status === 'sent') {
    return (
      <div className="animate-fade-in-up py-8 text-center">
        <div className="mb-4 text-5xl">✨</div>
        <h2 className="mb-3 text-3xl font-semibold text-ink">¡Mensaje Enviado!</h2>
        <p className="mb-6 leading-relaxed text-neutral-600">
          Gracias por escribirnos, <strong>{sentTo.name}</strong>.<br />
          Derivamos tu consulta al área correspondiente. Te respondemos a <u>{sentTo.email}</u>.
        </p>
        <Button variant="outline" onClick={() => setStatus('idle')}>
          Enviar otro mensaje
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-5">
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
      {/* Trampa para bots: los humanos no ven este campo. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      {status === 'error' && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <Button type="submit" block size="lg" disabled={status === 'sending'}>
        {status === 'sending' ? 'Enviando…' : 'Enviar Mensaje'}
      </Button>
    </form>
  )
}
