'use client'

import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  CirclePause,
  CirclePlay,
  ClipboardPaste,
  Megaphone,
  Pencil,
  Plus,
  Search,
  TableProperties,
  Trash2,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  formatCompactARS,
  formatMultiple,
  formatNumber,
  formatPercent,
} from '@/domain/admin/format'
import { SPEND_CHANNELS, channelInfo, type ChannelId } from '@/domain/marketing/channels'
import type { CampaignInput } from '@/domain/marketing/inputs'
import type { CampaignRow, Verdict } from '@/domain/marketing/performance'
import type { SpendEntry } from '@/domain/marketing/types'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Input, Select } from '@/ui/form'
import { useConfirm } from '../../../_ui/Confirm'
import { Segmented } from '../../../_ui/fields'
import { Menu } from '../../../_ui/Menu'
import { EmptyState } from '../../../_ui/primitives'
import { useAdminAction } from '../../../_ui/use-action'
import { deleteCampaign, setCampaignStatus } from '../actions'
import { ChannelTag, StateBadge, VerdictBadge } from '../_ui/bits'
import { CampaignSheet, campaignToInput, emptyCampaign, type Option } from './CampaignSheet'
import { ImportSheet } from './ImportSheet'
import { SpendSheet } from './SpendSheet'

export type BoardRow = CampaignRow & { verdict: Verdict }

type StateFilter = 'todas' | 'activas' | 'pausadas' | 'terminadas' | 'borradores'

const FILTERS: Record<StateFilter, (r: BoardRow) => boolean> = {
  todas: () => true,
  activas: (r) => r.state === 'active' || r.state === 'scheduled',
  pausadas: (r) => r.state === 'paused',
  terminadas: (r) => r.state === 'ended',
  borradores: (r) => r.state === 'draft',
}

export function CampaignsBoard({
  rows,
  themes,
  coupons,
  recentSpend,
  initial,
  readOnly,
}: {
  rows: BoardRow[]
  themes: Option[]
  coupons: Option[]
  recentSpend: SpendEntry[]
  /** Abrir el alta con estos datos (desde el planificador o "Nueva campaña"). */
  initial: Partial<CampaignInput> | null
  readOnly: boolean
}) {
  const [editing, setEditing] = useState<CampaignInput | null>(() =>
    initial && !readOnly ? emptyCampaign(initial) : null,
  )
  const [spendFor, setSpendFor] = useState<string | null | undefined>(undefined)
  const [importing, setImporting] = useState(false)
  const [state, setState] = useState<StateFilter>('todas')
  const [channel, setChannel] = useState<ChannelId | ''>('')
  const [query, setQuery] = useState('')
  const confirm = useConfirm()
  const { run, pending } = useAdminAction()

  const options = rows.map((r) => ({ id: r.campaign.id, name: r.campaign.name }))
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(
      (r) =>
        FILTERS[state](r) &&
        (!channel || r.campaign.channel === channel) &&
        (!q || r.campaign.name.toLowerCase().includes(q) || r.campaign.utmCampaign.includes(q)),
    )
  }, [rows, state, channel, query])
  const counts = Object.fromEntries(
    (Object.keys(FILTERS) as StateFilter[]).map((k) => [k, rows.filter(FILTERS[k]).length]),
  ) as Record<StateFilter, number>

  return (
    <>
      <div className="flex flex-col gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            id="campaign-state"
            size="sm"
            value={state}
            onChange={(v) => setState(v as StateFilter)}
            options={(Object.keys(FILTERS) as StateFilter[]).map((k) => ({
              value: k,
              label: k[0]!.toUpperCase() + k.slice(1),
              count: counts[k],
            }))}
          />
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="white" onClick={() => setImporting(true)}>
                <ClipboardPaste className="size-4" aria-hidden /> Importar CSV
              </Button>
              <Button
                size="sm"
                variant="white"
                onClick={() => setSpendFor(null)}
                disabled={rows.length === 0}
              >
                <TableProperties className="size-4" aria-hidden /> Cargar resultados
              </Button>
              <Button size="sm" onClick={() => setEditing(emptyCampaign())}>
                <Plus className="size-4" aria-hidden /> Nueva campaña
              </Button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative w-full sm:w-80">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar campaña o utm_campaign…"
              className="h-10 rounded-full bg-white py-2 pl-10"
              aria-label="Buscar campaña"
            />
          </div>
          <Select
            value={channel}
            onChange={(e) => setChannel(e.target.value as ChannelId | '')}
            className="h-10 w-full rounded-full py-1 text-sm sm:w-56"
            aria-label="Canal"
          >
            <option value="">Todos los canales</option>
            {SPEND_CHANNELS.map((c) => (
              <option key={c} value={c}>
                {channelInfo(c).label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title={rows.length ? 'Ninguna campaña con esos filtros' : 'Todavía no hay campañas'}
          text={
            rows.length
              ? 'Probá con otro estado o canal.'
              : 'Creá una por cada campaña de Meta, Google o TikTok (o por creadora) para medir cuánto cuesta cada venta.'
          }
          action={
            !rows.length && !readOnly ? (
              <Button size="sm" onClick={() => setEditing(emptyCampaign())}>
                <Plus className="size-4" aria-hidden /> Nueva campaña
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1240px] text-sm" style={{ opacity: pending ? 0.6 : 1 }}>
            <thead>
              <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                <th scope="col" className="px-6 py-2.5 font-semibold">
                  Campaña
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Inversión
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                  title="Impresiones"
                >
                  Impr.
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                  title="Clics ÷ impresiones (flecha: últimos 7 días contra los 21 anteriores)"
                >
                  CTR
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                  title="Costo por clic"
                >
                  CPC
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                  title="Costo cada mil impresiones"
                >
                  CPM
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Visitas
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Ventas
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold"
                  title="Costo por venta"
                >
                  CPA
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  ROAS
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Qué hacer
                </th>
                <th scope="col" className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map((r, i) => {
                const c = r.campaign
                const pace = r.budgetCents > 0 ? r.spendCents / r.budgetCents : null
                return (
                  <motion.tr
                    key={c.id}
                    className="border-b border-line transition-colors last:border-0 hover:bg-canvas/50"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.025, 0.3) }}
                  >
                    <td className="max-w-80 px-6 py-3">
                      <Link
                        href={`/admin/marketing/campanas/${c.id}` as Route}
                        className="block truncate font-semibold text-ink hover:text-brand"
                      >
                        {c.name}
                      </Link>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                        <ChannelTag channel={c.channel} />
                        <StateBadge state={r.state} />
                        <code className="truncate font-mono text-[11px]">{c.utmCampaign}</code>
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className="font-semibold text-ink">
                        {r.spendCents ? formatCompactARS(r.spendCents) : '—'}
                      </span>
                      {pace !== null && (
                        <span className="mt-1 ml-auto block h-1 w-20 overflow-hidden rounded-full bg-canvas">
                          <span
                            className={cn(
                              'block h-full rounded-full',
                              pace > 1.1 ? 'bg-warning' : 'bg-series-2',
                            )}
                            style={{ width: `${Math.min(pace, 1) * 100}%` }}
                            title={`${formatPercent(pace, 0)} del presupuesto del período`}
                          />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.impressions ? formatNumber(r.impressions) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        {r.ctr === null ? '—' : formatPercent(r.ctr, 2)}
                        {r.ctrTrend !== null && Math.abs(r.ctrTrend) >= 0.15 && (
                          <span
                            className={cn(
                              'inline-flex',
                              r.ctrTrend < 0 ? 'text-critical' : 'text-good-ink',
                            )}
                            title={`CTR ${r.ctrTrend > 0 ? '+' : ''}${Math.round(r.ctrTrend * 100)} % en la última semana`}
                          >
                            {r.ctrTrend < 0 ? (
                              <ArrowDownRight className="size-3.5" aria-label="bajando" />
                            ) : (
                              <ArrowUpRight className="size-3.5" aria-label="subiendo" />
                            )}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.cpcCents === null ? '—' : formatCompactARS(r.cpcCents)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.cpmCents === null ? '—' : formatCompactARS(r.cpmCents)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.sessions ? formatNumber(r.sessions) : '—'}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {formatNumber(Math.round(r.sales))}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {r.cpaCents === null ? '—' : formatCompactARS(r.cpaCents)}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-ink tabular-nums">
                      {formatMultiple(r.roas)}
                    </td>
                    <td className="px-3 py-3">
                      <VerdictBadge verdict={r.verdict} />
                    </td>
                    <td className="px-3 py-3">
                      {!readOnly && (
                        <Menu
                          items={[
                            {
                              label: 'Editar',
                              icon: <Pencil />,
                              onSelect: () => setEditing(campaignToInput(c)),
                            },
                            {
                              label: 'Cargar resultados',
                              icon: <TableProperties />,
                              onSelect: () => setSpendFor(c.id),
                            },
                            c.status === 'paused'
                              ? {
                                  label: 'Activar',
                                  icon: <CirclePlay />,
                                  onSelect: () =>
                                    void run(() => setCampaignStatus(campaignToInput(c), 'active')),
                                }
                              : {
                                  label: 'Pausar',
                                  icon: <CirclePause />,
                                  disabled: c.status === 'draft',
                                  onSelect: () =>
                                    void run(() => setCampaignStatus(campaignToInput(c), 'paused')),
                                },
                            'separator',
                            {
                              label: 'Borrar',
                              icon: <Trash2 />,
                              danger: true,
                              onSelect: async () => {
                                if (
                                  await confirm({
                                    title: `¿Borrar "${c.name}"?`,
                                    description:
                                      'Se borran también sus resultados diarios. Las ventas no se tocan: pasan a contar por su origen. Si terminó, mejor ponele fecha de fin.',
                                    confirm: 'Borrar',
                                    danger: true,
                                  })
                                )
                                  void run(() => deleteCampaign(c.id))
                              },
                            },
                          ]}
                        />
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <CampaignSheet
        campaign={editing}
        onClose={() => setEditing(null)}
        themes={themes}
        coupons={coupons}
        openAfterCreate
      />
      <SpendSheet
        open={spendFor !== undefined}
        onClose={() => setSpendFor(undefined)}
        campaigns={options}
        campaignId={spendFor ?? undefined}
        existing={recentSpend}
      />
      <ImportSheet open={importing} onClose={() => setImporting(false)} campaigns={options} />
    </>
  )
}
