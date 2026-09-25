import { KeyRound, LifeBuoy, Mail, PencilLine } from 'lucide-react'
import type { Metadata } from 'next'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { SupportButton } from '@/ui/SupportButton'
import { PageIntro } from '../_components/PageIntro'
import { Mark } from '../_home/primitives'
import { RecoverForm } from './RecoverForm'

export const metadata: Metadata = {
  title: 'Entrar a mi Boxie',
  description:
    'Recuperá el link para editar tu Boxie o el del regalo: te lo mandamos al mail con el que compraste.',
  alternates: { canonical: '/mi-boxie' },
}

const STEPS = [
  {
    icon: Mail,
    title: 'Buscá el mail de la compra',
    text: 'Te llega apenas se acredita el pago, con el asunto "¡Gracias por tu compra!".',
  },
  {
    icon: PencilLine,
    title: 'Tocá "Personalizar mi Boxie"',
    text: 'El link es personal: se abre en cualquier dispositivo, sin usuario ni clave.',
  },
  {
    icon: KeyRound,
    title: '¿No lo encontrás?',
    text: 'Pedilo de nuevo acá con tu mail y te mandamos uno nuevo al instante.',
  },
]

/**
 * Acceso del comprador. El editor se abre con el link personal que llega por
 * mail después de pagar (ya no hay "ID + clave" como en el prototipo); si se
 * perdió, se pide de nuevo con el mail de la compra.
 */
export default function MyBoxiePage() {
  return (
    <div className="overflow-x-clip bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] pb-24">
      <PageIntro
        eyebrow="Ya compré"
        title={
          <>
            Entrar a mi <Mark>Boxie</Mark>
          </>
        }
        text="Tu Boxie se edita con el link personal que te mandamos por mail. Si lo perdiste, te lo reenviamos."
      />

      <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-12">
        <Stagger as="ol" className="space-y-4" step={0.08}>
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <StaggerItem
              as="li"
              key={title}
              className="flex items-start gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5"
            >
              <span className="relative grid size-11 shrink-0 place-items-center rounded-2xl bg-brand text-white">
                <Icon className="size-5" aria-hidden />
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-ink text-[11px] font-bold">
                  {i + 1}
                </span>
              </span>
              <span>
                <span className="block font-semibold text-ink">{title}</span>
                <span className="mt-0.5 block text-sm text-ink/60">{text}</span>
              </span>
            </StaggerItem>
          ))}
        </Stagger>

        <div className="space-y-5">
          <Reveal
            y={30}
            className="rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-8"
          >
            <h2 className="font-display text-2xl font-bold text-ink">Pedir el link de nuevo</h2>
            <p className="mt-1 mb-5 text-sm text-ink/60">
              Te mandamos el acceso de tus Boxies vigentes: el link para editar las que todavía
              armás y el del regalo de las que ya bloqueaste.
            </p>
            <RecoverForm />
          </Reveal>
          <Reveal
            delay={0.1}
            className="flex flex-col gap-4 rounded-3xl bg-ink p-6 text-white sm:flex-row sm:items-center"
          >
            <LifeBuoy className="size-8 shrink-0 text-brand-muted" aria-hidden />
            <p className="flex-1 text-sm text-white/75">
              <strong className="block text-base text-white">¿Algo no funciona?</strong>
              Abrí un ticket y te ayuda una persona del equipo.
            </p>
            <SupportButton size="sm" detail={{ topic: 'boxie' }}>
              Necesito ayuda
            </SupportButton>
          </Reveal>
        </div>
      </div>
    </div>
  )
}
