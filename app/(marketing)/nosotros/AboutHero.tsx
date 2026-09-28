'use client'

import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { ArrowDown, Heart } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'
import { boardingPass, founders } from '@/content/about'
import { ButtonLink } from '@/ui/Button'
import { Float, Stagger, StaggerItem, ease, spring, useCalm } from '@/ui/motion'
import { Mark, useTilt } from '../_home/primitives'
import { FounderAvatar } from './FounderAvatar'

/**
 * La portada de /nosotros: el título a la izquierda y, a la derecha, un pase
 * de abordar. Un corazón viaja de Buenos Aires a Madrid una y otra vez: la
 * pregunta con la que empezó todo (¿cómo se abraza a alguien que está lejos?).
 */
export function AboutHero() {
  return (
    <header className="relative isolate overflow-hidden px-5 pt-[108px] pb-16 sm:px-8 sm:pt-[140px] sm:pb-24">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-[12%] -z-10 size-[30rem] rounded-full bg-brand/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[5%] bottom-0 -z-10 size-[22rem] rounded-full bg-lilac/15 blur-3xl"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Stagger immediate step={0.09} className="text-center lg:text-left">
          <StaggerItem
            as="span"
            className="mb-5 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.18em] text-brand uppercase"
          >
            Nosotros
          </StaggerItem>
          <StaggerItem
            as="h1"
            className="font-display text-[2.5rem] leading-[1.04] font-bold text-balance text-ink sm:text-6xl lg:text-[4.1rem]"
          >
            Hacemos regalos que se sienten <Mark>cerca</Mark>
          </StaggerItem>
          <StaggerItem
            as="p"
            className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-ink/70 sm:text-xl lg:mx-0"
          >
            Boxie nació de una pregunta simple: ¿cómo abrazar a alguien que está lejos? Somos tres
            amigos de Buenos Aires armando la respuesta, una Boxie a la vez.
          </StaggerItem>
          <StaggerItem className="mt-7 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href="#equipo" variant="dark" size="lg">
              Conocé al equipo
            </ButtonLink>
            <Link
              href="#historia"
              className="group inline-flex items-center gap-2 font-semibold text-ink/70 transition-colors hover:text-brand"
            >
              Nuestra historia
              <ArrowDown
                className="size-4 transition-transform duration-300 group-hover:translate-y-0.5"
                aria-hidden
              />
            </Link>
          </StaggerItem>
          <StaggerItem className="mt-9 flex items-center justify-center gap-3 lg:justify-start">
            <div className="flex -space-x-1.5">
              {founders.map((f) => (
                <FounderAvatar
                  key={f.id}
                  founder={f}
                  size={46}
                  className="ring-[3px] ring-white"
                  still
                />
              ))}
            </div>
            <p className="text-left text-sm leading-snug text-ink/60">
              {founders
                .map((f) => f.name.split(' ')[0])
                .join(', ')
                .replace(/, ([^,]*)$/, ' y $1')}
              <br />
              <span className="text-ink/45">Fundadores de Boxie</span>
            </p>
          </StaggerItem>
        </Stagger>

        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 3 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ ...spring.gentle, delay: 0.35 }}
        >
          <Float distance={8} rotate={-0.6} duration={7}>
            <BoardingPass />
          </Float>
        </motion.div>
      </div>
    </header>
  )
}

/** Puntos del arco (curva cuadrática) en el sistema del SVG. */
const P0 = { x: 22, y: 78 }
const P1 = { x: 170, y: -40 }
const P2 = { x: 318, y: 78 }
const ARC = `M ${P0.x} ${P0.y} Q ${P1.x} ${P1.y} ${P2.x} ${P2.y}`
const bezier = (t: number, a: number, b: number, c: number) =>
  (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c

function BoardingPass() {
  const calm = useCalm()
  const tilt = useTilt(6)
  const progress = useMotionValue(calm ? 0.5 : 0)
  const x = useTransform(progress, (t) => bezier(t, P0.x, P1.x, P2.x))
  const y = useTransform(progress, (t) => bezier(t, P0.y, P1.y, P2.y))
  // Al llegar, el corazón late.
  const scale = useTransform(progress, [0, 0.08, 0.9, 1], [0.6, 1, 1, 1.35])

  useEffect(() => {
    if (calm) return
    const controls = animate(progress, [0, 1], {
      duration: 2.8,
      ease: ease.inOut,
      repeat: Infinity,
      repeatDelay: 1.1,
      delay: 0.9,
    })
    return () => controls.stop()
  }, [calm, progress])

  const { from, to } = boardingPass
  return (
    <motion.div
      className="relative mx-auto w-full max-w-[460px] [perspective:1200px]"
      style={tilt.style}
      {...tilt.handlers}
    >
      <div
        className="relative overflow-hidden rounded-[32px] bg-ink text-white shadow-[0_50px_90px_-35px_rgba(42,36,51,0.7)]"
        role="img"
        aria-label={`Una Boxie viaja de ${from.city} a ${to.city}: ${boardingPass.distance} y llega al instante.`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-brand/35 blur-3xl"
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{ background: tilt.glare }}
        />

        <div className="relative px-6 pt-6 sm:px-8 sm:pt-7">
          <div className="flex items-center justify-between text-[0.65rem] font-extrabold tracking-[0.2em] text-white/50 uppercase">
            <span>Pase de abordar</span>
            <span className="flex items-center gap-1.5 text-brand-muted">
              <Heart className="size-3 fill-current" aria-hidden /> Boxie
            </span>
          </div>

          <div className="relative mt-5">
            <svg viewBox="0 0 340 92" className="h-auto w-full overflow-visible" aria-hidden>
              <path
                d={ARC}
                fill="none"
                stroke="rgb(255 255 255 / 0.18)"
                strokeWidth="2"
                strokeDasharray="2 7"
                strokeLinecap="round"
              />
              <motion.path
                d={ARC}
                fill="none"
                stroke="#f44e63"
                strokeWidth="2.5"
                strokeLinecap="round"
                style={{ pathLength: progress, opacity: calm ? 0 : 0.9 }}
              />
              <circle cx={P0.x} cy={P0.y} r="5" fill="#fff" />
              <circle cx={P2.x} cy={P2.y} r="5" fill="#f44e63" />
              <circle
                cx={P2.x}
                cy={P2.y}
                r="11"
                fill="none"
                stroke="#f44e63"
                strokeOpacity="0.45"
                className={
                  calm
                    ? undefined
                    : '[transform-origin:center] animate-ping [transform-box:fill-box]'
                }
              />
              <motion.g style={{ x, y, scale }}>
                <circle r="15" fill="#f44e63" opacity="0.22" />
                <path
                  transform="translate(-8 -7.5) scale(0.68)"
                  d="M12 21s-7.5-4.6-10-9.3C.3 8.5 2 4.5 5.8 4c2.2-.3 4.2.8 5.2 2.6C12 4.8 14 3.7 16.2 4c3.8.5 5.5 4.5 3.8 7.7C19.5 16.4 12 21 12 21z"
                  fill="#fff"
                />
              </motion.g>
            </svg>
          </div>

          <div className="mt-1 flex items-end justify-between gap-4">
            <City code={from.code} city={from.city} who={from.who} />
            <City code={to.code} city={to.city} who={to.who} align="right" />
          </div>
        </div>

        {/* Troquel: la línea punteada con dos muescas, como un ticket de verdad. */}
        <div className="relative my-6 h-px" aria-hidden>
          <span className="absolute inset-x-6 top-0 border-t-2 border-dashed border-white/15" />
          <span className="absolute top-1/2 -left-4 size-8 -translate-y-1/2 rounded-full bg-white" />
          <span className="absolute top-1/2 -right-4 size-8 -translate-y-1/2 rounded-full bg-white" />
        </div>

        <dl className="relative grid grid-cols-3 gap-3 px-6 pb-7 sm:px-8">
          <Detail label="Distancia" value={boardingPass.distance} />
          <Detail label="Llegada" value="Al instante" highlight />
          <Detail label="Equipaje" value={boardingPass.luggage} />
        </dl>
      </div>
    </motion.div>
  )
}

function City({
  code,
  city,
  who,
  align = 'left',
}: {
  code: string
  city: string
  who: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={align === 'right' ? 'text-right' : undefined}>
      <p className="font-display text-4xl leading-none font-bold sm:text-5xl">{code}</p>
      <p className="mt-1.5 text-sm text-white/70">{city}</p>
      <p className="text-xs font-semibold text-brand-muted">{who}</p>
    </div>
  )
}

function Detail({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6rem] font-extrabold tracking-[0.18em] text-white/40 uppercase">
        {label}
      </dt>
      <dd
        className={
          highlight
            ? 'mt-1 text-sm leading-snug font-bold text-brand-muted'
            : 'mt-1 text-sm leading-snug font-semibold text-white/85'
        }
      >
        {value}
      </dd>
    </div>
  )
}
