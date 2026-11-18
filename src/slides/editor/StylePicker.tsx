'use client'

import { motion } from 'framer-motion'
import { Check, Palette, Shuffle, Sparkles, Type, Wand2 } from 'lucide-react'
import { cn } from '@/ui/cn'
import { STYLE_FIELD, type StyleAxis, type StyleOption } from '../styles'
import type { EditorDraft } from './draft'

/**
 * El selector de estilos del editor (docs/PLAN-VARIACIONES.md): una barra con
 * los ejes de la pantalla y, al tocar uno, sus opciones como tarjetas. El
 * cambio se ve en vivo en el diseño.
 */

export const STYLE_PATH_PREFIX = 'estilo:'

export function stylePath(axis: string): string {
  return `${STYLE_PATH_PREFIX}${axis}`
}

export function styleAxisOfPath(path: string): string | null {
  return path.startsWith(STYLE_PATH_PREFIX) ? path.slice(STYLE_PATH_PREFIX.length) : null
}

/** Lo elegido en una slide del borrador. */
export function draftStyle(draft: EditorDraft, slideKey: string): Record<string, string> {
  const raw = draft.slides[slideKey]?.[STYLE_FIELD]
  return raw && typeof raw === 'object' ? (raw as Record<string, string>) : {}
}

/** Copia del borrador con `axis` = `value` en las slides indicadas. */
export function withStyle(
  draft: EditorDraft,
  slideKeys: string[],
  axis: string,
  value: string,
): EditorDraft {
  const slides = { ...draft.slides }
  for (const key of slideKeys) {
    const current = slides[key] ?? {}
    slides[key] = { ...current, [STYLE_FIELD]: { ...draftStyle(draft, key), [axis]: value } }
  }
  return { ...draft, slides }
}

function axisIcon(axis: StyleAxis) {
  if (axis.key === 'paleta') return Palette
  if (axis.key === 'tipo') return Type
  return Sparkles
}

/** La barra de ejes de la pantalla. */
export function StyleBar({
  axes,
  value,
  onOpen,
  onShuffle,
}: {
  axes: (StyleAxis & { options: StyleOption[] })[]
  value: Record<string, string>
  onOpen(axis: string, el: Element): void
  onShuffle(): void
}) {
  if (!axes.length) return null
  return (
    <div className="mt-4 w-full" aria-label="Estilo de esta pantalla">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Estilo de esta pantalla
        </p>
        <button
          type="button"
          onClick={onShuffle}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
        >
          <Shuffle className="size-3.5" aria-hidden /> Sorprendeme
        </button>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {axes.map((axis) => {
          const current = axis.options.find((o) => o.value === value[axis.key]) ?? axis.options[0]!
          const Icon = axisIcon(axis)
          return (
            <motion.button
              key={axis.key}
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={(e) => onOpen(axis.key, e.currentTarget)}
              className="flex min-w-0 items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-1.5 text-left shadow-sm ring-1 ring-neutral-200 transition hover:ring-brand/40"
            >
              <OptionMark option={current} size="sm" fallback={<Icon className="size-3.5" />} />
              <span className="min-w-0">
                <span className="block text-[11px] leading-tight font-semibold text-neutral-500">
                  {axis.label}
                </span>
                <span className="block truncate text-sm leading-tight font-bold text-ink">
                  {current.label}
                </span>
              </span>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}

/** Las opciones de un eje, para elegir una. */
export function StyleOptions({
  axis,
  value,
  onChange,
  onApplyAll,
  onDone,
}: {
  axis: StyleAxis & { options: StyleOption[] }
  value: string
  onChange(value: string): void
  /** Solo en los ejes que valen para todo el regalo (paleta, tipografía). */
  onApplyAll?: () => void
  onDone(): void
}) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={axis.label}>
        {axis.options.map((option) => {
          const on = option.value === value
          return (
            <motion.button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={on}
              whileTap={{ scale: 0.97 }}
              onClick={() => onChange(option.value)}
              className={cn(
                'flex items-center gap-2.5 rounded-2xl bg-white p-2 text-left text-sm font-semibold ring-2 transition',
                on
                  ? 'text-ink ring-brand'
                  : 'text-neutral-600 ring-neutral-100 hover:ring-neutral-200',
              )}
            >
              <OptionMark option={option} size="md" />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {on && <Check className="size-4 shrink-0 text-brand" aria-hidden />}
            </motion.button>
          )
        })}
      </div>
      {onApplyAll && (
        <button
          type="button"
          onClick={onApplyAll}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/15"
        >
          <Wand2 className="size-4" aria-hidden /> Usar en todo el regalo
        </button>
      )}
      <button
        type="button"
        onClick={onDone}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/90"
      >
        <Check className="size-4" aria-hidden /> Listo
      </button>
    </div>
  )
}

/** La muestra de una opción: sus colores, su tipografía o su inicial. */
function OptionMark({
  option,
  size,
  fallback,
}: {
  option: StyleOption
  size: 'sm' | 'md'
  fallback?: React.ReactNode
}) {
  const box = size === 'sm' ? 'size-7 rounded-full text-xs' : 'size-10 rounded-xl text-base'
  if (option.swatch) {
    return (
      <span
        className={cn('shrink-0 ring-1 ring-black/10', box)}
        style={{
          background: `linear-gradient(135deg, ${option.swatch[0]} 50%, ${option.swatch[1]} 50%)`,
        }}
        aria-hidden
      />
    )
  }
  return (
    <span
      className={cn('grid shrink-0 place-items-center bg-brand/10 font-bold text-brand', box)}
      style={option.font ? { fontFamily: option.font } : undefined}
      aria-hidden
    >
      {option.font ? 'Aa' : (fallback ?? option.label.slice(0, 1))}
    </span>
  )
}
