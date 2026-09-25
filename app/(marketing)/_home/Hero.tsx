'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, ChevronDown, Play, ShieldCheck, Smartphone, Wand2, Zap } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import { useRef, useState } from 'react'
import { ButtonLink, Nudge } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Swap, ease, spring, useCalm } from '@/ui/motion'
import { HeroPreview } from './HeroPreview'
import { lookOf, type HomeTheme } from './theme-look'

const TRUST = [
  { icon: ShieldCheck, label: 'Pago seguro con Mercado Pago' },
  { icon: Zap, label: 'Llega al instante' },
  { icon: Smartphone, label: 'Sin apps ni cuentas' },
]

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
 * nombre y el celular de al lado lo muestra) y el llamado a comprar con el
 * precio a la vista.
 */
export function Hero({ themes }: { themes: HomeTheme[] }) {
  const ref = useRef<HTMLElement>(null)
  const calm = useCalm()
  const router = useRouter()
  const [slug, setSlug] = useState(themes[0]?.slug ?? 'pareja')
  const [name, setName] = useState('')
  const theme = themes.find((t) => t.slug === slug) ?? themes[0]

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const markY = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 160])
  const markRotate = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 12])
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : -70])

  if (!theme) return null

  const href = `/tematicas/${theme.slug}` as Route
  const short = name.trim()
  const cta = short && short.length <= 10 ? `Crear la Boxie de ${short}` : 'Crear su Boxie'

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      className="relative isolate overflow-hidden bg-[linear-gradient(12.84deg,#F44E63_-14.02%,rgba(255,255,255,0)_38.2%)] pt-[112px] pb-16 lg:flex lg:min-h-dvh lg:items-center lg:pb-24"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[90px] left-[6%] -z-10 w-[480px] md:top-auto md:right-[-60px] md:bottom-[-80px] md:left-auto md:w-[560px]"
        style={{ y: markY, rotate: markRotate }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: ease.out }}
      >
        <Image
          src="/brand/boxie-mark.png"
          alt=""
          width={532}
          height={679}
          priority
          className="h-auto w-full opacity-20 md:opacity-45"
        />
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-x-10 gap-y-10 px-5 [grid-template-areas:'copy'_'builder'_'phone'] sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-y-7 lg:[grid-template-areas:'copy_phone'_'builder_phone']"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
      >
        <div className="flex flex-col items-center gap-6 text-center [grid-area:copy] lg:items-start lg:self-end lg:text-left">
          <motion.span
            data-reveal=""
            variants={rise}
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-bold tracking-wide text-ink shadow-[0_6px_20px_rgba(42,36,51,0.08)] ring-1 ring-black/5 backdrop-blur"
          >
            <motion.span
              aria-hidden
              animate={calm ? undefined : { rotate: [0, 18, -10, 0], scale: [1, 1.25, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.4 }}
            >
              ✨
            </motion.span>
            Regalo digital personalizado · Hecho en Argentina
          </motion.span>

          <h1
            id="hero-title"
            className="text-5xl leading-[1.02] font-extrabold tracking-tight text-ink sm:text-6xl md:text-7xl"
          >
            <span className="block overflow-hidden pb-1">
              <motion.span data-reveal="" className="block" variants={line}>
                Regalá una
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-1">
              <motion.span
                data-reveal=""
                className="block font-display text-[64px] leading-[1.05] text-brand sm:text-7xl md:text-8xl"
                variants={line}
              >
                BOXIE
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-1">
              <motion.span
                data-reveal=""
                className="block text-2xl font-bold tracking-normal text-ink/85 sm:text-3xl"
                variants={line}
              >
                el regalo digital que emociona
              </motion.span>
            </span>
          </h1>

          <motion.p
            data-reveal=""
            variants={rise}
            className="max-w-xl text-lg font-medium text-ink/75 md:text-xl"
          >
            Fotos, dedicatoria, su canción y juegos en una experiencia personalizada que se abre
            desde el celular. La creás en 5 minutos y llega al instante por WhatsApp.
          </motion.p>
        </div>

        <motion.div
          data-reveal=""
          variants={rise}
          className="w-full max-w-xl justify-self-center [grid-area:builder] lg:self-start lg:justify-self-start"
        >
          <form
            id="armador"
            className="rounded-[28px] bg-white/80 p-4 shadow-[0_24px_60px_-20px_rgba(42,36,51,0.28)] ring-1 ring-black/5 backdrop-blur-md sm:p-5"
            onSubmit={(e) => {
              e.preventDefault()
              router.push(href)
            }}
          >
            <p className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-ink lg:justify-start">
              <Wand2 className="size-4 text-brand" aria-hidden />
              Armala acá mismo y mirá cómo queda
            </p>

            <div
              role="group"
              aria-label="Temática"
              className="flex gap-1 rounded-full bg-paper/80 p-1"
            >
              {themes.map((t) => {
                const selected = t.slug === slug
                return (
                  <motion.button
                    key={t.slug}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSlug(t.slug)}
                    className={cn(
                      'relative flex-1 rounded-full px-2 py-2.5 text-sm font-semibold transition-colors duration-200 sm:px-3',
                      selected ? 'text-ink' : 'text-ink/60 hover:text-ink',
                    )}
                    whileTap={{ scale: 0.94 }}
                    transition={spring.snappy}
                  >
                    {selected && (
                      <motion.span
                        layoutId="hero-theme"
                        className="absolute inset-0 rounded-full bg-white shadow-[0_4px_14px_rgba(42,36,51,0.12)]"
                        transition={spring.snappy}
                        aria-hidden
                      />
                    )}
                    <span className="relative flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <span aria-hidden>{lookOf(t.slug).emoji}</span>
                      {t.name}
                    </span>
                  </motion.button>
                )
              })}
            </div>

            <label className="group relative mt-3 block">
              <span className="sr-only">¿Para quién es la Boxie?</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                maxLength={16}
                autoComplete="off"
                enterKeyHint="go"
                placeholder="¿Para quién es? Ej: Sofi"
                className="h-13 w-full rounded-full border-2 border-transparent bg-white px-5 pr-12 text-base font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(42,36,51,0.12)] transition-[border-color,box-shadow] duration-200 outline-none placeholder:font-medium placeholder:text-ink/40 focus:border-brand focus:shadow-[0_0_0_4px_rgba(244,78,99,0.15)]"
              />
              <motion.span
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg"
                animate={short ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                key={short.length}
              >
                {short ? '💖' : '✍️'}
              </motion.span>
            </label>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <ButtonLink
                href={href}
                size="lg"
                block
                className="px-6 text-base sm:flex-1 sm:text-lg"
              >
                <span className="relative inline-flex">
                  <Swap id={cta}>{cta}</Swap>
                </span>
                <Nudge x={4}>
                  <ArrowRight className="size-5" aria-hidden />
                </Nudge>
              </ButtonLink>
              <ButtonLink
                href={`/ejemplo/${theme.slug}`}
                variant="white"
                size="lg"
                block
                className="px-5 text-base sm:w-auto"
              >
                <span className="grid size-7 place-items-center rounded-full bg-brand text-white">
                  <Play className="size-3 translate-x-px fill-current" aria-hidden />
                </span>
                Ver ejemplo
              </ButtonLink>
            </div>

            <p className="mt-3 text-center text-sm text-ink/65 lg:text-left">
              <span className="relative inline-block font-display text-base font-bold text-ink">
                <Swap id={theme.price}>{theme.price}</Swap>
              </span>{' '}
              · pago único · sin suscripciones
            </p>
          </form>

          <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-ink/70 lg:justify-start">
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5">
                <Icon className="size-4 text-brand" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div className="[grid-area:phone] lg:py-6" style={{ y: phoneY }}>
          <HeroPreview theme={theme} name={name} />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block"
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
