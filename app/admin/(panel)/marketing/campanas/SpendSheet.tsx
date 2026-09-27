'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { formatARS } from '@/domain/admin/format'
import type { SpendInput } from '@/domain/marketing/inputs'
import type { SpendEntry } from '@/domain/marketing/types'
import { Button } from '@/ui/Button'
import { Field, Input, Select } from '@/ui/form'
import { Spinner } from '@/ui/motion'
import { MoneyInput } from '../../../_ui/fields'
import { Sheet } from '../../../_ui/Sheet'
import { useAdminAction } from '../../../_ui/use-action'
import { saveSpend } from '../actions'
import { todayKey, type Option } from './CampaignSheet'

type Row = Omit<SpendInput, 'campaignId'>

const addDay = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

/**
 * Carga de resultados de una campaña día por día (lo que muestra el
 * administrador de anuncios). Si el día ya tenía resultados, se reemplazan.
 */
export function SpendSheet({
  open,
  onClose,
  campaigns,
  campaignId,
  existing,
}: {
  open: boolean
  onClose(): void
  campaigns: Option[]
  /** Campaña fija (desde su detalle). */
  campaignId?: string
  existing: SpendEntry[]
}) {
  const [selected, setSelected] = useState(campaignId ?? campaigns[0]?.id ?? '')
  const blankFor = (campaign: string, day: string): Row => {
    const found = existing.find((e) => e.campaignId === campaign && e.day === day)
    return {
      day,
      spendCents: found?.spendCents ?? 0,
      impressions: found?.impressions ?? 0,
      clicks: found?.clicks ?? 0,
      platformConversions: found?.platformConversions ?? 0,
    }
  }
  const blank = (day: string) => blankFor(selected, day)
  const [rows, setRows] = useState<Row[]>(() => [blank(addDay(todayKey(), -1))])
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      const initial = campaignId ?? campaigns[0]?.id ?? ''
      setSelected(initial)
      setRows([blankFor(initial, addDay(todayKey(), -1))])
    }
  }
  const { run, pending, fields } = useAdminAction()
  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)))
  const total = rows.reduce((s, r) => s + r.spendCents, 0)
  const num = (v: string) => Math.max(0, Math.round(Number(v || 0)))

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      wide
      title="Cargar resultados"
      description="Copiá del administrador de anuncios lo de cada día: inversión, impresiones, clics y compras que reporta la plataforma."
      footer={
        <>
          <p className="mr-auto text-sm text-neutral-500">
            Total: <span className="font-semibold text-ink">{formatARS(total)}</span>
          </p>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending || !selected}
            onClick={() =>
              void run(() => saveSpend(rows.map((r) => ({ ...r, campaignId: selected }))), {
                onSuccess: onClose,
              })
            }
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!campaignId && (
          <Field label="Campaña" htmlFor="s-campaign">
            <Select id="s-campaign" value={selected} onChange={(e) => setSelected(e.target.value)}>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {fields._ && <p className="text-sm text-critical">{fields._}</p>}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <motion.div
                key={i}
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 gap-3 rounded-2xl border border-line p-3 sm:grid-cols-[150px_1fr_1fr_1fr_1fr_auto] sm:items-end"
              >
                <Field label="Día" htmlFor={`s-day-${i}`}>
                  <Input
                    id={`s-day-${i}`}
                    type="date"
                    value={r.day}
                    onChange={(e) => {
                      const found = existing.find(
                        (x) => x.campaignId === selected && x.day === e.target.value,
                      )
                      update(i, {
                        day: e.target.value,
                        ...(found
                          ? {
                              spendCents: found.spendCents,
                              impressions: found.impressions,
                              clicks: found.clicks,
                              platformConversions: found.platformConversions,
                            }
                          : {}),
                      })
                    }}
                  />
                </Field>
                <Field label="Inversión" htmlFor={`s-spend-${i}`}>
                  <MoneyInput
                    id={`s-spend-${i}`}
                    cents={r.spendCents}
                    onChange={(v) => update(i, { spendCents: v ?? 0 })}
                  />
                </Field>
                <Field label="Impresiones" htmlFor={`s-impr-${i}`}>
                  <Input
                    id={`s-impr-${i}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="tabular-nums"
                    value={r.impressions}
                    onChange={(e) => update(i, { impressions: num(e.target.value) })}
                  />
                </Field>
                <Field label="Clics" htmlFor={`s-clicks-${i}`}>
                  <Input
                    id={`s-clicks-${i}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="tabular-nums"
                    value={r.clicks}
                    onChange={(e) => update(i, { clicks: num(e.target.value) })}
                  />
                </Field>
                <Field label="Compras (plataforma)" htmlFor={`s-conv-${i}`}>
                  <Input
                    id={`s-conv-${i}`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className="tabular-nums"
                    value={r.platformConversions}
                    onChange={(e) => update(i, { platformConversions: num(e.target.value) })}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                  disabled={rows.length === 1}
                  className="grid size-10 place-items-center justify-self-end rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-critical disabled:opacity-30"
                  aria-label="Quitar este día"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const lastDay = rows.at(-1)?.day ?? todayKey()
            setRows((rs) => [...rs, blank(addDay(lastDay, -1))])
          }}
        >
          <Plus className="size-4" aria-hidden /> Agregar otro día
        </Button>
        <p className="text-xs text-neutral-500">
          ¿Muchos días? Exportá el informe desglosado por día y usá <b>Importar CSV</b>.
        </p>
      </div>
    </Sheet>
  )
}
