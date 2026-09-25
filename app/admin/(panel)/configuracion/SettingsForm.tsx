'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Building2, CircleDollarSign, Gift, Percent, RotateCcw, Save, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { saleCosts } from '@/domain/admin/finance'
import { formatARS, formatPercent } from '@/domain/admin/format'
import type { AdminSettings } from '@/domain/admin/types'
import { Button } from '@/ui/Button'
import { Field, Input, Select } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../_ui/Confirm'
import { MoneyInput, PercentInput, SwitchRow } from '../../_ui/fields'
import { Card, CardHeader } from '../../_ui/primitives'
import { useAdminAction } from '../../_ui/use-action'
import { resetDemo, saveSettings } from './actions'

type Values = Omit<AdminSettings, 'updatedAt'>

export function SettingsForm({
  initial,
  coupons,
  demo,
  canReset,
}: {
  initial: Values
  coupons: { id: string; code: string }[]
  demo: boolean
  canReset: boolean
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const [saved, setSaved] = useState(initial)
  const [values, setValues] = useState(initial)
  const { run, pending, fields } = useAdminAction()
  const dirty = JSON.stringify(values) !== JSON.stringify(saved)
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }))
  const example = saleCosts(values.basePriceCents, values)
  const { currency: _c, ...payload } = values

  const save = () =>
    run(() => saveSettings(payload), {
      onSuccess: () => {
        setSaved(values)
        router.refresh()
      },
    })

  return (
    <div className="space-y-5 pb-24">
      <div className="grid gap-5 xl:grid-cols-2">
        <Section
          icon={<Gift />}
          title="Venta y regalo"
          description="Valores generales de la tienda"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Precio base"
              htmlFor="s-base"
              error={fields.basePriceCents}
              hint="Para temáticas sin planes (los planes tienen su precio)"
            >
              <MoneyInput
                id="s-base"
                cents={values.basePriceCents}
                onChange={(v) => set('basePriceCents', v ?? 0)}
              />
            </Field>
            <Field
              label="Días online del regalo"
              htmlFor="s-days"
              error={fields.giftLifetimeDays}
              hint="Desde que se bloquea (los planes lo pueden pisar)"
            >
              <Input
                id="s-days"
                type="number"
                min={1}
                value={values.giftLifetimeDays}
                onChange={(e) => set('giftLifetimeDays', Number(e.target.value || 1))}
              />
            </Field>
            <Field
              label="Oferta de la ficha"
              htmlFor="s-offer"
              hint="Cupón que se ofrece en la página de producto"
            >
              <Select
                id="s-offer"
                value={values.offerCouponId ?? ''}
                onChange={(e) => set('offerCouponId', e.target.value || null)}
              >
                <option value="">Sin oferta</option>
                {coupons.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Aparece a los (segundos)"
              htmlFor="s-delay"
              error={fields.offerDelaySeconds}
            >
              <Input
                id="s-delay"
                type="number"
                min={0}
                max={600}
                value={values.offerDelaySeconds}
                onChange={(e) => set('offerDelaySeconds', Number(e.target.value || 0))}
              />
            </Field>
          </div>
          <div className="mt-4">
            <SwitchRow
              label="Pausar las ventas"
              hint="El checkout muestra un aviso y no cobra. Para vacaciones o un problema con la pasarela."
              checked={values.salesPaused}
              onChange={(v) => set('salesPaused', v)}
            />
          </div>
        </Section>

        <Section
          icon={<Percent />}
          title="Costos por venta"
          description="Con esto se calcula la rentabilidad en Finanzas"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Comisión de Mercado Pago"
              htmlFor="s-fee"
              error={fields.gatewayFeeBps}
              hint="Según el plazo de acreditación que tengas"
            >
              <PercentInput
                id="s-fee"
                bps={values.gatewayFeeBps}
                onChange={(v) => set('gatewayFeeBps', v)}
              />
            </Field>
            <Field label="IVA sobre la comisión" htmlFor="s-vat" error={fields.gatewayVatBps}>
              <PercentInput
                id="s-vat"
                bps={values.gatewayVatBps}
                onChange={(v) => set('gatewayVatBps', v)}
              />
            </Field>
            <Field label="Cargo fijo por cobro" htmlFor="s-fixed" error={fields.gatewayFixedCents}>
              <MoneyInput
                id="s-fixed"
                cents={values.gatewayFixedCents}
                onChange={(v) => set('gatewayFixedCents', v ?? 0)}
              />
            </Field>
            <Field
              label="Impuestos sobre ventas"
              htmlFor="s-tax"
              error={fields.taxBps}
              hint="Ingresos Brutos, etc."
            >
              <PercentInput id="s-tax" bps={values.taxBps} onChange={(v) => set('taxBps', v)} />
            </Field>
            <Field
              label="Costo de entregar una Boxie"
              htmlFor="s-var"
              error={fields.variableCostCents}
              hint="Storage, mails, ancho de banda"
            >
              <MoneyInput
                id="s-var"
                cents={values.variableCostCents}
                onChange={(v) => set('variableCostCents', v ?? 0)}
              />
            </Field>
          </div>
          <motion.div layout className="mt-4 rounded-2xl bg-canvas p-4 text-sm">
            <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
              En una venta de {formatARS(values.basePriceCents)}
            </p>
            <div className="grid grid-cols-2 gap-y-1 sm:grid-cols-4">
              <Mini
                label="Pasarela"
                value={`− ${formatARS(Math.round(example.gatewayCents / 100) * 100)}`}
              />
              <Mini
                label="Impuestos"
                value={`− ${formatARS(Math.round(example.taxCents / 100) * 100)}`}
              />
              <Mini label="Entrega" value={`− ${formatARS(example.variableCents)}`} />
              <Mini
                label="Queda"
                value={`${formatARS(Math.round(example.contributionCents / 100) * 100)} (${formatPercent(values.basePriceCents ? example.contributionCents / values.basePriceCents : 0, 0)})`}
                strong
              />
            </div>
          </motion.div>
        </Section>

        <Section icon={<Target />} title="Meta" description="La del tablero">
          <Field
            label="Facturación que querés por mes"
            htmlFor="s-goal"
            error={fields.monthlyGoalCents}
          >
            <MoneyInput
              id="s-goal"
              cents={values.monthlyGoalCents}
              onChange={(v) => set('monthlyGoalCents', v ?? 0)}
            />
          </Field>
        </Section>

        <Section
          icon={<Building2 />}
          title="Datos del negocio"
          description="Los que aparecen en los mails y en el sitio"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="s-name" error={fields.businessName}>
              <Input
                id="s-name"
                value={values.businessName}
                maxLength={80}
                onChange={(e) => set('businessName', e.target.value)}
              />
            </Field>
            <Field label="Mail de soporte" htmlFor="s-mail" error={fields.supportEmail}>
              <Input
                id="s-mail"
                type="email"
                value={values.supportEmail}
                onChange={(e) => set('supportEmail', e.target.value)}
              />
            </Field>
            <Field label="WhatsApp" htmlFor="s-wa" error={fields.whatsapp}>
              <Input
                id="s-wa"
                value={values.whatsapp}
                maxLength={40}
                onChange={(e) => set('whatsapp', e.target.value)}
              />
            </Field>
            <Field label="Instagram" htmlFor="s-ig" error={fields.instagram}>
              <Input
                id="s-ig"
                value={values.instagram}
                maxLength={40}
                onChange={(e) => set('instagram', e.target.value)}
              />
            </Field>
          </div>
        </Section>
      </div>

      {demo && canReset && (
        <Card className="border-dashed">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-ink">Datos de muestra</h2>
              <p className="text-sm text-neutral-600">
                Vuelve todo al estado inicial de la demo: temáticas, cupones, ventas simuladas y
                configuración.
              </p>
            </div>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={async () => {
                const ok = await confirm({
                  icon: '🔄',
                  title: '¿Restablecer la demo?',
                  description:
                    'Se pierde todo lo que cambiaste en el panel (solo datos de muestra).',
                  confirm: 'Restablecer',
                  danger: true,
                })
                if (ok) void run(() => resetDemo(), { onSuccess: () => router.refresh() })
              }}
            >
              <RotateCcw className="size-4" aria-hidden /> Restablecer
            </Button>
          </div>
        </Card>
      )}

      <AnimatePresence>
        {dirty && (
          <motion.div
            className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-xl"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={spring.gentle}
          >
            <div className="flex items-center gap-3 rounded-3xl bg-ink px-5 py-3 text-white shadow-[0_20px_60px_rgba(42,36,51,0.35)]">
              <CircleDollarSign className="size-5 text-gold" aria-hidden />
              <p className="flex-1 text-sm font-semibold">Hay cambios sin guardar</p>
              <button
                type="button"
                onClick={() => setValues(saved)}
                className="rounded-full px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
              >
                Descartar
              </button>
              <Button size="sm" variant="white" disabled={pending} onClick={() => void save()}>
                {pending ? <Spinner /> : <Save className="size-4" aria-hidden />} Guardar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card>
      <CardHeader icon={icon} title={title} description={description} />
      {children}
    </Card>
  )
}

function Mini({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div>
      <p className="text-[11px] text-neutral-500">{label}</p>
      <p className={strong ? 'font-semibold text-ink' : 'text-neutral-700'}>{value}</p>
    </div>
  )
}
