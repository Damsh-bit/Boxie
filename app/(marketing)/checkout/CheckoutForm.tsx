'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import { formatARS } from '@/domain/money'
import { Button, buttonVariants } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input } from '@/ui/form'

export interface Quote {
  listPriceCents: number
  discountCents: number
  totalCents: number
  coupon: { code: string; label: string | null } | null
  couponError: string | null
}

interface Props {
  theme: { slug: string; name: string; image: string }
  initialQuote: Quote
  giftLifetimeDays: number
  paymentsEnabled: boolean
  demo: boolean
}

const STEPS = [
  ['Comprás tu Boxie:', 'Completá tus datos y realizá el pago seguro.'],
  ['Recibís el acceso:', 'Entrás directo al editor y te llega un mail con tu link personal.'],
  ['Personalizás:', 'Cargás fotos, dedicatorias, música y anécdotas.'],
  ['Regalás:', 'Bloqueás la edición y compartís el link único a esa persona especial. ✨'],
] as const

export function CheckoutForm({
  theme,
  initialQuote,
  giftLifetimeDays,
  paymentsEnabled,
  demo,
}: Props) {
  const [quote, setQuote] = useState(initialQuote)
  const [couponInput, setCouponInput] = useState(initialQuote.coupon?.code ?? '')
  const [couponMessage, setCouponMessage] = useState<string | null>(
    initialQuote.coupon
      ? `¡Descuento ${initialQuote.coupon.label} aplicado!`
      : initialQuote.couponError,
  )
  const [terms, setTerms] = useState(false)
  const [busy, setBusy] = useState(false)

  async function requote(cupon: string | null) {
    setBusy(true)
    const response = await fetch('/api/checkout/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tematica: theme.slug, cupon }),
    }).catch(() => null)
    setBusy(false)
    const body = (await response?.json().catch(() => null)) as (Quote & { error?: string }) | null
    if (!response?.ok || !body) {
      setCouponMessage(body?.error ?? 'No pudimos validar el cupón. Probá de nuevo.')
      return
    }
    setQuote(body)
    setCouponMessage(body.coupon ? `¡Descuento ${body.coupon.label} aplicado!` : body.couponError)
  }

  const exampleHref = `/ejemplo/${theme.slug}` as Route

  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      {/* Formulario */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-8">
        <h1 className="mb-5 text-2xl font-bold text-ink">Finalizar Compra</h1>

        <div className="mb-8 rounded-2xl border border-brand-muted bg-brand-soft p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-brand">⚙️ ¿Cómo funciona?</h2>
          <ol className="space-y-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex gap-4 text-sm">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white">
                  {i + 1}
                </span>
                <p>
                  <strong>{title}</strong> {text}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
          }}
          className="space-y-5"
        >
          <h2 className="font-semibold text-ink">Datos de contacto</h2>
          <Field label="Nombre completo" htmlFor="name">
            <Input id="name" name="name" required autoComplete="name" maxLength={120} />
          </Field>
          <Field label="Email (ahí te llega el acceso)" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </Field>
          <Field label="Teléfono (WhatsApp)" htmlFor="phone">
            <Input id="phone" name="phone" type="tel" required autoComplete="tel" maxLength={40} />
          </Field>

          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-neutral-600">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-brand"
            />
            <span>
              Acepto los{' '}
              {/* El prototipo linkeaba /terminos y /privacidad, que daban 404 (hallazgo F17). */}
              <Link
                href="/legales/terminos"
                target="_blank"
                className="font-bold text-brand underline"
              >
                Términos y Condiciones
              </Link>{' '}
              y la{' '}
              <Link
                href="/legales/privacidad"
                target="_blank"
                className="font-bold text-brand underline"
              >
                Política de Privacidad
              </Link>
              . Entiendo que la Boxie es digital, que se edita hasta que la bloqueo para regalar y
              que el regalo queda disponible {giftLifetimeDays} días desde ese momento.
            </span>
          </label>

          {paymentsEnabled ? (
            <Button type="submit" block size="lg" disabled={!terms || busy}>
              Ir a pagar
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p>
                <strong>{demo ? 'Versión de demostración.' : 'Todavía no cobramos online.'}</strong>{' '}
                El precio y los cupones son reales (se calculan en el servidor), pero el pago con
                Mercado Pago se habilita en el próximo paso del proyecto.
              </p>
              <Link href={exampleHref} className={cn(buttonVariants({ block: true }))}>
                Ver cómo queda una Boxie {theme.name}
              </Link>
            </div>
          )}
        </form>
      </div>

      {/* Resumen */}
      <aside className="h-fit rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] lg:sticky lg:top-28">
        <h2 className="mb-5 font-bold text-ink">Resumen del pedido</h2>
        <div className="mb-5 flex items-start gap-4">
          <div className="relative size-[70px] shrink-0 overflow-hidden rounded-xl border border-neutral-100">
            <Image src={theme.image} alt={theme.name} fill sizes="70px" className="object-cover" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Boxie {theme.name}</h3>
            <div className="text-xs leading-relaxed text-neutral-500">
              <p>✅ Experiencia 100% digital</p>
              <p>⚠️ Editable hasta que la bloqueás</p>
              <p>⏳ Disponible {giftLifetimeDays} días desde que la regalás</p>
            </div>
          </div>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void requote(couponInput)
          }}
        >
          <Input
            aria-label="Código de cupón"
            placeholder="Tengo un cupón..."
            value={couponInput}
            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
            disabled={!!quote.coupon}
            className="py-2.5"
          />
          {quote.coupon ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCouponInput('')
                void requote(null)
              }}
              aria-label="Quitar cupón"
            >
              ✕
            </Button>
          ) : (
            <Button type="submit" variant="dark" disabled={busy || !couponInput.trim()}>
              Aplicar
            </Button>
          )}
        </form>
        {couponMessage && (
          <p
            className={cn('mt-2 text-sm', quote.coupon ? 'text-green-700' : 'text-red-600')}
            role="status"
          >
            {couponMessage}
          </p>
        )}

        <dl className="mt-5 space-y-2 border-t border-neutral-100 pt-5 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatARS(quote.listPriceCents)}</dd>
          </div>
          {quote.discountCents > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Descuento ({quote.coupon?.label})</dt>
              <dd>− {formatARS(quote.discountCents)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-neutral-100 pt-3 text-base font-bold">
            <dt>Total</dt>
            <dd className="font-display text-2xl text-brand">{formatARS(quote.totalCents)}</dd>
          </div>
        </dl>
      </aside>
    </div>
  )
}
