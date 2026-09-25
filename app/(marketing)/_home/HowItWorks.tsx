'use client'

import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion'
import {
  CheckCheck,
  Gift,
  Mail,
  PencilLine,
  Play,
  ShoppingBag,
  Wand2,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from 'next'
import { useEffect, useRef, useState } from 'react'
import { howItWorks, type HowItWorksIcon } from '@/content/site'
import { ButtonLink } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { Reveal, Swap, spring, useCalm } from '@/ui/motion'
import { Magnetic, Mark, SectionHeading } from './primitives'

const ICONS: Record<HowItWorksIcon, LucideIcon> = {
  bag: ShoppingBag,
  mail: Mail,
  pen: PencilLine,
  gift: Gift,
}

/**
 * Los cuatro pasos, unidos por una línea que se va llenando a medida que se
 * scrollea: cada paso se enciende cuando la línea lo alcanza, y su maqueta
 * (el pago, el mail, el editor, el WhatsApp) empieza a moverse.
 */
export function HowItWorks({
  price,
  editorHref,
  exampleHref,
  sample,
}: {
  price: string
  editorHref: Route
  exampleHref: Route
  /** La temática de la maqueta del pago (la primera del catálogo). */
  sample: { name: string; emoji: string }
}) {
  const ref = useRef<HTMLOListElement>(null)
  const calm = useCalm()
  const n = howItWorks.length
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 78%', 'end 60%'] })
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 26, restDelta: 0.001 })
  const [reached, setReached] = useState(0)

  const update = (p: number) =>
    setReached(howItWorks.filter((_, i) => p > 0 && p >= i / (n - 1) - 0.04).length)

  useMotionValueEvent(scrollYProgress, 'change', update)
  // Si la página se abre ya scrolleada, arranca en el estado correcto.
  useEffect(() => {
    const frame = requestAnimationFrame(() => update(scrollYProgress.get()))
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lit = calm ? n : reached

  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-title"
      className="scroll-mt-24 overflow-hidden px-5 py-20 sm:px-8 sm:py-24"
    >
      <SectionHeading
        eyebrow="Así de simple"
        title={
          <span id="como-funciona-title">
            Cómo regalar una Boxie en <Mark>4 pasos</Mark>
          </span>
        }
        text="Sin instalar nada, ni vos ni quien la recibe. De la compra al regalo en menos de lo que tarda un delivery."
      />

      <ol
        ref={ref}
        className="relative mx-auto grid max-w-3xl gap-12 lg:max-w-6xl lg:grid-cols-4 lg:gap-6"
      >
        {/* La línea: horizontal en escritorio, vertical en el celular y la tablet. */}
        <span
          aria-hidden
          className="absolute top-[10.625rem] left-[12.5%] hidden h-1 w-[75%] rounded-full bg-ink/10 lg:block"
        >
          <motion.span
            className="block h-full origin-left rounded-full bg-[linear-gradient(90deg,#f44e63,#ff9a9e,#c893d7)]"
            style={{ scaleX: calm ? 1 : fill }}
          />
        </span>
        <span
          aria-hidden
          className="absolute top-7 bottom-7 left-[1.625rem] w-1 rounded-full bg-ink/10 lg:hidden"
        >
          <motion.span
            className="block h-full origin-top rounded-full bg-[linear-gradient(180deg,#f44e63,#ff9a9e,#c893d7)]"
            style={{ scaleY: calm ? 1 : fill }}
          />
        </span>

        {howItWorks.map((step, i) => {
          const Icon = ICONS[step.icon]
          const on = i < lit
          return (
            <li
              key={step.title}
              className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-5 gap-y-4 [grid-template-areas:'icon_text'_'._visual'] md:grid-cols-[3.5rem_minmax(0,1fr)_minmax(0,16rem)] md:items-center md:[grid-template-areas:'icon_text_visual'] lg:grid-cols-1 lg:items-start lg:justify-items-center lg:text-center lg:[grid-template-areas:'visual'_'icon'_'text']"
            >
              <motion.div
                className="flex h-32 w-full max-w-[260px] items-center justify-center overflow-hidden rounded-3xl bg-white/70 p-4 shadow-[0_14px_40px_-18px_rgba(42,36,51,0.3)] ring-1 ring-black/5 [grid-area:visual]"
                animate={{
                  opacity: on ? 1 : 0.45,
                  scale: on ? 1 : 0.96,
                  filter: on ? 'grayscale(0)' : 'grayscale(0.8)',
                }}
                transition={spring.soft}
              >
                <StepVisual icon={step.icon} active={on} price={price} sample={sample} />
              </motion.div>

              <motion.span
                className={cn(
                  'relative z-10 grid size-14 place-items-center self-start rounded-2xl shadow-[0_10px_30px_rgba(244,78,99,0.18)] ring-1 ring-brand/10 transition-colors duration-300 [grid-area:icon]',
                  on ? 'bg-brand text-white' : 'bg-white text-brand',
                )}
                animate={on ? { scale: [1, 1.18, 1], rotate: [0, -8, 0] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                whileHover={{ rotate: -8, scale: 1.08 }}
              >
                <Icon className="size-6" aria-hidden />
                <span
                  className={cn(
                    'absolute -top-2 -right-2 grid size-6 place-items-center rounded-full text-xs font-bold transition-colors duration-300',
                    on ? 'bg-ink text-white' : 'bg-brand text-white',
                  )}
                >
                  {i + 1}
                </span>
              </motion.span>

              <div className="[grid-area:text]">
                <h3
                  className={cn(
                    'font-display text-xl font-bold transition-colors duration-300',
                    on ? 'text-ink' : 'text-ink/55',
                  )}
                >
                  {step.title}
                </h3>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-neutral-600">
                  {step.text}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      <Reveal
        className="mt-16 flex flex-col items-center justify-center gap-3 sm:flex-row"
        delay={0.1}
      >
        <Magnetic className="w-full sm:w-auto">
          <ButtonLink href={editorHref} size="lg" block className="sm:w-auto">
            <Wand2 className="size-5" aria-hidden /> Probá el editor gratis
          </ButtonLink>
        </Magnetic>
        <ButtonLink href={exampleHref} variant="white" size="lg" block className="sm:w-auto">
          <Play className="size-4 fill-current text-brand" aria-hidden /> Ver una Boxie de ejemplo
        </ButtonLink>
      </Reveal>
    </section>
  )
}

/** Un contador que avanza mientras el paso está encendido (para las maquetas). */
function useTicker(active: boolean, ms: number) {
  const calm = useCalm()
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!active || calm) return
    const timer = window.setInterval(() => setTick((t) => t + 1), ms)
    return () => window.clearInterval(timer)
  }, [active, calm, ms])
  return tick
}

function StepVisual({
  icon,
  active,
  price,
  sample,
}: {
  icon: HowItWorksIcon
  active: boolean
  price: string
  sample: { name: string; emoji: string }
}) {
  switch (icon) {
    case 'bag':
      return <PayVisual active={active} price={price} sample={sample} />
    case 'mail':
      return <MailVisual active={active} />
    case 'pen':
      return <EditorVisual active={active} />
    case 'gift':
      return <ShareVisual active={active} />
  }
}

function PayVisual({
  active,
  price,
  sample,
}: {
  active: boolean
  price: string
  sample: { name: string; emoji: string }
}) {
  const tick = useTicker(active, 1700)
  const paid = tick % 2 === 1
  return (
    <div className="w-full rounded-2xl bg-white p-3 text-left shadow-sm">
      <div className="flex items-center gap-2.5">
        <span
          className="grid size-9 place-items-center rounded-xl bg-brand-soft text-lg"
          aria-hidden
        >
          {sample.emoji}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-xs font-bold text-ink">Boxie {sample.name}</p>
          <p className="text-[0.65rem] text-ink/50">Pago único</p>
        </div>
        <p className="ml-auto font-display text-sm font-bold text-ink">{price}</p>
      </div>
      <motion.div
        className={cn(
          'relative mt-2.5 flex h-8 items-center justify-center rounded-lg text-[0.7rem] font-bold text-white transition-colors duration-300',
          paid ? 'bg-green-500' : 'bg-[#009ee3]',
        )}
        animate={active && !paid ? { scale: [1, 0.95, 1] } : { scale: 1 }}
        transition={{ duration: 0.4, delay: 1.1 }}
      >
        <Swap id={paid ? 'ok' : 'pagar'}>
          {paid ? '✓ ¡Pago aprobado!' : 'Pagar con Mercado Pago'}
        </Swap>
      </motion.div>
    </div>
  )
}

function MailVisual({ active }: { active: boolean }) {
  const tick = useTicker(active, 1800)
  const show = !active || tick % 3 !== 2
  return (
    <div className="relative h-full w-full">
      <AnimatePresence initial={false}>
        {show && (
          <motion.div
            key={tick}
            className="absolute inset-x-0 top-0 bottom-0 m-auto flex h-fit w-full items-center gap-2.5 rounded-2xl bg-white p-3 text-left shadow-md"
            initial={{ y: -36, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -24, opacity: 0, scale: 0.95 }}
            transition={spring.bouncy}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand text-white">
              <Mail className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-xs font-bold text-ink">Boxie · ahora</p>
              <p className="truncate text-[0.7rem] text-ink/60">
                ¡Tu Boxie está lista para editar! ✨
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const TYPED = 'Sofi ❤️'

function EditorVisual({ active }: { active: boolean }) {
  const tick = useTicker(active, 260)
  const letters = Array.from(TYPED)
  const cycle = letters.length + 8
  const shown = active ? Math.min(tick % cycle, letters.length) : letters.length
  const photos = active ? Math.max(0, Math.min(3, (tick % cycle) - letters.length + 1)) : 3
  return (
    <div className="w-full rounded-2xl bg-white p-3 text-left shadow-sm">
      <p className="text-[0.6rem] font-bold tracking-wider text-ink/40 uppercase">Para</p>
      <div className="mt-1 flex h-8 items-center rounded-lg border border-brand/40 px-2 text-sm font-semibold text-ink">
        {letters.slice(0, shown).join('')}
        <motion.span
          aria-hidden
          className="ml-0.5 h-4 w-0.5 bg-brand"
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.9, repeat: Infinity }}
        />
      </div>
      <div className="mt-2 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-6 flex-1 rounded-md"
            initial={false}
            animate={{
              backgroundColor: i < photos ? ['#f44e63', '#73cfee', '#c893d7'][i] : '#ece8ea',
              scale: i < photos ? [0.8, 1] : 1,
            }}
            transition={spring.bouncy}
          />
        ))}
      </div>
    </div>
  )
}

function ShareVisual({ active }: { active: boolean }) {
  const tick = useTicker(active, 1400)
  const read = !active || tick % 3 !== 0
  return (
    <div className="w-full rounded-2xl bg-[#efeae2] p-3">
      <motion.div
        key={active ? Math.floor(tick / 3) : 'quieto'}
        className="ml-auto w-[88%] origin-bottom-right rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-left text-[0.72rem] leading-snug text-ink shadow-sm"
        initial={active ? { scale: 0.6, opacity: 0 } : false}
        animate={{ scale: 1, opacity: 1 }}
        transition={spring.bouncy}
      >
        🎁 ¡Te mandé algo! Abrilo cuando estés tranqui
        <span className="mt-0.5 flex items-center justify-end gap-1 text-[0.6rem] text-ink/45">
          20:14
          <CheckCheck
            className={cn(
              'size-3.5 transition-colors duration-300',
              read ? 'text-sky-500' : 'text-ink/35',
            )}
            aria-hidden
          />
        </span>
      </motion.div>
    </div>
  )
}
