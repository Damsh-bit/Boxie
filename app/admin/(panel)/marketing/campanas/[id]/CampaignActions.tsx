'use client'

import { Check, CirclePause, CirclePlay, Copy, Pencil, TableProperties, Trash2 } from 'lucide-react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { formatARS, formatDate, formatNumber } from '@/domain/admin/format'
import type { Campaign, SpendEntry } from '@/domain/marketing/types'
import { Button } from '@/ui/Button'
import { useConfirm } from '../../../../_ui/Confirm'
import { EmptyState } from '../../../../_ui/primitives'
import { useAdminAction } from '../../../../_ui/use-action'
import { deleteCampaign, deleteSpend, setCampaignStatus } from '../../actions'
import { CampaignSheet, campaignToInput, type Option } from '../CampaignSheet'
import { SpendSheet } from '../SpendSheet'

/** Botones del encabezado del detalle: editar, cargar resultados, pausar y borrar. */
export function CampaignActions({
  campaign,
  themes,
  coupons,
  spend,
  readOnly,
}: {
  campaign: Campaign
  themes: Option[]
  coupons: Option[]
  spend: SpendEntry[]
  readOnly: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const confirm = useConfirm()
  const router = useRouter()
  const { run, pending } = useAdminAction()
  if (readOnly) return null
  return (
    <>
      <Button size="sm" variant="white" className="h-10" onClick={() => setEditing(true)}>
        <Pencil className="size-4" aria-hidden /> Editar
      </Button>
      <Button size="sm" variant="white" className="h-10" onClick={() => setLoading(true)}>
        <TableProperties className="size-4" aria-hidden /> Cargar resultados
      </Button>
      {campaign.status !== 'draft' && (
        <Button
          size="sm"
          variant="white"
          className="h-10"
          disabled={pending}
          onClick={() =>
            void run(() =>
              setCampaignStatus(
                campaignToInput(campaign),
                campaign.status === 'paused' ? 'active' : 'paused',
              ),
            )
          }
        >
          {campaign.status === 'paused' ? (
            <>
              <CirclePlay className="size-4" aria-hidden /> Activar
            </>
          ) : (
            <>
              <CirclePause className="size-4" aria-hidden /> Pausar
            </>
          )}
        </Button>
      )}
      <Button
        size="icon"
        variant="ghost"
        aria-label="Borrar campaña"
        disabled={pending}
        onClick={async () => {
          if (
            await confirm({
              title: `¿Borrar "${campaign.name}"?`,
              description:
                'Se borran también sus resultados diarios. Las ventas no se tocan: pasan a contar por su origen.',
              confirm: 'Borrar',
              danger: true,
            })
          )
            void run(() => deleteCampaign(campaign.id), {
              onSuccess: () => router.push('/admin/marketing/campanas' as Route),
            })
        }}
      >
        <Trash2 className="size-4" aria-hidden />
      </Button>
      <CampaignSheet
        campaign={editing ? campaignToInput(campaign) : null}
        onClose={() => setEditing(false)}
        themes={themes}
        coupons={coupons}
      />
      <SpendSheet
        open={loading}
        onClose={() => setLoading(false)}
        campaigns={[{ id: campaign.id, name: campaign.name }]}
        campaignId={campaign.id}
        existing={spend}
      />
    </>
  )
}

/** Copiar al portapapeles con confirmación visual. */
export function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        })
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-canvas px-3 text-xs font-semibold text-ink transition-colors hover:bg-brand-soft hover:text-brand"
    >
      {copied ? (
        <Check className="size-3.5 text-good" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      {copied ? 'Copiado' : label}
    </button>
  )
}

/** Los resultados cargados día por día (se puede borrar un día mal cargado). */
export function DailyTable({
  campaignId,
  rows,
  readOnly,
}: {
  campaignId: string
  rows: (SpendEntry & { sales: number; revenueCents: number })[]
  readOnly: boolean
}) {
  const { run, pending } = useAdminAction()
  const confirm = useConfirm()
  if (rows.length === 0)
    return (
      <EmptyState
        icon={<TableProperties />}
        title="Sin resultados cargados en el período"
        text="Cargá lo que dice el administrador de anuncios de cada día (o importá el CSV)."
      />
    )
  return (
    <div className="max-h-[480px] overflow-auto">
      <table className="w-full min-w-[760px] text-sm" style={{ opacity: pending ? 0.6 : 1 }}>
        <thead className="sticky top-0 z-10 bg-[#fbf9fa]">
          <tr className="border-y border-line text-left text-xs text-neutral-500">
            <th scope="col" className="px-6 py-2.5 font-semibold">
              Día
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Inversión
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Impresiones
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Clics
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              CTR
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Compras (plataforma)
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Ventas (tienda)
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-semibold">
              Facturación
            </th>
            <th scope="col" className="w-12 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day} className="border-b border-line last:border-0 hover:bg-canvas/50">
              <th scope="row" className="px-6 py-2 text-left font-medium text-ink">
                {formatDate(`${r.day}T12:00:00-03:00`)}
              </th>
              <td className="px-3 py-2 text-right font-semibold text-ink tabular-nums">
                {formatARS(r.spendCents)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.impressions)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatNumber(r.clicks)}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.impressions
                  ? `${((r.clicks / r.impressions) * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`
                  : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{r.platformConversions}</td>
              <td className="px-3 py-2 text-right tabular-nums">
                {r.sales.toLocaleString('es-AR', { maximumFractionDigits: 1 })}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatARS(Math.round(r.revenueCents))}
              </td>
              <td className="px-3 py-2">
                {!readOnly && r.id && (
                  <button
                    type="button"
                    className="grid size-8 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-[#fdeaea] hover:text-critical"
                    aria-label={`Borrar el ${r.day}`}
                    onClick={async () => {
                      if (
                        await confirm({
                          title: '¿Borrar los resultados de este día?',
                          confirm: 'Borrar',
                          danger: true,
                        })
                      )
                        void run(() => deleteSpend(campaignId, r.day))
                    }}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
