import type { Metadata } from 'next'
import type { Route } from 'next'
import Image from 'next/image'
import { listPublishedThemes } from '@/server/catalog'
import { ButtonLink } from '@/ui/Button'
import { GuideCard } from '@/ui/GuideCard'
import { Float, Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { DrawUnderline, TeamPhoto, ValueIcon } from './parts'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nosotros',
  description:
    'Boxie nació para abrazar a la distancia: regalos digitales con fotos, música y recuerdos que llegan al instante.',
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
  { icon: '🚀', title: '100% Digital', text: 'Llega al instante. Sin envíos, sin esperas.' },
  {
    icon: '🎨',
    title: 'Creatividad Pura',
    text: 'Un lienzo en blanco para tus fotos y anécdotas.',
  },
  { icon: '❤️', title: 'Emoción Real', text: 'Diseñada para generar sonrisas y lágrimas felices.' },
]

export default async function AboutPage() {
  const themes = await listPublishedThemes()
  const guides = themes.filter((t) => t.listing.guide)

  return (
    <div className="overflow-x-hidden bg-white pt-[90px] text-neutral-700">
      <Stagger
        as="section"
        immediate
        step={0.12}
        className="mx-auto max-w-3xl px-5 pt-20 pb-14 text-center"
      >
        <StaggerItem
          as="h1"
          className="mb-5 text-4xl leading-tight font-semibold text-black sm:text-5xl"
        >
          Más que un regalo,
          <br />
          <span className="relative isolate inline-block text-brand">
            una experiencia.
            <DrawUnderline />
          </span>
        </StaggerItem>
        <StaggerItem as="p" className="mx-auto max-w-xl text-xl text-neutral-500">
          Conectando emociones y rompiendo distancias, una Boxie a la vez.
        </StaggerItem>
      </Stagger>

      <section className="bg-neutral-50 px-5 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <Reveal className="relative flex justify-center" scale={0.9} y={0}>
            <Float
              className="absolute top-1/2 left-1/2 -mt-[175px] -ml-[175px] size-[350px] rounded-full bg-[#ffe0e6] blur-[40px]"
              distance={10}
              duration={8}
              aria-hidden
            />
            <Float distance={10} rotate={-2} duration={7}>
              <div className="relative z-10 flex size-[300px] items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9)_20%,rgba(255,255,255,0)_70%)] sm:size-[320px]">
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
          <Stagger step={0.1}>
            <StaggerItem as="h2" className="mb-5 text-4xl font-semibold text-black">
              Nuestra Historia
            </StaggerItem>
            <StaggerItem as="p" className="mb-4 text-[1.05rem] leading-relaxed">
              Todo empezó con un problema simple:{' '}
              <strong>¿Cómo abrazar a un amigo que está a 10.000 km de distancia?</strong>
            </StaggerItem>
            <StaggerItem as="p" className="mb-4 text-[1.05rem] leading-relaxed">
              Cansados de los regalos fríos y las gift cards impersonales, buscábamos una forma de
              enviar algo que tuviera &quot;alma&quot;. Queríamos regalar recuerdos, música, risas y
              momentos.
            </StaggerItem>
            <StaggerItem as="p" className="text-[1.05rem] leading-relaxed">
              Así nació <strong>Boxie</strong>. Diseñada para ser original, 100% personalizada y
              capaz de viajar instantáneamente a cualquier parte del mundo. Porque la distancia
              separa cuerpos, pero no historias.
            </StaggerItem>
          </Stagger>
        </div>
      </section>

      <section className="px-5 py-20">
        <Reveal as="h2" className="mb-12 text-center text-4xl font-semibold text-black">
          ¿Quiénes están detrás de esto?
        </Reveal>
        <Stagger className="mx-auto flex max-w-5xl flex-wrap justify-center gap-16" step={0.15}>
          {TEAM.map((m) => (
            <StaggerItem key={m.name} className="w-[300px] text-center" y={40}>
              <TeamPhoto src={m.photo} alt={m.name} />
              <h3 className="mb-1 text-2xl font-semibold text-black">{m.name}</h3>
              <span className="mb-4 block text-sm font-semibold tracking-wider text-brand uppercase">
                {m.role}
              </span>
              <p className="px-2.5 text-sm text-neutral-500">{m.bio}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="bg-neutral-50 px-5 py-16">
        <Stagger className="flex flex-wrap justify-center gap-8" step={0.12}>
          {VALUES.map((v) => (
            <StaggerItem
              key={v.title}
              className="w-full max-w-[280px] rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
              y={30}
              whileHover={{ y: -6 }}
            >
              <ValueIcon>{v.icon}</ValueIcon>
              <h3 className="mb-2 text-xl font-semibold text-black">{v.title}</h3>
              <p className="text-neutral-500">{v.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {guides.length > 0 && (
        <section className="px-5 py-20 text-center">
          <Reveal as="h2" className="mb-3 text-4xl font-semibold text-black">
            ¿Qué Boxie elegir?
          </Reveal>
          <Reveal as="p" delay={0.08} className="mb-10 text-lg text-neutral-500">
            Cada Boxie tiene una misión diferente. ¿Cuál es la tuya hoy?
          </Reveal>
          <Stagger className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3" step={0.12}>
            {guides.map((t) => (
              <StaggerItem key={t.id} y={30}>
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

      <section className="bg-brand-soft px-5 py-20 text-center">
        <Reveal as="h2" className="mb-8 text-3xl font-semibold text-ink">
          ¿Listo para emocionar a alguien?
        </Reveal>
        <Reveal delay={0.1}>
          <ButtonLink href="/galeria" size="lg">
            Crear mi primera Boxie
          </ButtonLink>
        </Reveal>
      </section>
    </div>
  )
}
