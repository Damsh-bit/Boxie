import type { Metadata } from 'next'
import { site } from '@/content/site'
import { MessageCard } from '@/ui/MessageCard'

export const metadata: Metadata = { title: 'Entrar a mi Boxie' }

/**
 * Acceso del comprador. El editor se abre con el link personal que llega por
 * mail después de pagar (ya no hay "ID + clave" como en el prototipo).
 */
export default function MyBoxiePage() {
  return (
    <div className="flex justify-center bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 pt-[140px] pb-24">
      <MessageCard emoji="📬" title="Entrar a mi Boxie">
        <p className="mb-4 leading-relaxed text-neutral-600">
          Después de pagar te mandamos un mail con tu <strong>link personal de edición</strong>.
          Abrilo desde cualquier dispositivo para seguir armando tu Boxie: no hace falta usuario ni
          clave.
        </p>
        <p className="leading-relaxed text-neutral-600">
          ¿No lo encontrás? Revisá spam o promociones, o escribinos a{' '}
          <a href={`mailto:${site.emails.help}`} className="font-semibold text-brand">
            {site.emails.help}
          </a>{' '}
          con el mail que usaste al comprar.
        </p>
      </MessageCard>
    </div>
  )
}
