'use client'

import { motion } from 'framer-motion'
import { formatARS, formatMultiple, formatPercent } from '@/domain/admin/format'
import { cn } from '@/ui/cn'
import { ease } from '@/ui/motion'

const pesos = (cents: number) => formatARS(Math.round(cents / 100) * 100)

/**
 * Dónde cae el costo por venta: la franja hasta el CPA objetivo es "gana lo
 * buscado", hasta el máximo "gana menos", y después "pierde". La aguja es el
 * CPA del período. Las zonas llevan su rótulo (el color no va solo).
 */
export function CpaGauge({
  cpaCents,
  targetCents,
  maxCents,
}: {
  cpaCents: number | null
  targetCents: number
  maxCents: number
}) {
  const top = Math.max(maxCents * 1.3, (cpaCents ?? 0) * 1.1, 1)
  const at = (v: number) => `${Math.min(Math.max(v / top, 0), 1) * 100}%`
  const zone =
    cpaCents === null
      ? null
      : cpaCents <= targetCents
        ? { label: 'Cumple el objetivo', className: 'text-good-ink' }
        : cpaCents <= maxCents
          ? { label: 'Gana, pero menos que el objetivo', className: 'text-[#8a6300]' }
          : { label: 'Pierde plata en cada venta', className: 'text-critical' }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-3xl font-semibold text-ink">
          {cpaCents === null ? '—' : pesos(cpaCents)}
        </p>
        {zone && (
          <p className={cn('text-right text-sm font-semibold', zone.className)}>{zone.label}</p>
        )}
      </div>
      <p className="text-xs text-neutral-500">Costo por venta de la pauta en el período</p>
      <div className="relative mt-8 mb-9">
        <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
          <span className="h-full bg-[#cdeccd]" style={{ width: at(targetCents) }} />
          <span className="h-full w-[2px] bg-white" />
          <span
            className="h-full bg-[#fde9b5]"
            style={{ width: `calc(${at(maxCents)} - ${at(targetCents)} - 2px)` }}
          />
          <span className="h-full w-[2px] bg-white" />
          <span className="h-full flex-1 bg-[#f8d0d0]" />
        </div>
        {[
          { v: targetCents, label: `Objetivo ${pesos(targetCents)}` },
          { v: maxCents, label: `Máximo ${pesos(maxCents)}` },
        ].map((m, i) => (
          <span
            key={m.label}
            className={cn(
              'absolute top-4 text-[11px] whitespace-nowrap text-neutral-500',
              i === 0 ? '-translate-x-full pr-1 text-right' : 'pl-1',
            )}
            style={{ left: at(m.v) }}
          >
            {m.label}
          </span>
        ))}
        {cpaCents !== null && (
          <motion.span
            className="absolute -top-2 grid -translate-x-1/2 place-items-center"
            initial={{ left: '0%', opacity: 0 }}
            animate={{ left: at(cpaCents), opacity: 1 }}
            transition={{ duration: 1, ease: ease.out, delay: 0.2 }}
            aria-hidden
          >
            <span className="size-7 rounded-full border-[3px] border-white bg-ink shadow-md" />
          </motion.span>
        )}
      </div>
    </div>
  )
}

/** Ritmo de gasto del mes: lo gastado contra el presupuesto y dónde debería estar hoy. */
export function PacingBar({
  spentCents,
  budgetCents,
  expectedCents,
  projectedCents,
  dayOfMonth,
  daysInMonth,
}: {
  spentCents: number
  budgetCents: number
  expectedCents: number
  projectedCents: number
  dayOfMonth: number
  daysInMonth: number
}) {
  if (budgetCents <= 0)
    return (
      <p className="text-sm text-neutral-600">
        Sin presupuesto cargado. Definilo en <span className="font-semibold">Supuestos</span> para
        ver si el mes viene gastando de más o de menos. Van {pesos(spentCents)} invertidos este mes.
      </p>
    )
  const ratio = spentCents / budgetCents
  const expected = expectedCents / budgetCents
  const projected = projectedCents / budgetCents
  const status =
    projected > 1.1
      ? { label: 'Se pasa del presupuesto', className: 'text-[#8a6300]' }
      : projected < 0.8
        ? { label: 'Queda presupuesto sin usar', className: 'text-series-2' }
        : { label: 'En ritmo', className: 'text-good-ink' }
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-2xl font-semibold text-ink">
          {pesos(spentCents)}{' '}
          <span className="text-sm font-normal text-neutral-500">de {pesos(budgetCents)}</span>
        </p>
        <p className={cn('text-sm font-semibold', status.className)}>{status.label}</p>
      </div>
      <div className="relative mt-4 h-3 rounded-full bg-brand-soft">
        <motion.div
          className="h-full rounded-full bg-brand"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(ratio, 1) * 100}%` }}
          transition={{ duration: 0.9, ease: ease.out, delay: 0.15 }}
        />
        <span
          className="absolute -top-1 h-5 w-[2px] rounded-full bg-ink"
          style={{ left: `${Math.min(expected, 1) * 100}%` }}
          title="Lo que se debería llevar gastado a hoy"
          aria-hidden
        />
      </div>
      <div className="mt-2 flex justify-between gap-3 text-xs text-neutral-500">
        <span>
          Día {dayOfMonth} de {daysInMonth} · a hoy corresponde {pesos(expectedCents)}
        </span>
        <span className="text-right">
          Proyección {pesos(projectedCents)} ({formatPercent(projected, 0)})
        </span>
      </div>
    </div>
  )
}

/** Una línea "rótulo · valor" con una comparación a la derecha. */
export function RatioLine({
  label,
  value,
  reference,
  referenceLabel,
  goodWhenAbove = true,
}: {
  label: string
  value: number | null
  reference: number | null
  referenceLabel: string
  goodWhenAbove?: boolean
}) {
  const good =
    value === null || reference === null
      ? null
      : goodWhenAbove
        ? value >= reference
        : value <= reference
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2 text-sm">
      <span className="text-neutral-600">{label}</span>
      <span className="text-right">
        <span className="font-semibold text-ink tabular-nums">{formatMultiple(value)}</span>
        <span
          className={cn(
            'ml-2 text-xs',
            good === null ? 'text-neutral-500' : good ? 'text-good-ink' : 'text-critical',
          )}
        >
          {referenceLabel} {formatMultiple(reference)}
        </span>
      </span>
    </div>
  )
}
