'use client'

import { FileUp, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatARS, formatNumber } from '@/domain/admin/format'
import { SPEND_CHANNELS, channelInfo, type ChannelId } from '@/domain/marketing/channels'
import { parseSpendCsv } from '@/domain/marketing/import'
import { Button } from '@/ui/Button'
import { Field, Select, Textarea } from '@/ui/form'
import { Spinner } from '@/ui/motion'
import { Sheet } from '../../../_ui/Sheet'
import { useAdminAction } from '../../../_ui/use-action'
import { importSpend } from '../actions'
import type { Option } from './CampaignSheet'

const NEW = '__nueva__'

const SAMPLE = `Día,Nombre de la campaña,Importe gastado (ARS),Impresiones,Clics en el enlace,Compras
2026-09-20,Meta · Prospección siempre prendida,"3.850,40",142310,1580,21
2026-09-21,Meta · Prospección siempre prendida,"4.012,10",150220,1602,19`

/**
 * Importar la exportación del administrador de anuncios (CSV desglosado por
 * día). Muestra qué columnas reconoció, las filas que no entiende y a qué
 * campaña va cada nombre (una existente o una nueva) antes de guardar.
 */
export function ImportSheet({
  open,
  onClose,
  campaigns,
}: {
  open: boolean
  onClose(): void
  campaigns: Option[]
}) {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState<ChannelId>('meta')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const { run, pending } = useAdminAction()
  const parsed = useMemo(() => parseSpendCsv(text), [text])
  const names = useMemo(() => [...new Set(parsed.rows.map((r) => r.campaignName))], [parsed])
  const target = (name: string) =>
    mapping[name] ?? campaigns.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id ?? NEW
  const totalSpend = parsed.rows.reduce((s, r) => s + r.spendCents, 0)
  const days = new Set(parsed.rows.map((r) => r.day))

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      wide
      title="Importar resultados"
      description="Exportá el informe de Meta Ads Manager, Google Ads o TikTok desglosado por día y pegalo acá (o subí el archivo)."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending || parsed.rows.length === 0}
            onClick={() =>
              void run(
                () =>
                  importSpend({
                    channel,
                    rows: parsed.rows.map((r) => {
                      const t = target(r.campaignName)
                      return {
                        campaignName: r.campaignName,
                        campaignId: t === NEW ? null : t,
                        day: r.day,
                        spendCents: r.spendCents,
                        impressions: r.impressions,
                        clicks: r.clicks,
                        platformConversions: r.platformConversions,
                      }
                    }),
                  }),
                {
                  onSuccess: () => {
                    setText('')
                    setMapping({})
                    onClose()
                  },
                },
              )
            }
          >
            {pending && <Spinner />} Importar{' '}
            {parsed.rows.length ? `${parsed.rows.length} filas` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-neutral-300">
            <FileUp className="size-4 text-brand" aria-hidden /> Subir CSV
            <input
              type="file"
              accept=".csv,text/csv,text/plain,.tsv"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (file) setText(await file.text())
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            className="h-9 rounded-full px-3 text-xs font-semibold text-neutral-500 hover:bg-canvas hover:text-ink"
            onClick={() => setText(SAMPLE)}
          >
            Ver un ejemplo
          </button>
        </div>
        <Field label="O pegá el contenido" htmlFor="i-text">
          <Textarea
            id="i-text"
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Día, Nombre de la campaña, Importe gastado, Impresiones, Clics…"
            className="font-mono text-xs"
          />
        </Field>

        {parsed.errors.length > 0 && (
          <div className="rounded-2xl bg-[#fff4d6] p-4 text-sm text-[#7a5800]">
            <p className="flex items-center gap-2 font-semibold">
              <TriangleAlert className="size-4" aria-hidden /> {parsed.errors.length}{' '}
              {parsed.errors.length === 1 ? 'fila no se entiende' : 'filas no se entienden'}
            </p>
            <ul className="mt-1 space-y-0.5 text-xs">
              {parsed.errors.slice(0, 5).map((e) => (
                <li key={`${e.line}-${e.message}`}>
                  Línea {e.line}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {parsed.rows.length > 0 && (
          <>
            <div className="grid gap-3 rounded-2xl bg-canvas p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-neutral-500">Filas</p>
                <p className="font-semibold text-ink">{formatNumber(parsed.rows.length)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Días</p>
                <p className="font-semibold text-ink">{formatNumber(days.size)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500">Inversión total</p>
                <p className="font-semibold text-ink">{formatARS(totalSpend)}</p>
              </div>
              <p className="text-xs text-neutral-500 sm:col-span-3">
                Columnas reconocidas:{' '}
                {Object.entries(parsed.columns)
                  .map(([k, v]) => `${LABEL[k] ?? k} ← "${v}"`)
                  .join(' · ')}
              </p>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
                ¿A qué campaña va cada una?
              </p>
              <ul className="space-y-2">
                {names.map((name) => (
                  <li
                    key={name}
                    className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_260px] sm:items-center"
                  >
                    <span className="truncate text-sm font-medium text-ink" title={name}>
                      {name}
                    </span>
                    <Select
                      aria-label={`Campaña para "${name}"`}
                      value={target(name)}
                      onChange={(e) => setMapping((m) => ({ ...m, [name]: e.target.value }))}
                      className="h-10 py-1 text-sm"
                    >
                      <option value={NEW}>Crear una campaña nueva</option>
                      {campaigns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </li>
                ))}
              </ul>
            </div>
            {names.some((n) => target(n) === NEW) && (
              <Field label="Canal de las campañas nuevas" htmlFor="i-channel">
                <Select
                  id="i-channel"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ChannelId)}
                >
                  {SPEND_CHANNELS.map((c) => (
                    <option key={c} value={c}>
                      {channelInfo(c).label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <p className="text-xs text-neutral-500">
              Si un día ya tenía resultados, se reemplazan (importar dos veces el mismo informe no
              duplica nada).
            </p>
          </>
        )}
      </div>
    </Sheet>
  )
}

const LABEL: Record<string, string> = {
  day: 'día',
  campaign: 'campaña',
  spend: 'inversión',
  impressions: 'impresiones',
  clicks: 'clics',
  conversions: 'compras',
}
