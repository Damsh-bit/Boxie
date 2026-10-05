'use client'

import { useState } from 'react'
import {
  Check,
  Copy,
  CreditCard,
  ExternalLink,
  Gift,
  Printer,
  Receipt,
  ShieldCheck,
  Sparkles,
  Tag,
  User,
} from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import type { CustomerOrderReceipt } from '@/server/customer/data'
import { Button } from '@/ui/Button'

export function OrderReceiptCard({ order }: { order: CustomerOrderReceipt }) {
  const [copiedKey, setCopiedKey] = useState<'order' | 'mp' | null>(null)

  const copyToClipboard = async (text: string, key: 'order' | 'mp') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2500)
    } catch {
      // Ignore copy error
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const formatPrice = (val: number) =>
    val.toLocaleString('es-AR', {
      minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
    })

  return (
    <article className="overflow-hidden rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7">
      {/* Encabezado: Número de orden, Estado y Monto */}
      <div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Receipt className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(order.fullId, 'order')}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-200"
                title="Copiar ID completo de la orden"
              >
                <span>#{order.id}</span>
                {copiedKey === 'order' ? (
                  <Check className="size-3 text-emerald-600" />
                ) : (
                  <Copy className="size-3 text-neutral-400 group-hover:text-neutral-600" />
                )}
              </button>

              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  order.isPaid
                    ? 'border border-emerald-200/80 bg-emerald-50 text-emerald-700'
                    : order.status === 'Pendiente'
                      ? 'border border-amber-200/80 bg-amber-50 text-amber-700'
                      : 'bg-neutral-100 text-neutral-700'
                }`}
              >
                {order.isPaid && <ShieldCheck className="size-3" />}
                {order.status}
              </span>
            </div>

            <h2 className="mt-1 font-display text-lg font-bold text-ink">
              Ribbly {order.themeName}
              {order.planName && (
                <span className="ml-1.5 font-sans text-xs font-medium text-neutral-500">
                  · Plan {order.planName}
                </span>
              )}
            </h2>
            <p className="text-xs text-neutral-400">
              {order.date} · {order.time} hs
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-neutral-100 pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
          <p className="text-xs text-neutral-400 sm:order-2">Total pagado</p>
          <p className="font-display text-2xl font-bold tracking-tight text-ink sm:order-1 sm:text-3xl">
            ${formatPrice(order.amount)}
          </p>
        </div>
      </div>

      {/* Grilla de información detallada */}
      <div className="mt-5 grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
        {/* N° de Operación Mercado Pago */}
        {order.mpPaymentId ? (
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 p-3.5">
            <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
              N° Operación Mercado Pago
            </span>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-bold text-ink">{order.mpPaymentId}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(order.mpPaymentId!, 'mp')}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-neutral-600 shadow-xs transition-colors hover:bg-neutral-100 hover:text-ink"
                title="Copiar número de operación"
              >
                {copiedKey === 'mp' ? (
                  <>
                    <Check className="size-3 text-emerald-600" />
                    <span className="text-emerald-700">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3 text-neutral-400" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <span className="mt-1 block text-[10px] text-neutral-400">
              Comprobante oficial de la pasarela
            </span>
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 p-3.5">
            <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
              Operación
            </span>
            <span className="mt-1 font-mono text-sm font-semibold text-neutral-600">
              #{order.id}
            </span>
            <span className="mt-1 block text-[10px] text-neutral-400">Identificador Ribbly</span>
          </div>
        )}

        {/* Medio de pago */}
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 p-3.5">
          <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
            Medio de pago
          </span>
          <div className="mt-1 flex items-center gap-2">
            <CreditCard className="size-4 shrink-0 text-brand" />
            <span className="font-semibold text-ink">{order.paymentMethodDetail}</span>
          </div>
          <span className="mt-1 block text-[10px] text-neutral-400">
            {order.isPaid ? 'Pago aprobado y procesado' : 'Estado actual del pago'}
          </span>
        </div>

        {/* Comprador / Facturación */}
        <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 p-3.5 sm:col-span-2 lg:col-span-1">
          <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
            Facturado a
          </span>
          <div className="mt-1 flex items-center gap-2">
            <User className="size-4 shrink-0 text-neutral-400" />
            <span className="truncate font-semibold text-ink">{order.buyerName}</span>
          </div>
          <span className="mt-1 block truncate text-[10px] text-neutral-500">
            {order.buyerEmail}
            {order.buyerPhone ? ` · ${order.buyerPhone}` : ''}
          </span>
        </div>
      </div>

      {/* Desglose de Descuentos / Cupón */}
      {order.discount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2 text-neutral-600">
            <Tag className="size-4 text-emerald-600" />
            <span>
              Precio regular:{' '}
              <span className="font-semibold line-through">${formatPrice(order.listPrice)}</span>
            </span>
          </div>
          <div className="font-semibold text-emerald-700">
            Ahorraste ${formatPrice(order.discount)}
            {order.couponCode && (
              <span className="ml-1 font-mono font-bold uppercase">({order.couponCode})</span>
            )}
          </div>
        </div>
      )}

      {/* Footer: Ribbly asociada y botón de imprimir */}
      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-neutral-50/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        {order.boxie ? (
          <div className="flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
              <Gift className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink">
                  Ribbly {order.boxie.code}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-600 shadow-xs">
                  {order.boxie.statusLabel}
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Para:{' '}
                <strong className="text-neutral-700">
                  {order.boxie.recipientName || 'Sin agasajado definido'}
                </strong>
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Sparkles className="size-4 text-brand" />
            <span>Regalo asociado a esta compra</span>
          </div>
        )}

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:border-neutral-300 hover:bg-neutral-50 hover:text-ink"
            title="Imprimir comprobante de compra"
          >
            <Printer className="size-3.5" />
            <span>Imprimir</span>
          </button>

          {order.boxie && (
            <Link
              href={
                order.boxie.status === 'ready' && order.boxie.giftUrl
                  ? (order.boxie.giftUrl as Route)
                  : (`/cuenta/boxies/${order.boxie.id}/editar` as Route)
              }
              target={order.boxie.status === 'ready' && order.boxie.giftUrl ? '_blank' : undefined}
            >
              <Button size="sm" variant="dark" className="h-8 text-xs">
                {order.boxie.status === 'draft' ? 'Abrir en el editor' : 'Ver regalo'}
                <ExternalLink className="size-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
