import type { Metadata } from 'next'
import { MessageCard } from '@/ui/MessageCard'
import { ResultActions } from '../ResultActions'

export const metadata: Metadata = {
  title: 'Pago no completado',
  robots: { index: false },
}

export default async function ErrorPage({ searchParams }: PageProps<'/checkout/error'>) {
  const params = await searchParams
  const rejected = params.razon === 'pago-rechazado'

  return (
    <div className="flex justify-center bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 pt-[130px] pb-24">
      <MessageCard emoji={rejected ? '💳' : '😕'} title="El pago no se completó">
        <p className="leading-relaxed text-ink/70">
          {rejected
            ? 'Mercado Pago rechazó el pago. Podés intentarlo de nuevo con otra tarjeta o medio de pago.'
            : 'Hubo un problema al procesar el pago. No se hizo ningún cobro: podés volver a intentarlo.'}
        </p>
        <ResultActions
          primary={{ href: '/galeria', label: 'Volver a elegir mi Boxie' }}
          support={{
            topic: 'pago',
            label: '¿Te cobraron igual? Escribinos',
            message: 'Intenté pagar y no se completó.',
          }}
        />
      </MessageCard>
    </div>
  )
}
