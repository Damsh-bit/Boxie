'use client'

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowRight, ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import type { Occasion } from '@/content/home'
import type { SocialProof } from '@/domain/social-proof'
import type { Showcase } from '@/slides/showcase'
import { Icon } from '@/ui/Icon'
import { ease, spring, useCalm } from '@/ui/motion'
import { HeroBuilder } from './HeroBuilder'
import { HeroPreview } from './HeroPreview'
import { useMouseParallax } from './primitives'
import type { HomeTheme } from './theme-look'

const WIDE = '(min-width: 1024px)'

function subscribeWide(callback: () => void) {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

/** true con la portada en dos columnas (lg; en el servidor, false). */
function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: ease.out } },
}

const line = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 0.9, ease: ease.out } },
}

/**
 * La portada: titular, un armador en vivo (elegís la temática, escribís el
 * nombre y el celular de al lado lo muestra; HeroBuilder.tsx) y el llamado a
 * comprar con el precio a la vista.
 */
export function Hero({
  themes,
  salesPaused,
  proof,
  userName,
  hasPreviousPurchases,
  draft,
  showcase = null,
  occasions = [],
}: {
  themes: HomeTheme[]
  salesPaused: boolean
  proof: SocialProof
  userName?: string | null
  hasPreviousPurchases?: boolean
  draft?: { id: string; recipientName: string; editUrl: string } | null
  /** Las pantallas de verdad que pasan en el celular (src/slides/showcase.ts). */
  showcase?: Showcase | null
  /** Los momentos para regalarla, que flotan al lado del celular. */
  occasions?: Occasion[]
}) {
  const ref = useRef<HTMLElement>(null)
  const calm = useCalm()
  const [slug, setSlug] = useState(themes[0]?.slug ?? 'pareja')
  const [name, setName] = useState('')
  // Hasta que eligen una temática, el celular intercala lo mejor de cada Ribbly.
  const [chosen, setChosen] = useState(false)
  const theme = themes.find((t) => t.slug === slug) ?? themes[0]
  const choose = (next: string) => {
    setSlug(next)
    setChosen(true)
  }

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const markY = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 160])
  const markRotate = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 12])
  // En una columna el celular va debajo del armador: si subiera, lo taparía.
  const wide = useWide()
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, calm || !wide ? 0 : -70])

  // La marca de fondo se corre al revés que el mouse, y una luz suave lo sigue.
  const mouse = useMouseParallax()
  const markMouseX = useTransform(mouse.x, (v) => v * -26)
  const markMouseY = useTransform(mouse.y, (v) => v * -18)
  const lightX = useMotionValue(0)
  const lightY = useMotionValue(0)
  const lightOn = useSpring(0, { stiffness: 80, damping: 20 })
  const light = useMotionTemplate`radial-gradient(560px circle at ${lightX}px ${lightY}px, rgba(244,78,99,0.14), transparent 65%)`
  const followLight = (e: PointerEvent<HTMLElement>) => {
    if (calm || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    lightX.set(e.clientX - r.left)
    lightY.set(e.clientY - r.top)
    lightOn.set(1)
  }

  if (!theme) return null

  const short = name.trim()

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      onPointerMove={followLight}
      onPointerLeave={() => lightOn.set(0)}
      className="relative isolate overflow-hidden bg-[linear-gradient(12.84deg,#F44E63_-14.02%,rgba(255,255,255,0)_38.2%)] pt-[96px] pb-14 sm:pt-[104px] lg:flex lg:min-h-dvh lg:items-center lg:pt-[88px] lg:pb-6"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: light, opacity: lightOn }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[90px] left-[6%] -z-10 w-[min(480px,110vw)] md:top-auto md:right-[-60px] md:bottom-[-80px] md:left-auto md:w-[560px]"
        style={{ y: markY, rotate: markRotate }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: ease.out }}
      >
        <motion.div style={{ x: markMouseX, y: markMouseY }}>
          <Image
            src="/brand/ribbly-mark.png"
            alt=""
            width={418}
            height={516}
            priority
            className="h-auto w-full opacity-20 md:opacity-45"
          />
        </motion.div>
      </motion.div>

      <motion.div
        // grid-cols-1 (minmax(0, 1fr)): nada de adentro puede ensanchar la grilla más que la pantalla.
        className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-x-10 gap-y-7 px-4 [grid-template-areas:'phone'_'copy'_'builder'] min-[380px]:px-5 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-y-5 lg:[grid-template-areas:'copy_phone'_'builder_phone']"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
      >
        <div className="flex min-w-0 flex-col items-center gap-4 text-center [grid-area:copy] lg:items-start lg:self-end lg:text-left">
          {/* Banner de borrador pendiente */}
          {draft && (
            <motion.a
              href={draft.editUrl}
              data-reveal=""
              variants={rise}
              className="flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-all hover:border-amber-300 hover:bg-amber-100"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-100">
                <Icon name="escribir" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-amber-900">
                  Tenés un regalo sin terminar
                </span>
                <span className="block truncate text-xs text-amber-700">
                  Para {draft.recipientName} · Tocá para continuar
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-amber-600" aria-hidden />
            </motion.a>
          )}

          {/* Si volvió con su cuenta, el saludo (la prueba social va al lado del celular). */}
          {userName && (
            <motion.span
              data-reveal=""
              variants={rise}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-bold tracking-wide text-ink shadow-[0_6px_20px_rgba(42,36,51,0.08)] ring-1 ring-black/5 backdrop-blur"
            >
              <motion.span
                aria-hidden
                className="inline-flex"
                animate={calm ? undefined : { rotate: [0, 18, -10, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.4 }}
              >
                <Icon name="hola" size={16} />
              </motion.span>
              <span className="truncate">
                ¡Hola, {userName.split(' ')[0]}! Bienvenido de vuelta
              </span>
            </motion.span>
          )}

          <h1
            id="hero-title"
            className="text-[2.4rem] leading-[1.02] font-extrabold tracking-tight text-ink min-[380px]:text-[2.75rem] sm:text-6xl lg:text-[3.1rem] xl:text-[3.4rem] lg:[@media(max-height:760px)]:text-[2.75rem]"
          >
            <span className="block overflow-hidden pb-1">
              <motion.span data-reveal="" className="block" variants={line}>
                Regalá una
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-1">
              <motion.span
                data-reveal=""
                className="block font-display text-[3.4rem] leading-[1.05] text-brand min-[380px]:text-[3.9rem] sm:text-7xl lg:text-[4.75rem] xl:text-[5.2rem] lg:[@media(max-height:760px)]:text-[4.2rem]"
                variants={line}
              >
                <BouncyWord word="RIBBLY" />
              </motion.span>
            </span>
          </h1>

          <motion.p
            data-reveal=""
            variants={rise}
            className="max-w-xl text-base font-medium text-pretty text-ink/75 min-[380px]:text-[17px] xl:text-lg"
          >
            Fotos, su canción, dedicatoria y juegos en un regalo digital que se abre en el celular.
            La armás en 5 minutos y llega al instante por WhatsApp.
          </motion.p>
        </div>

        <motion.div
          data-reveal=""
          variants={rise}
          className="w-full max-w-xl min-w-0 justify-self-center [grid-area:builder] lg:self-start lg:justify-self-start"
        >
          <HeroBuilder
            themes={themes}
            theme={theme}
            chosen={chosen}
            name={name}
            onName={setName}
            onChoose={choose}
            salesPaused={salesPaused}
            hasPreviousPurchases={hasPreviousPurchases ?? false}
          />
        </motion.div>

        {/* En una columna el celular va arriba de todo y asoma de una ranura: se
            ve la parte de arriba (--peek) y el título entra en la primera pantalla. */}
        <motion.div
          className="relative min-w-0 [--peek:300px] [grid-area:phone] max-lg:pb-1.5 sm:[--peek:380px] lg:py-2"
          style={{ y: phoneY }}
        >
          {/* Se corta solo abajo, en la ranura: arriba y a los costados flota libre. */}
          <div className="max-lg:h-[calc(var(--peek)+8px)] max-lg:pt-2 max-lg:[clip-path:inset(-200px_-100vw_0_-100vw)]">
            <HeroPreview
              theme={theme}
              themes={themes}
              name={name}
              showcase={showcase}
              occasions={occasions}
              purchases={proof.events}
              mix={!chosen && !short}
              onPickTheme={choose}
            />
          </div>
          <span
            aria-hidden
            className="pointer-events-none absolute top-[calc(var(--peek)+8px)] left-1/2 h-4 w-[264px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_-8px_18px_-8px_rgba(42,36,51,0.45),0_10px_22px_-8px_rgba(42,36,51,0.35)] ring-1 ring-black/5 sm:w-[314px] lg:hidden"
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block lg:[@media(max-height:900px)]:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <a
          href="#emocionar"
          aria-label="Ver las temáticas"
          className="grid place-items-center rounded-full border border-ink/15 bg-white/60 p-2 text-ink backdrop-blur transition-colors hover:bg-white"
        >
          <motion.span
            className="block"
            animate={
              calm
                ? undefined
                : { transform: ['translateY(-2px)', 'translateY(4px)', 'translateY(-2px)'] }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="size-5" aria-hidden />
          </motion.span>
        </a>
      </motion.div>
    </section>
  )
}

/**
 * Una palabra del título cuyas letras saltan cuando les pasa el mouse por
 * encima. Los lectores de pantalla la leen entera.
 */
function BouncyWord({ word }: { word: string }) {
  // Con "reducir movimiento" las letras quedan quietas (misma estructura: el
  // servidor no sabe la preferencia y la hidratación tiene que coincidir).
  const calm = useCalm()
  return (
    <>
      <span className="sr-only">{word}</span>
      <span aria-hidden>
        {Array.from(word).map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block cursor-default"
            whileHover={calm ? undefined : { y: -12, rotate: i % 2 ? 7 : -7, scale: 1.08 }}
            transition={spring.bouncy}
          >
            {ch}
          </motion.span>
        ))}
      </span>
    </>
  )
}
