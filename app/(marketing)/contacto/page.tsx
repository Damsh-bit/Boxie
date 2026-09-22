import type { Metadata } from 'next'
import { site } from '@/content/site'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escribinos: ayuda con tu Boxie, ventas, prensa o cualquier consulta.',
}

export default function ContactPage() {
  return (
    <div className="bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 pt-[90px] pb-20">
      <header className="animate-fade-in-up pt-16 pb-10 text-center">
        <h1 className="mb-3 text-5xl font-semibold text-black">Hablemos</h1>
        <p className="text-lg text-neutral-500">
          Estamos acá para ayudarte, escucharte y crear juntos.
        </p>
      </header>
      <div className="mx-auto max-w-xl">
        <div className="animate-pop-in rounded-[30px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10">
          <ContactForm />
        </div>
        <div className="mt-8 text-center text-neutral-500">
          <p>¿Preferís enviarnos un mail directo?</p>
          <a href={`mailto:${site.emails.hello}`} className="text-lg font-semibold text-brand">
            {site.emails.hello}
          </a>
        </div>
      </div>
    </div>
  )
}
