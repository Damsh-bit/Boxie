'use client'

import { motion } from 'framer-motion'
import { useCalm } from '@/ui/motion'

/**
 * La cinta de los tipos de Boxie a los que vamos (Gamer, Cine, Eventos…).
 * Corre en el compositor; con "reducir movimiento" queda quieta.
 */
export function FutureMarquee({ items }: { items: string[] }) {
  const calm = useCalm()
  const run = [...items, ...items]
  return (
    <section aria-label="Una Ribbly para cada rubro" className="overflow-hidden bg-ink py-6">
      <p className="sr-only">Hacia dónde vamos: {items.join(', ')}.</p>
      <motion.div
        aria-hidden
        className="flex w-max"
        animate={calm ? undefined : { transform: ['translateX(0%)', 'translateX(-50%)'] }}
        transition={{ duration: 40, ease: 'linear', repeat: Infinity }}
      >
        {run.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="flex shrink-0 items-center gap-8 pr-8 font-display text-2xl font-bold whitespace-nowrap text-white/90 sm:gap-10 sm:pr-10 sm:text-4xl"
          >
            {name}
            <span className="text-brand">✦</span>
          </span>
        ))}
      </motion.div>
    </section>
  )
}
