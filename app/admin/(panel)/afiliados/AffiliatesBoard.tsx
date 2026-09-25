'use client'

import { motion } from 'framer-motion'
import { Handshake, Mail, Pencil, Plus, TicketPercent } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { formatARS, formatBps } from '@/domain/admin/format'
import type { AffiliateInput } from '@/domain/admin/inputs'
import type { AdminAffiliate } from '@/domain/admin/types'
import { Button } from '@/ui/Button'
import { Field, Input, Textarea } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'
import { PercentInput, SwitchRow } from '../../_ui/fields'
import { Badge, Card, EmptyState } from '../../_ui/primitives'
import { Sheet } from '../../_ui/Sheet'
import { useAdminAction } from '../../_ui/use-action'
import { saveAffiliate } from './actions'

interface Row {
  affiliate: AdminAffiliate
  coupons: string[]
  sales: number
  revenue: number
  monthSales: number
  monthRevenue: number
  monthCommission: number
  lastMonthCommission: number
  totalCommission: number
}

const EMPTY: AffiliateInput = {
  name: '',
  code: '',
  commissionBps: 1000,
  active: true,
  email: '',
  notes: '',
}

export function AffiliatesBoard({ rows }: { rows: Row[] }) {
  const [editing, setEditing] = useState<AffiliateInput | null>(null)
  const owed = rows.reduce((s, r) => s + r.lastMonthCommission, 0)
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-gradient-to-br from-white to-[#f1ebfb]">
          <p className="text-xs font-medium text-neutral-500">A liquidar (mes anterior)</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{formatARS(owed)}</p>
          <p className="text-xs text-neutral-500">Se paga el 5 de cada mes</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500">Ventas con afiliados este mes</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {rows.reduce((s, r) => s + r.monthSales, 0)}
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500">Comisión acumulada este mes</p>
          <p className="mt-1 text-2xl font-semibold text-ink">
            {formatARS(rows.reduce((s, r) => s + r.monthCommission, 0))}
          </p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" className="h-10" onClick={() => setEditing(EMPTY)}>
          <Plus className="size-4" aria-hidden /> Nuevo afiliado
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Handshake />}
            title="Todavía no hay afiliados"
            text="Sumá a creadores o comercios que recomienden Boxie con su propio cupón."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {rows.map((r, i) => (
            <motion.article
              key={r.affiliate.id}
              className="flex flex-col rounded-[22px] border border-line bg-white p-5"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: r.affiliate.active ? 1 : 0.65, y: 0 }}
              transition={{ ...spring.soft, delay: i * 0.06 }}
              whileHover={{ y: -3 }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{r.affiliate.name}</p>
                  <p className="font-mono text-xs text-neutral-500">{r.affiliate.code}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge tone="violet">{formatBps(r.affiliate.commissionBps)}</Badge>
                  {!r.affiliate.active && <Badge>Pausado</Badge>}
                </div>
              </div>
              {r.affiliate.notes && (
                <p className="mt-2 text-sm text-neutral-600">{r.affiliate.notes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {r.coupons.length ? (
                  r.coupons.map((c) => (
                    <Link
                      key={c}
                      href="/admin/cupones"
                      className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 font-mono text-xs font-semibold text-ink hover:text-brand"
                    >
                      <TicketPercent className="size-3" aria-hidden /> {c}
                    </Link>
                  ))
                ) : (
                  <span className="text-xs text-neutral-500">
                    Sin cupón asignado: creá uno en Cupones.
                  </span>
                )}
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                <div>
                  <dd className="text-sm font-semibold text-ink tabular-nums">{r.sales}</dd>
                  <dt className="text-[11px] text-neutral-500">ventas</dt>
                </div>
                <div>
                  <dd className="text-sm font-semibold text-ink tabular-nums">
                    {formatARS(r.lastMonthCommission)}
                  </dd>
                  <dt className="text-[11px] text-neutral-500">mes anterior</dt>
                </div>
                <div>
                  <dd className="text-sm font-semibold text-ink tabular-nums">
                    {formatARS(r.monthCommission)}
                  </dd>
                  <dt className="text-[11px] text-neutral-500">este mes</dt>
                </div>
              </dl>
              <div className="mt-4 flex items-center gap-2">
                {r.affiliate.email && (
                  <a
                    href={`mailto:${r.affiliate.email}`}
                    className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
                  >
                    <Mail className="size-4" aria-hidden /> Escribir
                  </a>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto"
                  onClick={() => {
                    const { createdAt: _c, ...rest } = r.affiliate
                    setEditing(rest)
                  }}
                >
                  <Pencil className="size-3.5" aria-hidden /> Editar
                </Button>
              </div>
            </motion.article>
          ))}
        </div>
      )}
      <AffiliateSheet affiliate={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function AffiliateSheet({
  affiliate,
  onClose,
}: {
  affiliate: AffiliateInput | null
  onClose(): void
}) {
  const [draft, setDraft] = useState(affiliate)
  const [last, setLast] = useState(affiliate)
  if (affiliate !== last) {
    setLast(affiliate)
    setDraft(affiliate)
  }
  const { run, pending, fields } = useAdminAction()
  if (!draft)
    return (
      <Sheet open={false} onOpenChange={onClose} title="">
        {null}
      </Sheet>
    )
  const set = (patch: Partial<AffiliateInput>) => setDraft({ ...draft, ...patch })
  return (
    <Sheet
      open={affiliate !== null}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      title={draft.id ? `Editar ${affiliate?.name}` : 'Nuevo afiliado'}
      description="La comisión se calcula sobre lo cobrado en ventas con sus cupones."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() => void run(() => saveAffiliate(draft), { onSuccess: onClose })}
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre" htmlFor="a-name" error={fields.name}>
          <Input
            id="a-name"
            value={draft.name}
            maxLength={120}
            onChange={(e) => set({ name: e.target.value })}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Código interno" htmlFor="a-code" error={fields.code}>
            <Input
              id="a-code"
              value={draft.code}
              className="font-mono uppercase"
              maxLength={32}
              onChange={(e) => set({ code: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Comisión" htmlFor="a-bps" error={fields.commissionBps}>
            <PercentInput
              id="a-bps"
              bps={draft.commissionBps}
              onChange={(v) => set({ commissionBps: v })}
            />
          </Field>
        </div>
        <Field label="Mail" htmlFor="a-email" error={fields.email}>
          <Input
            id="a-email"
            type="email"
            value={draft.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Notas" htmlFor="a-notes" error={fields.notes}>
          <Textarea
            id="a-notes"
            rows={3}
            maxLength={500}
            value={draft.notes}
            onChange={(e) => set({ notes: e.target.value })}
            placeholder="Cómo y cuándo se le paga, acuerdos…"
          />
        </Field>
        <SwitchRow label="Activo" checked={draft.active} onChange={(v) => set({ active: v })} />
      </div>
    </Sheet>
  )
}
