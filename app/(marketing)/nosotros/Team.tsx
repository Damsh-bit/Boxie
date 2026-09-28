'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Quote } from 'lucide-react'
import { useState } from 'react'
import type { Founder } from '@/content/about'
import { Collapse, Stagger, StaggerItem, ease, spring } from '@/ui/motion'
import { Mark, SectionHeading } from '../_home/primitives'
import { FounderAvatar } from './FounderAvatar'

/**
 * "Somos tres". En la computadora, tres paneles: el elegido (al pasar el
 * mouse, con el teclado o tocándolo) se abre y cuenta quién es; los otros se
 * achican. En el celular, tarjetas que se despliegan.
 */
export function Team({ founders }: { founders: Founder[] }) {
  const [active, setActive] = useState(0)

  return (
    <section
      id="equipo"
      aria-labelledby="equipo-title"
      className="scroll-mt-20 rounded-[40px] bg-gradient-to-b from-paper/60 to-white px-5 py-20 sm:px-8 sm:py-28"
    >
      <SectionHeading
        eyebrow="El equipo"
        title={
          <span id="equipo-title">
            Somos <Mark>{founders.length === 3 ? 'tres' : founders.length}</Mark>
          </span>
        }
        text="Tres amigos, tres formas de ver las cosas y un mismo objetivo: que cada Boxie emocione al que la abre."
      />

      <div className="mx-auto hidden h-[540px] max-w-6xl gap-4 lg:flex">
        {founders.map((f, i) => (
          <Panel key={f.id} founder={f} open={i === active} onOpen={() => setActive(i)} />
        ))}
      </div>

      <Stagger className="mx-auto grid max-w-xl gap-4 lg:hidden" step={0.12}>
        {founders.map((f) => (
          <StaggerItem key={f.id} y={30}>
            <FounderCard founder={f} />
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  )
}

/** Un panel de la computadora. Abierto muestra todo; cerrado, la cara y el nombre. */
function Panel({ founder, open, onOpen }: { founder: Founder; open: boolean; onOpen(): void }) {
  const tint = `color-mix(in srgb, ${founder.color} 16%, white)`
  return (
    <article
      className="relative isolate min-w-0 overflow-hidden rounded-[36px] transition-[flex-grow,background-color,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{
        flexGrow: open ? 2.7 : 1,
        flexBasis: 0,
        backgroundColor: open ? '#2a2433' : tint,
        boxShadow: open ? '0 40px 80px -40px rgba(42,36,51,0.6)' : 'none',
      }}
      onMouseEnter={onOpen}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 -z-10 size-80 rounded-full blur-3xl transition-opacity duration-700"
        style={{ backgroundColor: founder.color, opacity: open ? 0.45 : 0 }}
      />

      {/* Todo el panel se abre; el botón es lo que se enfoca con el teclado. */}
      <button
        type="button"
        onClick={onOpen}
        onFocus={onOpen}
        aria-expanded={open}
        aria-controls={`fundador-${founder.id}`}
        className="absolute inset-0 z-20 rounded-[36px] focus-visible:outline-offset-[-4px]"
        style={{ pointerEvents: open ? 'none' : 'auto' }}
      >
        <span className="sr-only">Conocé a {founder.name}</span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="abierto"
            id={`fundador-${founder.id}`}
            // Ancho fijo: mientras el panel se abre, el texto no se reacomoda.
            className="absolute inset-y-0 left-0 flex w-[510px] flex-col justify-between p-9 text-white xl:w-[630px] xl:p-10"
            initial={{ opacity: 0, x: 24 }}
            animate={{
              opacity: 1,
              x: 0,
              transition: { duration: 0.5, delay: 0.2, ease: ease.out },
            }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <div className="flex items-center gap-6">
              <FounderAvatar founder={founder} size={120} />
              <div className="min-w-0">
                <p className="text-xs font-extrabold tracking-[0.18em] text-brand-muted uppercase">
                  {founder.focus}
                </p>
                <h3 className="mt-1 font-display text-[2.2rem] leading-[1.02] font-bold xl:text-[2.6rem]">
                  {founder.name}
                </h3>
                <p className="mt-1.5 text-white/60">{founder.role}</p>
              </div>
            </div>
            <p className="max-w-[540px] leading-relaxed text-white/80 xl:text-[1.05rem]">
              {founder.bio}
            </p>
            <blockquote className="relative max-w-[540px] border-l-2 border-brand pl-5">
              <p className="font-display text-xl leading-snug font-bold text-white">
                “{founder.quote}”
              </p>
            </blockquote>
            <dl className="grid max-w-[560px] grid-cols-3 gap-3">
              {founder.facts.map((fact) => (
                <div
                  key={fact.label}
                  className="rounded-2xl bg-white/[0.07] p-3.5 ring-1 ring-white/10"
                >
                  <dt className="text-[0.62rem] font-extrabold tracking-[0.14em] text-white/45 uppercase">
                    {fact.label}
                  </dt>
                  <dd className="mt-1 text-sm leading-snug font-semibold text-white/90">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          </motion.div>
        ) : (
          <motion.div
            key="cerrado"
            className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.25 } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <FounderAvatar founder={founder} size={112} />
            <div>
              <h3 className="font-display text-2xl leading-tight font-bold text-ink">
                {founder.name}
              </h3>
              <p className="mt-1 text-sm font-semibold text-ink/55">{founder.role}</p>
            </div>
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-bold text-ink/70">
              Conocelo
              <motion.span
                aria-hidden
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

/** En el celular: la tarjeta con lo esencial y el resto a un toque. */
function FounderCard({ founder }: { founder: Founder }) {
  const [open, setOpen] = useState(false)
  return (
    <article className="relative overflow-hidden rounded-[30px] bg-white p-5 shadow-[0_18px_40px_-24px_rgba(42,36,51,0.35)] ring-1 ring-black/5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 -right-16 size-44 rounded-full opacity-25 blur-3xl"
        style={{ backgroundColor: founder.color }}
      />
      <div className="relative flex items-center gap-4">
        <FounderAvatar founder={founder} size={84} />
        <div className="min-w-0">
          <p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-brand uppercase">
            {founder.focus}
          </p>
          <h3 className="font-display text-2xl leading-tight font-bold text-ink">{founder.name}</h3>
          <p className="text-sm text-ink/55">{founder.role}</p>
        </div>
      </div>
      <p className="relative mt-4 leading-relaxed text-ink/70">{founder.bio}</p>

      <Collapse open={open} id={`fundador-movil-${founder.id}`}>
        <div className="pt-5">
          <blockquote className="flex gap-3 rounded-2xl bg-ink p-4 text-white">
            <Quote className="size-5 shrink-0 text-brand" aria-hidden />
            <p className="font-display text-lg leading-snug font-bold">{founder.quote}</p>
          </blockquote>
          <dl className="mt-3 grid gap-2">
            {founder.facts.map((fact) => (
              <div
                key={fact.label}
                className="flex items-baseline justify-between gap-3 rounded-2xl bg-canvas px-4 py-2.5"
              >
                <dt className="text-xs font-bold text-ink/50">{fact.label}</dt>
                <dd className="text-right text-sm font-semibold text-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Collapse>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={`fundador-movil-${founder.id}`}
        className="relative mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand"
      >
        {open ? 'Mostrar menos' : `Conocé más de ${founder.name.split(' ')[0]}`}
        <motion.span
          className="inline-flex"
          animate={{ rotate: open ? 180 : 0 }}
          transition={spring.snappy}
        >
          <ChevronDown className="size-4" aria-hidden />
        </motion.span>
      </button>
    </article>
  )
}
