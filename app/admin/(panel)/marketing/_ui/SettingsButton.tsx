'use client'

import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { formatARS, formatMultiple } from '@/domain/admin/format'
import {
  ATTRIBUTION_MODELS,
  type AttributionModel,
  type MarketingSettings,
} from '@/domain/marketing/types'
import { Button } from '@/ui/Button'
import { Field } from '@/ui/form'
import { Spinner } from '@/ui/motion'
import { MoneyInput, PercentInput, Segmented } from '../../../_ui/fields'
import { Sheet } from '../../../_ui/Sheet'
import { useAdminAction } from '../../../_ui/use-action'
import { saveMarketingSettings } from '../actions'

/**
 * Los supuestos del equipo de marketing: presupuesto del mes, margen que se
 * quiere dejar por venta y modelo de atribución por defecto. Con la
 * contribución de una venta promedio, muestra en vivo el CPA y el ROAS
 * objetivo que resultan.
 */
export function SettingsButton({
  settings,
  chargedCents,
  contributionCents,
  disabled,
}: {
  settings: MarketingSettings
  chargedCents: number
  contributionCents: number
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(settings)
  const { run, pending, fields } = useAdminAction()
  const targetCpa = Math.max(
    Math.round(contributionCents - (chargedCents * draft.targetMarginBps) / 10_000),
    0,
  )
  return (
    <>
      <Button
        size="sm"
        variant="white"
        className="h-10"
        onClick={() => {
          setDraft(settings)
          setOpen(true)
        }}
        disabled={disabled}
        title={disabled ? 'Falta la migración de marketing en la base' : undefined}
      >
        <SlidersHorizontal className="size-4" aria-hidden /> Supuestos
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        locked={pending}
        title="Supuestos de marketing"
        description="Con estos números se decide si una campaña gana o pierde plata."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                void run(
                  () =>
                    saveMarketingSettings({
                      monthlyBudgetCents: draft.monthlyBudgetCents,
                      targetMarginBps: draft.targetMarginBps,
                      defaultModel: draft.defaultModel,
                    }),
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              {pending && <Spinner />} Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          <Field
            label="Presupuesto de pauta del mes"
            htmlFor="ms-budget"
            error={fields.monthlyBudgetCents}
            hint="Todo lo que se piensa invertir en anuncios este mes (Meta, Google, TikTok, creadoras)."
          >
            <MoneyInput
              id="ms-budget"
              cents={draft.monthlyBudgetCents}
              onChange={(v) => setDraft({ ...draft, monthlyBudgetCents: v ?? 0 })}
            />
          </Field>
          <Field
            label="Ganancia que tiene que dejar cada venta"
            htmlFor="ms-margin"
            error={fields.targetMarginBps}
            hint="Después de pagar la publicidad, como porcentaje de lo cobrado. Con esto se calcula el CPA objetivo."
          >
            <PercentInput
              id="ms-margin"
              bps={draft.targetMarginBps}
              onChange={(v) => setDraft({ ...draft, targetMarginBps: v })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-4 text-sm">
            <div>
              <p className="text-xs text-neutral-500">CPA objetivo</p>
              <p className="text-lg font-semibold text-ink">
                {formatARS(Math.round(targetCpa / 100) * 100)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">ROAS objetivo</p>
              <p className="text-lg font-semibold text-ink">
                {targetCpa > 0 ? formatMultiple(chargedCents / targetCpa) : '—'}
              </p>
            </div>
            <p className="col-span-2 text-xs text-neutral-500">
              Sobre una venta promedio de {formatARS(Math.round(chargedCents / 100) * 100)} que deja{' '}
              {formatARS(Math.round(contributionCents / 100) * 100)} antes de publicidad.
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
              Modelo de atribución por defecto
            </p>
            <Segmented
              id="ms-model"
              size="sm"
              value={draft.defaultModel}
              onChange={(v) => setDraft({ ...draft, defaultModel: v as AttributionModel })}
              options={ATTRIBUTION_MODELS.map((m) => ({ value: m.value, label: m.label }))}
            />
            <p className="mt-2 text-xs text-neutral-500">
              {ATTRIBUTION_MODELS.find((m) => m.value === draft.defaultModel)?.hint}
            </p>
          </div>
        </div>
      </Sheet>
    </>
  )
}
