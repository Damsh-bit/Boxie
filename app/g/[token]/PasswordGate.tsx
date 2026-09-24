'use client'

import { motion, useAnimationControls } from 'framer-motion'
import { LockKeyhole, LockKeyholeOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/ui/Button'
import { FieldMessage, Input, Label } from '@/ui/form'
import { ease, Spinner, spring } from '@/ui/motion'
import { unlockGiftAction } from './actions'

/** Solo si el comprador le puso clave al regalo (es opcional). */
export function PasswordGate({ token, recipientName }: { token: string; recipientName: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const card = useAnimationControls()

  async function submit() {
    setBusy(true)
    setError(null)
    const result = await unlockGiftAction(token, password).catch(() => ({
      ok: false as const,
      error: 'Sin conexión. Probá de nuevo.',
    }))
    if (result.ok) {
      setOpen(true)
      router.refresh()
      return
    }
    setBusy(false)
    setError(result.error)
    void card.start({ x: [0, -12, 12, -8, 8, -4, 0], transition: { duration: 0.45 } })
  }

  const Icon = open ? LockKeyholeOpen : LockKeyhole

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top,#ffd6de_0%,#2a2433_70%)] px-5">
      <motion.form
        className="w-full max-w-sm rounded-[30px] bg-white p-8 text-center shadow-2xl"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={spring.gentle}
        onSubmit={(e) => {
          e.preventDefault()
          if (password.trim()) void submit()
        }}
      >
        <motion.div animate={card}>
          <motion.div
            className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-brand-soft text-brand"
            initial={{ scale: 0, rotate: -30 }}
            animate={open ? { scale: [1, 1.2, 1], rotate: [0, -12, 0] } : { scale: 1, rotate: 0 }}
            transition={open ? { duration: 0.5 } : { ...spring.bouncy, delay: 0.2 }}
          >
            <Icon className="size-8" aria-hidden />
          </motion.div>
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
            <FieldMessage error={error} className="text-sm" />
          </div>
          <Button
            type="submit"
            size="lg"
            block
            className="mt-6"
            disabled={busy || !password.trim()}
          >
            {busy ? (
              <>
                <Spinner className="size-5" /> {open ? '¡Abriendo!' : 'Abriendo…'}
              </>
            ) : (
              'Abrir mi regalo 🎁'
            )}
          </Button>
          <motion.p
            className="mt-4 text-xs text-neutral-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.6, ease: ease.out }}
          >
            La clave te la pasó quien te hizo el regalo.
          </motion.p>
        </motion.div>
      </motion.form>
    </div>
  )
}
