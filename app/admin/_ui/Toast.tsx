'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'

/**
 * Avisos del panel ("Cupón guardado", "No se pudo publicar"). Entran desde
 * abajo a la derecha, se apilan y se van solos; los errores duran más.
 */

type Tone = 'success' | 'error' | 'info'

interface Toast {
  id: number
  tone: Tone
  title: string
  detail?: string
}

interface ToastApi {
  success(title: string, detail?: string): void
  error(title: string, detail?: string): void
  info(title: string, detail?: string): void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const api = useContext(ToastContext)
  if (!api) throw new Error('useToast fuera de <ToastProvider>')
  return api
}

const ICON = { success: CircleCheck, error: CircleAlert, info: Info }
const TONE = {
  success: 'text-good-ink',
  error: 'text-critical',
  info: 'text-series-2',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const next = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (tone: Tone, title: string, detail?: string) => {
      const id = next.current++
      setToasts((list) => [...list.slice(-3), { id, tone, title, detail }])
      setTimeout(() => dismiss(id), tone === 'error' ? 7000 : 3800)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (t, d) => push('success', t, d),
      error: (t, d) => push('error', t, d),
      info: (t, d) => push('info', t, d),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed right-4 bottom-4 z-[200] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2"
        aria-live="polite"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = ICON[toast.tone]
            return (
              <motion.div
                key={toast.id}
                layout
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-line bg-white p-4 shadow-[0_12px_40px_rgba(42,36,51,0.14)]"
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
                transition={spring.snappy}
              >
                <Icon className={cn('mt-0.5 size-5 shrink-0', TONE[toast.tone])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink">{toast.title}</p>
                  {toast.detail && (
                    <p className="mt-0.5 text-sm text-neutral-600">{toast.detail}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="-m-1 grid size-7 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-ink"
                  aria-label="Cerrar aviso"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
