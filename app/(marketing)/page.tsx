import { Play, Sparkles, Wand2 } from 'lucide-react'
import Image from 'next/image'
import { listPublishedThemes } from '@/server/catalog'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Float, Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { HomeHero } from './HomeHero'
import { StepsTimeline } from './StepsTimeline'
import { ThemeCarousel } from './ThemeCarousel'

export const dynamic = 'force-dynamic'

const BENEFITS = [
  {
    title: '¡¡LLEGA AL INSTANTE!!',
    text: 'Elegís la Boxie, la personalizás con un mensaje y ¡listo! Se entrega por mail o link en minutos.',
    decoration: '/brand/decoration-1.png',
  },
  {
    title: 'EMOCIONA DE VERDAD',
    text: 'No es un archivo más. Cada Boxie está diseñada para despertar sonrisas, lágrimas lindas o ese "ay, qué hermoso".',
    decoration: '/brand/decoration-2.png',
  },
  {
    title: 'ES FÁCIL, ACCESIBLE Y SIEMPRE QUEDA BIEN',
    text: 'No necesitás gastar una fortuna ni salir corriendo a comprar algo. Es un detalle distinto, emocional y pensado.',
    decoration: '/brand/decoration-3.png',
  },
]

export default async function HomePage() {
  const themes = await listPublishedThemes()
  const sample = themes[0]?.slug ?? 'pareja'

  return (
    <div className="bg-paper">
      <HomeHero />

      {/* Temáticas */}
      <section
        id="emocionar"
        className="relative z-10 scroll-mt-24 rounded-b-[40px] bg-gradient-to-b from-paper to-mauve pt-14 pb-10 text-center"
      >
        <Reveal
          as="h2"
          className="mb-3 px-4 font-display text-[32px] leading-tight font-bold sm:text-4xl"
        >
          ¿A QUIÉN QUERÉS EMOCIONAR HOY?
        </Reveal>
        <Reveal as="p" delay={0.1} className="mb-8 px-4 text-lg text-ink/70">
          Elegí la temática: cada una trae sus propias sorpresas.
        </Reveal>
        <ThemeCarousel themes={themes} />
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-24 px-5 py-20 sm:px-8">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <Reveal
            as="span"
            className="mb-3 inline-block text-xs font-extrabold tracking-[0.2em] text-brand uppercase"
          >
            Así de simple
          </Reveal>
          <Reveal
            as="h2"
            delay={0.05}
            className="font-display text-[32px] leading-tight font-bold sm:text-4xl"
          >
            ¿CÓMO FUNCIONA?
          </Reveal>
          <Reveal as="p" delay={0.1} className="mt-3 text-lg text-ink/70">
            En cuatro pasos, y sin instalar nada: ni vos ni quien la recibe.
          </Reveal>
        </div>

        <StepsTimeline />

        <Reveal
          className="mt-14 flex flex-col items-center justify-center gap-3 sm:flex-row"
          delay={0.2}
        >
          <ButtonLink
            href={`/ejemplo/${sample}/personalizar`}
            size="lg"
            block
            className="sm:w-auto"
          >
            <Wand2 className="size-5" aria-hidden /> Probá el editor gratis
          </ButtonLink>
          <ButtonLink
            href={`/ejemplo/${sample}`}
            variant="white"
            size="lg"
            block
            className="sm:w-auto"
          >
            <Play className="size-4 fill-current text-brand" aria-hidden /> Ver una Boxie de ejemplo
          </ButtonLink>
        </Reveal>
      </section>

      {/* Beneficios */}
      <section className="relative z-10 pb-20">
        <Reveal
          as="h2"
          className="mb-3 px-4 text-center font-display text-[32px] leading-tight font-bold sm:text-4xl"
        >
          ¡ESTO ES LO QUE HACE ESPECIAL A UNA BOXIE!
        </Reveal>
        <Reveal as="p" delay={0.1} className="mb-10 px-4 text-center text-xl text-ink/80">
          Regalá diferente, regalá con intención.
        </Reveal>
        <Stagger
          className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 md:grid-cols-[60%_1fr] md:grid-rows-2 md:px-8"
          step={0.12}
        >
          {BENEFITS.map((b, i) => (
            <StaggerItem
              key={b.title}
              y={40}
              className={cn(
                'relative flex min-h-[250px] flex-col gap-4 overflow-hidden rounded-[28px] border-2 border-brand bg-brand/5 p-8 transition-colors duration-300 hover:bg-brand/10',
                i === 1 && 'md:col-start-2 md:row-span-2 md:row-start-1',
              )}
              whileHover={{ y: -6 }}
            >
              <span className="relative z-10 font-display text-[26px] leading-tight font-bold sm:text-[28px]">
                {b.title}
              </span>
              <p className="relative z-10 w-4/5 text-lg">{b.text}</p>
              <Float
                className="absolute right-2.5 bottom-2.5 w-[150px] opacity-30"
                distance={8}
                rotate={4}
                duration={6 + i}
                delay={i * 0.8}
                aria-hidden
              >
                <Image
                  src={b.decoration}
                  alt=""
                  width={150}
                  height={100}
                  className="h-auto w-full"
                />
              </Float>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* Cierre */}
      <section className="px-4 pb-20 sm:px-8">
        <Reveal
          y={40}
          className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-ink px-6 py-16 text-center text-white sm:px-12 sm:py-20"
        >
          <Float
            className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-brand/40 blur-3xl"
            distance={24}
            duration={9}
            aria-hidden
          />
          <Float
            className="pointer-events-none absolute -right-16 -bottom-28 size-80 rounded-full bg-lilac/30 blur-3xl"
            distance={20}
            duration={11}
            delay={1}
            aria-hidden
          />
          <div className="relative">
            <Sparkles className="mx-auto mb-5 size-9 text-brand-muted" aria-hidden />
            <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight font-bold sm:text-5xl">
              Un regalo que se abre con el corazón
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70">
              Elegí la temática, personalizala en minutos y mandala por WhatsApp. Llega al instante,
              esté donde esté.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ButtonLink href="/galeria" size="lg" block className="sm:w-auto">
                Elegir mi Boxie
              </ButtonLink>
              <ButtonLink
                href={`/ejemplo/${sample}/personalizar`}
                variant="white"
                size="lg"
                block
                className="sm:w-auto"
              >
                Probar el editor gratis
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
