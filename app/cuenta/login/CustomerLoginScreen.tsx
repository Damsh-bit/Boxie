'use client'

import { motion } from 'framer-motion'
import { ArrowLeft, Gift, Mail, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { getBrowserSupabase } from '@/client/supabase'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/form'
import { Spinner } from '@/ui/motion'

export function CustomerLoginScreen({ nextUrl = '/cuenta' }: { nextUrl?: string }) {
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleLogin = async () => {
    try {
      setLoadingGoogle(true)
      setError(null)
      const supabase = getBrowserSupabase()
      const origin = window.location.origin

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (authError) throw authError
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message
      setError(message || 'No se pudo conectar con Google. Probá de nuevo.')
      setLoadingGoogle(false)
    }
  }

  const handleEmailMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    try {
      setLoadingEmail(true)
      setError(null)
      const supabase = getBrowserSupabase()
      const origin = window.location.origin

      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        },
      })

      if (authError) throw authError
      setMagicSent(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message
      setError(message || 'Error al enviar el link. Revisá tu email.')
    } finally {
      setLoadingEmail(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#FAF8F5] px-4 py-12 sm:px-6">
      {/* Círculos decorativos de fondo */}
      <div className="pointer-events-none absolute -top-40 -left-40 size-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 size-96 rounded-full bg-amber-400/10 blur-3xl" />

      {/* Volver al inicio */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-500 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Volver a Boxie
        </Link>
      </div>

      <motion.div
        className="w-full max-w-md rounded-3xl border border-line/80 bg-white p-8 shadow-xl shadow-ink/5 sm:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo e Icono */}
        <div className="text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/30">
            <Gift className="size-8" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Mi Cuenta Boxie
          </h1>
          <p className="mt-2 text-sm text-neutral-600">
            Ingresá para ver tus Boxies compradas, editar tu regalo y saber cuándo lo abrieron.
          </p>
        </div>

        {error && (
          <motion.div
            className="mt-6 rounded-2xl bg-rose-50 p-4 text-xs font-medium text-rose-700"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Botón Principal: Google OAuth */}
        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loadingGoogle || loadingEmail}
            className="group relative flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-300 bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-sm transition-all hover:border-neutral-400 hover:bg-neutral-50 active:scale-[0.99] disabled:opacity-50"
          >
            {loadingGoogle ? (
              <>
                <Spinner className="size-5 text-neutral-600" />
                <span>Conectando con Google…</span>
              </>
            ) : (
              <>
                {/* Google "G" oficial */}
                <svg className="size-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </>
            )}
          </button>

          {/* Divisor */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="w-full border-t border-line" />
            <span className="relative bg-white px-3 text-xs font-semibold text-neutral-400">
              o con tu email
            </span>
          </div>

          {/* Opción Email Magic Link */}
          {magicSent ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-emerald-900">
              <Mail className="mx-auto size-8 text-emerald-600" />
              <h3 className="mt-2 text-sm font-bold">¡Revisá tu correo!</h3>
              <p className="mt-1 text-xs text-emerald-700">
                Te enviamos un link de acceso seguro a <b>{email}</b>. Tocá el link para ingresar
                directamente.
              </p>
            </div>
          ) : (
            <form onSubmit={handleEmailMagicLink} className="space-y-3">
              <Field label="Correo electrónico de tu compra" htmlFor="email">
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loadingGoogle || loadingEmail}
                />
              </Field>
              <Button type="submit" block disabled={loadingGoogle || loadingEmail || !email}>
                {loadingEmail ? <Spinner className="size-4" /> : 'Recibir link de acceso'}
              </Button>
            </form>
          )}
        </div>

        {/* Nota de pie */}
        <div className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
          <Sparkles className="size-3.5 text-brand" />
          <span>Acceso seguro para compradores de Boxie</span>
        </div>
      </motion.div>
    </div>
  )
}
