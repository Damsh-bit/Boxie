import { ArrowLeft, CalendarClock, Gift, Receipt } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate, formatDateTime, formatRelative } from '@/domain/admin/format'
import { formatBoxieCode } from '@/domain/boxie'
import { buyerSlides, parseThemeConfig } from '@/slides/config'
import { missingRequired } from '@/slides/fields'
import { configForPlan } from '@/slides/plans'
import { slideDefinitions } from '@/slides/schemas'
import type { SlideDefinition } from '@/slides/types'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { Badge, Card, CardHeader, KeyValue, NeedsDb, Progress } from '../../../_ui/primitives'
import { BOXIE_STAGE, boxieStage } from '../../../_ui/status'
import { BoxieActions, BoxiePreview } from './BoxieClient'

export const metadata: Metadata = { title: 'Boxie' }

export default async function BoxiePage({ params }: PageProps<'/admin/boxies/[id]'>) {
  const { id } = await params
  await requireAdmin(`/admin/boxies/${id}`)
  const repo = await adminRepo()
  const [detail, plans] = await Promise.all([repo.getBoxie(id), repo.listPlans()])
  if (!detail) notFound()
  const { boxie, order, theme, plan, config, version, content } = detail
  const stage = boxieStage(boxie)
  const info = BOXIE_STAGE[stage]

  const parsed = parseThemeConfig(config)
  const shown = parsed.success
    ? plan
      ? configForPlan(parsed.data, plan, plans)
      : parsed.data
    : null
  const modules = shown
    ? buyerSlides(shown).map((s) => {
        const def = slideDefinitions[s.kind] as SlideDefinition
        const missing = def.buyerSchema
          ? missingRequired(def.buyerSchema, content[s.key] ?? {})
          : []
        const touched = content[s.key] && Object.keys(content[s.key]!).length > 0
        return {
          key: s.key,
          title: def.editor?.title ?? def.label,
          done: Boolean(touched) && missing.length === 0,
        }
      })
    : []

  return (
    <div>
      <Link
        href="/admin/boxies"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Boxies
      </Link>

      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-brand uppercase">
            {theme?.name ?? 'Boxie'} · {plan?.name ?? 'sin plan'}
            {repo.mode === 'demo' && <NeedsDb what="boxies, boxie_content, media_assets" />}
          </p>
          <h1 className="font-mono text-4xl font-semibold tracking-wider text-ink">
            {formatBoxieCode(boxie.code)}
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <Badge tone={info.tone} dot>
              {info.label}
            </Badge>
            {info.hint}
          </p>
        </div>
        <BoxieActions
          boxie={{
            id: boxie.id,
            code: formatBoxieCode(boxie.code),
            locked: boxie.lockedAt !== null,
            refunded: boxie.status === 'refunded',
            recipientName: boxie.recipientName,
            senderName: boxie.senderName,
          }}
          orderId={order.id}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader icon={<Gift />} title="El regalo" />
            <KeyValue
              items={[
                { label: 'Para', value: boxie.recipientName || '—' },
                { label: 'De', value: boxie.senderName || '—' },
                { label: 'Comprada', value: formatDateTime(boxie.createdAt) },
                {
                  label: 'Última edición',
                  value: boxie.lastEditedAt
                    ? `${formatDateTime(boxie.lastEditedAt)} (${formatRelative(boxie.lastEditedAt)})`
                    : 'Nunca',
                },
                {
                  label: 'Bloqueada',
                  value: boxie.lockedAt ? formatDateTime(boxie.lockedAt) : 'Todavía no',
                },
                {
                  label: boxie.lockedAt ? 'El regalo vence' : 'La edición vence',
                  value: `${formatDate(boxie.expiresAt)} (${formatRelative(boxie.expiresAt)})`,
                },
                {
                  label: 'Primera apertura',
                  value: boxie.firstOpenedAt ? formatDateTime(boxie.firstOpenedAt) : 'Sin abrir',
                },
                { label: 'Aperturas', value: String(boxie.openCount) },
                {
                  label: 'Fotos subidas',
                  value: `${boxie.photos} de ${plan?.limits.maxPhotos ?? 30}`,
                },
                { label: 'Versión de la temática', value: version ? `v${version}` : '—' },
              ]}
            />
          </Card>

          <Card>
            <CardHeader
              icon={<CalendarClock />}
              title="Lo que completó el comprador"
              description={`${boxie.modulesDone} de ${boxie.modulesTotal} módulos`}
            />
            <Progress
              value={boxie.modulesTotal ? boxie.modulesDone / boxie.modulesTotal : 0}
              tone={boxie.modulesDone >= boxie.modulesTotal ? 'good' : 'brand'}
              className="mb-4 h-2.5"
              label="Módulos completos"
            />
            {modules.length > 0 ? (
              <ul className="grid gap-2 sm:grid-cols-2">
                <li className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                  Para quién es
                  <Badge tone={boxie.recipientName ? 'good' : 'warning'}>
                    {boxie.recipientName ? 'Listo' : 'Falta'}
                  </Badge>
                </li>
                {modules.map((m) => (
                  <li
                    key={m.key}
                    className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm"
                  >
                    {m.title}
                    <Badge tone={m.done ? 'good' : 'warning'}>{m.done ? 'Listo' : 'Falta'}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-neutral-500">
                La versión de la temática no está disponible.
              </p>
            )}
            <p className="mt-4 text-xs text-neutral-500">
              El link del regalo y el del editor nunca se muestran acá: en la base solo está su
              huella. Para dárselo al comprador, reenviale el mail.
            </p>
          </Card>

          <Card>
            <CardHeader icon={<Receipt />} title="La compra" />
            <KeyValue
              items={[
                { label: 'Comprador', value: `${order.buyerName} · ${order.buyerEmail}` },
                {
                  label: 'Orden',
                  value: (
                    <Link
                      href={`/admin/ventas/${order.id}` as Route}
                      className="font-semibold text-brand hover:underline"
                    >
                      Ver la orden
                    </Link>
                  ),
                },
                {
                  label: 'Mail del editor',
                  value: boxie.accessEmailSentAt
                    ? formatDateTime(boxie.accessEmailSentAt)
                    : 'No se mandó',
                },
                {
                  label: 'Mail del regalo',
                  value: boxie.giftEmailSentAt
                    ? formatDateTime(boxie.giftEmailSentAt)
                    : 'No se mandó',
                },
              ]}
            />
          </Card>
        </div>

        <aside>
          <div className="xl:sticky xl:top-24">
            {shown ? (
              <BoxiePreview
                config={shown}
                content={content}
                recipientName={boxie.recipientName}
                senderName={boxie.senderName}
                empty={!boxie.lastEditedAt}
                media={detail.media}
              />
            ) : (
              <Card>
                <p className="text-sm text-neutral-500">No se puede mostrar la vista previa.</p>
              </Card>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
