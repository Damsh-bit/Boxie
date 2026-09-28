'use client'

import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarRange,
  DatabaseZap,
  Globe,
  Handshake,
  Mail,
  MessageCircle,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  SPONSOR_INTERESTS,
  SPONSOR_INTEREST_LABELS,
  SPONSOR_KINDS,
  SPONSOR_KIND_LABELS,
  SPONSOR_PLACEMENTS,
  SPONSOR_PLACEMENT_LABELS,
  SPONSOR_STAGES,
  SPONSOR_STAGE_LABELS,
  isLive,
  sponsorFor,
  toPublic,
  type Sponsor,
  type SponsorInput,
  type SponsorPlacement,
  type SponsorStage,
} from '@/domain/sponsors'
import { Button } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Field, Input, Select, Textarea } from '@/ui/form'
import { spring, Spinner } from '@/ui/motion'
import { SponsorMark, SponsorTile } from '@/ui/sponsors/SponsorUnits'
import { useConfirm } from '../../_ui/Confirm'
import { Segmented } from '../../_ui/fields'
import { Badge, Card, EmptyState, type Tone } from '../../_ui/primitives'
import { Sheet } from '../../_ui/Sheet'
import { useAdminAction } from '../../_ui/use-action'
import { deleteSponsor, saveSponsor } from './actions'

const STAGE_TONE: Record<SponsorStage, Tone> = {
  lead: 'brand',
  conversacion: 'info',
  activo: 'good',
  pausado: 'warning',
  finalizado: 'neutral',
}

/** El paso siguiente del recorrido (el botón rápido de cada tarjeta). */
const NEXT: Partial<Record<SponsorStage, SponsorStage>> = {
  lead: 'conversacion',
  pausado: 'activo',
}

const EMPTY: SponsorInput = {
  name: '',
  kind: 'local',
  stage: 'lead',
  tagline: '',
  offer: '',
  description: '',
  emoji: '☕',
  logoUrl: null,
  color: '#F44E63',
  url: null,
  city: '',
  couponCode: null,
  placements: [],
  startsOn: null,
  endsOn: null,
  sortOrder: 0,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  interests: [],
  notes: '',
}

function toInput(s: Sponsor): SponsorInput {
  const { source: _s, createdAt: _c, updatedAt: _u, ...rest } = s
  return rest
}

type Filter = 'todos' | SponsorStage

export function SponsorsBoard({
  sponsors,
  available,
  demo,
}: {
  sponsors: Sponsor[]
  available: boolean
  demo: boolean
}) {
  const [filter, setFilter] = useState<Filter>('todos')
  const [editing, setEditing] = useState<SponsorInput | null>(null)
  const live = useMemo(() => sponsors.filter((s) => isLive(s)).map(toPublic), [sponsors])
  const count = (stage: SponsorStage) => sponsors.filter((s) => s.stage === stage).length
  const shown = filter === 'todos' ? sponsors : sponsors.filter((s) => s.stage === filter)

  return (
    <div className="space-y-5">
      {!available && (
        <Card className="border-dashed border-[#c9a100]/60 bg-gold/5" padded={false}>
          <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:p-6">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/20 text-[#7a5800]">
              <DatabaseZap className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-ink">Falta la tabla de sponsors en la base</p>
              <p className="mt-0.5 text-neutral-600">
                Hasta aplicar la migración{' '}
                <code className="rounded bg-white px-1">20260928120000_sponsors.sql</code> no se
                guardan sponsors: el sitio muestra la invitación a sumarse y los pedidos de /marcas
                llegan solo por mail.
              </p>
            </div>
            <Link
              href="/admin/sistema"
              className="shrink-0 text-sm font-semibold text-brand hover:underline"
            >
              Ver qué falta
            </Link>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className={cn(count('lead') > 0 && 'bg-gradient-to-br from-white to-brand-soft')}>
          <p className="text-xs font-medium text-neutral-500">Contactos nuevos</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{count('lead')}</p>
          <p className="text-xs text-neutral-500">
            {sponsors.filter((s) => s.source === 'web').length} llegaron desde /marcas
          </p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500">En conversación</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{count('conversacion')}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500">Se ven hoy en el sitio</p>
          <p className="mt-1 text-2xl font-semibold text-ink">{live.length}</p>
          <p className="text-xs text-neutral-500">Activos y dentro de sus fechas</p>
        </Card>
        <Card>
          <p className="text-xs font-medium text-neutral-500">Espacios</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {SPONSOR_PLACEMENTS.map((p) => {
              const here = sponsorFor(live, p)
              const rotating = live.filter((s) => s.placements.includes(p)).length
              return (
                <li key={p} className="flex items-center justify-between gap-2">
                  <span className="truncate text-neutral-600">
                    {SPONSOR_PLACEMENT_LABELS[p].split(' (')[0]}
                  </span>
                  {here ? (
                    <Badge tone="good" dot>
                      {here.name}
                      {rotating > 1 && ` +${rotating - 1}`}
                    </Badge>
                  ) : (
                    <Badge>Libre</Badge>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          id="sponsors-etapa"
          size="sm"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todos', label: 'Todos', count: sponsors.length },
            ...SPONSOR_STAGES.map((s) => ({
              value: s,
              label: SPONSOR_STAGE_LABELS[s],
              count: count(s),
            })),
          ]}
        />
        <Button size="sm" className="h-10" disabled={!available} onClick={() => setEditing(EMPTY)}>
          <Plus className="size-4" aria-hidden /> Nuevo sponsor
        </Button>
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Handshake />}
            title={filter === 'todos' ? 'Todavía no hay sponsors' : 'Nada en esta etapa'}
            text="Los pedidos de /marcas (“Quiero ser aliado”) entran solos como contactos nuevos. También podés sumar uno a mano."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((s, i) => (
            <SponsorCard key={s.id} sponsor={s} index={i} onEdit={() => setEditing(toInput(s))} />
          ))}
        </div>
      )}

      {demo && (
        <p className="text-xs text-neutral-500">
          Modo demo: los sponsors de muestra son inventados y los cambios viven en la memoria del
          servidor.
        </p>
      )}

      <SponsorSheet sponsor={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function SponsorCard({
  sponsor: s,
  index,
  onEdit,
}: {
  sponsor: Sponsor
  index: number
  onEdit(): void
}) {
  const { run, pending } = useAdminAction()
  const liveNow = isLive(s)
  const next = NEXT[s.stage]
  const phone = s.contactPhone.replace(/[^\d]/g, '')
  return (
    <motion.article
      className="flex flex-col rounded-[22px] border border-line bg-white p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: s.stage === 'finalizado' ? 0.6 : pending ? 0.7 : 1, y: 0 }}
      transition={{ ...spring.soft, delay: Math.min(index, 8) * 0.05 }}
      whileHover={{ y: -3 }}
    >
      <div className="flex items-start gap-3">
        <SponsorMark sponsor={s} size={48} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-ink">{s.name}</p>
          <p className="truncate text-xs text-neutral-500">
            {SPONSOR_KIND_LABELS[s.kind]}
            {s.city && ` · ${s.city}`}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge tone={STAGE_TONE[s.stage]} dot={liveNow}>
            {liveNow ? 'En el sitio' : SPONSOR_STAGE_LABELS[s.stage]}
          </Badge>
          {s.source === 'web' && <Badge tone="violet">Desde /marcas</Badge>}
        </div>
      </div>

      {(s.offer || s.tagline) && (
        <p className="mt-3 text-sm text-neutral-700">{s.offer || s.tagline}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {s.placements.map((p) => (
          <span
            key={p}
            className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-xs font-semibold text-ink"
          >
            <Globe className="size-3" aria-hidden /> {SPONSOR_PLACEMENT_LABELS[p].split(' (')[0]}
          </span>
        ))}
        {(s.startsOn || s.endsOn) && (
          <span className="inline-flex items-center gap-1 rounded-md bg-canvas px-2 py-0.5 text-xs text-neutral-600">
            <CalendarRange className="size-3" aria-hidden />
            {s.startsOn ?? '…'} → {s.endsOn ?? '…'}
          </span>
        )}
        {s.interests.map((i) => (
          <span
            key={i}
            className="rounded-md bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand-dark"
          >
            {SPONSOR_INTEREST_LABELS[i]}
          </span>
        ))}
      </div>

      {s.notes && <p className="mt-3 line-clamp-3 text-sm text-neutral-500">{s.notes}</p>}

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
        {s.contactEmail && (
          <a
            href={`mailto:${s.contactEmail}`}
            className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
            title={s.contactEmail}
          >
            <Mail className="size-4" aria-hidden /> Mail
          </a>
        )}
        {phone.length >= 8 && (
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
          >
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        )}
        <div className="ml-auto flex items-center gap-1">
          {next && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending || (next === 'activo' && s.placements.length === 0)}
              onClick={() =>
                void run(() => saveSponsor({ ...toInput(s), stage: next }), {
                  success: `${s.name}: ${SPONSOR_STAGE_LABELS[next].toLowerCase()}`,
                })
              }
            >
              {pending ? <Spinner /> : <ArrowRight className="size-3.5" aria-hidden />}
              {SPONSOR_STAGE_LABELS[next]}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            <Pencil className="size-3.5" aria-hidden /> Editar
          </Button>
        </div>
      </div>
    </motion.article>
  )
}

function SponsorSheet({ sponsor, onClose }: { sponsor: SponsorInput | null; onClose(): void }) {
  const [draft, setDraft] = useState(sponsor)
  const [last, setLast] = useState(sponsor)
  if (sponsor !== last) {
    setLast(sponsor)
    setDraft(sponsor)
  }
  const { run, pending, fields } = useAdminAction()
  const confirm = useConfirm()
  if (!draft)
    return (
      <Sheet open={false} onOpenChange={onClose} title="">
        {null}
      </Sheet>
    )
  const set = (patch: Partial<SponsorInput>) => setDraft({ ...draft, ...patch })
  const togglePlacement = (p: SponsorPlacement) =>
    set({
      placements: draft.placements.includes(p)
        ? draft.placements.filter((x) => x !== p)
        : [...draft.placements, p],
    })
  const preview = {
    ...draft,
    id: draft.id ?? 'nuevo',
    name: draft.name || 'Nombre del aliado',
  }

  const remove = async () => {
    if (!draft.id) return
    const ok = await confirm({
      title: `¿Borrar ${sponsor?.name}?`,
      description:
        'Se va del panel y del sitio. Si solo terminó la campaña, mejor pasalo a Finalizado.',
      confirm: 'Borrar',
      danger: true,
    })
    if (ok) void run(() => deleteSponsor(draft.id!), { onSuccess: onClose })
  }

  return (
    <Sheet
      open={sponsor !== null}
      onOpenChange={(o) => !o && onClose()}
      locked={pending}
      wide
      title={draft.id ? `Editar ${sponsor?.name}` : 'Nuevo sponsor'}
      description="Lo de arriba es lo que se ve en el sitio; el contacto y las notas quedan en el panel."
      footer={
        <>
          {draft.id && (
            <Button
              variant="ghost"
              className="mr-auto text-red-600 hover:text-red-700"
              onClick={() => void remove()}
              disabled={pending}
            >
              <Trash2 className="size-4" aria-hidden /> Borrar
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button
            disabled={pending}
            onClick={() => void run(() => saveSponsor(draft), { onSuccess: onClose })}
          >
            {pending && <Spinner />} Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">Etapa</p>
          <Segmented<SponsorStage>
            id="sponsor-etapa"
            size="sm"
            value={draft.stage}
            onChange={(stage) => set({ stage })}
            options={SPONSOR_STAGES.map((s) => ({ value: s, label: SPONSOR_STAGE_LABELS[s] }))}
          />
        </div>

        <div className="rounded-3xl bg-canvas p-4">
          <p className="mb-3 text-xs font-bold tracking-wide text-neutral-500 uppercase">
            Así se ve en la galería
          </p>
          <div className="mx-auto max-w-[320px]">
            <SponsorTile sponsor={preview} />
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="font-semibold text-ink">En el sitio</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" htmlFor="s-name" error={fields.name}>
              <Input
                id="s-name"
                value={draft.name}
                maxLength={80}
                onChange={(e) => set({ name: e.target.value })}
              />
            </Field>
            <Field label="Tipo" htmlFor="s-kind" error={fields.kind}>
              <Select
                id="s-kind"
                value={draft.kind}
                onChange={(e) => set({ kind: e.target.value as SponsorInput['kind'] })}
              >
                {SPONSOR_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {SPONSOR_KIND_LABELS[k]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Propuesta (lo que más se ve)"
            htmlFor="s-offer"
            error={fields.offer}
            hint="Ej.: Con tu café, una Boxie de regalo para quien quieras"
          >
            <Input
              id="s-offer"
              value={draft.offer}
              maxLength={140}
              onChange={(e) => set({ offer: e.target.value })}
            />
          </Field>
          <Field label="Frase corta" htmlFor="s-tagline" error={fields.tagline}>
            <Input
              id="s-tagline"
              value={draft.tagline}
              maxLength={90}
              onChange={(e) => set({ tagline: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[100px_140px_1fr]">
            <Field label="Emoji" htmlFor="s-emoji" error={fields.emoji}>
              <Input
                id="s-emoji"
                value={draft.emoji}
                maxLength={16}
                className="text-center text-xl"
                onChange={(e) => set({ emoji: e.target.value })}
              />
            </Field>
            <Field label="Color" htmlFor="s-color" error={fields.color}>
              <div className="flex items-center gap-2">
                <input
                  id="s-color"
                  type="color"
                  value={draft.color}
                  onChange={(e) => set({ color: e.target.value.toUpperCase() })}
                  className="h-12 w-14 cursor-pointer rounded-xl border border-neutral-200 bg-white p-1"
                />
                <span className="font-mono text-xs text-neutral-500">{draft.color}</span>
              </div>
            </Field>
            <Field
              label="Logo (opcional)"
              htmlFor="s-logo"
              error={fields.logoUrl}
              hint="Link https:// a una imagen cuadrada"
            >
              <Input
                id="s-logo"
                value={draft.logoUrl ?? ''}
                placeholder="https://…"
                onChange={(e) => set({ logoUrl: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link (web o Instagram)" htmlFor="s-url" error={fields.url}>
              <Input
                id="s-url"
                value={draft.url ?? ''}
                placeholder="https://…"
                onChange={(e) => set({ url: e.target.value })}
              />
            </Field>
            <Field
              label="Cupón (opcional)"
              htmlFor="s-coupon"
              error={fields.couponCode}
              hint="Crealo en Cupones para que descuente"
            >
              <Input
                id="s-coupon"
                value={draft.couponCode ?? ''}
                className="font-mono uppercase"
                maxLength={32}
                onChange={(e) => set({ couponCode: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Ciudad o barrio" htmlFor="s-city" error={fields.city}>
            <Input
              id="s-city"
              value={draft.city}
              maxLength={80}
              onChange={(e) => set({ city: e.target.value })}
            />
          </Field>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-ink">Dónde y cuándo</h3>
          <div>
            <p className="mb-2 text-xs font-bold tracking-wide text-neutral-500 uppercase">
              Lugares
            </p>
            <div className="flex flex-wrap gap-2">
              {SPONSOR_PLACEMENTS.map((p) => {
                const on = draft.placements.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={on}
                    onClick={() => togglePlacement(p)}
                    className={cn(
                      'h-9 rounded-full px-3.5 text-sm font-semibold transition-colors',
                      on
                        ? 'bg-ink text-white'
                        : 'border border-line bg-white text-neutral-600 hover:text-ink',
                    )}
                  >
                    {SPONSOR_PLACEMENT_LABELS[p]}
                  </button>
                )
              })}
            </div>
            {fields.placements && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{fields.placements}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Desde" htmlFor="s-from" error={fields.startsOn}>
              <Input
                id="s-from"
                type="date"
                value={draft.startsOn ?? ''}
                onChange={(e) => set({ startsOn: e.target.value || null })}
              />
            </Field>
            <Field label="Hasta" htmlFor="s-to" error={fields.endsOn}>
              <Input
                id="s-to"
                type="date"
                value={draft.endsOn ?? ''}
                onChange={(e) => set({ endsOn: e.target.value || null })}
              />
            </Field>
            <Field label="Orden" htmlFor="s-order" error={fields.sortOrder} hint="Menor, primero">
              <Input
                id="s-order"
                type="number"
                min={0}
                max={999}
                value={draft.sortOrder}
                onChange={(e) => set({ sortOrder: Number(e.target.value) || 0 })}
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="font-semibold text-ink">Contacto (solo el panel)</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nombre" htmlFor="s-cname" error={fields.contactName}>
              <Input
                id="s-cname"
                value={draft.contactName}
                maxLength={120}
                onChange={(e) => set({ contactName: e.target.value })}
              />
            </Field>
            <Field label="Mail" htmlFor="s-cmail" error={fields.contactEmail}>
              <Input
                id="s-cmail"
                type="email"
                value={draft.contactEmail}
                onChange={(e) => set({ contactEmail: e.target.value })}
              />
            </Field>
            <Field label="WhatsApp" htmlFor="s-cphone" error={fields.contactPhone}>
              <Input
                id="s-cphone"
                type="tel"
                value={draft.contactPhone}
                maxLength={40}
                onChange={(e) => set({ contactPhone: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            {SPONSOR_INTERESTS.map((i) => {
              const on = draft.interests.includes(i)
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    set({
                      interests: on
                        ? draft.interests.filter((x) => x !== i)
                        : [...draft.interests, i],
                    })
                  }
                  className={cn(
                    'h-8 rounded-full px-3 text-xs font-semibold transition-colors',
                    on
                      ? 'bg-brand text-white'
                      : 'border border-line bg-white text-neutral-600 hover:text-ink',
                  )}
                >
                  {SPONSOR_INTEREST_LABELS[i]}
                </button>
              )
            })}
          </div>
          <Field label="Notas internas" htmlFor="s-notes" error={fields.notes}>
            <Textarea
              id="s-notes"
              rows={4}
              maxLength={2000}
              value={draft.notes}
              placeholder="Qué se acordó, cuánto paga, cuándo revisar resultados…"
              onChange={(e) => set({ notes: e.target.value })}
            />
          </Field>
        </section>
      </div>
    </Sheet>
  )
}
