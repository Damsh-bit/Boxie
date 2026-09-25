'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Eye,
  EyeOff,
  Gift,
  LockKeyhole,
  Sparkles,
  TrendingUp,
  Wand2,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useRef, useState } from 'react'
import { Button, Nudge } from '@/ui/Button'
import { Field, Input } from '@/ui/form'
import { ease, Float, Notice, spring, Spinner, Stagger, StaggerItem } from '@/ui/motion'
import { login, type LoginState } from './actions'

export function LoginScreen({
  next,
  demo,
  hint,
}: {
  next: string
  demo: boolean
  hint: { email: string; password: string } | null
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {
    error: null,
    email: '',
  })
  const [show, setShow] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const fillDemo = () => {
    if (!hint || !emailRef.current || !passwordRef.current) return
    emailRef.current.value = hint.email
    passwordRef.current.value = hint.password
    passwordRef.current.focus()
  }

  return (
    <div className="grid min-h-dvh bg-canvas lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />

      <div className="flex items-center justify-center px-5 py-12 sm:px-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: ease.out }}
        >
          <Link href="/" className="mb-10 inline-block lg:hidden" aria-label="Boxie">
            <Image src="/brand/boxie-logo.png" alt="Boxie" width={110} height={38} priority />
          </Link>

          <motion.span
            className="mb-5 grid size-14 place-items-center rounded-2xl bg-brand text-white shadow-[0_12px_30px_rgba(244,78,99,0.35)]"
            initial={{ scale: 0, rotate: -25 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ ...spring.bouncy, delay: 0.15 }}
          >
            <LockKeyhole className="size-6" aria-hidden />
          </motion.span>
          <h1 className="font-display text-4xl font-bold text-ink">Entrar al panel</h1>
          <p className="mt-2 text-neutral-600">
            El centro de control de Boxie: ventas, temáticas, planes y todo el negocio.
          </p>

          <form action={action} className="mt-8 space-y-5">
            <input type="hidden" name="next" value={next} />
            <Field label="Mail" htmlFor="email">
              <Input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
                defaultValue={state.email}
                placeholder="vos@boxiedigital.com.ar"
                aria-invalid={state.error ? true : undefined}
              />
            </Field>
            <Field label="Clave" htmlFor="password">
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="pr-12"
                  aria-invalid={state.error ? true : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-ink"
                  aria-label={show ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {show ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </Field>

            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-600 select-none">
              <input type="checkbox" name="remember" className="size-4 rounded accent-brand" />
              Mantener la sesión abierta 30 días
            </label>

            <AnimatePresence initial={false}>
              {state.error && !pending && (
                <Notice.p
                  key={state.error}
                  role="alert"
                  className="rounded-xl bg-[#fdeaea] px-4 py-3 text-sm font-medium text-[#a52a2a]"
                  initial={{ opacity: 0, height: 0, y: -6 }}
                  animate={{ opacity: 1, height: 'auto', y: 0, x: [0, -8, 8, -5, 5, 0] }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, x: { duration: 0.4 } }}
                >
                  {state.error}
                </Notice.p>
              )}
            </AnimatePresence>

            <Button type="submit" size="lg" block disabled={pending}>
              {pending ? (
                <>
                  <Spinner className="size-5" /> Entrando…
                </>
              ) : (
                <>
                  Entrar{' '}
                  <Nudge x={4}>
                    <ArrowRight className="size-5" aria-hidden />
                  </Nudge>
                </>
              )}
            </Button>
          </form>

          {demo && (
            <motion.div
              className="mt-8 rounded-2xl border border-dashed border-[#c9a100]/50 bg-gold/10 p-4 text-sm text-[#5c4a00]"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5, ease: ease.out }}
            >
              <p className="flex items-center gap-2 font-bold">
                <Sparkles className="size-4" aria-hidden /> Modo demo
              </p>
              <p className="mt-1">
                El panel muestra datos de muestra: la base de datos todavía no está conectada.
              </p>
              {hint && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-white/80 px-2 py-1 text-xs">{hint.email}</code>
                  <code className="rounded-lg bg-white/80 px-2 py-1 text-xs">{hint.password}</code>
                  <button
                    type="button"
                    onClick={fillDemo}
                    className="ml-auto rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85"
                  >
                    Completar
                  </button>
                </div>
              )}
            </motion.div>
          )}

          <p className="mt-10 text-center text-xs text-neutral-500">
            ¿Buscabas tu regalo?{' '}
            <Link href="/editor" className="font-semibold text-brand hover:underline">
              Entrá al editor
            </Link>{' '}
            o{' '}
            <Link href="/" className="font-semibold text-brand hover:underline">
              volvé a la tienda
            </Link>
            .
          </p>
        </motion.div>
      </div>
    </div>
  )
}

/** La mitad de la marca: degradé, el logo y tarjetitas flotando con el pulso del negocio. */
function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand via-[#e9587a] to-lilac lg:block">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1.2px, transparent 0)',
          backgroundSize: '26px 26px',
        }}
      />
      <motion.div
        aria-hidden
        className="absolute -top-40 -right-40 size-[520px] rounded-full bg-white/15 blur-3xl"
        animate={{ transform: ['scale(1)', 'scale(1.15)', 'scale(1)'] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="relative flex h-full flex-col justify-between p-12 text-white xl:p-16">
        <Link href="/" aria-label="Boxie" className="w-fit">
          <Image
            src="/brand/boxie-logo.png"
            alt="Boxie"
            width={130}
            height={45}
            priority
            className="brightness-0 invert"
          />
        </Link>

        <Stagger immediate step={0.12} delay={0.2} className="max-w-md">
          <StaggerItem
            as="p"
            className="mb-4 text-sm font-bold tracking-[0.2em] text-white/80 uppercase"
          >
            Panel de administración
          </StaggerItem>
          <StaggerItem as="h2" className="font-display text-5xl leading-[1.05] font-bold">
            Todo el negocio, en un solo lugar.
          </StaggerItem>
          <StaggerItem as="p" className="mt-5 text-lg text-white/85">
            Mirá cuánto vendés y cuánto ganás, creá temáticas en segundos y decidí qué incluye cada
            plan.
          </StaggerItem>
        </Stagger>

        <div className="relative h-48" aria-hidden>
          <Float distance={10} duration={7} className="absolute bottom-10 left-0">
            <MiniCard icon={TrendingUp} label="Ventas" value="En tiempo real" />
          </Float>
          <Float distance={12} duration={8} delay={1} className="absolute right-6 bottom-24">
            <MiniCard icon={Gift} label="Rentabilidad" value="Por plan y temática" />
          </Float>
          <Float distance={9} duration={6.5} delay={0.5} className="absolute bottom-0 left-56">
            <MiniCard icon={Wand2} label="Temáticas" value="Se generan solas" />
          </Float>
        </div>
      </div>
    </div>
  )
}

function MiniCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gift
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3 text-ink shadow-[0_20px_50px_rgba(42,36,51,0.25)]">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
        <Icon className="size-5" />
      </span>
      <span>
        <span className="block text-xs text-neutral-500">{label}</span>
        <span className="block text-lg font-semibold">{value}</span>
      </span>
    </div>
  )
}
