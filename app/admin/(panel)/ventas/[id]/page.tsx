import { ArrowLeft, Gift, Mail, MessageCircle, Receipt, User, Wallet } from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatARS, formatDateTime } from '@/domain/admin/format'
import { saleCosts } from '@/domain/admin/finance'
import { formatBoxieCode } from '@/domain/boxie'
import { describeCoupon } from '@/domain/coupons'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { Badge, Card, CardHeader, KeyValue, NeedsDb } from '../../../_ui/primitives'
import { BOXIE_STAGE, boxieStage, orderStatus } from '../../../_ui/status'
import { Timeline, type TimelineItem } from '../../../_ui/Timeline'
import { OrderActions } from './OrderActions'

export const metadata: Metadata = { title: 'Orden' }

const EVENT_LABEL: Record<string, string> = {
  approved: 'Pago aprobado',
  pending: 'Pago pendiente',
  in_process: 'Pago en revisión',
  rejected: 'Pago rechazado',
  cancelled: 'Pago cancelado',
  refunded: 'Reembolso',
  charged_back: 'Contracargo',
}
const SOURCE_LABEL: Record<string, string> = {
  webhook: 'aviso de Mercado Pago',
  return: 'vuelta del checkout',
  admin: 'desde el panel',
  checkout: 'checkout',
}

export default async function OrderPage({ params }: PageProps<'/admin/ventas/[id]'>) {
  const { id } = await params
  await requireAdmin(`/admin/ventas/${id}`)
  const repo = await adminRepo()
  const [detail, settings] = await Promise.all([repo.getOrder(id), repo.getSettings()])
  if (!detail) notFound()
  const { order, events, boxie, theme, plan, coupon, version } = detail
  const status = orderStatus(order)
  const costs = saleCosts(order.amountCents, settings)

  const timeline: TimelineItem[] = [
    {
      at: order.createdAt,
      title: 'Inició la compra',
      detail: `${theme?.name ?? 'Temática'} · ${plan?.name ?? 'sin plan'}`,
      icon: 'cart',
      tone: 'neutral',
    } satisfies TimelineItem,
    ...events.map<TimelineItem>((e) => ({
      at: e.receivedAt,
      title: EVENT_LABEL[e.status] ?? e.status,
      detail: `Por ${SOURCE_LABEL[e.source] ?? e.source}${e.outcome && e.outcome !== 'paid' && e.outcome !== 'recorded' ? ` · resultado: ${e.outcome}` : ''}`,
      icon: e.outcome === 'amount_mismatch' ? 'alert' : e.status === 'refunded' ? 'refund' : 'card',
      tone:
        e.outcome === 'amount_mismatch'
          ? 'critical'
          : e.status === 'approved'
            ? 'good'
            : e.status === 'refunded'
              ? 'violet'
              : 'warning',
    })),
    ...(boxie
      ? ([
          {
            at: boxie.createdAt,
            title: `Boxie ${formatBoxieCode(boxie.code)} creada`,
            icon: 'gift',
            tone: 'brand',
          },
          boxie.accessEmailSentAt && {
            at: boxie.accessEmailSentAt,
            title: 'Mail con el link del editor',
            detail: order.buyerEmail,
            icon: 'mail',
            tone: 'neutral',
          },
          boxie.lastEditedAt && {
            at: boxie.lastEditedAt,
            title: 'Última edición del comprador',
            detail: `${boxie.modulesDone} de ${boxie.modulesTotal} módulos completos`,
            icon: 'edit',
            tone: 'neutral',
          },
          boxie.lockedAt && {
            at: boxie.lockedAt,
            title: 'Bloqueada y lista para regalar',
            detail: `Para ${boxie.recipientName || '—'}`,
            icon: 'lock',
            tone: 'good',
          },
          boxie.giftEmailSentAt && {
            at: boxie.giftEmailSentAt,
            title: 'Mail con el link del regalo',
            icon: 'mail',
            tone: 'neutral',
          },
          boxie.firstOpenedAt && {
            at: boxie.firstOpenedAt,
            title: 'El destinatario abrió el regalo',
            detail: `${boxie.openCount} ${boxie.openCount === 1 ? 'apertura' : 'aperturas'} en total`,
            icon: 'open',
            tone: 'good',
          },
        ].filter(Boolean) as TimelineItem[])
      : []),
  ].sort((a, b) => a.at.localeCompare(b.at))

  const phone = order.buyerPhone?.replace(/[^\d]/g, '')

  return (
    <div>
      <Link
        href="/admin/ventas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Ventas
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-brand uppercase">
            Orden {order.id.slice(0, 8)}
            {repo.mode === 'demo' && <NeedsDb what="orders, payment_events" />}
          </p>
          <h1 className="font-display text-3xl font-bold text-ink">{order.buyerName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-600">
            <Badge tone={status.tone} dot>
              {status.label}
            </Badge>
            {formatARS(order.amountCents)} · {formatDateTime(order.createdAt)}
          </p>
        </div>
        <OrderActions
          orderId={order.id}
          canRefund={order.status === 'paid'}
          buyerName={order.buyerName}
          amount={formatARS(order.amountCents)}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader icon={<Receipt />} title="La compra" />
            <KeyValue
              items={[
                {
                  label: 'Temática',
                  value: theme ? (
                    <Link
                      href={`/admin/tematicas/${theme.id}` as Route}
                      className="font-semibold text-brand hover:underline"
                    >
                      {theme.name}
                    </Link>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Versión vendida', value: version ? `v${version}` : '—' },
                { label: 'Plan', value: plan ? plan.name : 'Sin plan (anterior a los planes)' },
                { label: 'Precio de lista', value: formatARS(order.listPriceCents) },
                {
                  label: 'Cupón',
                  value: order.couponCode ? (
                    <span>
                      <span className="font-mono font-semibold">{order.couponCode}</span>
                      {coupon && ` · ${describeCoupon(coupon)}`} · −{formatARS(order.discountCents)}
                    </span>
                  ) : (
                    'Sin cupón'
                  ),
                },
                {
                  label: 'Cobrado',
                  value: <span className="font-semibold">{formatARS(order.amountCents)}</span>,
                },
                {
                  label: 'Pasarela',
                  value:
                    order.paymentProvider === 'mercadopago'
                      ? 'Mercado Pago'
                      : order.paymentProvider,
                },
                {
                  label: 'N.º de pago',
                  value: order.mpPaymentId ? (
                    <span className="font-mono">{order.mpPaymentId}</span>
                  ) : (
                    '—'
                  ),
                },
                { label: 'Pagada', value: formatDateTime(order.paidAt) },
                { label: 'Estado en el proveedor', value: order.providerStatus ?? '—' },
              ]}
            />
          </Card>

          <Card>
            <CardHeader
              icon={<Wallet />}
              title="Qué dejó esta venta"
              description="Con los costos de Configuración"
            />
            <dl className="space-y-2 text-sm">
              <Line label="Cobrado" value={formatARS(order.amountCents)} strong />
              <Line
                label="Comisión de Mercado Pago (con IVA)"
                value={`− ${formatARS(costs.gatewayCents)}`}
              />
              <Line label="Impuestos sobre la venta" value={`− ${formatARS(costs.taxCents)}`} />
              <Line
                label="Costo de entrega (storage, mails)"
                value={`− ${formatARS(costs.variableCents)}`}
              />
              <div className="border-t border-line pt-2">
                <Line
                  label="Contribución"
                  value={formatARS(order.status === 'paid' ? costs.contributionCents : 0)}
                  strong
                />
              </div>
              {order.status !== 'paid' && (
                <p className="text-xs text-neutral-500">
                  {order.status === 'refunded'
                    ? 'Reembolsada: la comisión de la pasarela no se recupera.'
                    : 'No se cobró: no deja nada.'}
                </p>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader title="Historial" description="Del checkout al regalo abierto" />
            <Timeline items={timeline} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader icon={<User />} title="Comprador" />
            <p className="font-semibold text-ink">{order.buyerName}</p>
            <p className="text-sm text-neutral-600">{order.buyerEmail}</p>
            {order.buyerPhone && <p className="text-sm text-neutral-600">{order.buyerPhone}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`mailto:${order.buyerEmail}`}
                className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
              >
                <Mail className="size-4" aria-hidden /> Mail
              </a>
              {phone && (
                <a
                  href={`https://wa.me/${phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
                >
                  <MessageCircle className="size-4" aria-hidden /> WhatsApp
                </a>
              )}
              <Link
                href={`/admin/clientes?q=${encodeURIComponent(order.buyerEmail)}` as Route}
                className="flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
              >
                Historial del cliente
              </Link>
            </div>
          </Card>

          {boxie ? (
            <Card>
              <CardHeader icon={<Gift />} title="La Boxie" />
              <p className="font-mono text-2xl font-semibold tracking-wider text-ink">
                {formatBoxieCode(boxie.code)}
              </p>
              <p className="mt-2">
                <Badge tone={BOXIE_STAGE[boxieStage(boxie)].tone} dot>
                  {BOXIE_STAGE[boxieStage(boxie)].label}
                </Badge>
              </p>
              <p className="mt-2 text-sm text-neutral-600">
                Para <span className="font-semibold text-ink">{boxie.recipientName || '—'}</span> ·
                de {boxie.senderName || '—'}
              </p>
              <Link
                href={`/admin/boxies/${boxie.id}` as Route}
                className="mt-4 inline-flex h-9 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition-colors hover:bg-ink/85"
              >
                Ver la Boxie
              </Link>
            </Card>
          ) : (
            <Card>
              <CardHeader icon={<Gift />} title="La Boxie" />
              <p className="text-sm text-neutral-600">
                {order.status === 'pending'
                  ? 'Todavía no hay Boxie: se crea cuando se aprueba el pago.'
                  : 'Esta orden no generó una Boxie.'}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function Line({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className={strong ? 'font-semibold text-ink' : 'text-neutral-600'}>{label}</dt>
      <dd
        className={strong ? 'font-semibold text-ink tabular-nums' : 'text-neutral-700 tabular-nums'}
      >
        {value}
      </dd>
    </div>
  )
}
