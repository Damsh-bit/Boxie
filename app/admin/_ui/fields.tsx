'use client'

import { motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { Input } from '@/ui/form'
import { spring } from '@/ui/motion'

/** Interruptor (sí/no) con resorte. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  id,
}: {
  checked: boolean
  onChange(value: boolean): void
  label: string
  disabled?: boolean
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-neutral-300',
      )}
    >
      <motion.span
        className="size-6 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 20 : 0 }}
        transition={spring.snappy}
      />
    </button>
  )
}

/** Una fila "texto + interruptor" para formularios. */
export function SwitchRow({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: ReactNode
  hint?: ReactNode
  checked: boolean
  onChange(value: boolean): void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-line p-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>}
      </div>
      <Switch
        checked={checked}
        onChange={onChange}
        label={typeof label === 'string' ? label : 'Activar'}
        disabled={disabled}
      />
    </div>
  )
}

/** Monto en pesos (se guarda en centavos). */
export function MoneyInput({
  cents,
  onChange,
  id,
  invalid,
  placeholder,
  allowEmpty = false,
}: {
  cents: number | null
  onChange(cents: number | null): void
  id?: string
  invalid?: boolean
  placeholder?: string
  allowEmpty?: boolean
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-neutral-500">
        $
      </span>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="1"
        className="pl-8 tabular-nums"
        value={cents === null ? '' : cents / 100}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(e) => {
          const raw = e.target.value
          if (raw === '') onChange(allowEmpty ? null : 0)
          else onChange(Math.round(Number(raw) * 100))
        }}
      />
    </div>
  )
}

/** Porcentaje guardado en puntos básicos (6,29 % = 629). */
export function PercentInput({
  bps,
  onChange,
  id,
  invalid,
}: {
  bps: number
  onChange(bps: number): void
  id?: string
  invalid?: boolean
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        className="pr-9 tabular-nums"
        value={bps / 100}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(Math.round(Number(e.target.value || 0) * 100))}
      />
      <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-neutral-500">
        %
      </span>
    </div>
  )
}

/** Lista editable de textos cortos (beneficios de un plan, etiquetas). */
export function ListInput({
  values,
  onChange,
  placeholder,
  max = 8,
  maxLength = 80,
}: {
  values: string[]
  onChange(values: string[]): void
  placeholder?: string
  max?: number
  maxLength?: number
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const value = draft.trim()
    if (!value || values.length >= max) return
    onChange([...values, value])
    setDraft('')
  }
  return (
    <div>
      <ul className="space-y-2">
        {values.map((value, i) => (
          <motion.li
            key={`${value}-${i}`}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <Input
              value={value}
              maxLength={maxLength}
              onChange={(e) => onChange(values.map((v, j) => (j === i ? e.target.value : v)))}
              className="py-2"
            />
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="grid size-9 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-critical"
              aria-label={`Quitar "${value}"`}
            >
              <X className="size-4" aria-hidden />
            </button>
          </motion.li>
        ))}
      </ul>
      {values.length < max && (
        <div className="mt-2 flex items-center gap-2">
          <Input
            value={draft}
            maxLength={maxLength}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            className="py-2"
          />
          <button
            type="button"
            onClick={add}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-colors hover:bg-brand hover:text-white"
            aria-label="Agregar"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>
      )}
    </div>
  )
}

/** Segmentos (una opción entre pocas) con la marca que se desliza. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  id,
  size = 'md',
}: {
  value: T
  onChange(value: T): void
  options: { value: T; label: ReactNode; count?: number }[]
  id: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="radiogroup"
      className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-white p-1"
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative rounded-full font-semibold transition-colors',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm',
              active ? 'text-white' : 'text-neutral-600 hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-ink"
                transition={spring.snappy}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {option.label}
              {option.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[11px] tabular-nums',
                    active ? 'bg-white/20' : 'bg-canvas text-neutral-500',
                  )}
                >
                  {option.count}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
