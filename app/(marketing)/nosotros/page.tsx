import { ArrowRight, Gift, Wand2 } from 'lucide-react'
import type { Metadata, Route } from 'next'
import { chapters, founders, principles } from '@/content/about'
import { getSocialProof } from '@/server/social-proof'
import { getStorefront } from '@/server/storefront'
import { ButtonLink } from '@/ui/Button'
import { LiftLink } from '@/ui/LiftLink'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { CountUp } from '../_home/primitives'
import { AboutHero } from './AboutHero'
import { FounderAvatar } from './FounderAvatar'
import { Manifesto } from './Manifesto'
import { Story } from './Story'
import { Team } from './Team'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nosotros',
  description:
    'Ribbly nació para abrazar a la distancia. Somos Agustín, Santiago y Damián: hacemos regalos digitales con fotos, música y recuerdos que llegan al instante.',
  alternates: { canonical: '/nosotros' },
}

export default async function AboutPage() {
  const sf = await getStorefront()
  const proof = await getSocialProof({ themes: sf.themes, salesPaused: sf.salesPaused })
  const sample = sf.themes[0]?.slug ?? 'pareja'

  // Los números salen del catálogo y de las ventas: no hay nada inventado.
  const stats = [
    { value: sf.themes.length, label: 'temáticas para elegir' },
    { value: sf.maxScreens, label: 'sorpresas en una sola Ribbly' },
    { value: sf.lifetimeDays.max, label: 'días online para abrirla las veces que quiera' },
    proof.sold
      ? { value: proof.sold, prefix: '+', label: 'regalos entregados' }
      : { value: founders.length, label: 'fundadores que te responden en el chat' },
  ].filter((s) => s.value > 0)

  return (
    <div className="overflow-x-clip bg-white">
      <AboutHero />

      <section aria-label="Ribbly en números" className="px-4 sm:px-8">
        <Stagger
          className="mx-auto grid max-w-5xl grid-cols-2 gap-px overflow-hidden rounded-[32px] bg-black/[0.06] shadow-[0_24px_60px_-35px_rgba(42,36,51,0.35)] ring-1 ring-black/[0.06] lg:grid-cols-4"
          step={0.08}
        >
          {stats.map((s) => (
            <StaggerItem key={s.label} className="bg-white px-4 py-7 text-center sm:px-6 sm:py-9">
              <p className="font-display text-[2.6rem] leading-none font-bold text-ink sm:text-5xl">
                <CountUp to={s.value} prefix={'prefix' in s ? s.prefix : ''} />
              </p>
              <p className="mx-auto mt-2.5 max-w-[12rem] text-sm leading-snug text-ink/60">
                {s.label}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <Story
        chapters={chapters.map((c) => ({
          ...c,
          text: c.text.replace('{temáticas}', String(sf.themes.length)),
        }))}
      />

      <Team founders={founders} />

      <div className="py-16 sm:py-20">
        <Manifesto principles={principles} />
      </div>

      <section className="px-4 pb-24 sm:px-8">
        <Reveal className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[1.5fr_1fr]">
          <div className="relative isolate overflow-hidden rounded-[36px] bg-brand px-6 py-12 text-white sm:px-12 sm:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -bottom-28 -z-10 size-96 rounded-full bg-[#ff8a9a] blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute top-6 right-8 -z-10 text-7xl opacity-25 sm:text-8xl"
            >
              💌
            </span>
            <h2 className="max-w-md font-display text-3xl leading-[1.08] font-bold text-balance sm:text-[2.6rem]">
              ¿Tenés a alguien a quien abrazar?
            </h2>
            <p className="mt-3 max-w-md text-lg text-white/85">
              Elegí la temática, personalizala en minutos y mandala por WhatsApp.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/galeria" variant="white" size="lg">
                <Gift className="size-5 text-brand" aria-hidden /> Crear mi Ribbly
              </ButtonLink>
              <ButtonLink
                href={`/ejemplo/${sample}/personalizar` as Route}
                size="lg"
                className="border-2 border-white/60 bg-transparent shadow-none hover:bg-white/10 hover:shadow-none"
              >
                <Wand2 className="size-5" aria-hidden /> Probar gratis
              </ButtonLink>
            </div>
          </div>

          <LiftLink
            href="/contacto"
            className="group flex flex-col justify-between gap-8 rounded-[36px] bg-paper/50 px-6 py-10 ring-1 ring-black/5 transition-colors hover:bg-paper/80 sm:px-10"
          >
            <div className="flex -space-x-2">
              {founders.map((f) => (
                <FounderAvatar
                  key={f.id}
                  founder={f}
                  size={54}
                  className="ring-4 ring-[#f1eff0]"
                  still
                />
              ))}
            </div>
            <div>
              <h2 className="font-display text-2xl leading-tight font-bold text-ink sm:text-3xl">
                ¿Una idea, una alianza o ganas de sumarte?
              </h2>
              <p className="mt-2 text-ink/65">
                Prensa, marcas, creadores o alguien que quiere trabajar con nosotros: te leemos.
              </p>
              <span className="mt-5 inline-flex items-center gap-2 font-bold text-brand">
                Escribinos
                <ArrowRight
                  className="size-4 transition-transform duration-300 group-hover:translate-x-1"
                  aria-hidden
                />
              </span>
            </div>
          </LiftLink>
        </Reveal>
      </section>
    </div>
  )
}
