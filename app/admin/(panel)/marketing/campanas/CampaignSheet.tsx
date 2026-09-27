'use client'

import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useState } from 'react'
import { SPEND_CHANNELS, channelInfo } from '@/domain/marketing/channels'
import type { CampaignInput } from '@/domain/marketing/inputs'
import { slugify } from '@/domain/marketing/tools'
import { CAMPAIGN_OBJECTIVES, type Campaign } from '@/domain/marketing/types'
import { Button } from '@/ui/Button'
import { Field, Input, Select, Textarea } from '@/ui/form'
import { Spinner } from '@/ui/motion'
import { MoneyInput, Segmented } from '../../../_ui/fields'
import { Sheet } from '../../../_ui/Sheet'
import { useAdminAction } from '../../../_ui/use-action'
import { saveCampaign } from '../actions'

export interface Option {
  id: string
  name: string
}

export const todayKey = () => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10)

export function campaignToInput(c: Campaign): CampaignInput {
  return {
    id: c.id,
    name: c.name,
    channel: c.channel,
    objective: c.objective,
    status: c.status,
    utmCampaign: c.utmCampaign,
    startsOn: c.startsOn,
    endsOn: c.endsOn,
    dailyBudgetCents: c.dailyBudgetCents,
    themeId: c.themeId,
    couponId: c.couponId,
    audience: c.audience,
    notes: c.notes,
  }
}

export function emptyCampaign(patch: Partial<CampaignInput> = {}): CampaignInput {
  return {
    name: '',
    channel: 'meta',
    objective: 'ventas',
    status: 'active',
    utmCampaign: '',
    startsOn: todayKey(),
    endsOn: null,
    dailyBudgetCents: 0,
    themeId: null,
    couponId: null,
    audience: '',
    notes: '',
    ...patch,
  }
}

/**
 * Alta y edición de una campaña. El nombre para los links (utm_campaign) se
 * arma solo del nombre hasta que se lo toca a mano: es lo que une las visitas
 * y las ventas con la campaña.
 */
export function CampaignSheet({
  campaign,
  onClose,
  themes,
  coupons,
  openAfterCreate = false,
}: {
  campaign: CampaignInput | null
  onClose(): void
  themes: Option[]
  coupons: Option[]
  /** Al crear, ir al detalle de la campaña nueva. */
  openAfterCreate?: boolean
}) {
  const [draft, setDraft] = useState(campaign)
  const [last, setLast] = useState(campaign)
  const [utmTouched, setUtmTouched] = useState(Boolean(campaign?.id))
  if (campaign !== last) {
    setLast(campaign)
    setDraft(campaign)
    setUtmTouched(Boolean(campaign?.id))
  }
  const router = useRouter()
  const { run, pending, fields } = useAdminAction()
  if (!draft)
    return (
      <Sheet open={false} onOpenChange={onClose} title="">
        {null}
      </Sheet>
    )
  const set = (patch: Partial<CampaignInput>) => setDraft({ ...draft, ...patch })
  return (
    <Sheet
      open={campaign !== null}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      wide
      title={draft.id ? 'Editar campaña' : 'Nueva campaña'}
      description="Las visitas y ventas que lleguen con su utm_campaign (o con su cupón) se le atribuyen solas."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() =>
              void run(() => saveCampaign(draft), {
                onSuccess: (data) => {
                  onClose()
                  if (openAfterCreate && !draft.id && data?.id)
                    router.push(`/admin/marketing/campanas/${data.id}` as Route)
                },
              })
            }
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Nombre" htmlFor="c-name" error={fields.name}>
          <Input
            id="c-name"
            value={draft.name}
            maxLength={120}
            placeholder="Meta · Día de la Madre 2026"
            onChange={(e) =>
              set({
                name: e.target.value,
                ...(utmTouched ? {} : { utmCampaign: slugify(e.target.value, 80) }),
              })
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Canal" htmlFor="c-channel">
            <Select
              id="c-channel"
              value={draft.channel}
              onChange={(e) => set({ channel: e.target.value as CampaignInput['channel'] })}
            >
              {SPEND_CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {channelInfo(c).label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Objetivo" htmlFor="c-objective">
            <Select
              id="c-objective"
              value={draft.objective}
              onChange={(e) => set({ objective: e.target.value as CampaignInput['objective'] })}
            >
              {CAMPAIGN_OBJECTIVES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Nombre para los links (utm_campaign)"
          htmlFor="c-utm"
          error={fields.utmCampaign}
          hint="Minúsculas y guiones. Tiene que ser el mismo que usás en los anuncios."
        >
          <Input
            id="c-utm"
            value={draft.utmCampaign}
            maxLength={80}
            className="font-mono text-sm"
            onChange={(e) => {
              setUtmTouched(true)
              set({ utmCampaign: e.target.value })
            }}
            onBlur={() => set({ utmCampaign: slugify(draft.utmCampaign, 80) })}
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">Estado</p>
          <Segmented
            id="c-status"
            size="sm"
            value={draft.status}
            onChange={(v) => set({ status: v as CampaignInput['status'] })}
            options={[
              { value: 'active', label: 'Activa' },
              { value: 'paused', label: 'Pausada' },
              { value: 'draft', label: 'Borrador' },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Empieza" htmlFor="c-start" error={fields.startsOn}>
            <Input
              id="c-start"
              type="date"
              value={draft.startsOn}
              onChange={(e) => set({ startsOn: e.target.value })}
            />
          </Field>
          <Field label="Termina" htmlFor="c-end" error={fields.endsOn} hint="Vacío = sigue">
            <Input
              id="c-end"
              type="date"
              value={draft.endsOn ?? ''}
              onChange={(e) => set({ endsOn: e.target.value || null })}
            />
          </Field>
          <Field label="Presupuesto diario" htmlFor="c-budget" error={fields.dailyBudgetCents}>
            <MoneyInput
              id="c-budget"
              cents={draft.dailyBudgetCents}
              onChange={(v) => set({ dailyBudgetCents: v ?? 0 })}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Temática que empuja" htmlFor="c-theme">
            <Select
              id="c-theme"
              value={draft.themeId ?? ''}
              onChange={(e) => set({ themeId: e.target.value || null })}
            >
              <option value="">Todas / ninguna en particular</option>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Cupón de la campaña"
            htmlFor="c-coupon"
            hint="Las ventas con este cupón cuentan para la campaña aunque no toquen el link."
          >
            <Select
              id="c-coupon"
              value={draft.couponId ?? ''}
              onChange={(e) => set({ couponId: e.target.value || null })}
            >
              <option value="">Sin cupón</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Público" htmlFor="c-audience" error={fields.audience}>
          <Input
            id="c-audience"
            value={draft.audience}
            maxLength={300}
            placeholder="20 a 45 años · intereses: regalos, parejas · similares de compradores"
            onChange={(e) => set({ audience: e.target.value })}
          />
        </Field>
        <Field label="Notas" htmlFor="c-notes" error={fields.notes}>
          <Textarea
            id="c-notes"
            value={draft.notes}
            maxLength={2000}
            rows={3}
            placeholder="Creatividades, hipótesis, qué se está probando…"
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
      </div>
    </Sheet>
  )
}
