'use client'

import { AnimatePresence } from 'framer-motion'
import { CheckCircle2, KeyRound, Sparkles } from 'lucide-react'
import { useActionState } from 'react'
import { Button } from '@/ui/Button'
import { Field, Input } from '@/ui/form'
import { Modal } from '@/ui/Modal'
import { Notice, Spinner } from '@/ui/motion'
import { requestPasswordReset, type ResetPasswordState } from './actions'

interface ForgotPasswordModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  demo: boolean
  hint: { email: string; password: string } | null
  defaultEmail?: string
  onFillDemo?: () => void
}

export function ForgotPasswordModal({
  open,
  onOpenChange,
  demo,
  hint,
  defaultEmail = '',
  onFillDemo,
}: ForgotPasswordModalProps) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(
    requestPasswordReset,
    {
      error: null,
      success: false,
      message: null,
    },
  )

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Recuperar contraseña"
      description="Te enviaremos un enlace a tu correo para restablecer tu clave de acceso."
      icon={<KeyRound className="inline-block size-10 text-brand" aria-hidden />}
    >
      <div className="mt-6 space-y-5">
        {demo && (
          <div className="rounded-2xl border border-dashed border-[#c9a100]/50 bg-gold/10 p-4 text-sm text-[#5c4a00]">
            <p className="flex items-center gap-2 font-bold">
              <Sparkles className="size-4" aria-hidden /> Modo demo activo
            </p>
            <p className="mt-1 text-xs">
              La base de datos todavía no está conectada. Podés ingresar directamente con las
              credenciales de prueba:
            </p>
            {hint && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold">
                  {hint.email}
                </code>
                <code className="rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold">
                  {hint.password}
                </code>
                {onFillDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      onFillDemo()
                      onOpenChange(false)
                    }}
                    className="ml-auto rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-ink/85"
                  >
                    Usar credenciales
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {state.success ? (
          <div className="space-y-5 py-2">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                {state.isDemo ? 'Información de demostración' : '¡Correo enviado!'}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-emerald-800">{state.message}</p>
            </div>

            <Button type="button" block onClick={() => onOpenChange(false)}>
              Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <p className="text-xs text-neutral-600">
              Ingresá el mail con el que accedés al panel de administración:
            </p>

            <Field label="Mail de administrador" htmlFor="reset-email">
              <Input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={defaultEmail}
                placeholder="vos@ribbly.com.ar"
                aria-invalid={state.error ? true : undefined}
                autoFocus
              />
            </Field>

            <AnimatePresence initial={false}>
              {state.error && !pending && (
                <Notice.p
                  role="alert"
                  className="rounded-xl bg-[#fdeaea] px-4 py-3 text-xs font-medium text-[#a52a2a]"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  {state.error}
                </Notice.p>
              )}
            </AnimatePresence>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={pending}>
                {pending ? (
                  <>
                    <Spinner className="size-4" /> Enviando…
                  </>
                ) : (
                  'Enviar enlace'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
