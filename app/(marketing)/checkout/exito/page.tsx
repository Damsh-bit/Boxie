import type { Metadata } from 'next'
import { MessageCard } from '@/ui/MessageCard'
import { ResultActions } from '../ResultActions'

export const metadata: Metadata = {
  title: 'Compra exitosa',
  robots: { index: false },
}

/**
 * Cuando la Boxie ya se había creado en un intento anterior (el pago es
 * idempotente): el acceso está en el mail.
 */
export default function ExitoPage() {
  return (
    <div className="flex justify-center bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 pt-[130px] pb-24">
      <MessageCard emoji="🎉" title="¡Compra realizada!">
        <p className="leading-relaxed text-ink/70">
          Tu pago se acreditó. En tu mail está el link para personalizar tu Boxie (si no lo ves,
          revisá spam o promociones).
        </p>
        <ResultActions
          primary={{ href: '/mi-boxie', label: 'No encuentro el mail' }}
          secondary={{ href: '/', label: 'Ir al inicio' }}
          support={{ topic: 'pago', label: '¿Algo no salió bien? Escribinos' }}
        />
      </MessageCard>
    </div>
  )
}
