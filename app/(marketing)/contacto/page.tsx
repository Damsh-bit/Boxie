import { Mail } from 'lucide-react'
import type { Metadata } from 'next'
import { site } from '@/content/site'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { ContactForm } from './ContactForm'

export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escribinos: ayuda con tu Boxie, ventas, prensa o cualquier consulta.',
}

export default function ContactPage() {
  return (
    <div className="bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 pt-[90px] pb-20">
      <Stagger as="header" immediate step={0.1} className="pt-16 pb-10 text-center">
        <StaggerItem as="h1" className="mb-3 text-5xl font-semibold text-black">
          Hablemos
        </StaggerItem>
        <StaggerItem as="p" className="text-lg text-neutral-500">
          Estamos acá para ayudarte, escucharte y crear juntos.
        </StaggerItem>
      </Stagger>
      <div className="mx-auto max-w-xl">
        <Reveal
          y={40}
          scale={0.97}
          delay={0.15}
          className="rounded-[30px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10"
        >
          <ContactForm />
        </Reveal>
        <Reveal delay={0.25} className="mt-8 text-center text-neutral-500">
          <p>¿Preferís enviarnos un mail directo?</p>
          <a
            href={`mailto:${site.emails.hello}`}
            className="mt-1 inline-flex items-center gap-2 text-lg font-semibold text-brand underline-offset-4 hover:underline"
          >
            <Mail className="size-5" aria-hidden /> {site.emails.hello}
          </a>
        </Reveal>
      </div>
    </div>
  )
}
