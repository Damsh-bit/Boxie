import { AtSign, Mail, MessageCircle, MessagesSquare } from 'lucide-react'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { businessContact } from '@/domain/business'
import { getBusinessInfo } from '@/server/catalog'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { SupportButton } from '@/ui/SupportButton'
import { PageIntro } from '../_components/PageIntro'
import { Mark } from '../_home/primitives'
import { ContactForm } from './ContactForm'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contacto',
  description:
    'Escribinos: ayuda con tu Boxie por chat, ventas, prensa o cualquier consulta. Te respondemos rápido.',
  alternates: { canonical: '/contacto' },
}

function Channel({
  icon,
  title,
  text,
  children,
}: {
  icon: ReactNode
  title: string
  text: string
  children: ReactNode
}) {
  return (
    <div className="flex items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5">
      <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand [&_svg]:size-5">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-ink">{title}</p>
        <p className="text-sm text-ink/60">{text}</p>
        <div className="mt-2">{children}</div>
      </div>
    </div>
  )
}

export default async function ContactPage() {
  const contact = businessContact(await getBusinessInfo(), 'Hola Boxie 👋 Tengo una consulta')

  return (
    <div className="overflow-x-clip bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] pb-24">
      <PageIntro
        eyebrow="Contacto"
        title={
          <>
            <Mark>Hablemos</Mark>
          </>
        }
        text="Estamos para ayudarte, escucharte y crear juntos. Elegí el canal que te quede más cómodo."
      />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12">
        <Stagger className="flex flex-col gap-4" step={0.08}>
          <StaggerItem>
            <div className="rounded-3xl bg-ink p-6 text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider uppercase">
                Lo más rápido
              </span>
              <p className="mt-3 flex items-center gap-2 font-display text-2xl font-bold">
                <MessagesSquare className="size-6 text-brand-muted" aria-hidden /> Chat de soporte
              </p>
              <p className="mt-1 text-sm text-white/70">
                Para tu Boxie, un pago o un error del sitio. Te responde una persona y te avisamos
                por mail cuando hay respuesta.
              </p>
              <SupportButton className="mt-4 w-full sm:w-auto" size="md">
                Abrir el chat
              </SupportButton>
            </div>
          </StaggerItem>
          {contact.whatsapp && (
            <StaggerItem>
              <Channel
                icon={<MessageCircle />}
                title="WhatsApp"
                text="Escribinos directo desde el celular."
              >
                <a
                  href={contact.whatsapp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand underline-offset-4 hover:underline"
                >
                  {contact.whatsapp.display}
                </a>
              </Channel>
            </StaggerItem>
          )}
          <StaggerItem>
            <Channel
              icon={<Mail />}
              title="Mail de soporte"
              text="Para lo que quieras dejar por escrito."
            >
              <a
                href={`mailto:${contact.supportEmail}`}
                className="font-semibold break-all text-brand underline-offset-4 hover:underline"
              >
                {contact.supportEmail}
              </a>
            </Channel>
          </StaggerItem>
          {contact.instagram && (
            <StaggerItem>
              <Channel icon={<AtSign />} title="Instagram" text="Novedades, ideas y promociones.">
                <a
                  href={contact.instagram.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-brand underline-offset-4 hover:underline"
                >
                  {contact.instagram.handle}
                </a>
              </Channel>
            </StaggerItem>
          )}
        </Stagger>

        <Reveal
          y={40}
          scale={0.97}
          delay={0.1}
          className="rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10"
        >
          <h2 className="font-display text-2xl font-bold text-ink">Dejanos un mensaje</h2>
          <p className="mt-1 mb-6 text-sm text-ink/60">
            Ventas, publicidad, prensa, trabajo o cualquier otra consulta: lo derivamos al área que
            corresponde.
          </p>
          <ContactForm />
        </Reveal>
      </div>
    </div>
  )
}
