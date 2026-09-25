'use client'

import { motion } from 'framer-motion'
import { marqueeWords } from '@/content/home'
import { useCalm } from '@/ui/motion'

/**
 * Dos cintas cruzadas con las ocasiones para regalar: una va y la otra
 * vuelve. Corren en el compositor (transform).
 */
export function OccasionMarquee() {
  return (
    <div className="relative z-20 -my-4 overflow-hidden py-10" aria-hidden>
      <Strip className="relative z-10 -rotate-3 bg-brand text-white sm:-rotate-2" duration={38} />
      <Strip
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 rotate-[4deg] bg-ink text-brand-muted opacity-95 sm:rotate-[1.5deg]"
        duration={46}
        reverse
        small
      />
    </div>
  )
}

function Strip({
  className,
  duration,
  reverse = false,
  small = false,
}: {
  className: string
  duration: number
  reverse?: boolean
  small?: boolean
}) {
  const calm = useCalm()
  const run = [...marqueeWords, ...marqueeWords]
  const strip = (
    <span className="flex shrink-0 items-center">
      {run.map((word, i) => (
        <span key={i} className="flex items-center">
          <span className="px-5">{word}</span>
          <span className={small ? 'text-brand' : 'text-white/60'}>✦</span>
        </span>
      ))}
    </span>
  )
  return (
    <div
      className={`-mx-6 w-[calc(100%+3rem)] overflow-hidden py-3 whitespace-nowrap shadow-[0_18px_40px_-18px_rgba(42,36,51,0.45)] ${small ? 'text-sm font-bold tracking-[0.18em] uppercase' : 'font-display text-xl font-bold tracking-wide uppercase sm:text-2xl'} ${className}`}
    >
      <motion.div
        className="flex w-max"
        animate={
          calm
            ? undefined
            : {
                transform: reverse
                  ? ['translateX(-50%)', 'translateX(0%)']
                  : ['translateX(0%)', 'translateX(-50%)'],
              }
        }
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        {strip}
        {strip}
      </motion.div>
    </div>
  )
}
