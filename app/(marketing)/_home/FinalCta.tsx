'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Gift, Sparkles, Wand2 } from 'lucide-react'
import type { Route } from 'next'
import { useState } from 'react'
import { ButtonLink } from '@/ui/Button'
import { ConfettiBurst } from '@/ui/ConfettiBurst'
import { Float, Reveal, spring, useCalm } from '@/ui/motion'
import { Magnetic, Mark } from './primitives'

const HEARTS = [
  { x: -54, size: 20, delay: 0 },
  { x: -18, size: 14, delay: 0.35 },
  { x: 16, size: 24, delay: 0.15 },
  { x: 48, size: 16, delay: 0.55 },
  { x: -34, size: 12, delay: 0.8 },
  { x: 32, size: 13, delay: 1 },
]

/** El cierre: una caja de regalo que se abre al tocarla (con confeti) y el último llamado. */
export function FinalCta({ price, editorHref }: { price: string; editorHref: Route }) {
  const [open, setOpen] = useState(false)
  const [bursts, setBursts] = useState(0)

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) setBursts((b) => b + 1)
  }

  return (
    <section
      id="cierre"
      aria-labelledby="cierre-title"
      className="bg-white px-4 pt-6 pb-24 sm:px-8"
    >
      <Reveal
        y={40}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] bg-ink px-6 py-14 text-white sm:px-12 sm:py-20"
      >
        <Float
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-20 size-72 rounded-full bg-brand/40 blur-3xl"
          distance={24}
          duration={9}
        />
        <Float
          aria-hidden
          className="pointer-events-none absolute -right-16 -bottom-28 size-80 rounded-full bg-lilac/30 blur-3xl"
          distance={20}
          duration={11}
          delay={1}
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-16">
          <GiftBox open={open} bursts={bursts} onToggle={toggle} />

          <div className="text-center lg:text-left">
            <Sparkles className="mx-auto mb-5 size-9 text-brand-muted lg:mx-0" aria-hidden />
            <h2
              id="cierre-title"
              className="font-display text-[2.1rem] leading-[1.1] font-bold text-balance sm:text-5xl"
            >
              Un regalo que se abre <Mark>con el corazón</Mark>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-white/70 lg:mx-0">
              Elegí la temática, personalizala en 5 minutos y mandala por WhatsApp. Desde {price},
              llega al instante esté donde esté.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Magnetic className="w-full sm:w-auto">
                <ButtonLink href="/galeria" size="lg" block className="sm:w-auto">
                  <Gift className="size-5" aria-hidden /> Regalar una Boxie
                </ButtonLink>
              </Magnetic>
              <ButtonLink href={editorHref} variant="white" size="lg" block className="sm:w-auto">
                <Wand2 className="size-5 text-brand" aria-hidden /> Probar el editor gratis
              </ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/60 lg:justify-start">
              {['Pago único', 'Sin apps', 'Editás hasta el final'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="size-4 text-brand-muted" strokeWidth={3} aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

function GiftBox({ open, bursts, onToggle }: { open: boolean; bursts: number; onToggle(): void }) {
  const calm = useCalm()
  return (
    <div className="relative mx-auto flex flex-col items-center">
      {/* Un anillo que late detrás invita a tocar; la caja se queda quieta. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute top-6 left-1/2 size-48 -translate-x-1/2 rounded-full border-2 border-brand/50 motion-reduce:hidden"
        animate={
          calm || open
            ? { opacity: 0 }
            : { opacity: [0.6, 0], transform: ['scale(0.85)', 'scale(1.25)'] }
        }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
      />

      <motion.button
        type="button"
        onClick={onToggle}
        aria-pressed={open}
        aria-label={open ? 'Cerrar la caja de regalo' : 'Abrir la caja de regalo'}
        className="relative block h-56 w-56 rounded-3xl outline-offset-4"
        initial="rest"
        animate={open ? 'open' : 'rest'}
        whileHover={open ? undefined : 'hover'}
        whileTap={{ scale: 0.95 }}
        transition={spring.snappy}
      >
        {bursts > 0 && (
          <ConfettiBurst key={bursts} count={60} seed={bursts * 7} className="top-20" />
        )}

        <AnimatePresence>
          {open &&
            HEARTS.map((h, i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute bottom-24 left-1/2 text-brand-muted"
                style={{ fontSize: h.size, marginLeft: h.x }}
                initial={{ opacity: 0, y: 0 }}
                animate={
                  calm
                    ? { opacity: 1, y: -90 }
                    : { opacity: [0, 1, 0], transform: ['translateY(0px)', 'translateY(-130px)'] }
                }
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2.2,
                  repeat: calm ? 0 : Infinity,
                  delay: h.delay,
                  ease: 'easeOut',
                }}
              >
                ❤
              </motion.span>
            ))}
        </AnimatePresence>

        {/* Luz que sale de la caja abierta */}
        <motion.span
          aria-hidden
          className="absolute bottom-24 left-1/2 h-28 w-36 -translate-x-1/2 rounded-full bg-gold/50 blur-2xl"
          variants={{
            rest: { opacity: 0, scale: 0.6 },
            hover: { opacity: 0.25 },
            open: { opacity: 1, scale: 1 },
          }}
          transition={spring.soft}
        />

        {/* Cuerpo */}
        <span className="absolute bottom-2 left-1/2 h-28 w-40 -translate-x-1/2 rounded-t-md rounded-b-2xl bg-[linear-gradient(180deg,#f44e63,#c92f45)] shadow-[0_24px_40px_-12px_rgba(0,0,0,0.5)]">
          <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-gold" />
        </span>

        {/* Tapa con moño */}
        <motion.span
          className="absolute bottom-[7.25rem] left-1/2 h-10 w-44 -translate-x-1/2"
          variants={{
            rest: { y: 0, rotate: 0, x: 0 },
            hover: { y: -12, rotate: -5, x: 0 },
            open: { y: -78, rotate: -20, x: -26 },
          }}
          transition={spring.bouncy}
        >
          <span className="absolute inset-0 rounded-lg bg-[linear-gradient(180deg,#ff6b7e,#f44e63)] shadow-md" />
          <span className="absolute inset-y-0 left-1/2 w-6 -translate-x-1/2 bg-gold" />
          <motion.span
            aria-hidden
            className="absolute -top-7 left-1/2 flex -translate-x-1/2 items-end"
            animate={calm || open ? undefined : { rotate: [0, -6, 6, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.2 }}
          >
            <span className="block h-8 w-9 -rotate-[28deg] rounded-[50%_50%_40%_60%] border-[6px] border-gold" />
            <span className="block h-8 w-9 rotate-[28deg] rounded-[50%_50%_60%_40%] border-[6px] border-gold" />
          </motion.span>
        </motion.span>
      </motion.button>

      <p className="mt-3 text-sm font-semibold text-white/60" aria-hidden>
        {open ? '¡Así se siente abrir una Boxie! ✨' : 'Tocá la caja 👆'}
      </p>
    </div>
  )
}
