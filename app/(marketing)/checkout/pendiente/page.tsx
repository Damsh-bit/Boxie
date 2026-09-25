import type { Metadata } from 'next'
import { MessageCard } from '@/ui/MessageCard'
import { ResultActions } from '../ResultActions'

export const metadata: Metadata = {
  title: 'Pago pendiente',
  robots: { index: false },
}

export default function PendientePage() {
  return (
    <div className="flex justify-center bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 pt-[130px] pb-24">
      <MessageCard emoji="⏳" title="Tu pago está pendiente">
        <p className="leading-relaxed text-ink/70">
          Mercado Pago está procesando el pago: según el medio elegido puede tardar unas horas. En
          cuanto se acredite te llega un mail con el link para personalizar tu Boxie.
        </p>
        <ResultActions
          primary={{ href: '/', label: 'Volver al inicio' }}
          secondary={{ href: '/mi-boxie', label: 'Ya se acreditó: reenviar el link' }}
          support={{ topic: 'pago', label: '¿Pasó mucho tiempo? Escribinos' }}
        />
      </MessageCard>
    </div>
  )
}
