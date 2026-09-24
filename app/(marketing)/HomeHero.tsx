'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ChevronDown, Play } from 'lucide-react'
import Image from 'next/image'
import { useRef } from 'react'
import { ButtonLink, Nudge } from '@/ui/Button'
import { ease, useCalm } from '@/ui/motion'
import { HeroPhone } from './HeroPhone'

const PROMISES = ['Llega al instante', 'Se abre desde el celular', 'Sin apps ni cuentas']

/** La portada de la home: titular, llamados a la acción y una Boxie de muestra. */
export function HomeHero() {
  const ref = useRef<HTMLElement>(null)
  const calm = useCalm()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const markY = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 160])
  const markRotate = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 12])
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : -80])

  const line = {
    hidden: { y: '105%' },
    show: { y: '0%', transition: { duration: 0.9, ease: ease.out } },
  }

  return (
    <section
      ref={ref}
      className="relative isolate overflow-hidden bg-[linear-gradient(12.84deg,#F44E63_-14.02%,rgba(255,255,255,0)_38.2%)] pt-[118px] pb-16 lg:min-h-dvh lg:pb-24"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[90px] left-[6%] -z-10 w-[480px] md:top-auto md:right-[-60px] md:bottom-[-80px] md:left-auto md:w-[560px]"
        style={{ y: markY, rotate: markRotate }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: ease.out }}
      >
        {/* La transparencia va en la imagen: la del contenedor la maneja la animación. */}
        <Image
          src="/brand/boxie-mark.png"
          alt=""
          width={532}
          height={679}
          priority
          className="h-auto w-full opacity-25 md:opacity-50"
        />
      </motion.div>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-8">
        <motion.div
          className="flex flex-col items-center gap-7 text-center lg:items-start lg:text-left"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
        >
          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight text-ink sm:text-6xl md:text-7xl">
            <span className="block overflow-hidden pb-1">
              <motion.span data-reveal="" className="block" variants={line}>
                Regalá una
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-2">
              <motion.span
                data-reveal=""
                className="block font-display text-[64px] text-brand sm:text-7xl md:text-8xl"
                variants={line}
              >
                BOXIE
              </motion.span>
            </span>
          </h1>

          <motion.p
            data-reveal=""
            className="max-w-xl text-lg font-medium text-ink/80 md:text-xl"
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: ease.out } },
            }}
          >
            El regalo digital que le va a llegar al corazón: fotos, música, juegos y una
            dedicatoria, en una experiencia pensada para esa persona especial.
          </motion.p>

          <motion.div
            data-reveal=""
            className="flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
            variants={{
              hidden: { opacity: 0, y: 20 },
              show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: ease.out } },
            }}
          >
            <ButtonLink href="/galeria" size="xl" block className="sm:w-auto">
              Regalar una Boxie
              <Nudge x={4}>
                <ArrowRight className="size-5" aria-hidden />
              </Nudge>
            </ButtonLink>
            <ButtonLink
              href="/ejemplo/pareja"
              variant="white"
              size="xl"
              block
              className="text-lg sm:w-auto"
            >
              <span className="grid size-8 place-items-center rounded-full bg-brand text-white">
                <Play className="size-3.5 translate-x-px fill-current" aria-hidden />
              </span>
              Ver un ejemplo
            </ButtonLink>
          </motion.div>

          <motion.ul
            data-reveal=""
            className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-ink/70 lg:justify-start"
            variants={{
              hidden: { opacity: 0 },
              show: { opacity: 1, transition: { duration: 0.8, delay: 0.1 } },
            }}
          >
            {PROMISES.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-brand" aria-hidden />
                {p}
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <motion.div style={{ y: phoneY }}>
          <HeroPhone />
        </motion.div>
      </div>

      <motion.a
        href="#emocionar"
        aria-label="Ver las temáticas"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 place-items-center rounded-full border border-ink/15 bg-white/60 p-2 text-ink backdrop-blur lg:grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
        whileHover={{ scale: 1.1 }}
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
      </motion.a>
    </section>
  )
}
