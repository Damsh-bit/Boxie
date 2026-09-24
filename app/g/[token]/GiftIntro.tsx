'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { ConfettiBurst } from '@/ui/ConfettiBurst'
import { ease, spring, useCalm } from '@/ui/motion'

const SPARKLES = [
  { left: '14%', top: '22%', size: 16, delay: 0 },
  { left: '82%', top: '18%', size: 12, delay: 0.7 },
  { left: '76%', top: '62%', size: 18, delay: 1.3 },
  { left: '20%', top: '70%', size: 12, delay: 1.9 },
  { left: '50%', top: '12%', size: 10, delay: 2.4 },
  { left: '8%', top: '46%', size: 10, delay: 0.4 },
  { left: '92%', top: '40%', size: 14, delay: 1.6 },
]

/**
 * La tapa del regalo: quien lo recibe lo "abre" con un toque. Además de la
 * emoción del momento, ese toque cuenta como interacción con la página: los
 * navegadores recién ahí dejan sonar la canción de la Boxie.
 */
export function GiftIntro({
  recipientName,
  senderName,
  onOpen,
}: {
  recipientName: string
  senderName: string
  onOpen(): void
}) {
  const calm = useCalm()
  const [opening, setOpening] = useState(false)

  const open = () => {
    if (opening) return
    setOpening(true)
    window.setTimeout(onOpen, calm ? 150 : 900)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[10000] flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_40%,#5b2c46_0%,#2a2433_55%,#16121b_100%)] px-6 text-center text-white"
      exit={{ opacity: 0, transition: { duration: 0.6, ease: ease.out } }}
    >
      {SPARKLES.map((s, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute text-brand-muted opacity-0 motion-reduce:hidden"
          style={{ left: s.left, top: s.top, fontSize: s.size }}
          animate={
            calm
              ? undefined
              : {
                  opacity: [0, 1, 0],
                  transform: [
                    'scale(0.4) rotate(0deg)',
                    'scale(1) rotate(90deg)',
                    'scale(0.4) rotate(180deg)',
                  ],
                }
          }
          transition={{ duration: 2.6, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }}
        >
          ✦
        </motion.span>
      ))}

      {opening && <ConfettiBurst className="top-[38%]" count={90} seed={21} />}

      <motion.button
        type="button"
        onClick={open}
        aria-label="Abrir mi regalo"
        className="relative mb-10 rounded-3xl focus-visible:outline-white"
        initial={{ opacity: 0, scale: 0.6, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ ...spring.bouncy, delay: 0.15 }}
        whileTap={{ scale: 0.94 }}
      >
        {/* Luz que sale de adentro al abrir. */}
        <motion.span
          aria-hidden
          className="absolute top-1/2 left-1/2 -mt-24 -ml-24 size-48 rounded-full bg-[radial-gradient(circle,rgba(255,215,0,0.55)_0%,rgba(244,78,99,0.25)_45%,transparent_70%)]"
          initial={{ opacity: 0, scale: 0.2 }}
          animate={
            opening ? { opacity: [0, 1, 0], scale: [0.2, 2.2, 3] } : { opacity: 0, scale: 0.2 }
          }
          transition={{ duration: 1.1, ease: ease.out }}
        />
        <motion.span
          className="relative block"
          animate={
            opening || calm
              ? undefined
              : {
                  transform: [
                    'translateY(0px) rotate(0deg)',
                    'translateY(-14px) rotate(-4deg)',
                    'translateY(0px) rotate(3deg)',
                    'translateY(-6px) rotate(-2deg)',
                    'translateY(0px) rotate(0deg)',
                    'translateY(0px) rotate(0deg)',
                  ],
                }
          }
          transition={{
            duration: 2.4,
            times: [0, 0.15, 0.3, 0.42, 0.55, 1],
            repeat: Infinity,
            delay: 1,
          }}
        >
          <GiftBox opening={opening} />
        </motion.span>
      </motion.button>

      <motion.div
        initial="hidden"
        animate={opening ? 'gone' : 'show'}
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.45 } },
          gone: { opacity: 0, y: 20, transition: { duration: 0.3 } },
        }}
      >
        <motion.h1
          className="font-display text-3xl leading-tight font-bold sm:text-4xl"
          variants={line}
        >
          {recipientName ? `¡${recipientName}, tenés un regalo!` : '¡Tenés un regalo!'}
        </motion.h1>
        {senderName && (
          <motion.p className="mt-2 text-lg text-white/70" variants={line}>
            De parte de <strong className="text-white">{senderName}</strong>
          </motion.p>
        )}
        <motion.div variants={line} className="relative mt-9 inline-flex">
          {/* El botón queda quieto (fácil de tocar); lo que late es un anillo detrás. */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full bg-brand opacity-0 motion-reduce:hidden"
            animate={
              calm ? undefined : { opacity: [0.5, 0], transform: ['scale(1)', 'scale(1.3)'] }
            }
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut', delay: 1.6 }}
          />
          <motion.button
            type="button"
            onClick={open}
            className="relative rounded-full bg-brand px-9 py-4 text-lg font-bold shadow-[0_12px_40px_rgb(244_78_99/0.45)]"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={spring.snappy}
          >
            Abrir mi regalo 🎁
          </motion.button>
        </motion.div>
        <motion.p className="mt-5 text-xs text-white/50" variants={line}>
          Subí el volumen: tiene música 🔊
        </motion.p>
      </motion.div>
    </motion.div>
  )
}

const line = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: ease.out } },
}

/** Una caja con moño: al abrirse, la tapa sale volando. */
function GiftBox({ opening }: { opening: boolean }) {
  return (
    <span className="relative block h-36 w-40" aria-hidden>
      {/* Tapa */}
      <motion.span
        className="absolute top-0 left-1/2 z-10 -ml-[84px] block h-9 w-[168px] rounded-lg bg-brand shadow-[0_6px_0_rgba(0,0,0,0.15)]"
        animate={
          opening
            ? { y: -140, x: 30, rotate: 28, opacity: 0 }
            : { y: 0, x: 0, rotate: 0, opacity: 1 }
        }
        transition={opening ? { duration: 0.8, ease: [0.3, 0.7, 0.4, 1] } : spring.soft}
      >
        <span className="absolute inset-y-0 left-1/2 -ml-3 w-6 bg-gold" />
        <span className="absolute -top-8 left-1/2 -ml-6 text-5xl leading-none">🎀</span>
      </motion.span>
      {/* Caja */}
      <motion.span
        className="absolute bottom-0 left-1/2 -ml-[76px] block h-28 w-[152px] overflow-hidden rounded-b-xl bg-brand-dark"
        animate={opening ? { scaleY: [1, 0.9, 1.04, 1] } : { scaleY: 1 }}
        transition={{ duration: 0.5 }}
        style={{ transformOrigin: 'bottom' }}
      >
        <span className="absolute inset-y-0 left-1/2 -ml-3 w-6 bg-gold" />
        <span className="absolute inset-x-0 top-0 h-3 bg-black/15" />
      </motion.span>
    </span>
  )
}
