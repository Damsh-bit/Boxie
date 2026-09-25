'use client'

import { AnimatePresence, animate, motion, useInView, useMotionValue } from 'framer-motion'
import { Gift, Play } from 'lucide-react'
import type { Route } from 'next'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { experiences, type ExperienceId } from '@/content/home'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Collapse, Float, Swap, ease, spring, useCalm } from '@/ui/motion'
import {
  CouponsDemo,
  DedicationDemo,
  JackpotDemo,
  PhotosDemo,
  SongDemo,
  TriviaDemo,
  type DemoProps,
} from './demos'
import { Magnetic, Mark, PhoneFrame, SectionHeading } from './primitives'

/** Segundos que se queda cada pestaña mientras nadie toca nada. */
const STEP_SECONDS = 7

/**
 * "Qué trae una Boxie": pestañas con demos jugables dentro de un celular.
 * Pasan solas como historias (con su barrita de progreso) hasta que la
 * persona toca una pestaña o juega con una demo; con el mouse encima del
 * celular se frenan, y fuera de pantalla no corren.
 */
export function InsideBoxie({ photos, exampleHref }: { photos: string[]; exampleHref: Route }) {
  const section = useRef<HTMLElement>(null)
  const tabList = useRef<HTMLDivElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const inView = useInView(section, { amount: 0.35 })
  const calm = useCalm()
  const [active, setActive] = useState(0)
  const [auto, setAuto] = useState(true)
  const [paused, setPaused] = useState(false)
  const progress = useMotionValue(0)
  const count = experiences.length
  const current = experiences[active]!

  // Avanza solo: la barrita se llena y pasa a la siguiente.
  useEffect(() => {
    if (!auto || !inView || paused || calm) return
    const controls = animate(progress, 1, {
      duration: STEP_SECONDS * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => {
        progress.set(0)
        setActive((a) => (a + 1) % count)
      },
    })
    return () => controls.stop()
  }, [auto, inView, paused, calm, active, count, progress])

  // En el celular las pestañas son una fila que se desliza: la activa queda a la vista.
  useEffect(() => {
    const list = tabList.current
    const tab = tabs.current[active]
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return
    list.scrollTo({
      left: tab.offsetLeft - (list.clientWidth - tab.clientWidth) / 2,
      behavior: 'smooth',
    })
  }, [active])

  const select = (i: number) => {
    setAuto(false)
    progress.set(0)
    setActive(i)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    }
    let next: number | null = null
    if (e.key in moves) next = (active + moves[e.key]! + count) % count
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = count - 1
    if (next === null) return
    e.preventDefault()
    select(next)
    tabs.current[next]?.focus()
  }

  const stopAuto = () => setAuto(false)

  return (
    <section
      ref={section}
      id="que-trae"
      aria-labelledby="que-trae-title"
      className="relative -mt-10 scroll-mt-16 overflow-hidden rounded-b-[40px] bg-night pt-28 pb-20 text-white sm:pb-24"
    >
      <Float
        aria-hidden
        className="pointer-events-none absolute -top-10 -left-24 size-96 rounded-full bg-brand/25 blur-3xl"
        distance={30}
        duration={12}
      />
      <Float
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-0 size-[28rem] rounded-full bg-lilac/20 blur-3xl"
        distance={24}
        duration={14}
        delay={1}
      />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading
          dark
          eyebrow="Adentro de cada Boxie"
          title={
            <span id="que-trae-title">
              Mucho más que una <Mark>tarjeta</Mark> digital
            </span>
          }
          text="20 pantallas para emocionar. Tocá cada sorpresa y probala acá mismo, tal como la va a vivir quien la reciba."
        />

        <div className="grid items-center gap-x-16 gap-y-8 [grid-template-areas:'tabs'_'phone'_'info'] lg:grid-cols-[minmax(0,1fr)_auto] lg:[grid-template-areas:'tabs_phone'_'info_phone']">
          <div
            ref={tabList}
            role="tablist"
            aria-label="Sorpresas de una Boxie"
            aria-orientation="vertical"
            onKeyDown={onKeyDown}
            className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 py-1 [grid-area:tabs] lg:mx-0 lg:flex-col lg:gap-1.5 lg:self-end lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {experiences.map((exp, i) => {
              const selected = i === active
              return (
                <button
                  key={exp.id}
                  ref={(el) => {
                    tabs.current[i] = el
                  }}
                  id={`tab-${exp.id}`}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls="panel-que-trae"
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(i)}
                  className={cn(
                    'group relative shrink-0 rounded-full px-4 py-2.5 text-left transition-colors duration-200 lg:w-full lg:rounded-2xl lg:px-4 lg:py-3',
                    selected ? 'text-white' : 'text-white/60 hover:text-white',
                  )}
                >
                  {selected && (
                    <motion.span
                      layoutId="inside-tab"
                      className="absolute inset-0 rounded-full bg-white/10 ring-1 ring-white/15 lg:rounded-2xl"
                      transition={spring.soft}
                      aria-hidden
                    />
                  )}
                  <span className="relative flex items-center gap-2.5 lg:gap-3.5">
                    <motion.span
                      aria-hidden
                      className="grid size-7 place-items-center rounded-lg text-lg transition-colors lg:size-11 lg:rounded-xl lg:bg-white/5 lg:text-2xl lg:group-hover:bg-white/10"
                      animate={selected ? { rotate: [0, -14, 10, 0], scale: [1, 1.18, 1] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      {exp.emoji}
                    </motion.span>
                    <span className="font-display text-base font-bold whitespace-nowrap lg:text-xl">
                      {exp.label}
                    </span>
                  </span>
                  <div className="hidden lg:block">
                    <Collapse open={selected}>
                      <p className="relative pt-2 pr-2 pl-[3.6rem] text-[0.95rem] leading-relaxed text-white/70">
                        <strong className="block text-white">{exp.title}</strong>
                        {exp.text}
                      </p>
                    </Collapse>
                  </div>
                  {selected && auto && !calm && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-x-4 bottom-1 h-0.5 origin-left rounded-full bg-brand lg:bottom-1.5"
                      style={{ scaleX: progress }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          <div
            className="relative mx-auto [grid-area:phone]"
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
          >
            <div
              aria-hidden
              className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(244,78,99,0.35),transparent_65%)] blur-2xl"
            />
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={current.id}
                aria-hidden
                className="absolute -top-5 -right-7 z-50 grid size-16 place-items-center rounded-2xl bg-white text-3xl shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                initial={{ opacity: 0, scale: 0.3, rotate: -35 }}
                animate={{ opacity: 1, scale: 1, rotate: 8 }}
                exit={{ opacity: 0, scale: 0.3, rotate: 35 }}
                transition={spring.bouncy}
              >
                {current.emoji}
              </motion.span>
            </AnimatePresence>

            <PhoneFrame className="w-[258px] sm:w-[284px]">
              <div className="absolute inset-x-4 top-8 z-40 flex gap-1" aria-hidden>
                {experiences.map((exp, i) => (
                  <span
                    key={exp.id}
                    className="h-[3px] flex-1 overflow-hidden rounded-full bg-black/15"
                  >
                    <motion.span
                      className="block h-full origin-left rounded-full bg-white"
                      style={i === active && auto && !calm ? { scaleX: progress } : undefined}
                      initial={false}
                      animate={
                        i === active && auto && !calm ? undefined : { scaleX: i <= active ? 1 : 0 }
                      }
                      transition={spring.soft}
                    />
                  </span>
                ))}
              </div>

              <div
                id="panel-que-trae"
                role="tabpanel"
                aria-labelledby={`tab-${current.id}`}
                className="absolute inset-0"
                onPointerDownCapture={stopAuto}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={current.id}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 0.94, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.04, filter: 'blur(6px)' }}
                    transition={{ duration: 0.45, ease: ease.out }}
                  >
                    <Demo id={current.id} photos={photos} onInteract={stopAuto} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </PhoneFrame>
          </div>

          <div className="flex flex-col items-center gap-6 text-center [grid-area:info] lg:items-start lg:self-start lg:text-left">
            <div className="relative min-h-[7.5rem] max-w-md lg:hidden" aria-live="polite">
              <Swap id={current.id} className="block">
                <strong className="block font-display text-xl text-white">{current.title}</strong>
                <span className="mt-1.5 block text-white/70">{current.text}</span>
              </Swap>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Magnetic className="w-full sm:w-auto">
                <ButtonLink href={exampleHref} size="lg" block className="sm:w-auto">
                  <Play className="size-4 fill-current" aria-hidden /> Ver una Boxie completa
                </ButtonLink>
              </Magnetic>
              <ButtonLink href="/galeria" variant="white" size="lg" block className="sm:w-auto">
                <Gift className="size-5 text-brand" aria-hidden /> Quiero regalar una
              </ButtonLink>
            </div>
            <p className="max-w-md text-sm text-white/55">
              Y 14 sorpresas más: playlists, cine y series, revista, razones, diario, galletita de
              la fortuna y un cierre con todo lo que vivieron.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Demo({ id, photos, onInteract }: DemoProps & { id: ExperienceId; photos: string[] }) {
  switch (id) {
    case 'dedicatoria':
      return <DedicationDemo onInteract={onInteract} />
    case 'fotos':
      return <PhotosDemo onInteract={onInteract} photos={photos} />
    case 'cancion':
      return <SongDemo onInteract={onInteract} />
    case 'trivia':
      return <TriviaDemo onInteract={onInteract} />
    case 'jackpot':
      return <JackpotDemo onInteract={onInteract} />
    case 'cuponera':
      return <CouponsDemo onInteract={onInteract} />
  }
}
