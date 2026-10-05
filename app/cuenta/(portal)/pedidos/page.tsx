import type { Metadata } from 'next'
import Link from 'next/link'
import { getCustomerPortalData } from '@/server/customer/data'
import { requireCustomerSession } from '@/server/customer/session'
import { Button } from '@/ui/Button'
import { Icon } from '@/ui/Icon'
import { OrderReceiptCard } from './OrderReceiptCard'

export const metadata: Metadata = {
  title: 'Mis Compras · Mi Cuenta Ribbly',
  description: 'Historial de compras y comprobantes de pago de tus regalos.',
}

export default async function CustomerOrdersPage() {
  const session = await requireCustomerSession('/cuenta/pedidos')
  const data = await getCustomerPortalData(session.email)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Historial de Compras
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Comprobantes oficiales de pago y órdenes asociadas a {session.email}.
          </p>
        </div>

        {data.orders.length > 0 && (
          <div className="text-xs text-neutral-500 sm:text-right">
            Total:{' '}
            <strong className="text-ink">
              {data.orders.length} {data.orders.length === 1 ? 'compra' : 'compras'}
            </strong>
          </div>
        )}
      </div>

      {data.orders.length === 0 ? (
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-neutral-100">
            <Icon name="compras" size={40} />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold text-ink">
            No encontramos compras registradas
          </h2>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Si compraste un regalo con otro email, podés iniciar sesión con ese correo para verlo.
          </p>
          <div className="mt-6">
            <Link href="/galeria">
              <Button>Ir a la tienda</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {data.orders.map((order) => (
            <OrderReceiptCard key={order.fullId} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
