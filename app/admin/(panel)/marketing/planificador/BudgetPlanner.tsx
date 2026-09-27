'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { formatARS, formatMultiple, formatNumber } from '@/domain/admin/format'
import { DEFAULT_ELASTICITY, optimalSpend, scenario, spendForSales } from '@/domain/marketing/tools'
import { cn } from '@/ui/cn'
import { Input } from '@/ui/form'
import { spring } from '@/ui/motion'
import { MoneyInput, Segmented } from '../../../_ui/fields'
import { LineChart } from '../../../_ui/charts'
import { SERIES } from '../../../_ui/palette'
import { Metric } from '../_ui/bits'

const pesos = (cents: number) => formatARS(Math.round(cents / 1000) * 1000)

/**
 * "¿Cuánto tengo que invertir para vender N?" y "¿qué pasa si invierto X?".
 * Parte del ritmo actual (inversión y CPA de los últimos 30 días) y supone
 * rendimientos decrecientes: cada peso extra consigue un poco menos.
 */
export function BudgetPlanner({
  baseSpendCents,
  baseCpaCents,
  organicSales,
  ticketCents,
  contributionPerSaleCents,
  fixedCents,
}: {
  /** Inversión de los últimos 30 días. */
  baseSpendCents: number
  /** CPA de la pauta de los últimos 30 días. */
  baseCpaCents: number
  /** Ventas por mes que llegan sin pauta. */
  organicSales: number
  ticketCents: number
  contributionPerSaleCents: number
  /** Gastos fijos del mes (sin la pauta). */
  fixedCents: number
}) {
  const [mode, setMode] = useState<'meta' | 'monto'>('meta')
  const [goal, setGoal] = useState(
    Math.round((organicSales + baseSpendCents / Math.max(baseCpaCents, 1)) * 1.3),
  )
  const [spend, setSpend] = useState(Math.round(baseSpendCents * 1.3))
  const [elasticity, setElasticity] = useState(DEFAULT_ELASTICITY)
  const base = { spendCents: Math.max(baseSpendCents, 1), cpaCents: Math.max(baseCpaCents, 1) }

  const needed =
    mode === 'meta' ? spendForSales(Math.max(goal - organicSales, 0), base, elasticity) : spend
  const chosen = needed ?? 0
  const result = scenario({
    spendCents: chosen,
    base,
    organicSales,
    ticketCents,
    contributionPerSaleCents,
    fixedCents,
    elasticity,
  })
  const current = scenario({
    spendCents: baseSpendCents,
    base,
    organicSales,
    ticketCents,
    contributionPerSaleCents,
    fixedCents,
    elasticity,
  })
  const best = optimalSpend({ base, contributionPerSaleCents, elasticity })
  const bestScenario = scenario({
    spendCents: best,
    base,
    organicSales,
    ticketCents,
    contributionPerSaleCents,
    fixedCents,
    elasticity,
  })

  const max = Math.max(best * 1.6, baseSpendCents * 3, chosen * 1.2, 1)
  const curve = Array.from({ length: 13 }, (_, i) => {
    const x = (max * i) / 12
    const s = scenario({
      spendCents: x,
      base,
      organicSales,
      ticketCents,
      contributionPerSaleCents,
      fixedCents,
      elasticity,
    })
    return { label: pesos(x), values: [s.resultCents] }
  })

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          id="planner-mode"
          size="sm"
          value={mode}
          onChange={(v) => setMode(v as 'meta' | 'monto')}
          options={[
            { value: 'meta', label: 'Quiero vender…' },
            { value: 'monto', label: 'Quiero invertir…' },
          ]}
        />
        <p className="text-xs text-neutral-500">
          Hoy: {pesos(baseSpendCents)} por mes en pauta, {pesos(baseCpaCents)} por venta,{' '}
          {formatNumber(Math.round(organicSales))} ventas sin pauta.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {mode === 'meta' ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Ventas en el mes</span>
            <Input
              type="number"
              min={1}
              inputMode="numeric"
              className="tabular-nums"
              value={goal}
              onChange={(e) => setGoal(Math.max(0, Math.round(Number(e.target.value || 0))))}
            />
          </label>
        ) : (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Inversión en pauta del mes
            </span>
            <MoneyInput cents={spend} onChange={(v) => setSpend(v ?? 0)} />
          </label>
        )}
        <label className="block">
          <span className="mb-1 flex items-baseline justify-between text-sm">
            <span className="font-medium text-ink">Cuánto rinde menos cada peso extra</span>
            <span className="text-xs text-neutral-500 tabular-nums">
              {elasticity.toLocaleString('es-AR', { maximumFractionDigits: 2 })}
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={0.8}
            step={0.05}
            value={elasticity}
            onChange={(e) => setElasticity(Number(e.target.value))}
            className="mt-2 w-full accent-brand"
          />
          <span className="block text-xs text-neutral-500">
            0 = cada peso rinde igual · 0,35 = típico · 0,8 = el público se agota rápido
          </span>
        </label>
      </div>

      <motion.div
        layout
        transition={spring.soft}
        className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Metric
          label={mode === 'meta' ? 'Inversión necesaria' : 'Inversión'}
          value={needed === null ? 'No alcanza' : pesos(chosen)}
          hint={`${formatNumber(Math.round(result.paidSales))} ventas por pauta`}
        />
        <Metric
          label="Costo por venta esperado"
          value={pesos(result.cpaCents)}
          hint={`hoy ${pesos(baseCpaCents)}`}
        />
        <Metric
          label="ROAS esperado"
          value={formatMultiple(result.roas)}
          hint={`facturación ${pesos(result.revenueCents)}`}
        />
        <div
          className={cn(
            'min-w-0 rounded-2xl px-4 py-3',
            result.resultCents >= current.resultCents ? 'bg-[#e7f6e7]' : 'bg-[#fdeaea]',
          )}
        >
          <p className="truncate text-xs font-medium text-neutral-600">Resultado del mes</p>
          <p
            className={cn(
              'mt-1 text-lg font-semibold',
              result.resultCents >= 0 ? 'text-good-ink' : 'text-critical',
            )}
          >
            {result.resultCents < 0 ? '− ' : ''}
            {pesos(Math.abs(result.resultCents))}
          </p>
          <p className="truncate text-[11px] text-neutral-600">
            {result.resultCents >= current.resultCents ? '+' : '−'}{' '}
            {pesos(Math.abs(result.resultCents - current.resultCents))} contra hoy
          </p>
        </div>
      </motion.div>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm font-semibold text-ink">Resultado del mes según la inversión</p>
        <p className="mb-4 text-xs text-neutral-500">
          Contribución de todas las ventas − pauta − gastos fijos. El punto más alto es la inversión
          que más deja: {pesos(best)} ({pesos(bestScenario.resultCents)} de resultado, CPA{' '}
          {pesos(bestScenario.cpaCents)}).
        </p>
        <LineChart
          ariaLabel="Resultado del mes según la inversión en pauta"
          format="ars"
          height={220}
          area={false}
          series={[{ name: 'Resultado del mes', color: SERIES[2] }]}
          data={curve}
        />
        <p className="mt-2 text-xs text-neutral-500">
          Es un modelo simple para decidir el orden de magnitud: probá subir de a 20 % y mirá cómo
          se mueve el CPA real.
        </p>
      </div>
    </div>
  )
}
