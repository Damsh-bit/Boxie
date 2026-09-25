'use client'

import { Copy, ExternalLink, Undo2 } from 'lucide-react'
import { Button } from '@/ui/Button'
import { Spinner } from '@/ui/motion'
import { useConfirm } from '../../../_ui/Confirm'
import { useToast } from '../../../_ui/Toast'
import { useAdminAction } from '../../../_ui/use-action'
import { refundOrder } from '../actions'

export function OrderActions({
  orderId,
  canRefund,
  buyerName,
  amount,
}: {
  orderId: string
  canRefund: boolean
  buyerName: string
  amount: string
}) {
  const confirm = useConfirm()
  const toast = useToast()
  const { run, pending } = useAdminAction()
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        className="h-10"
        onClick={() => {
          void navigator.clipboard
            .writeText(orderId)
            .then(() => toast.success('Número de orden copiado'))
        }}
      >
        <Copy className="size-4" aria-hidden /> Copiar N.º
      </Button>
      <a
        href="https://www.mercadopago.com.ar/activities"
        target="_blank"
        rel="noreferrer"
        className="flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-neutral-300"
      >
        <ExternalLink className="size-4" aria-hidden /> Mercado Pago
      </a>
      {canRefund && (
        <Button
          variant="danger"
          size="sm"
          className="h-10"
          disabled={pending}
          onClick={async () => {
            const ok = await confirm({
              icon: '↩️',
              title: `¿Reembolsar ${amount} a ${buyerName}?`,
              description:
                'Primero devolvé el dinero desde Mercado Pago. Acá se marca la orden como reembolsada y el regalo deja de poder abrirse. No se puede deshacer.',
              confirm: 'Marcar reembolsada',
              danger: true,
            })
            if (ok) void run(() => refundOrder(orderId))
          }}
        >
          {pending ? <Spinner /> : <Undo2 className="size-4" aria-hidden />} Reembolsar
        </Button>
      )}
    </div>
  )
}
