import { Gift, Wand2 } from 'lucide-react'
import type { Metadata } from 'next'
import type { Route } from 'next'
import Image from 'next/image'
import { listPublishedThemes } from '@/server/catalog'
import { ButtonLink } from '@/ui/Button'
import { GuideCard } from '@/ui/GuideCard'
import { Float, Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { PageIntro } from '../_components/PageIntro'
import { Mark, SectionHeading } from '../_home/primitives'
import { TeamPhoto, ValueIcon } from './parts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nosotros',
  description:
    'Boxie nació para abrazar a la distancia: regalos digitales con fotos, música y recuerdos que llegan al instante.',
  alternates: { canonical: '/nosotros' },
}

const TEAM = [
  {
    name: 'Agustín Del Puerto',
    role: 'CEO & Co-Founder',
    bio: 'El estratega detrás de la visión. Obsesionado con conectar personas a través de la tecnología.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?fit=crop&w=400&h=400',
  },
  {
    name: 'Franco Alvarez',
    role: 'Head of Design & Co-Founder',
    bio: 'El arquitecto visual. Creador de la identidad estética y la experiencia de usuario de Boxie.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?fit=crop&w=400&h=400',
  },
]

const VALUES = [
  { icon: '🚀', title: '100% digital', text: 'Llega al instante. Sin envíos, sin esperas.' },
  {
    icon: '🎨',
    title: 'Creatividad pura',
    text: 'Un lienzo en blanco para tus fotos y anécdotas.',
  },
  { icon: '❤️', title: 'Emoción real', text: 'Diseñada para generar sonrisas y lágrimas felices.' },
]

export default async function AboutPage() {
  const themes = await listPublishedThemes()
  const guides = themes.filter((t) => t.listing.guide)
  const sample = themes[0]?.slug ?? 'pareja'

  return (
    <div className="overflow-x-clip bg-white">
      <PageIntro
        eyebrow="Nuestra historia"
        title={
          <>
            Más que un regalo, <Mark>una experiencia</Mark>
          </>
        }
        text="Conectando emociones y rompiendo distancias, una Boxie a la vez."
      />

      <section className="rounded-[40px] bg-paper/50 px-5 py-20 sm:px-8">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <Reveal className="relative flex justify-center" scale={0.9} y={0}>
            <Float
              className="absolute top-1/2 left-1/2 -mt-[150px] -ml-[150px] size-[300px] rounded-full bg-[#ffe0e6] blur-[40px] sm:-mt-[175px] sm:-ml-[175px] sm:size-[350px]"
              distance={10}
              duration={8}
              aria-hidden
            />
            <Float distance={10} rotate={-2} duration={7}>
              <div className="relative z-10 flex size-[260px] items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9)_20%,rgba(255,255,255,0)_70%)] sm:size-[320px]">
                <Image
                  src="/brand/boxie-logo.png"
                  alt="Logo Boxie"
                  width={272}
                  height={95}
                  className="h-auto w-[85%] drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                />
              </div>
            </Float>
          </Reveal>
          <Stagger step={0.1} className="text-center md:text-left">
            <StaggerItem
              as="h2"
              className="mb-5 font-display text-4xl leading-tight font-bold text-ink"
            >
              Cómo empezó todo
            </StaggerItem>
            <StaggerItem as="p" className="mb-4 text-[1.05rem] leading-relaxed text-ink/75">
              Todo empezó con un problema simple:{' '}
              <strong className="text-ink">
                ¿cómo abrazar a un amigo que está a 10.000 km de distancia?
              </strong>
            </StaggerItem>
            <StaggerItem as="p" className="mb-4 text-[1.05rem] leading-relaxed text-ink/75">
              Cansados de los regalos fríos y las gift cards impersonales, buscábamos una forma de
              enviar algo que tuviera &quot;alma&quot;. Queríamos regalar recuerdos, música, risas y
              momentos.
            </StaggerItem>
            <StaggerItem as="p" className="text-[1.05rem] leading-relaxed text-ink/75">
              Así nació <strong className="text-ink">Boxie</strong>: original, 100% personalizada y
              capaz de viajar al instante a cualquier parte del mundo. Porque la distancia separa
              cuerpos, pero no historias.
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section aria-labelledby="equipo-title" className="px-5 py-20 sm:px-8 sm:py-24">
        <SectionHeading
          eyebrow="El equipo"
          title={
            <span id="equipo-title">
              ¿Quiénes están <Mark>detrás</Mark>?
            </span>
          }
        />
        <Stagger
          className="mx-auto flex max-w-5xl flex-wrap justify-center gap-12 sm:gap-16"
          step={0.15}
        >
          {TEAM.map((m) => (
            <StaggerItem key={m.name} className="w-full max-w-[300px] text-center" y={40}>
              <TeamPhoto src={m.photo} alt={m.name} />
              <h3 className="mb-1 font-display text-2xl font-bold text-ink">{m.name}</h3>
              <span className="mb-4 block text-sm font-bold tracking-wider text-brand uppercase">
                {m.role}
              </span>
              <p className="px-2.5 text-[0.95rem] text-ink/60">{m.bio}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="rounded-[40px] bg-paper/50 px-5 py-16 sm:px-8">
        <Stagger className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3" step={0.12}>
          {VALUES.map((v) => (
            <StaggerItem
              key={v.title}
              className="rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)] ring-1 ring-black/5"
              y={30}
              whileHover={{ y: -6 }}
            >
              <ValueIcon>{v.icon}</ValueIcon>
              <h3 className="mb-2 font-display text-xl font-bold text-ink">{v.title}</h3>
              <p className="text-ink/60">{v.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {guides.length > 0 && (
        <section aria-labelledby="mision-title" className="px-5 py-20 sm:px-8 sm:py-24">
          <SectionHeading
            eyebrow="Una Boxie para cada momento"
            title={
              <span id="mision-title">
                ¿Qué Boxie <Mark>elegir</Mark>?
              </span>
            }
            text="Cada Boxie tiene una misión diferente. ¿Cuál es la tuya hoy?"
          />
          <Stagger
            className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3"
            step={0.12}
          >
            {guides.map((t) => (
              <StaggerItem key={t.id} className="h-full" y={30}>
                <GuideCard
                  compact
                  href={`/tematicas/${t.slug}` as Route}
                  emoji={t.listing.guide!.emoji}
                  title={`Boxie ${t.name}`}
                  text={t.listing.guide!.text}
                />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      <section className="px-4 pb-24 sm:px-8">
        <Reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[40px] bg-ink px-6 py-14 text-center text-white sm:px-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 left-1/2 size-80 -translate-x-1/2 rounded-full bg-brand/40 blur-3xl"
          />
          <h2 className="relative font-display text-3xl leading-tight font-bold text-balance sm:text-4xl">
            ¿Listo para emocionar a alguien?
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-white/70">
            Elegí la temática, personalizala en minutos y mandala por WhatsApp.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/galeria" size="lg">
              <Gift className="size-5" aria-hidden /> Crear mi primera Boxie
            </ButtonLink>
            <ButtonLink href={`/ejemplo/${sample}/personalizar` as Route} variant="white" size="lg">
              <Wand2 className="size-5 text-brand" aria-hidden /> Probar gratis
            </ButtonLink>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
