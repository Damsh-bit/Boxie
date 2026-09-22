import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { listPublishedThemes } from '@/server/catalog'
import { buttonVariants } from '@/ui/Button'
import { cn } from '@/ui/cn'

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

  return (
    <div className="overflow-x-hidden bg-white pt-[90px] text-neutral-700">
      <section className="mx-auto max-w-3xl animate-fade-in-up px-5 pt-20 pb-10 text-center">
        <h1 className="mb-5 text-4xl leading-tight font-semibold text-black sm:text-5xl">
          Más que un regalo,
          <br />
          <span className="relative inline-block text-brand after:absolute after:bottom-1 after:left-0 after:-z-10 after:h-2 after:w-full after:rounded after:bg-brand/20">
            una experiencia.
          </span>
        </h1>
        <p className="mx-auto max-w-xl text-xl text-neutral-500">
          Conectando emociones y rompiendo distancias, una Boxie a la vez.
        </p>
      </section>

      <section className="bg-neutral-50 px-5 py-16">
        <div className="mx-auto grid max-w-5xl items-center gap-12 md:grid-cols-2">
          <div className="relative flex justify-center">
            <div className="absolute top-1/2 left-1/2 size-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffe0e6] blur-[40px]" />
            <div className="relative z-10 flex size-[320px] items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9)_20%,rgba(255,255,255,0)_70%)]">
              <Image
                src="/brand/boxie-logo.png"
                alt="Logo Boxie"
                width={272}
                height={95}
                className="h-auto w-[85%] drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              />
            </div>
          </div>
          <div>
            <h2 className="mb-5 text-4xl font-semibold text-black">Nuestra Historia</h2>
            <p className="mb-4 text-[1.05rem] leading-relaxed">
              Todo empezó con un problema simple:{' '}
              <strong>¿Cómo abrazar a un amigo que está a 10.000 km de distancia?</strong>
            </p>
            <p className="mb-4 text-[1.05rem] leading-relaxed">
              Cansados de los regalos fríos y las gift cards impersonales, buscábamos una forma de
              enviar algo que tuviera &quot;alma&quot;. Queríamos regalar recuerdos, música, risas y
              momentos.
            </p>
            <p className="text-[1.05rem] leading-relaxed">
              Así nació <strong>Boxie</strong>. Diseñada para ser original, 100% personalizada y
              capaz de viajar instantáneamente a cualquier parte del mundo. Porque la distancia
              separa cuerpos, pero no historias.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 py-20">
        <h2 className="mb-10 text-center text-4xl font-semibold text-black">
          ¿Quiénes están detrás de esto?
        </h2>
        <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-16">
          {TEAM.map((m) => (
            <div key={m.name} className="group w-[300px] text-center">
              <div className="mx-auto mb-5 size-[200px] overflow-hidden rounded-full border-[3px] border-transparent shadow-[0_5px_15px_rgba(0,0,0,0.1)] transition group-hover:scale-105 group-hover:border-brand">
                <Image
                  src={m.photo}
                  alt={m.name}
                  width={200}
                  height={200}
                  className="size-full object-cover"
                />
              </div>
              <h3 className="mb-1 text-2xl font-semibold text-black">{m.name}</h3>
              <span className="mb-4 block text-sm font-semibold tracking-wider text-brand uppercase">
                {m.role}
              </span>
              <p className="px-2.5 text-sm text-neutral-500">{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap justify-center gap-8 bg-neutral-50 px-5 py-16">
        {VALUES.map((v) => (
          <div
            key={v.title}
            className="w-full max-w-[280px] rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(0,0,0,0.04)]"
          >
            <div className="mb-4 text-4xl">{v.icon}</div>
            <h3 className="mb-2 text-xl font-semibold text-black">{v.title}</h3>
            <p className="text-neutral-500">{v.text}</p>
          </div>
        ))}
      </section>

      {themes.some((t) => t.listing.guide) && (
        <section className="px-5 py-20 text-center">
          <h2 className="mb-3 text-4xl font-semibold text-black">¿Qué Boxie elegir?</h2>
          <p className="mb-10 text-lg text-neutral-500">
            Cada Boxie tiene una misión diferente. ¿Cuál es la tuya hoy?
          </p>
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {themes
              .filter((t) => t.listing.guide)
              .map((t) => (
                <Link
                  key={t.id}
                  href={`/tematicas/${t.slug}`}
                  className="rounded-3xl border border-neutral-100 p-8 transition hover:-translate-y-1 hover:border-brand"
                >
                  <span className="mb-3 block text-4xl">{t.listing.guide!.emoji}</span>
                  <h3 className="mb-2 text-xl font-semibold text-black">Boxie {t.name}</h3>
                  <p className="text-neutral-500">{t.listing.guide!.text}</p>
                </Link>
              ))}
          </div>
        </section>
      )}

      <section className="bg-brand-soft px-5 py-20 text-center">
        <h2 className="mb-8 text-3xl font-semibold text-ink">¿Listo para emocionar a alguien?</h2>
        <Link href="/galeria" className={cn(buttonVariants({ size: 'lg' }))}>
          Crear mi primera Boxie
        </Link>
      </section>
    </div>
  )
}
