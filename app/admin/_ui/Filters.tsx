'use client'

import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import type { Route } from 'next'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { Input } from '@/ui/form'
import { spring } from '@/ui/motion'

/**
 * Filtros de las listas del panel: viven en la URL (se comparten y el
 * servidor filtra y pagina). Cambiar un filtro vuelve a la página 1.
 */
export function useUrlParams() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, start] = useTransition()
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === '') next.delete(key)
      else next.set(key, value)
    }
    if (!('pagina' in updates)) next.delete('pagina')
    const url = `${pathname}${next.size ? `?${next}` : ''}`
    start(() => router.replace(url as Route, { scroll: false }))
  }
  return { params, set, pending }
}

export function SearchBox({ placeholder, param = 'q' }: { placeholder: string; param?: string }) {
  const { params, set, pending } = useUrlParams()
  const current = params.get(param) ?? ''
  const [value, setValue] = useState(current)
  const [lastCurrent, setLastCurrent] = useState(current)
  if (current !== lastCurrent) {
    setLastCurrent(current)
    setValue(current)
  }
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <div className="relative w-full sm:w-80">
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => {
          const next = e.target.value
          setValue(next)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => set({ [param]: next.trim() || null }), 350)
        }}
        placeholder={placeholder}
        className={cn('h-10 rounded-full bg-white py-2 pr-10 pl-10', pending && 'opacity-70')}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('')
            set({ [param]: null })
          }}
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-ink"
          aria-label="Borrar búsqueda"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

export function FilterSelect({
  param,
  label,
  options,
  allLabel = 'Todos',
}: {
  param: string
  label: string
  options: { value: string; label: string }[]
  allLabel?: string
}) {
  const { params, set } = useUrlParams()
  const value = params.get(param) ?? ''
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => set({ [param]: e.target.value || null })}
        className={cn(
          'h-10 cursor-pointer appearance-none rounded-full border bg-white pr-9 pl-4 text-sm font-medium transition-colors outline-none hover:border-neutral-300 focus:border-brand',
          value ? 'border-brand/40 text-ink' : 'border-line text-neutral-600',
        )}
      >
        <option value="">
          {label}: {allLabel}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {label}: {o.label}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute top-1/2 right-3.5 size-3.5 -translate-y-1/2 text-neutral-400"
        viewBox="0 0 16 16"
        aria-hidden
      >
        <path
          d="M4 6l4 4 4-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </label>
  )
}

/** Pestañas de estado que filtran por un parámetro (con el conteo de cada una). */
export function StatusTabs({
  param,
  options,
  id,
}: {
  param: string
  id: string
  options: { value: string; label: string; count?: number }[]
}) {
  const { params, set } = useUrlParams()
  const value = params.get(param) ?? ''
  return (
    <div className="flex w-fit max-w-full [scrollbar-width:none] gap-1 overflow-x-auto rounded-full border border-line bg-white p-1">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value || 'all'}
            type="button"
            onClick={() => set({ [param]: o.value || null })}
            className={cn(
              'relative h-8 shrink-0 rounded-full px-3.5 text-sm font-semibold transition-colors',
              active ? 'text-white' : 'text-neutral-600 hover:text-ink',
            )}
            aria-pressed={active}
          >
            {active && (
              <motion.span
                layoutId={`tabs-${id}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={spring.snappy}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.label}
              {o.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] tabular-nums',
                    active ? 'bg-white/20' : 'bg-canvas text-neutral-500',
                  )}
                >
                  {o.count.toLocaleString('es-AR')}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Pagination({
  page,
  pages,
  total,
  label,
}: {
  page: number
  pages: number
  total: number
  label: string
}) {
  const { set, pending } = useUrlParams()
  if (pages <= 1)
    return (
      <p className="px-6 py-4 text-sm text-neutral-500">
        {total.toLocaleString('es-AR')} {label}
      </p>
    )
  const go = (p: number) => set({ pagina: p === 1 ? null : String(p) })
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-4 text-sm">
      <p className="text-neutral-500">
        Página {page} de {pages} · {total.toLocaleString('es-AR')} {label}
      </p>
      <div className={cn('flex gap-1', pending && 'opacity-60')}>
        <PageButton disabled={page <= 1} onClick={() => go(page - 1)} label="Anterior">
          <ChevronLeft className="size-4" aria-hidden />
        </PageButton>
        <PageButton disabled={page >= pages} onClick={() => go(page + 1)} label="Siguiente">
          <ChevronRight className="size-4" aria-hidden />
        </PageButton>
      </div>
    </div>
  )
}

function PageButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean
  onClick(): void
  label: string
  children: ReactNode
}) {
  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="grid size-9 place-items-center rounded-full border border-line bg-white text-ink transition-colors hover:border-neutral-300 disabled:opacity-40"
      whileTap={disabled ? undefined : { scale: 0.9 }}
      aria-label={label}
    >
      {children}
    </motion.button>
  )
}
