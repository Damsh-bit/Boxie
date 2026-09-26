'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useActionState, useState } from 'react'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/form'
import { ease, Spinner } from '@/ui/motion'
import { activateAccount, type ActivateState } from './actions'

export function ActivateScreen({
  token,
  user,
  currentUserEmail,
}: {
  token: string
  user: {
    name: string
    email: string
    roleLabel: string
  }
  currentUserEmail?: string
}) {
  const [state, action, pending] = useActionState<ActivateState, FormData>(activateAccount, {
    error: null,
  })
  const [show, setShow] = useState(false)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-12 sm:px-8">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: ease.out }}
      >
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block" aria-label="Boxie">
            <span className="font-display text-3xl font-black tracking-tight text-ink">
              Boxie<span className="text-brand">.</span>
            </span>
          </Link>
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wider text-brand uppercase">
            <Sparkles className="size-3.5" />
            <span>Invitación al equipo</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">¡Hola, {user.name}!</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Te sumaron con el rol de <strong className="text-ink">{user.roleLabel}</strong>. Elegí
            una contraseña para activar tu acceso.
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-white/95 p-6 shadow-xl backdrop-blur-md sm:p-8">
          <form action={action} className="space-y-4">
            <input type="hidden" name="token" value={token} />

            {currentUserEmail && currentUserEmail.toLowerCase() !== user.email.toLowerCase() && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Tenés una sesión abierta como <strong>{currentUserEmail}</strong>. Al activar esta
                cuenta, entrarás automáticamente como <strong>{user.email}</strong>.
              </div>
            )}

            <div className="rounded-2xl bg-canvas p-3.5 text-xs text-neutral-600">
              <span className="font-medium text-neutral-500">Cuenta a activar:</span>{' '}
              <strong className="text-ink">{user.email}</strong>
            </div>

            <Field label="Nueva contraseña" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={show ? 'text' : 'password'}
                  required
                  minLength={8}
                  maxLength={200}
                  placeholder="Mínimo 8 caracteres"
                  className="pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-neutral-400 hover:text-ink"
                  aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'}
                  tabIndex={-1}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>

            <Field label="Confirmar contraseña" htmlFor="confirm">
              <Input
                id="confirm"
                name="confirm"
                type={show ? 'text' : 'password'}
                required
                minLength={8}
                maxLength={200}
                placeholder="Repetí tu contraseña"
              />
            </Field>

            {state.error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
                {state.error}
              </div>
            )}

            <Button
              type="submit"
              disabled={pending}
              className="mt-6 w-full py-3.5 text-base font-bold"
            >
              {pending ? (
                <>
                  <Spinner className="mr-2" />
                  Activando acceso...
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" />
                  Activar cuenta y entrar
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs text-neutral-400">
          ¿Ya tenés una cuenta activa?{' '}
          <Link href="/admin/login" className="font-medium text-ink hover:underline">
            Iniciá sesión acá
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
