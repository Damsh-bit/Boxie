'use client'

import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useCalm } from '@/ui/motion'
import { Mark, SectionHeading } from '../_home/primitives'

/**
 * "Lo que nos importa": frases grandes que se encienden de a una a medida que
 * pasan por el medio de la pantalla. Nada cambia de alto (solo la opacidad),
 * así el scroll no salta. Con "reducir movimiento" se ven todas encendidas.
 */
export function Manifesto({ principles }: { principles: { title: string; text: string }[] }) {
  const [active, setActive] = useState(0)
  return (
    <section
      aria-labelledby="manifiesto-title"
      className="relative mx-3 overflow-hidden rounded-[40px] bg-ink px-5 py-20 text-white sm:mx-6 sm:px-8 sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-brand/25 blur-3xl"
      />
      <SectionHeading
        dark
        eyebrow="Lo que nos importa"
        title={
          <span id="manifiesto-title">
            Lo que <Mark>no negociamos</Mark>
          </span>
        }
        className="relative"
      />
      <ol className="relative mx-auto max-w-4xl">
        {principles.map((p, i) => (
          <Principle
            key={p.title}
            principle={p}
            index={i}
            active={i === active}
            onActive={setActive}
          />
        ))}
      </ol>
    </section>
  )
}

function Principle({
  principle,
  index,
  active,
  onActive,
}: {
  principle: { title: string; text: string }
  index: number
  active: boolean
  onActive(index: number): void
}) {
  const ref = useRef<HTMLLIElement>(null)
  const calm = useCalm()
  const centered = useInView(ref, { margin: '-42% 0px -42% 0px' })
  useEffect(() => {
    if (centered) onActive(index)
  }, [centered, index, onActive])
  const lit = active || calm

  return (
    <li
      ref={ref}
      className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-white/10 py-8 sm:gap-x-8 sm:py-10"
    >
      <motion.span
        className="pt-1.5 font-display text-lg font-bold text-brand tabular-nums sm:pt-3 sm:text-xl"
        initial={false}
        animate={{ opacity: lit ? 1 : 0.35 }}
        transition={{ duration: 0.5 }}
      >
        {String(index + 1).padStart(2, '0')}
      </motion.span>
      <div>
        <motion.h3
          className="font-display text-[1.85rem] leading-[1.08] font-bold text-balance sm:text-5xl"
          initial={false}
          animate={{ opacity: lit ? 1 : 0.25 }}
          transition={{ duration: 0.5 }}
        >
          {principle.title}
        </motion.h3>
        <motion.p
          className="mt-3 max-w-2xl text-lg leading-relaxed text-white/70"
          initial={false}
          animate={{ opacity: lit ? 1 : 0.15, y: lit ? 0 : 6 }}
          transition={{ duration: 0.5 }}
        >
          {principle.text}
        </motion.p>
      </div>
    </li>
  )
}
