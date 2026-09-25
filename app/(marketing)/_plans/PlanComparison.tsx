import { Check, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatARS } from '@/domain/money'
import { cn } from '@/ui/cn'
import { Reveal } from '@/ui/motion'
import type { PlanCardData } from './PlanCards'

/**
 * La comparación de los planes, pantalla por pantalla. Una tabla de verdad
 * (se lee bien con lector de pantalla): la primera columna queda fija y, si
 * hay muchos planes para el ancho del celular, la tabla se desliza.
 */

export interface ComparisonRow {
  key: string
  emoji?: string
  label: string
  /** Por plan (en el orden de `plans`): incluido, no incluido o un texto ("60 días"). */
  cells: (boolean | string)[]
}

export interface ComparisonGroup {
  title: string
  rows: ComparisonRow[]
}

export function PlanComparison({
  plans,
  groups,
  caption,
}: {
  plans: PlanCardData[]
  groups: ComparisonGroup[]
  caption: string
}) {
  return (
    <Reveal className="mx-auto max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_-30px_rgba(42,36,51,0.35)] ring-1 ring-black/5">
      <div className="overflow-x-auto overscroll-x-contain">
        <table
          className="w-full table-fixed border-collapse text-left text-[13px] sm:text-sm"
          // Hasta 3 planes entran en un celular; con más, la tabla se desliza.
          style={{ minWidth: plans.length > 3 ? `${9 + plans.length * 5}rem` : undefined }}
        >
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-black/5">
              <th
                scope="col"
                className="sticky left-0 z-10 w-[36%] bg-white px-3 py-4 text-[11px] font-bold tracking-wider text-ink/45 uppercase sm:w-[40%] sm:px-6 sm:text-xs"
              >
                Qué trae
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.slug}
                  scope="col"
                  className={cn(
                    'px-1.5 py-4 text-center align-bottom sm:px-3',
                    plan.highlighted && 'bg-brand-soft/70',
                  )}
                >
                  <span className="block font-display text-[13px] leading-tight font-bold hyphens-auto text-ink min-[400px]:text-[15px] sm:text-lg">
                    {plan.name}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-ink/60 tabular-nums sm:text-sm">
                    {formatARS(plan.priceCents)}
                  </span>
                  {plan.highlighted && (
                    <span className="mt-1 hidden rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase sm:inline-block">
                      Más elegido
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.title}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={plans.length + 1}
                  className="sticky left-0 bg-canvas px-3 py-2.5 text-[11px] font-extrabold tracking-[0.14em] text-ink/50 uppercase sm:px-6"
                >
                  {group.title}
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.key} className="border-t border-black/5">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-white px-3 py-3 font-medium text-ink sm:px-6"
                  >
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      {row.emoji && (
                        <span aria-hidden className="text-base">
                          {row.emoji}
                        </span>
                      )}
                      {row.label}
                    </span>
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={plans[i]!.slug}
                      className={cn(
                        'px-1 py-3 text-center sm:px-3',
                        plans[i]!.highlighted && 'bg-brand-soft/40',
                      )}
                    >
                      <Cell value={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </Reveal>
  )
}

function Cell({ value }: { value: boolean | string }): ReactNode {
  if (value === true)
    return (
      <span className="inline-grid size-6 place-items-center rounded-full bg-brand text-white">
        <Check className="size-3.5" strokeWidth={3.5} aria-hidden />
        <span className="sr-only">Incluido</span>
      </span>
    )
  if (value === false)
    return (
      <span className="inline-grid size-6 place-items-center text-ink/25">
        <Minus className="size-4" aria-hidden />
        <span className="sr-only">No incluido</span>
      </span>
    )
  return <span className="font-semibold text-ink tabular-nums">{value}</span>
}
