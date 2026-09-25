'use client'

import { motion } from 'framer-motion'
import { FlaskConical, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { saleCosts } from '@/domain/admin/finance'
import { bucketLabel } from '@/domain/admin/range'
import { formatARS, formatDate, formatPercent } from '@/domain/admin/format'
import type { ExpenseInput } from '@/domain/admin/inputs'
import { EXPENSE_CATEGORIES, type Expense, type FinanceSettings } from '@/domain/admin/types'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input, Select } from '@/ui/form'
import { ease, spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../_ui/Confirm'
import { MoneyInput, Segmented } from '../../_ui/fields'
import { Menu } from '../../_ui/Menu'
import { Badge, Card, CardHeader, EmptyState } from '../../_ui/primitives'
import { Sheet } from '../../_ui/Sheet'
import { useAdminAction } from '../../_ui/use-action'
import { deleteExpense, saveExpense } from './actions'

// ── Estado de resultados ───────────────────────────────────────────────────

export interface PnlLine {
  label: string
  value: number
  kind: 'base' | 'minus' | 'total' | 'result'
}

/** Cada línea con su barra proporcional a lo cobrado: se ve dónde se va la plata. */
export function PnlTable({ lines, base }: { lines: PnlLine[]; base: number }) {
  const max = Math.max(...lines.map((l) => Math.abs(l.value)), 1)
  return (
    <dl className="space-y-1">
      {lines.map((line, i) => {
        const strong = line.kind === 'total' || line.kind === 'result'
        const negative = line.value < 0
        const color =
          line.kind === 'result'
            ? line.value >= 0
              ? 'bg-good'
              : 'bg-critical'
            : line.kind === 'minus'
              ? 'bg-series-2/70'
              : 'bg-brand'
        return (
          <motion.div
            key={line.label}
            className={cn(
              'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 rounded-xl px-3 py-2',
              strong && 'bg-canvas',
              line.kind === 'result' && 'mt-2 bg-ink text-white',
            )}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease: ease.out, delay: 0.05 + i * 0.04 }}
          >
            <dt
              className={cn(
                'min-w-0 text-sm',
                strong ? 'font-semibold' : 'text-neutral-600',
                line.kind === 'result' && 'text-white',
              )}
            >
              <span className="block truncate">{line.label}</span>
              <span
                className={cn(
                  'mt-1 block h-1.5 overflow-hidden rounded-full',
                  line.kind === 'result' ? 'bg-white/15' : 'bg-white',
                )}
              >
                <motion.span
                  className={cn('block h-full rounded-full', color)}
                  initial={{ width: 0 }}
                  animate={{ width: `${(Math.abs(line.value) / max) * 100}%` }}
                  transition={{ duration: 0.8, ease: ease.out, delay: 0.15 + i * 0.04 }}
                />
              </span>
            </dt>
            <dd className="text-right tabular-nums">
              <span
                className={cn(
                  'block text-sm',
                  strong ? 'font-semibold' : '',
                  negative && line.kind === 'minus' && 'text-neutral-700',
                  line.kind === 'result' && 'text-lg',
                )}
              >
                {negative ? '− ' : ''}
                {formatARS(Math.round(Math.abs(line.value) / 100) * 100)}
              </span>
              {base > 0 && line.kind !== 'base' && (
                <span
                  className={cn(
                    'block text-[11px]',
                    line.kind === 'result' ? 'text-white/60' : 'text-neutral-400',
                  )}
                >
                  {formatPercent(line.value / base)}
                </span>
              )}
            </dd>
          </motion.div>
        )
      })}
    </dl>
  )
}

// ── Gastos ─────────────────────────────────────────────────────────────────

const monthOf = (day: string) => bucketLabel(day.slice(0, 7), 'month')

const today = () =>
  new Date(Date.parse(new Date().toISOString()) - 3 * 3_600_000).toISOString().slice(0, 10)

export function ExpensesTable({ expenses }: { expenses: Expense[] }) {
  const [editing, setEditing] = useState<ExpenseInput | null>(null)
  const confirm = useConfirm()
  const { run, pending } = useAdminAction()
  const sorted = useMemo(
    () =>
      [...expenses].sort(
        (a, b) =>
          Number(b.recurrence === 'monthly') - Number(a.recurrence === 'monthly') ||
          b.amountCents - a.amountCents,
      ),
    [expenses],
  )
  const label = (c: string) => EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c
  return (
    <>
      <div className="flex items-start justify-between gap-3 p-5 pb-3 sm:p-6 sm:pb-3">
        <CardHeader
          className="mb-0"
          title="Gastos fijos"
          description="Hosting, publicidad, herramientas, impuestos fijos. Los mensuales se prorratean por día."
        />
        <Button
          size="sm"
          onClick={() =>
            setEditing({
              category: 'marketing',
              description: '',
              vendor: '',
              amountCents: 0,
              recurrence: 'monthly',
              startsOn: today(),
              endsOn: null,
            })
          }
        >
          <Plus className="size-4" aria-hidden /> Cargar gasto
        </Button>
      </div>
      {sorted.length === 0 ? (
        <EmptyState
          title="Sin gastos cargados"
          text="Cargá lo que pagás todos los meses para ver el resultado real."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm" style={{ opacity: pending ? 0.6 : 1 }}>
            <thead>
              <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                <th scope="col" className="px-6 py-2.5 font-semibold">
                  Gasto
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Categoría
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Cuándo
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                  Monto
                </th>
                <th scope="col" className="w-12 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  <td className="px-6 py-2.5">
                    <span className="block font-semibold text-ink">{e.description}</span>
                    <span className="block text-xs text-neutral-500">{e.vendor}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge>{label(e.category)}</Badge>
                  </td>
                  <td className="px-3 py-2.5 text-neutral-600">
                    {e.recurrence === 'monthly' ? (
                      <span className="inline-flex items-center gap-1 whitespace-nowrap">
                        <Repeat className="size-3.5" aria-hidden /> Desde {monthOf(e.startsOn)}
                        {e.endsOn && ` hasta ${monthOf(e.endsOn)}`}
                      </span>
                    ) : (
                      <span className="whitespace-nowrap">
                        Único · {formatDate(`${e.startsOn}T12:00:00-03:00`)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-ink tabular-nums">
                    {formatARS(e.amountCents)}
                    {e.recurrence === 'monthly' && (
                      <span className="text-xs font-normal text-neutral-500">/mes</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Menu
                      items={[
                        {
                          label: 'Editar',
                          icon: <Pencil />,
                          onSelect: () => {
                            const { createdAt: _c, ...rest } = e
                            setEditing(rest)
                          },
                        },
                        {
                          label: 'Borrar',
                          icon: <Trash2 />,
                          danger: true,
                          onSelect: async () => {
                            if (
                              await confirm({
                                title: `¿Borrar "${e.description}"?`,
                                description:
                                  'Si dejó de pagarse, mejor ponele fecha de fin: así los meses anteriores siguen bien.',
                                confirm: 'Borrar',
                                danger: true,
                              })
                            )
                              void run(() => deleteExpense(e.id))
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ExpenseSheet expense={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function ExpenseSheet({ expense, onClose }: { expense: ExpenseInput | null; onClose(): void }) {
  const [draft, setDraft] = useState(expense)
  const [last, setLast] = useState(expense)
  if (expense !== last) {
    setLast(expense)
    setDraft(expense)
  }
  const { run, pending, fields } = useAdminAction()
  if (!draft)
    return (
      <Sheet open={false} onOpenChange={onClose} title="">
        {null}
      </Sheet>
    )
  const set = (patch: Partial<ExpenseInput>) => setDraft({ ...draft, ...patch })
  return (
    <Sheet
      open={expense !== null}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      title={draft.id ? 'Editar gasto' : 'Cargar gasto'}
      description="En pesos. Si pagás en dólares, cargalo al tipo de cambio del mes."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() => void run(() => saveExpense(draft), { onSuccess: onClose })}
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Qué es" htmlFor="e-desc" error={fields.description}>
          <Input
            id="e-desc"
            value={draft.description}
            maxLength={120}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Campañas de Instagram"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proveedor" htmlFor="e-vendor" error={fields.vendor}>
            <Input
              id="e-vendor"
              value={draft.vendor}
              maxLength={80}
              onChange={(e) => set({ vendor: e.target.value })}
              placeholder="Meta Ads"
            />
          </Field>
          <Field label="Categoría" htmlFor="e-cat">
            <Select
              id="e-cat"
              value={draft.category}
              onChange={(e) => set({ category: e.target.value as ExpenseInput['category'] })}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Monto" htmlFor="e-amount" error={fields.amountCents}>
          <MoneyInput
            id="e-amount"
            cents={draft.amountCents}
            onChange={(v) => set({ amountCents: v ?? 0 })}
          />
        </Field>
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
            Frecuencia
          </p>
          <Segmented
            id="e-rec"
            size="sm"
            value={draft.recurrence}
            onChange={(v) =>
              set({
                recurrence: v as 'monthly' | 'once',
                endsOn: v === 'once' ? null : draft.endsOn,
              })
            }
            options={[
              { value: 'monthly', label: 'Todos los meses' },
              { value: 'once', label: 'Una sola vez' },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={draft.recurrence === 'monthly' ? 'Desde' : 'Fecha'}
            htmlFor="e-start"
            error={fields.startsOn}
          >
            <Input
              id="e-start"
              type="date"
              value={draft.startsOn}
              onChange={(e) => set({ startsOn: e.target.value })}
            />
          </Field>
          {draft.recurrence === 'monthly' && (
            <Field label="Hasta" htmlFor="e-end" error={fields.endsOn} hint="Vacío = sigue">
              <Input
                id="e-end"
                type="date"
                value={draft.endsOn ?? ''}
                onChange={(e) => set({ endsOn: e.target.value || null })}
              />
            </Field>
          )}
        </div>
      </div>
    </Sheet>
  )
}

// ── Simulador ──────────────────────────────────────────────────────────────

/**
 * "¿Qué pasa si…?": mueve el precio, las ventas y la publicidad y muestra el
 * resultado del mes con los mismos costos que usa el estado de resultados.
 */
export function Simulator({
  basePriceCents,
  salesPerMonth,
  fixedMonthlyCents,
  settings,
}: {
  basePriceCents: number
  salesPerMonth: number
  fixedMonthlyCents: number
  settings: FinanceSettings
}) {
  const [price, setPrice] = useState(0)
  const [volume, setVolume] = useState(0)
  const [ads, setAds] = useState(0)
  const newPrice =
    price === 0 ? basePriceCents : Math.round((basePriceCents * (1 + price / 100)) / 1000) * 1000
  const newSales = Math.max(0, Math.round(salesPerMonth * (1 + volume / 100)))
  const unit = saleCosts(newPrice, settings).contributionCents
  const result = unit * newSales - fixedMonthlyCents - ads * 100_000
  const baseResult =
    saleCosts(basePriceCents, settings).contributionCents * salesPerMonth - fixedMonthlyCents
  const diff = result - baseResult

  return (
    <Card>
      <CardHeader
        icon={<FlaskConical />}
        title="¿Qué pasa si…?"
        description="Simulá un mes con otros números"
      />
      <div className="space-y-4">
        <Slider
          label="Precio promedio"
          value={price}
          onChange={setPrice}
          min={-30}
          max={50}
          suffix="%"
          detail={formatARS(newPrice)}
        />
        <Slider
          label="Ventas por mes"
          value={volume}
          onChange={setVolume}
          min={-50}
          max={100}
          suffix="%"
          detail={`${newSales} ventas`}
        />
        <Slider
          label="Publicidad extra"
          value={ads}
          onChange={setAds}
          min={0}
          max={100}
          step={5}
          prefix="+$"
          suffix=" mil"
          detail={formatARS(ads * 100_000)}
        />
      </div>
      <motion.div
        className={cn('mt-5 rounded-2xl p-4', result >= 0 ? 'bg-[#e7f6e7]' : 'bg-[#fdeaea]')}
        layout
        transition={spring.soft}
      >
        <p className="text-xs font-semibold text-neutral-600">Resultado del mes</p>
        <p
          className={cn(
            'text-2xl font-semibold tabular-nums',
            result >= 0 ? 'text-good-ink' : 'text-critical',
          )}
        >
          {result < 0 ? '− ' : ''}
          {formatARS(Math.abs(Math.round(result / 100) * 100))}
        </p>
        <p className="text-xs text-neutral-600">
          {diff === 0
            ? 'Igual que hoy'
            : `${diff > 0 ? '+' : '−'} ${formatARS(Math.abs(Math.round(diff / 100) * 100))} contra el ritmo actual`}
        </p>
      </motion.div>
    </Card>
  )
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  prefix = '',
  suffix = '',
  detail,
}: {
  label: string
  value: number
  onChange(v: number): void
  min: number
  max: number
  step?: number
  prefix?: string
  suffix?: string
  detail: string
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-xs text-neutral-500 tabular-nums">
          {value > 0 && !prefix ? '+' : ''}
          {prefix}
          {value}
          {suffix} · {detail}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-brand"
      />
    </label>
  )
}
