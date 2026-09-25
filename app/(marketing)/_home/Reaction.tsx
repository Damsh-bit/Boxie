'use client'

import { AnimatePresence, motion, useInView } from 'framer-motion'
import { CheckCheck, Gift, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/ui/cn'
import { Stagger, StaggerItem, spring, useCalm } from '@/ui/motion'
import { CountUp, Mark, SectionHeading } from './primitives'

type Message = { from: 'me' | 'them'; text?: string; link?: boolean }

const CHAT: Message[] = [
  { from: 'me', text: 'Te mandé algo 🎁 abrilo cuando estés tranqui' },
  { from: 'me', link: true },
  { from: 'them', text: '¿¿Qué es esto?? 😱' },
  { from: 'them', text: 'NO PUEDO, me hiciste llorar 😭❤️' },
  { from: 'them', text: 'La trivia me mató jaja, obvio que fue en la costanera 🌊' },
  { from: 'them', text: 'Canjeo el vale del desayuno YA 🥐' },
]

/**
 * El momento de abrirla: una charla de WhatsApp que se escribe sola cuando
 * entra en pantalla (con "escribiendo…" y los tildes que se ponen azules), al
 * lado de los números de la Boxie, que cuentan al aparecer.
 */
export function Reaction({ lifetimeDays }: { lifetimeDays: number }) {
  const stats = [
    { value: 20, label: 'sorpresas en cada Boxie' },
    { value: lifetimeDays, label: 'días online para verla las veces que quiera' },
    { value: 5, label: 'minutos para crearla', prefix: '~' },
    { value: 0, label: 'apps para instalar' },
  ]

  return (
    <section
      id="reaccion"
      aria-labelledby="reaccion-title"
      className="relative overflow-hidden rounded-t-[40px] bg-white px-5 pt-20 pb-10 sm:px-8 sm:pt-24"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <div>
          <SectionHeading
            align="left"
            eyebrow="El momento de abrirla"
            title={
              <span id="reaccion-title">
                Lo mejor es <Mark>su reacción</Mark>
              </span>
            }
            text="Le mandás el link por WhatsApp y la Boxie hace el resto: se abre como un regalo, suena su canción y empiezan las sorpresas. Un regalo a distancia que se siente cerca."
            className="lg:mb-10"
          />
          <Stagger className="grid grid-cols-2 gap-3 sm:gap-4" step={0.1}>
            {stats.map((s) => (
              <StaggerItem
                key={s.label}
                className="rounded-3xl bg-paper/60 p-5 ring-1 ring-black/5 transition-colors duration-300 hover:bg-brand-soft"
                whileHover={{ y: -4 }}
              >
                <p className="font-display text-4xl font-bold text-brand sm:text-5xl">
                  <CountUp to={s.value} prefix={s.prefix} />
                </p>
                <p className="mt-1 text-sm leading-snug font-medium text-ink/70">{s.label}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <ChatDemo />
      </div>
    </section>
  )
}

function ChatDemo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.45 })
  const calm = useCalm()
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const [shown, setShown] = useState(0)
  const [typing, setTyping] = useState(false)
  const [loved, setLoved] = useState(false)
  const [done, setDone] = useState(false)

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))
    at(0, () => {
      setShown(0)
      setTyping(false)
      setLoved(false)
      setDone(false)
    })
    let t = 400
    CHAT.forEach((m, i) => {
      if (m.from === 'them') {
        at(t, () => setTyping(true))
        t += 1150
        at(t, () => {
          setTyping(false)
          setShown(i + 1)
        })
        t += 650
      } else {
        at(t, () => setShown(i + 1))
        t += 750
      }
      if (i === 3) at(t - 300, () => setLoved(true))
    })
    at(t, () => setDone(true))
  }, [])

  useEffect(() => {
    if (!inView) return
    if (calm) {
      const frame = requestAnimationFrame(() => {
        setShown(CHAT.length)
        setLoved(true)
        setDone(true)
      })
      return () => cancelAnimationFrame(frame)
    }
    play()
    const pending = timers.current
    return () => pending.forEach(clearTimeout)
  }, [inView, calm, play])

  const read = shown > 2 || typing

  return (
    <motion.div
      ref={ref}
      data-reveal=""
      className="relative mx-auto w-full max-w-[380px]"
      initial={{ opacity: 0, y: 40, rotate: 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={spring.gentle}
    >
      <div
        aria-hidden
        className="absolute -inset-8 -z-10 rounded-full bg-[radial-gradient(circle,rgba(244,78,99,0.18),transparent_65%)] blur-2xl"
      />
      <div className="overflow-hidden rounded-[32px] bg-[#efeae2] shadow-[0_40px_80px_-30px_rgba(42,36,51,0.45)] ring-1 ring-black/5">
        <div className="flex items-center gap-3 bg-white px-4 py-3">
          <span className="grid size-10 place-items-center rounded-full bg-[linear-gradient(135deg,#f44e63,#c893d7)] font-bold text-white">
            S
          </span>
          <div className="leading-tight">
            <p className="font-semibold text-ink">Sofi ❤️</p>
            <p className="relative h-4 text-xs text-ink/50">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={typing ? 'typing' : 'online'}
                  className={cn('block', typing && 'text-green-600')}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2 }}
                >
                  {typing ? 'escribiendo…' : 'en línea'}
                </motion.span>
              </AnimatePresence>
            </p>
          </div>
        </div>

        <div
          className="flex h-[430px] flex-col justify-end gap-2 overflow-hidden bg-[radial-gradient(rgba(42,36,51,0.06)_1px,transparent_1px)] [background-size:14px_14px] px-3 py-4"
          aria-label="Ejemplo de conversación al recibir una Boxie"
          role="log"
        >
          <AnimatePresence initial={false}>
            {CHAT.slice(0, shown).map((m, i) => (
              <motion.div
                key={i}
                layout
                className={cn(
                  'relative max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-snug text-ink shadow-sm',
                  m.from === 'me'
                    ? 'origin-bottom-right self-end rounded-tr-md bg-[#d9fdd3]'
                    : 'origin-bottom-left self-start rounded-tl-md bg-white',
                )}
                initial={{ opacity: 0, scale: 0.6, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={spring.bouncy}
              >
                {m.link ? <LinkPreview /> : m.text}
                {m.from === 'me' && (
                  <span className="mt-0.5 flex items-center justify-end gap-1 text-[0.6rem] text-ink/45">
                    20:14
                    <CheckCheck
                      className={cn(
                        'size-3.5 transition-colors duration-500',
                        read ? 'text-sky-500' : 'text-ink/35',
                      )}
                      aria-hidden
                    />
                  </span>
                )}
                {m.link && (
                  <AnimatePresence>
                    {loved && (
                      <motion.span
                        className="absolute -bottom-3 left-2 rounded-full bg-white px-1.5 py-0.5 text-sm shadow-md"
                        initial={{ scale: 0, rotate: -30 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={spring.bouncy}
                        aria-label="Reaccionó con un corazón"
                      >
                        ❤️
                      </motion.span>
                    )}
                  </AnimatePresence>
                )}
              </motion.div>
            ))}
            {typing && (
              <motion.div
                key="typing"
                layout
                className="flex w-16 origin-bottom-left items-center justify-center gap-1 rounded-2xl rounded-tl-md bg-white px-3 py-3 shadow-sm"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={spring.snappy}
                aria-hidden
              >
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className="size-1.5 rounded-full bg-ink/40"
                    animate={{
                      transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'],
                    }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between px-2 text-xs text-ink/50">
        <span>Recreación de ejemplo</span>
        <AnimatePresence>
          {done && !calm && (
            <motion.button
              type="button"
              onClick={play}
              className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3 py-1.5 font-semibold text-ink"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.92 }}
              transition={spring.snappy}
            >
              <RotateCcw className="size-3.5" aria-hidden /> Ver de nuevo
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function LinkPreview() {
  return (
    <span className="block">
      <span className="block overflow-hidden rounded-xl bg-white/70">
        <span className="flex h-24 items-center justify-center gap-2 bg-[linear-gradient(135deg,#f44e63,#ff9a9e)] font-fun text-xl font-bold text-white">
          <Gift className="size-7" strokeWidth={1.6} aria-hidden /> Para Sofi
        </span>
        <span className="block p-2">
          <span className="block text-xs font-bold">Un regalo especial para vos 🎁</span>
          <span className="block text-[0.65rem] text-ink/50">boxiedigital.com.ar</span>
        </span>
      </span>
      <span className="mt-1 block text-[0.72rem] text-sky-700 underline">
        boxiedigital.com.ar/g/sofi…
      </span>
    </span>
  )
}
