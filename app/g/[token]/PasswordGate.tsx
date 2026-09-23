'use client'

import { LockKeyhole } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/ui/Button'
import { Input, Label } from '@/ui/form'
import { unlockGiftAction } from './actions'

/** Solo si el comprador le puso clave al regalo (es opcional). */
export function PasswordGate({ token, recipientName }: { token: string; recipientName: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setError(null)
    const result = await unlockGiftAction(token, password).catch(() => ({
      ok: false as const,
      error: 'Sin conexión. Probá de nuevo.',
    }))
    if (result.ok) {
      router.refresh()
      return
    }
    setBusy(false)
    setError(result.error)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#ffd6de_0%,#2a2433_70%)] px-5">
      <form
        className="w-full max-w-sm rounded-[30px] bg-white p-8 text-center shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault()
          if (password.trim()) void submit()
        }}
      >
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-brand-soft text-brand">
          <LockKeyhole className="size-8" aria-hidden />
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">
          {recipientName ? `¡Hola, ${recipientName}!` : '¡Hola!'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          Te prepararon un regalo con clave. Escribila para abrirlo.
        </p>
        <div className="mt-6 text-left">
          <Label htmlFor="clave">Clave</Label>
          <Input
            id="clave"
            type="password"
            autoComplete="off"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={error ? true : undefined}
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <Button type="submit" size="lg" block className="mt-6" disabled={busy || !password.trim()}>
          {busy ? 'Abriendo…' : 'Abrir mi regalo 🎁'}
        </Button>
      </form>
    </div>
  )
}
