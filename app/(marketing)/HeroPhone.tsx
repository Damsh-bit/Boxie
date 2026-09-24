'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ease, spring, useCalm } from '@/ui/motion'

const NAMES = ['Sofía', 'Mamá', 'Lucas', 'la Abu', 'Martu']

const HEARTS = [
  { left: '12%', size: 18, duration: 7, delay: 0 },
  { left: '28%', size: 12, duration: 9, delay: 2.2 },
  { left: '46%', size: 22, duration: 8, delay: 4.1 },
  { left: '64%', size: 14, duration: 10, delay: 1.2 },
  { left: '80%', size: 20, duration: 7.5, delay: 3.3 },
  { left: '90%', size: 11, duration: 9.5, delay: 5.5 },
]

const CHIPS = [
  { label: '💌 Dedicatoria', className: '-left-12 top-[20%]', delay: 0.9, float: 6 },
  { label: '🎵 Su canción', className: '-right-14 top-[62%]', delay: 1.1, float: 7 },
  { label: '🎟️ Cuponera', className: '-left-8 bottom-[12%]', delay: 1.3, float: 6.5 },
]

/**
 * Una Boxie de muestra en el celular: la portada tal cual la ve quien la
 * recibe, con el nombre cambiando para mostrar que es para quien vos quieras.
 */
export function HeroPhone() {
  const calm = useCalm()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (calm) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % NAMES.length), 2600)
    return () => window.clearInterval(timer)
  }, [calm])

  return (
    <motion.div
      className="relative mx-auto w-[250px] sm:w-[280px] lg:w-[300px]"
      initial={{ opacity: 0, y: 70, rotate: 8 }}
      animate={{ opacity: 1, y: 0, rotate: 3 }}
      transition={{ ...spring.gentle, delay: 0.25 }}
    >
      <motion.div
        animate={
          calm
            ? undefined
            : {
                transform: [
                  'translateY(0px) rotate(0deg)',
                  'translateY(-12px) rotate(-1.5deg)',
                  'translateY(0px) rotate(0deg)',
                ],
              }
        }
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div
          className="relative aspect-[9/19] overflow-hidden rounded-[44px] border-[7px] border-[#16131a] bg-ink shadow-[0_50px_90px_-25px_rgba(42,36,51,0.55)]"
          role="img"
          aria-label="Así se ve una Boxie: la portada con el nombre de quien la recibe"
        >
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#f44e63,#ff9a9e)]" />
          <div className="absolute -top-10 -left-16 size-56 rounded-full bg-white/15 blur-3xl" />
          <div className="absolute right-[-60px] bottom-10 size-48 rounded-full bg-white/10 blur-3xl" />

          {HEARTS.map((h, i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute bottom-0 text-white/60 motion-reduce:hidden"
              style={{ left: h.left, fontSize: h.size }}
              initial={{ opacity: 0 }}
              animate={
                calm
                  ? undefined
                  : {
                      transform: [
                        'translateY(20px) rotate(0deg)',
                        'translateY(-520px) rotate(200deg)',
                      ],
                      opacity: [0, 0.9, 0],
                    }
              }
              transition={{
                duration: h.duration,
                delay: h.delay,
                repeat: Infinity,
                ease: 'linear',
              }}
            >
              ❤
            </motion.span>
          ))}

          <div className="absolute inset-x-3 top-3 flex gap-[3px]" aria-hidden>
            {Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className={`h-[3px] flex-1 rounded-full ${i < 2 ? 'bg-white' : 'bg-white/35'}`}
              />
            ))}
          </div>

          <div className="relative flex h-full flex-col items-center justify-center px-5 text-center text-white">
            <motion.div
              animate={
                calm
                  ? undefined
                  : { transform: ['translateY(0px)', 'translateY(-10px)', 'translateY(0px)'] }
              }
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="mb-6 drop-shadow-[0_10px_10px_rgba(0,0,0,0.2)]"
            >
              <Gift className="size-16" strokeWidth={1.5} aria-hidden />
            </motion.div>
            <p className="text-sm font-medium text-white/90">Este regalo especial es para...</p>
            <div className="relative mt-2 mb-8 h-[3.4rem] w-full overflow-hidden [perspective:600px]">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.p
                  key={NAMES[index]}
                  className="absolute inset-x-0 font-fun text-[2.6rem] leading-[3.4rem] font-bold [text-shadow:3px_3px_0_rgba(0,0,0,0.1)]"
                  initial={{ y: 48, opacity: 0, rotateX: -60 }}
                  animate={{ y: 0, opacity: 1, rotateX: 0 }}
                  exit={{ y: -48, opacity: 0, rotateX: 60 }}
                  transition={{ duration: 0.6, ease: ease.out }}
                >
                  {NAMES[index]}
                </motion.p>
              </AnimatePresence>
            </div>
            <p className="absolute bottom-10 text-[0.6rem] font-semibold tracking-[0.2em] text-white/80 uppercase">
              De parte de: vos
            </p>
          </div>
        </div>
      </motion.div>

      {CHIPS.map((chip) => (
        <motion.span
          key={chip.label}
          aria-hidden
          className={`absolute hidden rounded-full bg-white px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-ink shadow-[0_12px_30px_rgba(42,36,51,0.15)] sm:block ${chip.className}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.bouncy, delay: chip.delay }}
        >
          <motion.span
            className="block"
            animate={
              calm
                ? undefined
                : { transform: ['translateY(0px)', 'translateY(-8px)', 'translateY(0px)'] }
            }
            transition={{ duration: chip.float, repeat: Infinity, ease: 'easeInOut' }}
          >
            {chip.label}
          </motion.span>
        </motion.span>
      ))}
    </motion.div>
  )
}
