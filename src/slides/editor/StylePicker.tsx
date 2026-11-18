'use client'

import { motion } from 'framer-motion'
import { Check, Shuffle, Wand2 } from 'lucide-react'
import { cn } from '@/ui/cn'
import { STYLE_FIELD, type StyleAxis, type StyleOption } from '../styles'
import type { EditorDraft } from './draft'

/**
 * Las opciones de estilo en el globo del editor directo
 * (docs/PLAN-VARIACIONES.md): cada pieza muestra las suyas debajo de sus
 * campos (la torta, sus sabores y velas) y el lápiz de la pantalla, las que
 * son de toda la pantalla (colores, tipografía, decoración). El cambio se ve
 * en vivo en el diseño.
 */

export type OfferedAxis = StyleAxis & { options: StyleOption[] }

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

/** Las opciones de un eje, como tarjetas para elegir una. */
export function StyleSection({
  axis,
  value,
  onChange,
  onApplyAll,
  first = false,
}: {
  axis: OfferedAxis
  value: string
  onChange(value: string): void
  /** Solo en los ejes que valen para todo el regalo (paleta, tipografía). */
  onApplyAll?: () => void
  /** Sin línea arriba (la primera del globo, si no hay campos antes). */
  first?: boolean
}) {
  return (
    <section className={cn(!first && 'mt-4 border-t border-neutral-100 pt-4')}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink">{axis.label}</h3>
        {onApplyAll && (
          <button
            type="button"
            onClick={onApplyAll}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand hover:bg-brand/10"
          >
            <Wand2 className="size-3.5" aria-hidden /> Usar en todo el regalo
          </button>
        )}
      </div>
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
                'flex items-center gap-2 rounded-2xl bg-white p-1.5 text-left text-[13px] leading-tight font-semibold ring-2 transition',
                on
                  ? 'text-ink ring-brand'
                  : 'text-neutral-600 ring-neutral-100 hover:ring-neutral-200',
              )}
            >
              <OptionMark option={option} />
              <span className="min-w-0 flex-1 break-words">{option.label}</span>
              {on && <Check className="size-4 shrink-0 text-brand" aria-hidden />}
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}

/** "Sorprendeme": elige otra combinación al azar para los ejes del globo. */
export function ShuffleButton({ onClick }: { onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/15"
    >
      <Shuffle className="size-4" aria-hidden /> Sorprendeme
    </button>
  )
}

/** La muestra de una opción: sus colores, su tipografía o su inicial. */
function OptionMark({ option }: { option: StyleOption }) {
  const box = 'size-8 shrink-0 rounded-lg'
  if (option.swatch) {
    return (
      <span
        className={cn(box, 'ring-1 ring-black/10')}
        style={{
          background: `linear-gradient(135deg, ${option.swatch[0]} 50%, ${option.swatch[1]} 50%)`,
        }}
        aria-hidden
      />
    )
  }
  return (
    <span
      className={cn(box, 'grid place-items-center bg-brand/10 text-sm font-bold text-brand')}
      style={option.font ? { fontFamily: option.font } : undefined}
      aria-hidden
    >
      {option.font ? 'Aa' : option.label.slice(0, 1)}
    </span>
  )
}
