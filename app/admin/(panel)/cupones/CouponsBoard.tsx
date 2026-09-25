'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarRange,
  Copy,
  Dices,
  Handshake,
  Pencil,
  Plus,
  Timer,
  Trash2,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatARS, formatCompactARS, formatDate } from '@/domain/admin/format'
import type { CouponInput } from '@/domain/admin/inputs'
import type { AdminCoupon } from '@/domain/admin/types'
import { couponDiscount, describeCoupon } from '@/domain/coupons'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input, Select, Textarea } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'
import { useConfirm } from '../../_ui/Confirm'
import { MoneyInput, Segmented, Switch, SwitchRow } from '../../_ui/fields'
import { Menu } from '../../_ui/Menu'
import { Badge, Card, EmptyState, Progress, type Tone } from '../../_ui/primitives'
import { Sheet } from '../../_ui/Sheet'
import { useToast } from '../../_ui/Toast'
import { useAdminAction } from '../../_ui/use-action'
import { deleteCoupon, saveCoupon, setCouponActive, setOfferCoupon } from './actions'

interface Stats {
  uses30: number
  discount30: number
  revenue30: number
  discountAll: number
  revenueAll: number
}

type State = 'active' | 'scheduled' | 'expired' | 'exhausted' | 'paused'

const STATE: Record<State, { label: string; tone: Tone }> = {
  active: { label: 'Activo', tone: 'good' },
  scheduled: { label: 'Programado', tone: 'info' },
  expired: { label: 'Vencido', tone: 'neutral' },
  exhausted: { label: 'Agotado', tone: 'warning' },
  paused: { label: 'Pausado', tone: 'neutral' },
}

function stateOf(c: AdminCoupon, now: number): State {
  if (!c.active) return 'paused'
  if (c.expiresAt && Date.parse(c.expiresAt) <= now) return 'expired'
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return 'exhausted'
  if (c.startsAt && Date.parse(c.startsAt) > now) return 'scheduled'
  return 'active'
}

const dayOf = (iso: string | null) =>
  iso ? new Date(Date.parse(iso) - 3 * 3_600_000).toISOString().slice(0, 10) : null

function toInput(c: AdminCoupon): CouponInput {
  return {
    id: c.id,
    code: c.code,
    kind: c.kind,
    value: c.value,
    active: c.active,
    maxUses: c.maxUses,
    startsOn: dayOf(c.startsAt),
    expiresOn: dayOf(c.expiresAt),
    affiliateId: c.affiliateId,
    description: c.description,
  }
}

const EMPTY: CouponInput = {
  code: '',
  kind: 'percent',
  value: 10,
  active: true,
  maxUses: null,
  startsOn: null,
  expiresOn: null,
  affiliateId: null,
  description: '',
}

export function CouponsBoard({
  coupons,
  affiliates,
  stats,
  offer,
  prices,
  openNew,
}: {
  coupons: AdminCoupon[]
  affiliates: { id: string; name: string }[]
  stats: Record<string, Stats>
  offer: { couponId: string | null; delaySeconds: number }
  prices: { name: string; cents: number }[]
  openNew: boolean
}) {
  const [now] = useState(() => new Date().getTime())
  const [filter, setFilter] = useState<'todos' | State>('todos')
  const [editing, setEditing] = useState<CouponInput | null>(openNew ? EMPTY : null)
  const visible = useMemo(
    () => coupons.filter((c) => filter === 'todos' || stateOf(c, now) === filter),
    [coupons, filter, now],
  )
  const count = (s: State) => coupons.filter((c) => stateOf(c, now) === s).length

  return (
    <div className="space-y-5">
      <OfferCard coupons={coupons} offer={offer} now={now} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Segmented
          id="coupon-filter"
          value={filter}
          onChange={(v) => setFilter(v as 'todos' | State)}
          options={[
            { value: 'todos', label: 'Todos', count: coupons.length },
            { value: 'active', label: 'Activos', count: count('active') },
            { value: 'scheduled', label: 'Programados', count: count('scheduled') },
            { value: 'exhausted', label: 'Agotados', count: count('exhausted') },
            { value: 'expired', label: 'Vencidos', count: count('expired') },
            { value: 'paused', label: 'Pausados', count: count('paused') },
          ]}
        />
        <Button size="sm" className="h-10" onClick={() => setEditing(EMPTY)}>
          <Plus className="size-4" aria-hidden /> Nuevo cupón
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <EmptyState title="No hay cupones en este estado" />
        </Card>
      ) : (
        <motion.ul layout className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((c, i) => (
              <motion.li
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ ...spring.soft, delay: Math.min(i * 0.03, 0.3) }}
              >
                <CouponCard
                  coupon={c}
                  state={stateOf(c, now)}
                  stats={stats[c.id]}
                  affiliate={affiliates.find((a) => a.id === c.affiliateId)?.name}
                  isOffer={offer.couponId === c.id}
                  onEdit={() => setEditing(toInput(c))}
                  onDuplicate={() =>
                    setEditing({ ...toInput(c), id: undefined, code: `${c.code}-2`.slice(0, 32) })
                  }
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      )}

      <CouponSheet
        coupon={editing}
        affiliates={affiliates}
        prices={prices}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}

function OfferCard({
  coupons,
  offer,
  now,
}: {
  coupons: AdminCoupon[]
  offer: { couponId: string | null; delaySeconds: number }
  now: number
}) {
  const { run, pending } = useAdminAction()
  const [couponId, setCouponId] = useState(offer.couponId ?? '')
  const [delay, setDelay] = useState(offer.delaySeconds)
  const dirty = couponId !== (offer.couponId ?? '') || delay !== offer.delaySeconds
  const current = coupons.find((c) => c.id === couponId)
  const usable = current ? stateOf(current, now) === 'active' : true
  return (
    <Card className="bg-gradient-to-br from-white to-brand-soft/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3 lg:flex-1">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-[0_10px_24px_rgba(244,78,99,0.3)]">
            <Zap className="size-5" aria-hidden />
          </span>
          <div>
            <h2 className="font-semibold text-ink">Oferta de la ficha</h2>
            <p className="text-sm text-neutral-600">
              A los segundos que elijas, la página de producto ofrece este cupón (&ldquo;¡Lo quiero
              ya!&rdquo;). El descuento sale del cupón real.
            </p>
            {!usable && (
              <p className="mt-1 text-xs font-semibold text-critical">
                Ese cupón no está activo: la oferta no se va a mostrar.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-semibold text-neutral-500">
            Cupón
            <Select
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
              className="mt-1 h-10 w-64 py-2 text-sm"
            >
              <option value="">Sin oferta</option>
              {coupons.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} · {describeCoupon(c)}
                </option>
              ))}
            </Select>
          </label>
          <label className="text-xs font-semibold text-neutral-500">
            A los (segundos)
            <Input
              type="number"
              min={0}
              max={600}
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value || 0))}
              className="mt-1 h-10 w-28 py-2 text-sm"
            />
          </label>
          <Button
            size="sm"
            className="h-10"
            disabled={!dirty || pending}
            onClick={() => void run(() => setOfferCoupon(couponId || null, delay))}
          >
            {pending && <Spinner />} Guardar
          </Button>
        </div>
      </div>
    </Card>
  )
}

function CouponCard({
  coupon,
  state,
  stats,
  affiliate,
  isOffer,
  onEdit,
  onDuplicate,
}: {
  coupon: AdminCoupon
  state: State
  stats: Stats | undefined
  affiliate?: string
  isOffer: boolean
  onEdit(): void
  onDuplicate(): void
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const { run, pending } = useAdminAction()
  const info = STATE[state]
  const usage = coupon.maxUses ? coupon.usedCount / coupon.maxUses : null
  return (
    <motion.article
      className="relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-white"
      whileHover={{ y: -3, boxShadow: '0 16px 40px rgba(42,36,51,0.1)' }}
      transition={spring.snappy}
      style={{ opacity: pending ? 0.6 : 1 }}
    >
      {/* Troquel de cupón */}
      <div className="relative flex items-center gap-3 border-b border-dashed border-line bg-canvas/60 px-5 py-4">
        <span
          className="absolute top-full -left-3 size-6 -translate-y-1/2 rounded-full border border-line bg-canvas"
          aria-hidden
        />
        <span
          className="absolute top-full -right-3 size-6 -translate-y-1/2 rounded-full border border-line bg-canvas"
          aria-hidden
        />
        <button
          type="button"
          onClick={() =>
            void navigator.clipboard
              .writeText(coupon.code)
              .then(() => toast.success(`${coupon.code} copiado`))
          }
          className="group flex min-w-0 items-center gap-2 font-mono text-lg font-bold tracking-wider text-ink"
          title="Copiar código"
        >
          <span className="truncate">{coupon.code}</span>
          <Copy
            className="size-4 shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        </button>
        <span className="ml-auto shrink-0 rounded-full bg-brand px-3 py-1 text-sm font-bold text-white">
          {describeCoupon(coupon)}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge tone={info.tone} dot>
            {info.label}
          </Badge>
          {isOffer && (
            <Badge tone="brand">
              <Zap className="size-3" aria-hidden /> Oferta de la ficha
            </Badge>
          )}
          {affiliate && (
            <Badge tone="violet">
              <Handshake className="size-3" aria-hidden /> {affiliate}
            </Badge>
          )}
        </div>
        {coupon.description && <p className="text-sm text-neutral-600">{coupon.description}</p>}

        <div className="mt-3 space-y-1.5 text-xs text-neutral-500">
          {(coupon.startsAt || coupon.expiresAt) && (
            <p className="flex items-center gap-1.5">
              <CalendarRange className="size-3.5" aria-hidden />
              {coupon.startsAt ? `Desde ${formatDate(coupon.startsAt)}` : 'Desde ya'}
              {coupon.expiresAt
                ? ` hasta el ${formatDate(new Date(Date.parse(coupon.expiresAt) - 1))}`
                : ', sin vencimiento'}
            </p>
          )}
          <p className="flex items-center gap-1.5">
            <Timer className="size-3.5" aria-hidden />
            {coupon.usedCount.toLocaleString('es-AR')} {coupon.usedCount === 1 ? 'uso' : 'usos'}
            {coupon.maxUses !== null && ` de ${coupon.maxUses.toLocaleString('es-AR')}`}
          </p>
        </div>
        {usage !== null && (
          <Progress
            value={usage}
            tone={usage >= 1 ? 'critical' : usage >= 0.9 ? 'warning' : 'brand'}
            className="mt-2 h-1.5"
            label="Usos del cupón"
          />
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
          <div>
            <p className="text-sm font-semibold text-ink tabular-nums">{stats?.uses30 ?? 0}</p>
            <p className="text-[11px] text-neutral-500">usos 30 d</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink tabular-nums">
              {formatCompactARS(stats?.discountAll ?? 0)}
            </p>
            <p className="text-[11px] text-neutral-500">descontado</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink tabular-nums">
              {formatCompactARS(stats?.revenueAll ?? 0)}
            </p>
            <p className="text-[11px] text-neutral-500">vendido con él</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Switch
            checked={coupon.active}
            onChange={(v) => void run(() => setCouponActive(coupon.id, v))}
            label={coupon.active ? `Pausar ${coupon.code}` : `Activar ${coupon.code}`}
            disabled={pending}
          />
          <span className="text-sm text-neutral-600">{coupon.active ? 'Activo' : 'Pausado'}</span>
          <div className="ml-auto flex items-center">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="size-3.5" aria-hidden /> Editar
            </Button>
            <Menu
              items={[
                { label: 'Duplicar', icon: <Copy />, onSelect: onDuplicate },
                'separator',
                {
                  label: 'Borrar',
                  icon: <Trash2 />,
                  danger: true,
                  disabled: coupon.usedCount > 0 || isOffer,
                  onSelect: async () => {
                    if (
                      await confirm({
                        title: `¿Borrar ${coupon.code}?`,
                        description:
                          'Nunca se usó, así que se puede borrar sin afectar ninguna venta.',
                        confirm: 'Borrar',
                        danger: true,
                      })
                    )
                      void run(() => deleteCoupon(coupon.id))
                  },
                },
              ]}
            />
          </div>
        </div>
      </div>
    </motion.article>
  )
}

function randomCode() {
  const words = ['REGALO', 'BOXIE', 'SORPRESA', 'MIMO', 'FESTEJO', 'AMOR', 'AMIGO']
  const word = words[Math.floor(Math.random() * words.length)]!
  return `${word}${Math.floor(10 + Math.random() * 40)}`
}

function CouponSheet({
  coupon,
  affiliates,
  prices,
  onClose,
}: {
  coupon: CouponInput | null
  affiliates: { id: string; name: string }[]
  prices: { name: string; cents: number }[]
  onClose(): void
}) {
  const [draft, setDraft] = useState<CouponInput | null>(coupon)
  const [last, setLast] = useState(coupon)
  if (coupon !== last) {
    setLast(coupon)
    setDraft(coupon)
  }
  const { run, pending, fields } = useAdminAction()
  if (!draft)
    return (
      <Sheet open={false} onOpenChange={onClose} title="">
        {null}
      </Sheet>
    )
  const set = (patch: Partial<CouponInput>) => setDraft({ ...draft, ...patch })
  const isNew = !draft.id

  return (
    <Sheet
      open={coupon !== null}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      title={isNew ? 'Nuevo cupón' : `Editar ${coupon?.code}`}
      description="El checkout lo valida en el servidor: fechas, tope de usos y que esté activo."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() => void run(() => saveCoupon(draft), { onSuccess: onClose })}
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field
          label="Código"
          htmlFor="c-code"
          error={fields.code}
          hint="Lo que escribe el cliente. Mayúsculas, números, - y _."
        >
          <div className="flex gap-2">
            <Input
              id="c-code"
              value={draft.code}
              maxLength={32}
              className="font-mono font-semibold tracking-wider uppercase"
              onChange={(e) => set({ code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="size-12 shrink-0 rounded-xl"
              onClick={() => set({ code: randomCode() })}
              aria-label="Inventar un código"
            >
              <Dices className="size-5" aria-hidden />
            </Button>
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">Tipo</p>
            <Segmented
              id="c-kind"
              size="sm"
              value={draft.kind}
              onChange={(v) =>
                set({ kind: v as 'percent' | 'fixed', value: v === 'percent' ? 10 : 50_000 })
              }
              options={[
                { value: 'percent', label: 'Porcentaje' },
                { value: 'fixed', label: 'Monto fijo' },
              ]}
            />
          </div>
          <Field
            label={draft.kind === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}
            htmlFor="c-value"
            error={fields.value}
          >
            {draft.kind === 'percent' ? (
              <Input
                id="c-value"
                type="number"
                min={1}
                max={100}
                value={draft.value}
                onChange={(e) => set({ value: Number(e.target.value || 0) })}
              />
            ) : (
              <MoneyInput
                id="c-value"
                cents={draft.value}
                onChange={(v) => set({ value: v ?? 0 })}
              />
            )}
          </Field>
        </div>

        {prices.length > 0 && draft.value > 0 && (
          <div className="rounded-2xl bg-canvas p-4 text-sm">
            <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
              Así queda
            </p>
            <ul className="space-y-1">
              {prices.map((p) => {
                const off = couponDiscount({ kind: draft.kind, value: draft.value }, p.cents)
                return (
                  <li key={p.name} className="flex justify-between gap-3">
                    <span className="text-neutral-600">{p.name}</span>
                    <span className="tabular-nums">
                      <span className="text-neutral-400 line-through">{formatARS(p.cents)}</span>{' '}
                      <span className="font-semibold text-ink">{formatARS(p.cents - off)}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Desde" htmlFor="c-start" error={fields.startsOn} hint="Vacío = ya">
            <Input
              id="c-start"
              type="date"
              value={draft.startsOn ?? ''}
              onChange={(e) => set({ startsOn: e.target.value || null })}
            />
          </Field>
          <Field
            label="Vence (sin incluir)"
            htmlFor="c-end"
            error={fields.expiresOn}
            hint="Vacío = nunca"
          >
            <Input
              id="c-end"
              type="date"
              value={draft.expiresOn ?? ''}
              onChange={(e) => set({ expiresOn: e.target.value || null })}
            />
          </Field>
          <Field
            label="Tope de usos"
            htmlFor="c-max"
            error={fields.maxUses}
            hint="Vacío = sin tope"
          >
            <Input
              id="c-max"
              type="number"
              min={1}
              value={draft.maxUses ?? ''}
              onChange={(e) => set({ maxUses: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label="Afiliado" htmlFor="c-aff">
            <Select
              id="c-aff"
              value={draft.affiliateId ?? ''}
              onChange={(e) => set({ affiliateId: e.target.value || null })}
            >
              <option value="">Ninguno</option>
              {affiliates.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Nota interna" htmlFor="c-desc" error={fields.description}>
          <Textarea
            id="c-desc"
            rows={2}
            maxLength={200}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="Para qué campaña es"
          />
        </Field>
        <SwitchRow
          label="Activo"
          hint="Pausado, el checkout lo rechaza"
          checked={draft.active}
          onChange={(v) => set({ active: v })}
        />
        <p className={cn('text-xs text-neutral-500', !isNew && 'hidden')}>
          Tip: un código corto y fácil de dictar funciona mejor en redes y audios.
        </p>
      </div>
    </Sheet>
  )
}
