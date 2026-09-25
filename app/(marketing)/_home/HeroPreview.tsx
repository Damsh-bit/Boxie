'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Float, ease, spring, useCalm } from '@/ui/motion'
import { PhoneFrame, useTilt } from './primitives'
import { lookOf, themeGradient, type HomeTheme } from './theme-look'

const PARTICLES = [
  { left: '10%', size: 18, duration: 7, delay: 0 },
  { left: '27%', size: 12, duration: 9, delay: 2.2 },
  { left: '45%', size: 22, duration: 8, delay: 4.1 },
  { left: '63%', size: 14, duration: 10, delay: 1.2 },
  { left: '80%', size: 20, duration: 7.5, delay: 3.3 },
  { left: '91%', size: 11, duration: 9.5, delay: 5.5 },
]

const CHIPS = [
  { label: '💌 Dedicatoria', className: '-left-14 top-[18%]', delay: 0.9, float: 6 },
  { label: '🎵 Su canción', className: '-right-16 top-[46%]', delay: 1.1, float: 7 },
  { label: '🧠 Trivia', className: '-left-10 top-[64%]', delay: 1.25, float: 5.5 },
  { label: '🎟️ Cuponera', className: '-right-8 bottom-[10%]', delay: 1.4, float: 6.5 },
]

/** Tamaño de la letra según el largo del nombre, para que entre siempre en la portada. */
function nameSize(name: string) {
  if (name.length <= 7) return 'text-[2.5rem]'
  if (name.length <= 10) return 'text-[2rem]'
  if (name.length <= 13) return 'text-[1.6rem]'
  return 'text-[1.3rem]'
}

/**
 * La portada de una Boxie en el celular, en vivo: toma el color de la temática
 * elegida y el nombre que se escribe al lado. Mientras no hay nombre, van
 * pasando algunos de ejemplo.
 */
export function HeroPreview({ theme, name }: { theme: HomeTheme; name: string }) {
  const calm = useCalm()
  const look = lookOf(theme.slug)
  const typed = name.trim()
  const [index, setIndex] = useState(0)
  const tilt = useTilt(7)
  const Icon = look.icon

  useEffect(() => {
    if (calm || typed) return
    const timer = window.setInterval(() => setIndex((i) => i + 1), 2600)
    return () => window.clearInterval(timer)
  }, [calm, typed])

  const example = look.names[index % look.names.length]!

  return (
    <motion.div
      className="relative mx-auto w-[220px] sm:w-[270px] lg:w-[300px]"
      initial={{ opacity: 0, y: 70, rotate: 8 }}
      animate={{ opacity: 1, y: 0, rotate: 3 }}
      transition={{ ...spring.gentle, delay: 0.25 }}
    >
      <Float distance={12} rotate={-1.5} duration={7}>
        <motion.div style={tilt.style} {...tilt.handlers}>
          <PhoneFrame label="Vista previa de la portada de una Boxie con el nombre de quien la recibe">
            <AnimatePresence initial={false}>
              <motion.div
                key={theme.slug}
                className="absolute inset-0"
                style={{ background: themeGradient(theme.color) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: ease.inOut }}
              />
            </AnimatePresence>
            <div className="absolute -top-10 -left-16 size-56 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute right-[-60px] bottom-10 size-48 rounded-full bg-white/10 blur-3xl" />

            {PARTICLES.map((p, i) => (
              <motion.span
                key={`${theme.slug}-${i}`}
                aria-hidden
                className="absolute bottom-0 text-white/70 motion-reduce:hidden"
                style={{ left: p.left, fontSize: p.size }}
                initial={{ opacity: 0 }}
                animate={
                  calm
                    ? undefined
                    : {
                        transform: [
                          'translateY(20px) rotate(0deg)',
                          'translateY(-560px) rotate(200deg)',
                        ],
                        opacity: [0, 0.9, 0],
                      }
                }
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                {look.particle}
              </motion.span>
            ))}

            <div className="absolute inset-x-3 top-8 z-10 flex gap-[3px]" aria-hidden>
              {Array.from({ length: 12 }, (_, i) => (
                <span
                  key={i}
                  className={`h-[3px] flex-1 rounded-full ${i < 2 ? 'bg-white' : 'bg-white/35'}`}
                />
              ))}
            </div>

            <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
              <div className="mb-6 grid h-16 place-items-center drop-shadow-[0_10px_10px_rgba(0,0,0,0.2)]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={theme.slug}
                    className="block"
                    initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.3, rotate: 30 }}
                    transition={spring.bouncy}
                  >
                    <Icon className="size-16" strokeWidth={1.5} aria-hidden />
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="text-sm font-medium text-white/90">Este regalo especial es para...</p>
              <div className="relative mt-2 mb-8 h-[3.4rem] w-full [perspective:600px]">
                {typed ? (
                  <p
                    className={`absolute inset-x-0 flex justify-center font-fun leading-[3.4rem] font-bold [text-shadow:3px_3px_0_rgba(0,0,0,0.1)] ${nameSize(typed)}`}
                  >
                    <AnimatePresence mode="popLayout" initial={false}>
                      {Array.from(typed).map((ch, i) => (
                        <motion.span
                          key={`${i}-${ch}`}
                          layout="position"
                          className="inline-block whitespace-pre"
                          initial={{ opacity: 0, y: 26, scale: 0.4, rotate: -14 }}
                          animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                          exit={{ opacity: 0, y: -12, scale: 0.4 }}
                          transition={spring.bouncy}
                        >
                          {ch}
                        </motion.span>
                      ))}
                    </AnimatePresence>
                  </p>
                ) : (
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.p
                      key={example}
                      className="absolute inset-x-0 font-fun text-[2.5rem] leading-[3.4rem] font-bold [text-shadow:3px_3px_0_rgba(0,0,0,0.1)]"
                      initial={{ y: 48, opacity: 0, rotateX: -60 }}
                      animate={{ y: 0, opacity: 1, rotateX: 0 }}
                      exit={{ y: -48, opacity: 0, rotateX: 60 }}
                      transition={{ duration: 0.6, ease: ease.out }}
                    >
                      {example}
                    </motion.p>
                  </AnimatePresence>
                )}
              </div>
              <p className="absolute bottom-10 text-[0.6rem] font-semibold tracking-[0.2em] text-white/80 uppercase">
                De parte de: vos
              </p>
            </div>

            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-30 mix-blend-soft-light"
              style={{ background: tilt.glare }}
            />
          </PhoneFrame>
        </motion.div>
      </Float>

      {CHIPS.map((chip) => (
        <motion.span
          key={chip.label}
          aria-hidden
          className={`absolute z-10 hidden rounded-full bg-white px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-ink shadow-[0_12px_30px_rgba(42,36,51,0.15)] sm:block ${chip.className}`}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ...spring.bouncy, delay: chip.delay }}
          whileHover={{ scale: 1.08, rotate: -3 }}
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
