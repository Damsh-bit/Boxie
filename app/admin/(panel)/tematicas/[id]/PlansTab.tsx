'use client'

import { motion } from 'framer-motion'
import { Check, Crown, Gamepad2, Layers, Lock, PenLine, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'
import { formatARS } from '@/domain/admin/format'
import { minRankOf, type Plan } from '@/domain/plans'
import { parseThemeConfig } from '@/slides/config'
import { describePlanContents, planContents, withDefaultPlans } from '@/slides/plans'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'
import { Badge } from '../../../_ui/primitives'
import { definitionOf, isStructural, kindOf, SlideIcon, type EditorConfig } from './editor-state'

/**
 * Qué incluye cada plan en esta temática. Cada fila es una pantalla: tocar la
 * celda de un plan hace que la pantalla se incluya desde ese plan (y en todos
 * los de arriba). Las de apertura y cierre van siempre.
 */
export function PlansTab({
  config,
  onChange,
  plans,
  salesByPlan,
}: {
  config: EditorConfig
  onChange(config: EditorConfig): void
  plans: Plan[]
  salesByPlan: Record<string, number>
}) {
  const parsed = useMemo(() => parseThemeConfig(config), [config])
  const contents = useMemo(
    () => (parsed.success ? planContents(parsed.data, plans) : []),
    [parsed, plans],
  )

  const setPlan = (key: string, plan: string) =>
    onChange({
      ...config,
      slides: config.slides.map((s) => (s.key === key ? { ...s, plan } : s)),
    })

  const resetDefaults = () =>
    onChange({
      ...config,
      slides: withDefaultPlans(
        config.slides.map(({ plan: _plan, ...s }) => s),
        plans,
      ),
    })

  if (plans.length === 0)
    return (
      <p className="rounded-2xl bg-canvas p-6 text-sm text-neutral-600">
        No hay planes activos.{' '}
        <Link href="/admin/planes" className="font-semibold text-brand hover:underline">
          Creá uno
        </Link>{' '}
        para repartir las pantallas.
      </p>
    )

  return (
    <div>
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {plans.map((plan, i) => {
          const c = contents.find((x) => x.planSlug === plan.slug)
          return (
            <motion.div
              key={plan.id}
              className={cn(
                'relative rounded-2xl border bg-white p-4',
                plan.highlighted
                  ? 'border-brand/50 shadow-[0_10px_30px_rgba(244,78,99,0.12)]'
                  : 'border-line',
              )}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring.soft, delay: i * 0.06 }}
            >
              {plan.highlighted && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                  <Crown className="size-3" aria-hidden /> Más elegido
                </span>
              )}
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <span
                  className="size-2.5 rounded-full"
                  style={{ background: plan.color }}
                  aria-hidden
                />
                {plan.name}
              </p>
              <p className="mt-1 text-2xl font-semibold text-ink">{formatARS(plan.priceCents)}</p>
              <p className="mt-2 text-xs text-neutral-600">{c ? describePlanContents(c) : '—'}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {salesByPlan[plan.id] ?? 0} ventas de esta temática en 30 días
              </p>
            </motion.div>
          )
        })}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas/60">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-500"
              >
                Pantalla
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  scope="col"
                  className="w-28 px-2 py-3 text-center text-xs font-semibold text-neutral-600"
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {config.slides.map((slide) => {
              const def = definitionOf(slide)
              const kind = kindOf(slide)
              const structural = kind ? isStructural(kind) : false
              const minRank = structural ? Number.NEGATIVE_INFINITY : minRankOf(slide.plan, plans)
              return (
                <tr key={slide.key} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal">
                    <span className="flex items-center gap-2.5">
                      <SlideIcon slide={slide} className="size-4 shrink-0 text-neutral-400" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {def?.label ?? slide.kind}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs text-neutral-500">
                          <code className="font-mono">{slide.key}</code>
                          {def?.buyerSchema && (
                            <span className="inline-flex items-center gap-0.5 text-brand">
                              <PenLine className="size-3" aria-hidden /> módulo
                            </span>
                          )}
                          {def?.category === 'game' && kind !== 'connector.gamer' && (
                            <span className="inline-flex items-center gap-0.5 text-[#137a55]">
                              <Gamepad2 className="size-3" aria-hidden /> juego
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                  </th>
                  {plans.map((plan) => {
                    const included = plan.rank >= minRank
                    const isStart = !structural && plan.slug === (slide.plan ?? plans[0]?.slug)
                    return (
                      <td key={plan.id} className="px-2 py-2 text-center">
                        {structural ? (
                          <span
                            className="inline-grid size-9 place-items-center rounded-xl bg-canvas text-neutral-400"
                            title="Va en todos los planes"
                          >
                            <Lock className="size-3.5" aria-hidden />
                            <span className="sr-only">Incluida siempre</span>
                          </span>
                        ) : (
                          <motion.button
                            type="button"
                            onClick={() => setPlan(slide.key, plan.slug)}
                            className={cn(
                              'inline-grid size-9 place-items-center rounded-xl border transition-colors',
                              included
                                ? 'border-transparent bg-brand text-white'
                                : 'border-dashed border-neutral-300 text-transparent hover:border-brand/50 hover:text-brand/50',
                              isStart && 'ring-2 ring-brand/30 ring-offset-2',
                            )}
                            whileTap={{ scale: 0.85 }}
                            animate={{ scale: included ? 1 : 0.92 }}
                            transition={spring.bouncy}
                            aria-pressed={included}
                            aria-label={`${def?.label ?? slide.key}: incluir desde ${plan.name}`}
                            title={`Incluir desde ${plan.name}`}
                          >
                            <Check className="size-4 stroke-[3]" aria-hidden />
                          </motion.button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-canvas/60">
              <th
                scope="row"
                className="px-4 py-3 text-left text-xs font-semibold text-neutral-600"
              >
                Total
              </th>
              {plans.map((plan) => {
                const c = contents.find((x) => x.planSlug === plan.slug)
                return (
                  <td key={plan.id} className="px-2 py-3 text-center">
                    <span className="block text-sm font-semibold text-ink">
                      {c?.screens ?? '—'}
                    </span>
                    <span className="block text-[11px] text-neutral-500">pantallas</span>
                  </td>
                )
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-500">
        <p className="flex items-center gap-2">
          <Badge tone="brand">
            <Layers className="size-3" aria-hidden /> Tip
          </Badge>
          El anillo marca desde qué plan entra cada pantalla. Los precios y beneficios de los planes
          se editan en Planes.
        </p>
        <Button size="sm" variant="secondary" onClick={resetDefaults}>
          <RotateCcw className="size-3.5" aria-hidden /> Reparto sugerido
        </Button>
      </div>
    </div>
  )
}
