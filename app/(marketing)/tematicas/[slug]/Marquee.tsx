'use client'

import { motion } from 'framer-motion'
import { useCalm } from '@/ui/motion'

const WORDS = ['Elegí el motivo', 'Personalizá', 'Regalá']

/** La cinta que corre arriba de la ficha. Corre en el compositor (transform). */
export function Marquee() {
  const calm = useCalm()
  const run = Array.from({ length: 4 }, () => WORDS).flat()
  const strip = (
    <span className="flex shrink-0 items-center">
      {run.map((word, i) => (
        <span key={i} className="flex items-center">
          <span className="px-4">{word}</span>
          <span className="text-white/40">✦</span>
        </span>
      ))}
    </span>
  )
  return (
    <div
      className="mt-[90px] w-full overflow-hidden bg-ink py-2.5 text-[11px] font-bold tracking-[2px] whitespace-nowrap text-brand uppercase"
      aria-hidden
    >
      <motion.div
        className="flex w-max"
        animate={calm ? undefined : { transform: ['translateX(0%)', 'translateX(-50%)'] }}
        transition={{ duration: 36, ease: 'linear', repeat: Infinity }}
      >
        {strip}
        {strip}
      </motion.div>
    </div>
  )
}
