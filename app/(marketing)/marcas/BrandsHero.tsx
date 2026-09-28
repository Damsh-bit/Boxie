'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { industries, type Industry } from '@/content/brands'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Float, Stagger, StaggerItem, ease, spring, useCalm } from '@/ui/motion'
import { Mark, PhoneFrame } from '../_home/primitives'
import { PseudoQr } from './PseudoQr'

/**
 * La portada de /marcas: el título y un selector de rubro. La maqueta de la
 * derecha muestra cómo sería la Boxie de ese rubro (con la marca, la campaña
 * y sus módulos). Va pasando sola hasta que alguien elige uno.
 */
export function BrandsHero() {
  const [active, setActive] = useState(0)
  const [touched, setTouched] = useState(false)
  const calm = useCalm()
  const industry = industries[active]!

  useEffect(() => {
    if (touched || calm) return
    const id = window.setInterval(() => setActive((i) => (i + 1) % industries.length), 4200)
    return () => window.clearInterval(id)
  }, [touched, calm])

  const choose = (i: number) => {
    setTouched(true)
    setActive(i)
  }

  return (
    <header className="relative isolate overflow-hidden px-5 pt-[108px] pb-16 sm:px-8 sm:pt-[140px] sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-[8%] -z-10 size-[34rem] rounded-full blur-3xl transition-colors duration-700"
        style={{ backgroundColor: `color-mix(in srgb, ${industry.color} 22%, transparent)` }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-20 left-[5%] -z-10 size-[24rem] rounded-full bg-brand/10 blur-3xl"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-10">
        <Stagger immediate step={0.08} className="text-center lg:text-left">
          <StaggerItem
            as="span"
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.18em] text-brand uppercase"
          >
            Boxie para marcas
          </StaggerItem>
          <StaggerItem
            as="h1"
            className="font-display text-[2.4rem] leading-[1.04] font-bold text-balance text-ink sm:text-6xl lg:text-[3.9rem]"
          >
            Tu marca, dentro de un regalo que <Mark>emociona</Mark>
          </StaggerItem>
          <StaggerItem
            as="p"
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-ink/70 sm:text-xl lg:mx-0"
          >
            Boxie es un regalo digital que se adapta a cualquier rubro. Con tu café, tu ramo o tu
            entrada, la gente arma una Boxie y se la manda a quien quiere. Tu marca viaja con el
            regalo.
          </StaggerItem>
          <StaggerItem className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href="#sumate" size="lg">
              Quiero ser aliado
            </ButtonLink>
            <Link
              href="#formatos"
              className="group inline-flex items-center gap-2 font-semibold text-ink/70 transition-colors hover:text-brand"
            >
              Ver formatos
              <ArrowDown
                className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
                aria-hidden
              />
            </Link>
          </StaggerItem>

          <StaggerItem className="mt-10">
            <p className="mb-3 text-xs font-extrabold tracking-[0.16em] text-ink/45 uppercase">
              Elegí un rubro
            </p>
            <div
              role="tablist"
              aria-label="Rubros"
              className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0 lg:justify-start [&::-webkit-scrollbar]:hidden"
            >
              {industries.map((ind, i) => {
                const selected = i === active
                return (
                  <button
                    key={ind.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="rubro-maqueta"
                    onClick={() => choose(i)}
                    className={cn(
                      'relative flex h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors',
                      selected
                        ? 'text-white'
                        : 'bg-white text-ink ring-1 ring-black/10 hover:ring-black/20',
                    )}
                  >
                    {selected && (
                      <motion.span
                        layoutId="rubro-activo"
                        className="absolute inset-0 rounded-full shadow-[0_10px_24px_-10px_rgba(42,36,51,0.5)]"
                        style={{ backgroundColor: ind.color }}
                        transition={spring.snappy}
                        aria-hidden
                      />
                    )}
                    <span className="relative" aria-hidden>
                      {ind.emoji}
                    </span>
                    <span className="relative">{ind.label}</span>
                  </button>
                )
              })}
            </div>
            {!touched && !calm && (
              <div className="mx-auto mt-3 h-1 max-w-[12rem] overflow-hidden rounded-full bg-black/[0.06] lg:mx-0">
                <motion.span
                  key={active}
                  className="block h-full origin-left rounded-full bg-ink/30"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 4.2, ease: 'linear' }}
                />
              </div>
            )}
          </StaggerItem>
        </Stagger>

        <div id="rubro-maqueta" role="tabpanel" aria-live="polite" className="relative">
          <Mockup industry={industry} />
        </div>
      </div>
    </header>
  )
}

function Mockup({ industry }: { industry: Industry }) {
  return (
    <div className="relative mx-auto h-[540px] w-full max-w-[440px] sm:h-[580px]">
      <motion.div
        className="absolute top-0 left-1/2 w-[250px] -translate-x-1/2 sm:left-[58%] sm:w-[270px]"
        initial={{ opacity: 0, y: 40, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ ...spring.gentle, delay: 0.3 }}
      >
        <Float distance={8} duration={7}>
          <PhoneFrame label={`Ejemplo de Boxie de ${industry.brand}`}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={industry.id}
                className="absolute inset-0 flex flex-col px-5 pt-12 pb-6 text-white"
                style={{
                  background: `linear-gradient(165deg, color-mix(in srgb, ${industry.color} 75%, #2a2433) 0%, ${industry.color} 55%, color-mix(in srgb, ${industry.color} 60%, white) 100%)`,
                }}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: ease.out }}
              >
                <span className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[0.65rem] font-bold backdrop-blur">
                  Te la regala {industry.brand}
                </span>
                <motion.span
                  className="mt-7 text-center text-6xl"
                  aria-hidden
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...spring.bouncy, delay: 0.15 }}
                >
                  {industry.emoji}
                </motion.span>
                <p className="mt-4 text-center font-fun text-[1.7rem] leading-tight font-semibold">
                  Para vos, Sofi
                </p>
                <p className="mt-2 text-center text-[0.82rem] leading-snug text-white/85">
                  {industry.campaign}
                </p>
                <ul className="mt-auto space-y-1.5">
                  {industry.modules.map((m, i) => (
                    <motion.li
                      key={m}
                      className="rounded-xl bg-white/15 px-3 py-2 text-[0.75rem] font-semibold backdrop-blur"
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...spring.soft, delay: 0.25 + i * 0.08 }}
                    >
                      {m}
                    </motion.li>
                  ))}
                </ul>
                <span className="mt-4 rounded-full bg-white py-2.5 text-center text-sm font-bold text-ink">
                  Abrir mi Boxie ✨
                </span>
              </motion.div>
            </AnimatePresence>
          </PhoneFrame>
        </Float>
      </motion.div>

      {/* El punto de contacto en el mundo real: el QR del vaso, la tarjeta del ramo… */}
      <motion.div
        className="absolute bottom-0 left-0 w-[160px] rounded-3xl bg-white p-4 shadow-[0_30px_60px_-25px_rgba(42,36,51,0.5)] ring-1 ring-black/5 sm:-left-4 sm:w-[180px]"
        initial={{ opacity: 0, x: -30, rotate: -8 }}
        animate={{ opacity: 1, x: 0, rotate: -6 }}
        transition={{ ...spring.gentle, delay: 0.55 }}
      >
        <Float distance={6} duration={6} delay={0.8}>
          <PseudoQr seed={industry.id} color="#2a2433" className="mx-auto size-20 sm:size-24" />
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={industry.id}
              className="mt-3 text-center text-xs leading-snug font-semibold text-ink/70"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              {industry.channel}
            </motion.p>
          </AnimatePresence>
        </Float>
      </motion.div>

      <motion.div
        className="absolute top-20 left-0 rounded-2xl bg-ink px-4 py-3 text-white shadow-[0_20px_40px_-20px_rgba(42,36,51,0.6)] sm:-left-2"
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0, rotate: -5 }}
        transition={{ ...spring.gentle, delay: 0.7 }}
      >
        <p className="text-[0.6rem] font-extrabold tracking-[0.16em] text-white/50 uppercase">
          Ejemplo
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={industry.id}
            className="text-sm font-bold"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {industry.emoji} {industry.label}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
