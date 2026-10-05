'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronDown,
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
  const [isOpen, setIsOpen] = useState(false)
  const [copiedKey, setCopiedKey] = useState<'order' | 'mp' | null>(null)

  const copyToClipboard = async (text: string, key: 'order' | 'mp', e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey(key)
      setTimeout(() => setCopiedKey(null), 2500)
    } catch {
      // Ignore copy error
    }
  }

  const handlePrint = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const formatPrice = (val: number) =>
    val.toLocaleString('es-AR', {
      minimumFractionDigits: val % 1 !== 0 ? 2 : 0,
    })

  return (
    <article
      className={`overflow-hidden rounded-3xl border bg-white shadow-xs transition-[box-shadow,border-color] duration-200 ${
        isOpen
          ? 'border-neutral-300 shadow-md'
          : 'border-neutral-200/80 hover:border-neutral-300 hover:shadow-sm'
      }`}
    >
      {/* Encabezado colapsable: Breve y limpio */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer flex-col gap-4 p-5 text-left transition-colors sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Receipt className="size-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                onClick={(e) => copyToClipboard(order.fullId, 'order', e)}
                className="group inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-2 py-0.5 font-mono text-xs font-bold text-neutral-600 transition-colors hover:bg-neutral-200"
                title="Copiar ID completo de la orden"
              >
                <span>#{order.id}</span>
                {copiedKey === 'order' ? (
                  <Check className="size-3 text-emerald-600" />
                ) : (
                  <Copy className="size-3 text-neutral-400 group-hover:text-neutral-600" />
                )}
              </span>

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

            <h2 className="mt-1 font-display text-base font-bold text-ink sm:text-lg">
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

        <div className="flex items-center justify-between border-t border-neutral-100 pt-3 sm:border-0 sm:pt-0">
          <div className="text-left sm:text-right">
            <p className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              ${formatPrice(order.amount)}
            </p>
            <p className="text-[11px] text-neutral-400">
              {order.paymentProvider === 'mercadopago' ? 'Mercado Pago' : 'Online'}
            </p>
          </div>

          <div className="flex items-center gap-2 pl-4">
            <span className="hidden text-xs font-semibold text-brand sm:inline">
              {isOpen ? 'Menos detalle' : 'Ver detalle'}
            </span>
            <div
              className={`grid size-8 place-items-center rounded-full bg-neutral-100 text-neutral-500 transition-transform duration-300 ${
                isOpen ? 'rotate-180 bg-brand/10 text-brand' : ''
              }`}
            >
              <ChevronDown className="size-4" />
            </div>
          </div>
        </div>
      </button>

      {/* Contenido desplegable con animación */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-neutral-100 bg-neutral-50/40 p-5 pt-4 sm:p-7 sm:pt-5">
              {/* Grilla de información detallada */}
              <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
                {/* N° de Operación Mercado Pago */}
                {order.mpPaymentId ? (
                  <div className="rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-2xs">
                    <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                      N° Operación Mercado Pago
                    </span>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-ink">
                        {order.mpPaymentId}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => copyToClipboard(order.mpPaymentId!, 'mp', e)}
                        className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-ink"
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
                  <div className="rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-2xs">
                    <span className="block text-[11px] font-medium tracking-wide text-neutral-500 uppercase">
                      Identificador
                    </span>
                    <span className="mt-1 font-mono text-sm font-semibold text-neutral-600">
                      #{order.id}
                    </span>
                    <span className="mt-1 block text-[10px] text-neutral-400">Orden Ribbly</span>
                  </div>
                )}

                {/* Medio de pago */}
                <div className="rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-2xs">
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
                <div className="rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-2xs sm:col-span-2 lg:col-span-1">
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
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-xs">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Tag className="size-4 text-emerald-600" />
                    <span>
                      Precio regular:{' '}
                      <span className="font-semibold line-through">
                        ${formatPrice(order.listPrice)}
                      </span>
                    </span>
                  </div>
                  <div className="font-semibold text-emerald-700">
                    Ahorraste ${formatPrice(order.discount)}
                    {order.couponCode && (
                      <span className="ml-1 font-mono font-bold uppercase">
                        ({order.couponCode})
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer: Ribbly asociada y botón de imprimir */}
              <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-neutral-200/70 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
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
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
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
                      target={
                        order.boxie.status === 'ready' && order.boxie.giftUrl ? '_blank' : undefined
                      }
                    >
                      <Button size="sm" variant="dark" className="h-8 text-xs">
                        {order.boxie.status === 'draft' ? 'Abrir en el editor' : 'Ver regalo'}
                        <ExternalLink className="size-3" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}
