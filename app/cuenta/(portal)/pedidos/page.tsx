import type { Metadata } from 'next'
import { Receipt, ShoppingBag } from 'lucide-react'
import Link from 'next/link'
import { getCustomerPortalData } from '@/server/customer/data'
import { requireCustomerSession } from '@/server/customer/session'
import { Button } from '@/ui/Button'

export const metadata: Metadata = {
  title: 'Mis Compras · Mi Cuenta Boxie',
  description: 'Historial de compras y comprobantes de pago de tus Boxies.',
}

export default async function CustomerOrdersPage() {
  const session = await requireCustomerSession('/cuenta/pedidos')
  const data = await getCustomerPortalData(session.email)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Historial de Compras
        </h1>
        <p className="mt-1 text-sm text-neutral-600">
          Comprobantes de pago y órdenes asociadas a tu email ({session.email}).
        </p>
      </div>

      {data.orders.length === 0 ? (
        <div className="rounded-3xl border border-line bg-white p-12 text-center shadow-sm">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-neutral-100 text-neutral-500">
            <ShoppingBag className="size-8" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold text-ink">
            No encontramos compras registradas
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Si compraste una Boxie con otro email, podés iniciar sesión con ese correo para verla.
          </p>
          <div className="mt-6">
            <Link href="/galeria">
              <Button>Ir a la tienda</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-sm">
          <div className="divide-y divide-neutral-100">
            {data.orders.map((order) => (
              <div
                key={order.id}
                className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Receipt className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-400">
                        #{order.id}
                      </span>
                      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {order.status}
                      </span>
                    </div>
                    <p className="mt-0.5 font-display text-base font-bold text-ink">
                      {order.themeName}
                    </p>
                    <p className="text-xs text-neutral-400">{order.date}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6 border-t border-neutral-50 pt-3 sm:justify-end sm:border-0 sm:pt-0">
                  <p className="font-display text-lg font-bold text-ink">
                    ${order.amount.toLocaleString('es-AR')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
