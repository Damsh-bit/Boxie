'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import type { FinanceSettings } from '@/domain/admin/types'
import { formatARS, formatMultiple, formatPercent } from '@/domain/admin/format'
import {
  targetCpa,
  targetRoas,
  unitEconomics,
  type PlanMix,
  type UnitLine,
} from '@/domain/marketing/economics'
import { cn } from '@/ui/cn'
import { Select } from '@/ui/form'
import { ease } from '@/ui/motion'
import { Segmented } from '../../../_ui/fields'
import { SERIES } from '../../../_ui/palette'
import { Metric } from '../_ui/bits'

const pesos = (cents: number) => formatARS(Math.round(cents / 100) * 100)

export interface PlanOption {
  key: string
  label: string
  mix: PlanMix
}

export interface AcquisitionOption {
  key: string
  label: string
  cpaCents: number
  hint: string
}

/**
 * La anatomía de una venta: del precio de lista a lo que queda, línea por
 * línea, para un plan y una forma de conseguir la venta (la pauta combinada,
 * un canal, o sin publicidad). El margen objetivo se mueve en vivo.
 */
export function UnitExplorer({
  plans,
  acquisitions,
  settings,
  fixedPerSaleCents,
  targetMarginBps,
}: {
  plans: PlanOption[]
  acquisitions: AcquisitionOption[]
  settings: FinanceSettings
  fixedPerSaleCents: number
  targetMarginBps: number
}) {
  const [planKey, setPlanKey] = useState(plans[0]?.key ?? '')
  const [acqKey, setAcqKey] = useState(acquisitions[0]?.key ?? '')
  const [margin, setMargin] = useState(targetMarginBps)
  const plan = plans.find((p) => p.key === planKey) ?? plans[0]!
  const acq = acquisitions.find((a) => a.key === acqKey) ?? acquisitions[0]!
  const u = unitEconomics({
    listPriceCents: plan.mix.listPriceCents,
    discountRate: plan.mix.discountRate,
    affiliateCents: plan.mix.affiliateCents,
    settings,
    acquisitionCents: acq.cpaCents,
    fixedPerSaleCents,
  })
  const tCpa = targetCpa(u, margin)
  const tRoas = targetRoas(u, margin)

  return (
    <div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          id="unit-plan"
          size="sm"
          value={plan.key}
          onChange={setPlanKey}
          options={plans.map((p) => ({ value: p.key, label: p.label }))}
        />
        <Select
          value={acq.key}
          onChange={(e) => setAcqKey(e.target.value)}
          className="h-10 w-full rounded-full py-1 text-sm lg:w-80"
          aria-label="Cómo se consigue la venta"
        >
          {acquisitions.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label} · {pesos(a.cpaCents)} por venta
            </option>
          ))}
        </Select>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {plan.mix.sales
          ? `Promedio de ${plan.mix.sales} ventas del período. `
          : 'Sin ventas en el período: se usa el precio de lista. '}
        {acq.hint}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Waterfall lines={u.lines} base={u.chargedCents} max={plan.mix.listPriceCents} />
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Margen de contribución"
              value={formatPercent(u.contributionMargin)}
              hint={pesos(u.contributionCents)}
            />
            <Metric
              label="Ganancia por Boxie"
              value={pesos(u.profitCents)}
              hint={
                u.chargedCents
                  ? `${formatPercent(u.profitCents / u.chargedCents)} de lo cobrado`
                  : undefined
              }
            />
            <Metric
              label="CPA máximo"
              value={pesos(u.maxCpaCents)}
              hint="ahí la venta queda en cero"
            />
            <Metric
              label="ROAS de equilibrio"
              value={formatMultiple(u.breakEvenRoas, 2)}
              hint="debajo, la pauta pierde"
            />
            <Metric
              label="CPA objetivo"
              value={pesos(tCpa)}
              hint={`deja ${formatPercent(margin / 10_000, 0)} por venta`}
            />
            <Metric
              label="ROAS objetivo"
              value={formatMultiple(tRoas, 2)}
              hint="para dejar ese margen"
            />
          </div>
          <label className="block rounded-2xl border border-line p-4">
            <span className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-ink">Ganancia buscada por venta</span>
              <span className="text-xs text-neutral-500 tabular-nums">
                {formatPercent(margin / 10_000, 0)}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={Math.max(Math.floor(u.contributionMargin * 100) * 100, 500)}
              step={100}
              value={Math.min(margin, Math.max(Math.floor(u.contributionMargin * 100) * 100, 500))}
              onChange={(e) => setMargin(Number(e.target.value))}
              className="w-full accent-brand"
            />
            <span className="mt-1 block text-xs text-neutral-500">
              Probá: cuánto podés pagar por venta según cuánto querés ganar. El valor guardado se
              cambia en Supuestos.
            </span>
          </label>
        </div>
      </div>
    </div>
  )
}

/**
 * Cascada horizontal: cada costo es un tramo que "come" parte del precio,
 * y los subtotales vuelven a la base. Se ve de un vistazo a dónde se va la
 * plata de una Boxie.
 */
function waterfallBars(lines: UnitLine[]) {
  const bars: { line: UnitLine; from: number; to: number }[] = []
  let running = 0
  for (const line of lines) {
    if (line.kind === 'minus') {
      const to = running
      running += line.cents
      bars.push({ line, from: Math.max(running, 0), to: Math.max(to, 0) })
    } else {
      running = line.cents
      bars.push({ line, from: Math.min(0, line.cents), to: Math.max(0, line.cents) })
    }
  }
  return bars
}

function Waterfall({ lines, base, max }: { lines: UnitLine[]; base: number; max: number }) {
  const top = Math.max(max, 1)
  const bars = waterfallBars(lines)
  return (
    <ol className="space-y-1.5" aria-label="De precio de lista a resultado por Boxie">
      {bars.map(({ line, from, to }, i) => {
        const strong = line.kind !== 'minus'
        const color =
          line.kind === 'result'
            ? line.cents >= 0
              ? 'var(--color-good)'
              : 'var(--color-critical)'
            : line.kind === 'minus'
              ? SERIES[1]
              : SERIES[0]
        return (
          <motion.li
            key={line.key}
            className={cn(
              'grid grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-1.5',
              strong && 'bg-canvas',
              line.kind === 'result' && 'bg-ink text-white',
            )}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: ease.out, delay: 0.04 * i }}
            title={line.hint}
          >
            <span
              className={cn(
                'truncate text-sm',
                strong ? 'font-semibold' : 'text-neutral-600',
                line.kind === 'result' && 'text-white',
              )}
            >
              {line.label}
            </span>
            <span className="relative h-3" aria-hidden>
              <span
                className={cn(
                  'absolute inset-0 rounded-full',
                  line.kind === 'result' ? 'bg-white/10' : 'bg-white',
                )}
              />
              <motion.span
                className="absolute inset-y-0 rounded-[4px]"
                style={{
                  left: `${(Math.max(from, 0) / top) * 100}%`,
                  background: color,
                  opacity: line.kind === 'minus' ? 0.55 : 1,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${(Math.abs(to - from) / top) * 100}%` }}
                transition={{ duration: 0.7, ease: ease.out, delay: 0.1 + 0.05 * i }}
              />
            </span>
            <span className="text-right tabular-nums">
              <span className={cn('block text-sm', strong && 'font-semibold')}>
                {line.cents < 0 ? '− ' : ''}
                {pesos(Math.abs(line.cents))}
              </span>
              {base > 0 && line.key !== 'list' && (
                <span
                  className={cn(
                    'block text-[11px]',
                    line.kind === 'result' ? 'text-white/60' : 'text-neutral-400',
                  )}
                >
                  {formatPercent(Math.abs(line.cents) / base)}
                </span>
              )}
            </span>
          </motion.li>
        )
      })}
    </ol>
  )
}
