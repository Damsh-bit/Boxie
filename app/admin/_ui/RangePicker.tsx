'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CalendarDays, Check, ChevronDown } from 'lucide-react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react'
import { RANGE_PRESETS, type RangePreset } from '@/domain/admin/range'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Input } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'

/**
 * El período de las páginas de análisis vive en la URL (?periodo=30d o
 * ?desde=…&hasta=…): se puede compartir y el servidor recalcula todo con el
 * mismo corte. Mientras llegan los datos nuevos, el contenido queda a media
 * opacidad (sin esqueletos ni saltos).
 */

const Pending = createContext<{ pending: boolean; go(url: string): void } | null>(null)

export function RangeScope({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  return (
    <Pending.Provider
      value={{ pending, go: (url) => start(() => router.replace(url as Route, { scroll: false })) }}
    >
      {children}
    </Pending.Provider>
  )
}

export function RangeContent({ children }: { children: ReactNode }) {
  const ctx = useContext(Pending)
  return (
    <motion.div
      animate={{ opacity: ctx?.pending ? 0.55 : 1 }}
      transition={{ duration: 0.2 }}
      aria-busy={ctx?.pending || undefined}
    >
      {children}
    </motion.div>
  )
}

export function RangePicker({
  preset,
  label,
  from,
  to,
}: {
  preset: RangePreset
  label: string
  /** Días de calendario del rango actual (para el personalizado). */
  from: string
  to: string
}) {
  const ctx = useContext(Pending)
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState({ from, to })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const navigate = (update: (p: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString())
    next.delete('periodo')
    next.delete('desde')
    next.delete('hasta')
    next.delete('pagina')
    update(next)
    const url = `${pathname}${next.size ? `?${next}` : ''}`
    setOpen(false)
    if (ctx) ctx.go(url)
    else router.replace(url as Route, { scroll: false })
  }

  return (
    <div ref={ref} className="relative">
      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(42,36,51,0.04)] transition-colors hover:border-neutral-300"
        whileTap={{ scale: 0.97 }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {ctx?.pending ? (
          <Spinner className="size-4 text-brand" />
        ) : (
          <CalendarDays className="size-4 text-brand" aria-hidden />
        )}
        {label}
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={spring.snappy}>
          <ChevronDown className="size-4 text-neutral-400" aria-hidden />
        </motion.span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            className="absolute right-0 z-40 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-line bg-white p-1.5 shadow-[0_20px_50px_rgba(42,36,51,0.16)]"
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12 } }}
            transition={spring.snappy}
          >
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                role="menuitemradio"
                aria-checked={preset === p.value}
                onClick={() => navigate((n) => n.set('periodo', p.value))}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-canvas',
                  preset === p.value ? 'font-semibold text-ink' : 'text-neutral-700',
                )}
              >
                {p.label}
                {preset === p.value && (
                  <Check className="size-4 stroke-[3] text-brand" aria-hidden />
                )}
              </button>
            ))}
            <form
              className="mt-1.5 border-t border-line px-2 pt-3 pb-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (custom.from && custom.to && custom.from <= custom.to)
                  navigate((n) => {
                    n.set('desde', custom.from)
                    n.set('hasta', custom.to)
                  })
              }}
            >
              <p className="mb-2 text-xs font-semibold text-neutral-500">Rango personalizado</p>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={custom.from}
                  onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                  className="h-10 px-2 py-1 text-sm"
                  aria-label="Desde"
                />
                <Input
                  type="date"
                  value={custom.to}
                  onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                  className="h-10 px-2 py-1 text-sm"
                  aria-label="Hasta"
                />
              </div>
              <Button type="submit" size="sm" variant="dark" block className="mt-2">
                Aplicar
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
