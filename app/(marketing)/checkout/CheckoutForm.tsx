'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  Gift,
  Lock,
  Mail,
  PencilLine,
  ShoppingBag,
  TicketPercent,
  X,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import type { Route } from 'next'
import { useState } from 'react'
import { howItWorks, type HowItWorksIcon } from '@/content/site'
import { formatARS } from '@/domain/money'
import { Button, ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input } from '@/ui/form'
import { ease, Notice, Spinner, spring, Swap } from '@/ui/motion'

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

const STEP_ICONS: Record<HowItWorksIcon, LucideIcon> = {
  bag: ShoppingBag,
  mail: Mail,
  pen: PencilLine,
  gift: Gift,
}

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: ease.out } },
}

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
  const sandboxHref = `/ejemplo/${theme.slug}/personalizar` as Route

  return (
    <motion.div
      className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.12 } } }}
    >
      {/* Formulario */}
      <motion.div
        variants={item}
        className="rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] sm:p-8"
      >
        <h1 className="mb-5 text-2xl font-bold text-ink">Finalizar Compra</h1>

        <div className="mb-8 rounded-2xl border border-brand-muted bg-brand-soft p-5">
          <h2 className="mb-4 font-bold text-brand">¿Cómo funciona?</h2>
          <motion.ol
            className="space-y-3.5"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}
          >
            {howItWorks.map((step) => {
              const Icon = STEP_ICONS[step.icon]
              return (
                <motion.li
                  key={step.title}
                  className="flex gap-3.5 text-sm"
                  variants={{
                    hidden: { opacity: 0, x: -12 },
                    show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: ease.out } },
                  }}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_4px_12px_rgb(244_78_99/0.3)]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <p className="pt-1.5 leading-snug">
                    <strong>{step.title}:</strong> {step.text}
                  </p>
                </motion.li>
              )
            })}
          </motion.ol>
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

          <label className="group flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-neutral-600">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              className="peer sr-only"
            />
            <motion.span
              aria-hidden
              className={cn(
                'mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors duration-200 peer-focus-visible:ring-4 peer-focus-visible:ring-brand/20',
                terms
                  ? 'border-brand bg-brand text-white'
                  : 'border-neutral-300 bg-white group-hover:border-brand',
              )}
              whileTap={{ scale: 0.85 }}
              transition={spring.snappy}
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none">
                <motion.path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={false}
                  animate={{ pathLength: terms ? 1 : 0, opacity: terms ? 1 : 0 }}
                  transition={{ duration: 0.25, ease: ease.out }}
                />
              </svg>
            </motion.span>
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
              <Lock className="size-4" aria-hidden /> Ir a pagar
            </Button>
          ) : (
            <div className="space-y-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <p>
                <strong>{demo ? 'Versión de demostración.' : 'Todavía no cobramos online.'}</strong>{' '}
                El precio y los cupones son reales (se calculan en el servidor), pero el pago con
                Mercado Pago se habilita en el próximo paso del proyecto. Mientras tanto, podés
                probar el editor: es el mismo que usás después de comprar.
              </p>
              <ButtonLink href={sandboxHref} block>
                Probar cómo se personaliza
              </ButtonLink>
              <ButtonLink href={exampleHref} variant="secondary" block>
                Ver cómo queda una Boxie {theme.name}
              </ButtonLink>
            </div>
          )}
        </form>
      </motion.div>

      {/* Resumen */}
      <motion.aside
        variants={item}
        className="h-fit rounded-3xl bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.06)] lg:sticky lg:top-28"
      >
        <h2 className="mb-5 font-bold text-ink">Resumen del pedido</h2>
        <div className="mb-5 flex items-start gap-4">
          <div className="relative size-[70px] shrink-0 overflow-hidden rounded-xl border border-neutral-100">
            <Image src={theme.image} alt={theme.name} fill sizes="70px" className="object-cover" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Boxie {theme.name}</h3>
            <ul className="text-xs leading-relaxed text-neutral-500">
              <li>✅ Experiencia 100% digital</li>
              <li>✏️ Editable hasta que la bloqueás</li>
              <li>⏳ Disponible {giftLifetimeDays} días desde que la regalás</li>
            </ul>
          </div>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void requote(couponInput)
          }}
        >
          <div className="relative flex-1">
            <TicketPercent
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              aria-label="Código de cupón"
              placeholder="Tengo un cupón..."
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              disabled={!!quote.coupon}
              className="py-2.5 pl-10 uppercase placeholder:normal-case"
            />
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            {quote.coupon ? (
              <motion.span
                key="quitar"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring.snappy}
              >
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="size-11"
                  onClick={() => {
                    setCouponInput('')
                    void requote(null)
                  }}
                  aria-label="Quitar cupón"
                  disabled={busy}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </motion.span>
            ) : (
              <motion.span
                key="aplicar"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={spring.snappy}
              >
                <Button
                  type="submit"
                  variant="dark"
                  className="min-w-[96px]"
                  disabled={busy || !couponInput.trim()}
                >
                  {busy ? <Spinner /> : 'Aplicar'}
                </Button>
              </motion.span>
            )}
          </AnimatePresence>
        </form>
        <AnimatePresence initial={false} mode="wait">
          {couponMessage && (
            <Notice.p
              key={couponMessage}
              className={cn(
                'mt-2 flex items-center gap-1.5 text-sm',
                quote.coupon ? 'text-green-700' : 'text-red-600',
              )}
              role="status"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0, x: quote.coupon ? 0 : [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: ease.out }}
            >
              {quote.coupon && <Check className="size-4 shrink-0" aria-hidden />}
              {couponMessage}
            </Notice.p>
          )}
        </AnimatePresence>

        <motion.dl layout className="mt-5 space-y-2 border-t border-neutral-100 pt-5 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatARS(quote.listPriceCents)}</dd>
          </div>
          <AnimatePresence initial={false}>
            {quote.discountCents > 0 && (
              <motion.div
                className="flex justify-between overflow-hidden text-green-700"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring.soft}
              >
                <dt>Descuento ({quote.coupon?.label})</dt>
                <dd>− {formatARS(quote.discountCents)}</dd>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.div
            layout="position"
            className="flex items-baseline justify-between border-t border-neutral-100 pt-3 text-base font-bold"
          >
            <dt>Total</dt>
            <dd className="relative font-display text-2xl text-brand">
              <Swap id={quote.totalCents} y={14}>
                {formatARS(quote.totalCents)}
              </Swap>
            </dd>
          </motion.div>
        </motion.dl>
      </motion.aside>
    </motion.div>
  )
}
