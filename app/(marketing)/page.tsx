import Image from 'next/image'
import Link from 'next/link'
import { listPublishedThemes } from '@/server/catalog'
import { buttonVariants } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { ThemeCard } from '@/ui/ThemeCard'

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

  return (
    <div className="bg-paper">
      {/* Banner */}
      <section className="relative isolate min-h-dvh overflow-hidden bg-[linear-gradient(12.84deg,#F44E63_-14.02%,rgba(255,255,255,0)_38.2%)] pt-[110px]">
        <Image
          src="/brand/boxie-mark.png"
          alt=""
          width={532}
          height={679}
          priority
          className="pointer-events-none absolute top-[100px] left-[10%] -z-10 w-[532px] max-w-none opacity-40 md:top-auto md:right-[-50px] md:bottom-[-50px] md:left-auto md:w-[550px] md:opacity-60"
        />
        <div className="relative z-10 mt-8 flex w-full flex-col items-center gap-8 px-4 md:items-start md:px-[10%]">
          <h1 className="text-center text-5xl leading-[1.1] font-extrabold md:text-left md:text-7xl">
            Regalá una <br />
            <span className="font-display text-[64px] text-brand md:text-7xl">BOXIE</span>
          </h1>
          <p className="max-w-3xl text-center text-lg font-medium md:text-justify md:text-2xl">
            El regalo digital que le va a llegar al corazón. Regalá distinto, compartí un momento o
            conectá con una box digital pensada para esa persona especial.
          </p>
          <div className="flex w-full flex-col items-center gap-4 md:mt-8 md:w-auto md:flex-row md:gap-0">
            <Link
              href="/#emocionar"
              className="w-full rounded-full border border-mauve bg-paper p-4 text-center text-lg font-semibold whitespace-nowrap md:w-auto md:min-w-[400px] md:py-6 md:pr-24 md:pl-8 md:text-left md:text-xl"
            >
              Preparemos tu regalo juntos
            </Link>
            <Link
              href="/galeria"
              className={cn(
                buttonVariants({ size: 'xl' }),
                'w-full text-2xl md:relative md:z-10 md:-ml-20 md:h-auto md:w-auto md:px-16 md:py-6 md:text-[28px]',
              )}
            >
              Regalar
            </Link>
          </div>
        </div>
      </section>

      {/* Temáticas */}
      <section
        id="emocionar"
        className="relative z-10 scroll-mt-24 rounded-b-[32px] bg-gradient-to-b from-paper to-mauve py-10 text-center"
      >
        <h2 className="mb-8 px-4 font-display text-[32px] font-bold">
          ¿A QUIÉN QUERÉS EMOCIONAR HOY?
        </h2>
        <div className="flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto px-6 pb-6 md:justify-center">
          {themes.map((theme, i) => (
            <ThemeCard key={theme.id} theme={theme} priority={i === 0} />
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="relative z-10 pb-8">
        <h2 className="my-8 px-4 text-center font-display text-[32px] font-bold">
          ¡ESTO ES LO QUE HACE ESPECIAL A UNA BOXIE!
        </h2>
        <p className="mb-8 text-center text-xl">Regalá diferente, regalá con intención.</p>
        <div className="grid grid-cols-1 gap-4 px-4 pb-8 md:grid-cols-[60%_1fr] md:grid-rows-2 md:px-[10%]">
          {BENEFITS.map((b, i) => (
            <div
              key={b.title}
              className={cn(
                'relative flex min-h-[250px] flex-col gap-4 rounded-[25px] border-2 border-brand bg-brand/5 p-8',
                i === 1 && 'md:col-start-2 md:row-span-2 md:row-start-1',
              )}
            >
              <span className="font-display text-[28px] font-bold">{b.title}</span>
              <p className="w-4/5 text-lg">{b.text}</p>
              <Image
                src={b.decoration}
                alt=""
                width={150}
                height={100}
                className="absolute right-2.5 bottom-2.5 h-auto w-[150px] opacity-30"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
