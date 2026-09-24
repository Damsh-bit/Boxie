'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'
import { cn } from './cn'
import { useCalm } from './motion'

const COLORS = ['#F44E63', '#FFD700', '#73CFEE', '#C893D7', '#FF9A9E', '#2A2433']

/** Azar determinístico: mismo resultado en el servidor y en el navegador. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Explosión de confeti (una sola vez). Cada papelito sale disparado en arco y
 * cae girando; todo con `transform`, así corre en el compositor.
 */
export function ConfettiBurst({
  count = 70,
  seed = 7,
  className,
  delay = 0,
}: {
  count?: number
  seed?: number
  className?: string
  delay?: number
}) {
  const calm = useCalm()
  const pieces = useMemo(() => {
    const rand = seeded(seed)
    return Array.from({ length: count }, () => {
      const angle = (rand() - 0.5) * Math.PI * 1.1
      const power = 220 + rand() * 320
      const dx = Math.sin(angle) * power
      const up = Math.cos(angle) * power * 0.9
      return {
        dx,
        up,
        fall: 380 + rand() * 360,
        spin: (rand() - 0.5) * 900,
        size: 6 + rand() * 7,
        round: rand() > 0.6,
        color: COLORS[Math.floor(rand() * COLORS.length)]!,
        duration: 1.9 + rand() * 1.1,
        delay: rand() * 0.15,
      }
    })
  }, [count, seed])

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 flex justify-center motion-reduce:hidden',
        className,
      )}
    >
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="absolute top-0"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            borderRadius: p.round ? '50%' : 2,
          }}
          initial={{ opacity: 0 }}
          animate={
            calm
              ? undefined
              : {
                  opacity: [1, 1, 0],
                  transform: [
                    'translate(0px, 0px) rotate(0deg)',
                    `translate(${p.dx * 0.7}px, ${-p.up}px) rotate(${p.spin * 0.4}deg)`,
                    `translate(${p.dx}px, ${p.fall}px) rotate(${p.spin}deg)`,
                  ],
                }
          }
          transition={{
            duration: p.duration,
            delay: delay + p.delay,
            times: [0, 0.3, 1],
            ease: [0.2, 0.7, 0.4, 1],
          }}
        />
      ))}
    </div>
  )
}
