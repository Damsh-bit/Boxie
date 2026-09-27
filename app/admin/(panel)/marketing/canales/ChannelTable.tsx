'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  formatCompactARS,
  formatMultiple,
  formatNumber,
  formatPercent,
} from '@/domain/admin/format'
import { CHANNEL_KIND_LABEL, channelInfo, type ChannelId } from '@/domain/marketing/channels'
import type { Verdict } from '@/domain/marketing/performance'
import { cn } from '@/ui/cn'
import { ChannelTag, VerdictBadge } from '../_ui/bits'

export interface ChannelTableRow {
  channel: ChannelId
  sessions: number
  cvr: number | null
  sales: number
  newCustomers: number
  revenueCents: number
  spendCents: number
  cpaCents: number | null
  cacCents: number | null
  roas: number | null
  poas: number | null
  profitCents: number
  contributionCents: number
  verdict: Verdict
}

type Key = keyof Omit<ChannelTableRow, 'channel' | 'verdict'>

const COLUMNS: { key: Key; label: string; hint: string; format(r: ChannelTableRow): string }[] = [
  {
    key: 'sessions',
    label: 'Visitas',
    hint: 'Visitas medidas en la tienda',
    format: (r) => formatNumber(r.sessions),
  },
  {
    key: 'cvr',
    label: 'Conv.',
    hint: 'Ventas ÷ visitas',
    format: (r) => (r.cvr === null ? '—' : formatPercent(r.cvr, 2)),
  },
  {
    key: 'sales',
    label: 'Ventas',
    hint: 'Ventas atribuidas con el modelo elegido',
    format: (r) => formatNumber(Math.round(r.sales)),
  },
  {
    key: 'newCustomers',
    label: 'Nuevos',
    hint: 'Primera compra de ese mail',
    format: (r) => formatNumber(Math.round(r.newCustomers)),
  },
  {
    key: 'revenueCents',
    label: 'Facturación',
    hint: 'Lo cobrado por esas ventas',
    format: (r) => formatCompactARS(r.revenueCents),
  },
  {
    key: 'spendCents',
    label: 'Inversión',
    hint: 'Pauta cargada en sus campañas',
    format: (r) => (r.spendCents ? formatCompactARS(r.spendCents) : '—'),
  },
  {
    key: 'cpaCents',
    label: 'CPA',
    hint: 'Inversión ÷ ventas',
    format: (r) => (r.cpaCents === null ? '—' : formatCompactARS(r.cpaCents)),
  },
  {
    key: 'cacCents',
    label: 'CAC',
    hint: 'Inversión ÷ clientes nuevos',
    format: (r) => (r.cacCents === null ? '—' : formatCompactARS(r.cacCents)),
  },
  {
    key: 'roas',
    label: 'ROAS',
    hint: 'Facturación ÷ inversión',
    format: (r) => formatMultiple(r.roas),
  },
  {
    key: 'poas',
    label: 'POAS',
    hint: 'Contribución ÷ inversión: cuánto deja cada peso',
    format: (r) => formatMultiple(r.poas),
  },
  {
    key: 'profitCents',
    label: 'Ganancia',
    hint: 'Contribución de sus ventas − inversión',
    format: (r) => formatCompactARS(r.profitCents),
  },
]

/** Todos los canales con sus números; se ordena tocando el encabezado. */
export function ChannelTable({ rows }: { rows: ChannelTableRow[] }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: 'revenueCents', desc: true })
  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const va = a[sort.key] ?? -Infinity
        const vb = b[sort.key] ?? -Infinity
        return sort.desc ? vb - va : va - vb
      }),
    [rows, sort],
  )
  const total = rows.reduce(
    (t, r) => ({
      sessions: t.sessions + r.sessions,
      sales: t.sales + r.sales,
      newCustomers: t.newCustomers + r.newCustomers,
      revenue: t.revenue + r.revenueCents,
      spend: t.spend + r.spendCents,
      contribution: t.contribution + r.contributionCents,
    }),
    { sessions: 0, sales: 0, newCustomers: 0, revenue: 0, spend: 0, contribution: 0 },
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1180px] text-sm">
        <thead>
          <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
            <th scope="col" className="sticky left-0 z-10 bg-[#fbf9fa] px-6 py-2.5 font-semibold">
              Canal
            </th>
            {COLUMNS.map((c) => {
              const active = sort.key === c.key
              return (
                <th
                  key={c.key}
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                  aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'}
                >
                  <button
                    type="button"
                    title={c.hint}
                    onClick={() =>
                      setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : true }))
                    }
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1 transition-colors hover:text-ink',
                      active && 'text-ink',
                    )}
                  >
                    {c.label}
                    {active &&
                      (sort.desc ? (
                        <ArrowDown className="size-3" aria-hidden />
                      ) : (
                        <ArrowUp className="size-3" aria-hidden />
                      ))}
                  </button>
                </th>
              )
            })}
            <th scope="col" className="px-6 py-2.5 font-semibold">
              Qué hacer
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.channel}
              className="border-b border-line transition-colors hover:bg-canvas/50"
            >
              <th
                scope="row"
                className="sticky left-0 z-10 bg-white px-6 py-2.5 text-left font-medium text-ink"
              >
                <ChannelTag channel={r.channel} />
                <span className="mt-0.5 block text-[11px] font-normal text-neutral-500">
                  {CHANNEL_KIND_LABEL[channelInfo(r.channel).kind]}
                </span>
              </th>
              {COLUMNS.map((c) => (
                <td
                  key={c.key}
                  className={cn(
                    'px-3 py-2.5 text-right tabular-nums',
                    (c.key === 'roas' || c.key === 'profitCents') && 'font-semibold text-ink',
                    c.key === 'profitCents' && r.profitCents < 0 && 'text-critical',
                  )}
                >
                  {c.format(r)}
                </td>
              ))}
              <td className="px-6 py-2.5">
                <VerdictBadge verdict={r.verdict} />
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-canvas/60 font-semibold text-ink">
            <th scope="row" className="sticky left-0 z-10 bg-[#fbf9fa] px-6 py-3 text-left">
              Total
            </th>
            <td className="px-3 py-3 text-right tabular-nums">{formatNumber(total.sessions)}</td>
            <td className="px-3 py-3 text-right tabular-nums">
              {total.sessions ? formatPercent(total.sales / total.sessions, 2) : '—'}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatNumber(Math.round(total.sales))}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatNumber(Math.round(total.newCustomers))}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">{formatCompactARS(total.revenue)}</td>
            <td className="px-3 py-3 text-right tabular-nums">{formatCompactARS(total.spend)}</td>
            <td className="px-3 py-3 text-right tabular-nums">
              {total.sales ? formatCompactARS(Math.round(total.spend / total.sales)) : '—'}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {total.newCustomers
                ? formatCompactARS(Math.round(total.spend / total.newCustomers))
                : '—'}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatMultiple(total.spend ? total.revenue / total.spend : null)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatMultiple(total.spend ? total.contribution / total.spend : null)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums">
              {formatCompactARS(total.contribution - total.spend)}
            </td>
            <td className="px-6 py-3" />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
