import type { Metadata } from 'next'
import Link from 'next/link'
import { legalDocs } from '@/content/legal'
import { site } from '@/content/site'
import { buttonVariants } from '@/ui/Button'
import { Faq } from './Faq'

export const metadata: Metadata = {
  title: 'Ayuda y legales',
  description: 'Preguntas frecuentes sobre Boxie, términos, privacidad y medios de pago.',
}

const FAQS = [
  {
    question: '¿Qué es exactamente una Boxie?',
    answer:
      'Boxie es una experiencia de regalo 100% digital. Es una página web personalizada y única que creás para alguien especial, donde podés incluir fotos, música, dedicatorias y sorpresas. Al finalizar, recibís un link mágico para enviárselo.',
  },
  {
    question: '¿Cómo recibo el acceso después de pagar?',
    answer:
      'Apenas se acredita el pago entrás directo al editor, y además te llega un mail con tu link de edición. Si lo perdiste, pedilo de nuevo desde "Ya compré: entrar a mi Boxie" con el mail que usaste al comprar.',
  },
  {
    question: '¿Cuánto tiempo dura el link activo?',
    answer:
      'El regalo queda disponible 60 días desde que lo bloqueás para regalar. Durante ese tiempo, la persona agasajada puede entrar todas las veces que quiera.',
  },
  {
    question: '¿Puedo editar la Boxie después de pagar?',
    answer:
      "¡Sí! Una vez que comprás, recibís un acceso de editor. Podés modificar el contenido las veces que necesites hasta que decidas 'Finalizar y regalar'. Una vez bloqueada para el envío, ya no se puede modificar.",
  },
  {
    question: '¿La persona que recibe el regalo necesita una clave?',
    answer:
      'No hace falta: el link del regalo es único y no se puede adivinar. Si querés, podés agregarle una clave opcional desde el editor y pasársela vos.',
  },
  {
    question: '¿Cómo funcionan los pagos?',
    answer:
      'Procesamos todos los pagos a través de Mercado Pago, lo que garantiza la seguridad de tus datos. Podés pagar con tarjeta de crédito, débito o dinero en cuenta.',
  },
]

export default function HelpPage() {
  return (
    <div className="bg-white px-5 pt-[90px] pb-20">
      <header className="animate-fade-in-up pt-16 pb-12 text-center">
        <h1 className="mb-3 text-4xl font-semibold text-black sm:text-5xl">
          Centro de Ayuda y Legales
        </h1>
        <p className="text-lg text-neutral-500">
          Todo lo que necesitás saber sobre Boxie, en un solo lugar.
        </p>
      </header>

      <div className="mx-auto max-w-4xl space-y-20">
        <section>
          <h2 className="mb-6 text-3xl font-semibold text-ink">Preguntas Frecuentes</h2>
          <Faq items={FAQS} />
        </section>

        <section>
          <h2 className="mb-2 text-3xl font-semibold text-ink">Información Legal y Políticas</h2>
          <p className="mb-8 text-neutral-500">
            Para tu tranquilidad y seguridad, cumplimos con las normativas vigentes en Argentina.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            {legalDocs.map((doc) => (
              <Link
                key={doc.slug}
                href={`/legales/${doc.slug}`}
                className="rounded-3xl border border-neutral-100 bg-neutral-50 p-7 transition hover:-translate-y-1 hover:border-brand hover:bg-white"
              >
                <div className="mb-3 text-3xl">{doc.icon}</div>
                <h3 className="mb-1 text-xl font-semibold text-ink">{doc.title}</h3>
                <p className="text-neutral-500">{doc.summary}</p>
              </Link>
            ))}
          </div>
          <a
            href={site.consumerDefenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 block rounded-2xl border border-dashed border-neutral-300 p-5 text-center text-sm text-neutral-600 hover:border-brand hover:text-brand"
          >
            Defensa de las y los consumidores. Para reclamos ingresá aquí.
          </a>
        </section>

        <section className="rounded-[30px] bg-brand-soft p-10 text-center">
          <h2 className="mb-2 text-3xl font-semibold text-ink">¿Seguís con dudas?</h2>
          <p className="mb-6 text-neutral-600">
            Nuestro equipo está listo para ayudarte con lo que necesites.
          </p>
          <Link href="/contacto" className={buttonVariants({ variant: 'outline' })}>
            Ir a Contacto
          </Link>
        </section>
      </div>
    </div>
  )
}
