'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarClock,
  Check,
  Crown,
  ImageIcon,
  KeyRound,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState, type ReactNode } from 'react'
import { formatARS, formatCompactARS, formatPercent } from '@/domain/admin/format'
import type { PlanInput } from '@/domain/admin/inputs'
import { savingsPercent, type Plan, type PlanIssue } from '@/domain/plans'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../_ui/Confirm'
import { ListInput, MoneyInput, SwitchRow } from '../../_ui/fields'
import { Menu } from '../../_ui/Menu'
import { Badge, Card, CardHeader } from '../../_ui/primitives'
import { Sheet } from '../../_ui/Sheet'
import { useAdminAction } from '../../_ui/use-action'
import { deletePlan, savePlan, setPlanActive } from './actions'

interface Stats {
  sales30: number
  revenue30: number
  share30: number
  contribution30: number
  margin30: number
  salesAll: number
}

interface ThemeRow {
  id: string
  name: string
  status: string
  contents: { planSlug: string; screens: number; modules: number; games: number }[]
}

const COLORS = ['#73CFEE', '#F44E63', '#C893D7', '#FFD700', '#2BB673', '#2A2433', '#FF8A3D']

const emptyPlan = (rank: number): PlanInput => ({
  slug: '',
  name: '',
  tagline: '',
  priceCents: 0,
  compareAtCents: null,
  rank,
  color: COLORS[(rank - 1) % COLORS.length]!,
  features: [],
  limits: { giftLifetimeDays: 60, maxPhotos: 15, allowPassword: true },
  highlighted: false,
  active: true,
})

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)

export function PlansBoard({
  plans,
  issues,
  stats,
  themes,
}: {
  plans: Plan[]
  issues: PlanIssue[]
  stats: Record<string, Stats>
  themes: ThemeRow[]
}) {
  const [editing, setEditing] = useState<PlanInput | null>(null)
  const active = plans.filter((p) => p.active)

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {issues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-3 rounded-2xl border border-[#f3d27a] bg-[#fff8e1] p-4 text-sm text-[#6b5000]">
              <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <p className="font-semibold">Revisá la grilla de planes</p>
                <ul className="mt-1 list-disc pl-5">
                  {issues.map((i, n) => (
                    <li key={n}>
                      {plans.find((p) => p.id === i.planId)?.name
                        ? `${plans.find((p) => p.id === i.planId)!.name}: `
                        : ''}
                      {i.message}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600">
          {active.length} {active.length === 1 ? 'plan activo' : 'planes activos'} · ordenados por
          nivel
        </p>
        <Button size="sm" onClick={() => setEditing(emptyPlan((plans.at(-1)?.rank ?? 0) + 1))}>
          <Plus className="size-4" aria-hidden /> Nuevo plan
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            stats={stats[plan.id]}
            delay={i * 0.08}
            onEdit={() => {
              const { id, createdAt: _c, updatedAt: _u, ...rest } = plan
              setEditing({ ...rest, id })
            }}
          />
        ))}
      </div>

      <Card delay={0.2} padded={false}>
        <div className="p-5 pb-3 sm:p-6 sm:pb-3">
          <CardHeader
            className="mb-0"
            title="Qué incluye cada plan, temática por temática"
            description="Pantallas por plan. Se ajusta en la pestaña Planes de cada temática."
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-y border-line bg-canvas/60 text-xs text-neutral-500">
                <th scope="col" className="px-6 py-2.5 text-left font-semibold">
                  Temática
                </th>
                {active.map((p) => (
                  <th key={p.id} scope="col" className="px-4 py-2.5 text-center font-semibold">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {themes.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0 hover:bg-canvas/50">
                  <th scope="row" className="px-6 py-3 text-left font-medium">
                    <Link
                      href={`/admin/tematicas/${t.id}?tab=planes` as Route}
                      className="text-ink hover:text-brand"
                    >
                      {t.name}
                    </Link>
                    {t.status === 'draft' && (
                      <Badge tone="warning" className="ml-2">
                        Borrador
                      </Badge>
                    )}
                  </th>
                  {active.map((p) => {
                    const c = t.contents.find((x) => x.planSlug === p.slug)
                    return (
                      <td key={p.id} className="px-4 py-3 text-center tabular-nums">
                        {c ? (
                          <span className="inline-flex flex-col items-center">
                            <span className="font-semibold text-ink">{c.screens}</span>
                            <span className="text-[11px] text-neutral-500">
                              {c.modules} módulos · {c.games} juegos
                            </span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <PlanSheet plan={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function PlanCard({
  plan,
  stats,
  delay,
  onEdit,
}: {
  plan: Plan
  stats: Stats | undefined
  delay: number
  onEdit(): void
}) {
  const confirm = useConfirm()
  const { run, pending } = useAdminAction()
  const savings = savingsPercent(plan)
  return (
    <motion.article
      className={cn(
        'relative flex flex-col rounded-[26px] border bg-white p-6 shadow-[0_1px_2px_rgba(42,36,51,0.04)]',
        plan.highlighted
          ? 'border-brand/40 shadow-[0_20px_50px_rgba(244,78,99,0.14)]'
          : 'border-line',
        !plan.active && 'opacity-60',
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: plan.active ? 1 : 0.6, y: 0 }}
      transition={{ ...spring.soft, delay }}
      whileHover={{ y: -4 }}
    >
      {plan.highlighted && (
        <motion.span
          className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-[11px] font-bold tracking-wide text-white uppercase shadow-[0_8px_20px_rgba(244,78,99,0.35)]"
          initial={{ scale: 0, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring.bouncy, delay: delay + 0.2 }}
        >
          <Crown className="size-3.5" aria-hidden /> Más elegido
        </motion.span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold text-ink">
            <span className="size-3 rounded-full" style={{ background: plan.color }} aria-hidden />
            {plan.name}
            {!plan.active && <Badge>Pausado</Badge>}
          </p>
          <p className="text-sm text-neutral-500">{plan.tagline}</p>
        </div>
        <Menu
          items={[
            { label: 'Editar', icon: <Pencil />, onSelect: onEdit },
            {
              label: plan.active ? 'Pausar' : 'Reactivar',
              icon: plan.active ? <Pause /> : <Play />,
              onSelect: () => void run(() => setPlanActive(plan.id, !plan.active)),
            },
            'separator',
            {
              label: 'Borrar',
              icon: <Trash2 />,
              danger: true,
              disabled: (stats?.salesAll ?? 0) > 0,
              onSelect: async () => {
                if (
                  await confirm({
                    title: `¿Borrar el plan ${plan.name}?`,
                    description:
                      'No tiene ventas. Las pantallas asignadas a este plan pasan a estar en todos.',
                    confirm: 'Borrar',
                    danger: true,
                  })
                )
                  void run(() => deletePlan(plan.id))
              },
            },
          ]}
        />
      </div>

      <div className="mt-5 flex items-end gap-2">
        <p className="text-4xl font-semibold tracking-tight text-ink">
          {formatARS(plan.priceCents)}
        </p>
        {plan.compareAtCents && (
          <p className="mb-1 text-sm text-neutral-400 line-through">
            {formatARS(plan.compareAtCents)}
          </p>
        )}
        {savings > 0 && (
          <Badge tone="good" className="mb-1.5">
            −{savings}%
          </Badge>
        )}
      </div>

      <ul className="mt-5 space-y-2 text-sm">
        <Limit icon={<CalendarClock />} text={`Online ${plan.limits.giftLifetimeDays} días`} />
        <Limit icon={<ImageIcon />} text={`Hasta ${plan.limits.maxPhotos} fotos`} />
        <Limit
          icon={<KeyRound />}
          text={plan.limits.allowPassword ? 'Clave opcional para abrirla' : 'Sin clave'}
          off={!plan.limits.allowPassword}
        />
        {plan.features.map((f) => (
          <Limit key={f} icon={<Check />} text={f} />
        ))}
      </ul>

      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-4 text-center">
        <div>
          <p className="font-semibold text-ink tabular-nums">{stats?.sales30 ?? 0}</p>
          <p className="text-[11px] text-neutral-500">ventas 30 d</p>
        </div>
        <div>
          <p className="font-semibold text-ink tabular-nums">
            {formatCompactARS(stats?.revenue30 ?? 0)}
          </p>
          <p className="text-[11px] text-neutral-500">facturado</p>
        </div>
        <div>
          <p className="font-semibold text-ink tabular-nums">
            {formatPercent(stats?.margin30 ?? 0, 0)}
          </p>
          <p className="text-[11px] text-neutral-500">margen</p>
        </div>
      </div>
      <Button variant="secondary" size="sm" className="mt-4" onClick={onEdit} disabled={pending}>
        {pending ? <Spinner /> : <Pencil className="size-3.5" aria-hidden />} Editar plan
      </Button>
    </motion.article>
  )
}

function Limit({ icon, text, off = false }: { icon: ReactNode; text: string; off?: boolean }) {
  return (
    <li className={cn('flex items-start gap-2.5', off ? 'text-neutral-400' : 'text-neutral-700')}>
      <span
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full [&_svg]:size-3',
          off ? 'bg-neutral-100' : 'bg-brand-soft text-brand',
        )}
      >
        {off ? <X aria-hidden /> : icon}
      </span>
      {text}
    </li>
  )
}

function PlanSheet({ plan, onClose }: { plan: PlanInput | null; onClose(): void }) {
  const [draft, setDraft] = useState<PlanInput | null>(plan)
  const [lastPlan, setLastPlan] = useState(plan)
  if (plan !== lastPlan) {
    setLastPlan(plan)
    setDraft(plan)
  }
  const { run, pending, fields } = useAdminAction()
  if (!draft)
    return (
      <Sheet open={false} onOpenChange={onClose} title="">
        {null}
      </Sheet>
    )
  const set = (patch: Partial<PlanInput>) => setDraft({ ...draft, ...patch })
  const setLimits = (patch: Partial<PlanInput['limits']>) =>
    setDraft({ ...draft, limits: { ...draft.limits, ...patch } })
  const isNew = !draft.id

  return (
    <Sheet
      open={plan !== null}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      title={isNew ? 'Nuevo plan' : `Editar ${plan?.name}`}
      description="El precio se cobra en el checkout. Las pantallas que incluye se eligen en cada temática."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() => void run(() => savePlan(draft), { onSuccess: onClose })}
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="p-name" error={fields.name}>
            <Input
              id="p-name"
              value={draft.name}
              maxLength={40}
              onChange={(e) =>
                set({
                  name: e.target.value,
                  ...(isNew ? { slug: slugify(e.target.value) } : {}),
                })
              }
            />
          </Field>
          <Field
            label="Identificador"
            htmlFor="p-slug"
            error={fields.slug}
            hint="Lo usan las temáticas"
          >
            <Input
              id="p-slug"
              value={draft.slug}
              className="font-mono text-sm"
              onChange={(e) => set({ slug: slugify(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Bajada" htmlFor="p-tagline" error={fields.tagline}>
          <Input
            id="p-tagline"
            value={draft.tagline}
            maxLength={80}
            onChange={(e) => set({ tagline: e.target.value })}
            placeholder="Lo justo para emocionar"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio" htmlFor="p-price" error={fields.priceCents}>
            <MoneyInput
              id="p-price"
              cents={draft.priceCents}
              onChange={(v) => set({ priceCents: v ?? 0 })}
              invalid={!!fields.priceCents}
            />
          </Field>
          <Field
            label="Precio tachado"
            htmlFor="p-compare"
            error={fields.compareAtCents}
            hint="Opcional: el “antes”"
          >
            <MoneyInput
              id="p-compare"
              cents={draft.compareAtCents}
              allowEmpty
              onChange={(v) => set({ compareAtCents: v })}
              invalid={!!fields.compareAtCents}
            />
          </Field>
          <Field label="Nivel" htmlFor="p-rank" error={fields.rank} hint="1 = el más básico">
            <Input
              id="p-rank"
              type="number"
              min={1}
              max={20}
              value={draft.rank}
              onChange={(e) => set({ rank: Number(e.target.value || 1) })}
            />
          </Field>
          <div>
            <p className="mb-2 block text-xs font-bold tracking-wide text-neutral-500 uppercase">
              Color
            </p>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <motion.button
                  key={c}
                  type="button"
                  onClick={() => set({ color: c })}
                  className={cn(
                    'size-9 rounded-full ring-offset-2 transition-shadow',
                    draft.color === c && 'ring-2 ring-ink',
                  )}
                  style={{ background: c }}
                  whileTap={{ scale: 0.85 }}
                  aria-label={`Color ${c}`}
                  aria-pressed={draft.color === c}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl bg-canvas p-4 sm:grid-cols-2">
          <Field label="Días online" htmlFor="p-days" error={fields['limits.giftLifetimeDays']}>
            <Input
              id="p-days"
              type="number"
              min={1}
              value={draft.limits.giftLifetimeDays}
              onChange={(e) => setLimits({ giftLifetimeDays: Number(e.target.value || 1) })}
            />
          </Field>
          <Field label="Fotos máximas" htmlFor="p-photos" error={fields['limits.maxPhotos']}>
            <Input
              id="p-photos"
              type="number"
              min={0}
              max={30}
              value={draft.limits.maxPhotos}
              onChange={(e) => setLimits({ maxPhotos: Number(e.target.value || 0) })}
            />
          </Field>
          <div className="sm:col-span-2">
            <SwitchRow
              label="Clave para abrir el regalo"
              hint="El comprador le puede poner clave"
              checked={draft.limits.allowPassword}
              onChange={(v) => setLimits({ allowPassword: v })}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
            Beneficios que se muestran
          </p>
          <ListInput
            values={draft.features}
            onChange={(features) => set({ features })}
            placeholder="Ej.: Soporte prioritario por WhatsApp"
          />
        </div>

        <SwitchRow
          label="Destacado (“el más elegido”)"
          hint="Uno solo: al marcar este se desmarca el anterior"
          checked={draft.highlighted}
          onChange={(v) => set({ highlighted: v })}
        />
        <SwitchRow
          label="Activo"
          hint="Pausado no se ofrece en la tienda"
          checked={draft.active}
          onChange={(v) => set({ active: v })}
        />
      </div>
    </Sheet>
  )
}
