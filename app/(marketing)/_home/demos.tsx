'use client'

import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ConfettiBurst } from '@/ui/ConfettiBurst'
import { cn } from '@/ui/cn'
import { ease, spring, useCalm } from '@/ui/motion'

/**
 * Versiones jugables y livianas de las slides de una Boxie, para la home. No
 * usan el player: son maquetas que se sienten como la real (mismos colores,
 * misma letra redondeada) y que se pueden tocar.
 */

export interface DemoProps {
  /** Avisa que la persona tocó algo: la home deja de pasar sola a la siguiente. */
  onInteract(): void
}

/** Timers que se limpian solos al desmontar. */
function useTimers() {
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  return {
    at(ms: number, fn: () => void) {
      timers.current.push(setTimeout(fn, ms))
    },
    clear() {
      timers.current.forEach(clearTimeout)
      timers.current = []
    },
  }
}

function Eyebrow({ children, className }: { children: string; className?: string }) {
  return (
    <p className={cn('font-fun text-xs font-semibold tracking-[0.22em] uppercase', className)}>
      {children}
    </p>
  )
}

function ReplayButton({
  onClick,
  label,
  dark = false,
}: {
  onClick(): void
  label: string
  dark?: boolean
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold backdrop-blur',
        dark ? 'bg-white/15 text-white' : 'bg-ink/10 text-ink',
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      transition={spring.snappy}
    >
      <RotateCcw className="size-3.5" aria-hidden /> {label}
    </motion.button>
  )
}

// ── Dedicatoria ────────────────────────────────────────────────────────────

const LETTER = [
  'Sofi:',
  'Hay días en los que no alcanzan las palabras, así que te hice esto.',
  'Gracias por cada risa, cada viaje y cada abrazo.',
  'Te elijo todos los días ❤️',
]

type Envelope = 'closed' | 'open' | 'read'

export function DedicationDemo({ onInteract }: DemoProps) {
  const calm = useCalm()
  const timers = useTimers()
  const [phase, setPhase] = useState<Envelope>('closed')

  const open = (delay: number) => {
    timers.clear()
    timers.at(delay, () => setPhase('open'))
    timers.at(delay + (calm ? 0 : 750), () => setPhase('read'))
  }

  useEffect(() => {
    open(calm ? 0 : 700)
    // Solo al montarse: abre el sobre una vez sola.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    onInteract()
    if (phase === 'closed') open(0)
    else {
      timers.clear()
      setPhase('closed')
    }
  }

  const isOpen = phase !== 'closed'

  return (
    <div className="absolute inset-0 flex flex-col items-center bg-[linear-gradient(165deg,#fff5f7,#ffd0da)] px-5 pt-16 pb-7 text-ink">
      <Eyebrow className="text-brand">Para vos</Eyebrow>
      <h3 className="mt-1 font-fun text-2xl font-bold">Mi dedicatoria</h3>

      <div className="relative mt-auto h-[330px] w-[220px] overflow-hidden">
        {/* El fondo del sobre */}
        <div className="absolute inset-x-0 bottom-0 h-[150px] rounded-b-2xl bg-[#d63a4e]" />

        {/* La carta */}
        <motion.div
          className="absolute inset-x-3 bottom-2 h-[228px] rounded-xl bg-white p-4 text-left shadow-[0_10px_30px_rgba(0,0,0,0.15)]"
          initial={false}
          animate={
            phase === 'closed'
              ? { y: 110, opacity: 0, zIndex: 10 }
              : phase === 'open'
                ? { y: -20, opacity: 1, zIndex: 10 }
                : { y: -70, opacity: 1, zIndex: 40, scale: 1.04 }
          }
          transition={phase === 'closed' ? { duration: 0.3, ease: ease.in } : spring.gentle}
        >
          <motion.div
            className="space-y-2 font-fun text-[0.92rem] leading-snug"
            initial={false}
            animate={phase === 'read' ? 'show' : 'hidden'}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.22, delayChildren: 0.15 } },
            }}
          >
            {LETTER.map((line, i) => (
              <motion.p
                key={line}
                className={i === 0 ? 'font-bold text-brand' : undefined}
                variants={{
                  hidden: { opacity: 0, y: 8, filter: 'blur(3px)' },
                  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
                }}
                transition={{ duration: 0.5, ease: ease.out }}
              >
                {line}
              </motion.p>
            ))}
            <motion.p
              className="pt-1 text-right font-bold"
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            >
              — Tomi
            </motion.p>
          </motion.div>
        </motion.div>

        {/* El bolsillo de adelante */}
        <div className="absolute inset-x-0 bottom-0 z-20 h-[150px] rounded-b-2xl bg-brand [clip-path:polygon(0_0,50%_52%,100%_0,100%_100%,0_100%)]" />

        {/* La solapa */}
        <motion.div
          className="absolute inset-x-0 top-[180px] h-[92px] origin-top bg-[#e8475d] [clip-path:polygon(0_0,100%_0,50%_100%)]"
          initial={false}
          animate={{ rotateX: isOpen ? 180 : 0, zIndex: isOpen ? 5 : 30 }}
          transition={{
            rotateX: { duration: 0.6, ease: ease.inOut },
            zIndex: { duration: 0, delay: isOpen ? 0.3 : 0 },
          }}
          style={{ transformPerspective: 700 }}
        />
        <motion.span
          aria-hidden
          className="absolute top-[244px] left-1/2 z-30 grid size-10 -translate-x-1/2 place-items-center rounded-full bg-[#b3243a] text-lg shadow-md"
          initial={false}
          animate={{ opacity: isOpen ? 0 : 1, scale: isOpen ? 0.4 : 1 }}
          transition={spring.snappy}
        >
          ❤
        </motion.span>
      </div>

      <div className="mt-4">
        <ReplayButton onClick={toggle} label={isOpen ? 'Cerrar el sobre' : 'Abrir el sobre'} />
      </div>
    </div>
  )
}

// ── Fotos ──────────────────────────────────────────────────────────────────

const CAPTIONS = ['Nuestro primer viaje ✈️', 'Tu cumple sorpresa 🎂', 'Esa tarde con amigos 🌅']
const ROTATIONS = [-3, 6, -8]

export function PhotosDemo({ onInteract, photos }: DemoProps & { photos: string[] }) {
  const calm = useCalm()
  const [order, setOrder] = useState(() => photos.slice(0, 3).map((_, i) => i))
  const [seen, setSeen] = useState(0)

  const next = () => {
    onInteract()
    setSeen((s) => s + 1)
    setOrder(([first, ...rest]) => [...rest, first!])
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center bg-[linear-gradient(165deg,#2a2433,#4a4063)] px-5 pt-16 pb-7 text-white">
      <Eyebrow className="text-brand-muted">Nuestros momentos</Eyebrow>
      <h3 className="mt-1 font-fun text-2xl font-bold">Galería de fotos</h3>

      <div className="relative mt-8 h-[290px] w-[196px]">
        {order.map((photo, depth) => {
          const top = depth === 0
          return (
            <motion.div
              key={photo}
              className={cn(
                'absolute inset-0 rounded-md bg-white p-2.5 pb-11 shadow-[0_20px_40px_rgba(0,0,0,0.35)] select-none',
                top && 'cursor-grab active:cursor-grabbing',
              )}
              style={{ zIndex: 3 - depth, touchAction: 'pan-y' }}
              initial={false}
              animate={{ rotate: ROTATIONS[depth], y: depth * 10, scale: 1 - depth * 0.05 }}
              transition={spring.soft}
              drag={top ? 'x' : false}
              dragSnapToOrigin
              dragElastic={0.8}
              whileDrag={{ scale: 1.05, rotate: 0 }}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 450) next()
              }}
              onTap={top ? next : undefined}
            >
              <div className="relative size-full overflow-hidden bg-neutral-200">
                <Image
                  src={photos[photo]!}
                  alt=""
                  fill
                  sizes="200px"
                  draggable={false}
                  className="pointer-events-none object-cover"
                />
              </div>
              <p className="absolute inset-x-0 bottom-3 text-center font-fun text-sm font-semibold text-ink">
                {CAPTIONS[photo % CAPTIONS.length]}
              </p>
            </motion.div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {order.map((_, i) => (
            <motion.span
              key={i}
              className="h-1.5 rounded-full bg-white"
              initial={false}
              animate={{
                width: i === seen % order.length ? 18 : 6,
                opacity: i === seen % order.length ? 1 : 0.4,
              }}
              transition={spring.snappy}
            />
          ))}
        </div>
        <motion.button
          type="button"
          onClick={next}
          className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold backdrop-blur"
          whileTap={{ scale: 0.92 }}
        >
          <motion.span
            aria-hidden
            animate={
              calm
                ? undefined
                : { transform: ['translateX(-3px)', 'translateX(5px)', 'translateX(-3px)'] }
            }
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            👉
          </motion.span>
          Deslizá o tocá: siguiente foto
        </motion.button>
      </div>
    </div>
  )
}

// ── Canción ────────────────────────────────────────────────────────────────

const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const SONG_SECONDS = 195

export function SongDemo({ onInteract }: DemoProps) {
  const calm = useCalm()
  const [playing, setPlaying] = useState(true)
  const spin = useMotionValue(0)
  const progress = useMotionValue(0.22)
  const elapsed = useTransform(progress, (p) => formatTime(p * SONG_SECONDS))
  const width = useTransform(progress, (p) => `${p * 100}%`)

  useAnimationFrame((_, delta) => {
    if (!playing) return
    if (!calm) spin.set(spin.get() + delta * 0.05)
    progress.set((progress.get() + delta / (SONG_SECONDS * 1000)) % 1)
  })

  const toggle = () => {
    onInteract()
    setPlaying((p) => !p)
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center bg-[radial-gradient(circle_at_50%_30%,#4a4063,#1a191d_70%)] px-6 pt-16 pb-8 text-white">
      <Eyebrow className="text-brand-muted">Su canción</Eyebrow>

      <div className="relative mt-8">
        <motion.div
          aria-hidden
          className="absolute -inset-6 rounded-full bg-brand/40 blur-2xl"
          animate={{ opacity: playing ? 1 : 0.3, scale: playing ? 1 : 0.85 }}
          transition={spring.soft}
        />
        <motion.div
          className="relative grid size-44 place-items-center rounded-full bg-[repeating-radial-gradient(circle,#1a191d_0_2px,#2c2a31_2px_4px)] shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          style={{ rotate: spin }}
        >
          <div className="grid size-16 place-items-center rounded-full bg-[linear-gradient(135deg,#f44e63,#ff9a9e)] text-2xl">
            ❤
          </div>
          <span className="absolute size-2 rounded-full bg-night" />
        </motion.div>
      </div>

      <h3 className="mt-8 font-fun text-2xl font-bold">Nuestra canción</h3>
      <p className="mt-1 text-sm text-white/60">Suena mientras mirás tu regalo</p>

      <div className="mt-5 flex h-8 items-end gap-1" aria-hidden>
        {[0.9, 1.1, 0.8, 1.25, 1].map((d, i) => (
          <motion.span
            key={i}
            className="w-1.5 origin-bottom rounded-full bg-brand"
            style={{ height: 32 }}
            animate={
              playing && !calm
                ? {
                    transform: [
                      'scaleY(0.3)',
                      'scaleY(1)',
                      'scaleY(0.45)',
                      'scaleY(0.85)',
                      'scaleY(0.3)',
                    ],
                  }
                : { transform: 'scaleY(0.25)' }
            }
            transition={
              playing && !calm ? { duration: d, repeat: Infinity, ease: 'easeInOut' } : spring.soft
            }
          />
        ))}
      </div>

      <div className="mt-auto w-full">
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
          <motion.div className="h-full rounded-full bg-white" style={{ width }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[0.65rem] text-white/50 tabular-nums">
          <motion.span>{elapsed}</motion.span>
          <span>{formatTime(SONG_SECONDS)}</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-7">
          <SkipBack className="size-5 fill-current text-white/50" aria-hidden />
          <motion.button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            className="grid size-14 place-items-center rounded-full bg-white text-ink shadow-lg"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.88 }}
            transition={spring.snappy}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={playing ? 'pause' : 'play'}
                initial={{ scale: 0.4, opacity: 0, rotate: -45 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0.4, opacity: 0, rotate: 45 }}
                transition={spring.snappy}
              >
                {playing ? (
                  <Pause className="size-6 fill-current" aria-hidden />
                ) : (
                  <Play className="size-6 translate-x-0.5 fill-current" aria-hidden />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
          <SkipForward className="size-5 fill-current text-white/50" aria-hidden />
        </div>
      </div>
    </div>
  )
}

// ── Trivia ─────────────────────────────────────────────────────────────────

const OPTIONS = ['En el cine 🍿', 'En una plaza 🌳', 'En la costanera 🌊']
const CORRECT = 2

export function TriviaDemo({ onInteract }: DemoProps) {
  const timers = useTimers()
  const [picked, setPicked] = useState<number | null>(null)
  const [won, setWon] = useState(false)
  const [misses, setMisses] = useState(0)

  const answer = (i: number) => {
    onInteract()
    if (picked !== null) return
    setPicked(i)
    timers.at(900, () => {
      if (i === CORRECT) setWon(true)
      else setMisses((m) => m + 1)
      setPicked(null)
    })
  }

  const restart = () => {
    onInteract()
    setWon(false)
    setMisses(0)
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-[linear-gradient(165deg,#9fe0f5,#c893d7)] px-5 pt-16 pb-7 text-ink">
      <AnimatePresence mode="wait" initial={false}>
        {won ? (
          <motion.div
            key="premio"
            className="flex h-full flex-col items-center justify-center text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={spring.bouncy}
          >
            <ConfettiBurst count={40} seed={11} className="top-1/3" />
            <motion.span
              className="text-7xl"
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring.bouncy, delay: 0.15 }}
              aria-hidden
            >
              🏆
            </motion.span>
            <h3 className="mt-4 font-fun text-3xl font-bold">¡Acertaste!</h3>
            <p className="mt-2 text-sm font-medium text-ink/75">Desbloqueaste tu premio:</p>
            <p className="mt-3 rounded-2xl bg-white px-4 py-3 font-fun text-lg font-bold shadow-lg">
              Una cena a elección 🍝
            </p>
            <div className="mt-6">
              <ReplayButton onClick={restart} label="Jugar de nuevo" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="juego"
            className="flex h-full flex-col"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35, ease: ease.out }}
          >
            <Eyebrow className="text-center text-ink/60">Pregunta 1 de 3</Eyebrow>
            <motion.div
              aria-hidden
              className="mx-auto mt-3 text-5xl"
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              🤔
            </motion.div>
            <div className="mt-3 rounded-2xl bg-white/90 p-4 text-center shadow-lg">
              <h3 className="font-fun text-xl leading-tight font-bold">
                ¿Dónde fue nuestra primera cita?
              </h3>
            </div>
            <div className="mt-4 space-y-2.5">
              {OPTIONS.map((option, i) => {
                const chosen = picked === i
                const right = chosen && i === CORRECT
                const wrong = chosen && i !== CORRECT
                return (
                  <motion.button
                    key={option}
                    type="button"
                    onClick={() => answer(i)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-fun text-base font-semibold shadow-md transition-colors duration-200',
                      right
                        ? 'bg-green-500 text-white'
                        : wrong
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-ink',
                    )}
                    animate={wrong ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }}
                    transition={wrong ? { duration: 0.45 } : spring.snappy}
                    whileHover={picked === null ? { scale: 1.03 } : undefined}
                    whileTap={picked === null ? { scale: 0.96 } : undefined}
                  >
                    {option}
                    <AnimatePresence>
                      {chosen && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={spring.bouncy}
                          aria-hidden
                        >
                          {right ? '✓' : '✗'}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </div>
            <p
              className="mt-auto min-h-5 text-center text-xs font-semibold text-ink/70"
              aria-live="polite"
            >
              {misses > 0 ? 'Pista: había mucho viento 😅' : 'Tocá una respuesta'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Tragamonedas ───────────────────────────────────────────────────────────

const SYMBOLS = ['🍒', '⭐', '💖', '🍀', '🔔', '🎁']
const IDLE = ['🍒', '💖', '⭐']

export function JackpotDemo({ onInteract }: DemoProps) {
  const calm = useCalm()
  const timers = useTimers()
  const [stopped, setStopped] = useState([true, true, true])
  const [spun, setSpun] = useState(false)
  const [won, setWon] = useState(false)
  const spinning = stopped.some((s) => !s)

  const spin = () => {
    onInteract()
    if (spinning) return
    setWon(false)
    setSpun(true)
    setStopped([false, false, false])
    timers.at(900, () => setStopped([true, false, false]))
    timers.at(1300, () => setStopped([true, true, false]))
    timers.at(1750, () => setStopped([true, true, true]))
    timers.at(2050, () => setWon(true))
  }

  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#4a4063,#1a191d_75%)] px-5 pt-16 pb-8 text-white">
      <Eyebrow className="text-gold">Tragamonedas</Eyebrow>
      <h3 className="mt-1 font-fun text-2xl font-bold">¡Probá tu suerte!</h3>

      <div className="relative mt-8 rounded-3xl bg-[linear-gradient(180deg,#f44e63,#d63a4e)] p-3 shadow-[0_20px_50px_rgba(244,78,99,0.35)]">
        <div className="absolute inset-x-4 -top-1.5 flex justify-between" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <motion.span
              key={i}
              className="size-2.5 rounded-full bg-gold shadow-[0_0_8px_#ffd700]"
              animate={calm ? undefined : { opacity: [1, 0.25, 1] }}
              transition={{
                duration: won ? 0.35 : 1.2,
                repeat: Infinity,
                delay: (i % 2) * (won ? 0.17 : 0.6),
              }}
            />
          ))}
        </div>
        <div className="flex gap-2 rounded-2xl bg-night-deep p-2">
          {[0, 1, 2].map((reel) => (
            <div
              key={reel}
              className="relative h-[76px] w-[62px] overflow-hidden rounded-xl bg-white text-4xl"
            >
              {stopped[reel] ? (
                <motion.span
                  key={spun ? 'premio' : 'quieto'}
                  className="grid size-full place-items-center"
                  initial={spun ? { y: -40, opacity: 0 } : false}
                  animate={{ y: 0, opacity: 1 }}
                  transition={spring.bouncy}
                >
                  {spun ? '🎁' : IDLE[reel]}
                </motion.span>
              ) : (
                <motion.div
                  className="flex flex-col"
                  animate={calm ? undefined : { transform: ['translateY(0%)', 'translateY(-50%)'] }}
                  transition={{ duration: 0.32, repeat: Infinity, ease: 'linear' }}
                >
                  {[...SYMBOLS, ...SYMBOLS].map((s, i) => (
                    <span key={i} className="grid h-[76px] place-items-center blur-[1px]">
                      {s}
                    </span>
                  ))}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-6 flex min-h-[92px] w-full flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {won ? (
            <motion.div
              key="gano"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={spring.bouncy}
            >
              <ConfettiBurst count={36} seed={23} className="-top-24" />
              <p className="font-fun text-3xl font-bold text-gold">¡JACKPOT! 🎉</p>
              <p className="mt-1 text-sm text-white/80">Ganaste: una escapada juntos ✈️</p>
            </motion.div>
          ) : (
            <motion.p
              key="espera"
              className="text-sm text-white/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {spinning ? 'Girando…' : 'Tres regalos iguales y ganás 🎁'}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        onClick={spin}
        disabled={spinning}
        className="mt-auto w-full rounded-2xl bg-gold py-3.5 font-fun text-lg font-bold text-ink shadow-[0_6px_0_#b89800] disabled:opacity-70"
        whileHover={spinning ? undefined : { y: -2 }}
        whileTap={spinning ? undefined : { y: 4, boxShadow: '0 2px 0 #b89800' }}
        transition={spring.snappy}
      >
        {won ? 'Girar otra vez' : 'Girar 🎰'}
      </motion.button>
    </div>
  )
}

// ── Cuponera ───────────────────────────────────────────────────────────────

const COUPONS = [
  { emoji: '💆', title: 'Vale por un masaje', detail: 'de 20 minutos, sin apuro' },
  { emoji: '🍿', title: 'Vale por elegir la peli', detail: 'sin quejas de mi parte' },
  { emoji: '🥐', title: 'Vale por un desayuno', detail: 'en la cama, un domingo' },
]

export function CouponsDemo({ onInteract }: DemoProps) {
  const [redeemed, setRedeemed] = useState(() => COUPONS.map(() => false))
  const count = redeemed.filter(Boolean).length

  const redeem = (i: number) => {
    onInteract()
    setRedeemed((r) => r.map((v, j) => (j === i ? true : v)))
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-[linear-gradient(165deg,#fff8e6,#ffdcb5)] px-4 pt-16 pb-7 text-ink">
      <Eyebrow className="text-center text-brand">Tu cuponera</Eyebrow>
      <h3 className="mt-1 text-center font-fun text-2xl font-bold">Vales para canjear</h3>

      <div className="mt-6 space-y-3">
        {COUPONS.map((c, i) => (
          <div
            key={c.title}
            className="relative flex overflow-hidden rounded-2xl bg-white shadow-[0_8px_20px_rgba(214,58,78,0.14)]"
          >
            <div className="grid w-16 shrink-0 place-items-center border-r-2 border-dashed border-brand/25 bg-brand-soft text-3xl">
              <span aria-hidden>{c.emoji}</span>
            </div>
            <span
              className="absolute top-0 left-16 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ffe9cc]"
              aria-hidden
            />
            <span
              className="absolute bottom-0 left-16 size-4 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#ffe3c0]"
              aria-hidden
            />
            <motion.div
              className="flex min-w-0 flex-1 items-center justify-between gap-2 p-3"
              animate={{ opacity: redeemed[i] ? 0.45 : 1 }}
            >
              <div className="min-w-0">
                <p className="font-fun text-[0.95rem] leading-tight font-bold">{c.title}</p>
                <p className="mt-0.5 text-[0.7rem] text-ink/60">{c.detail}</p>
              </div>
              <motion.button
                type="button"
                onClick={() => redeem(i)}
                disabled={redeemed[i]}
                className="shrink-0 rounded-full bg-brand px-3 py-1.5 text-xs font-bold text-white disabled:bg-neutral-300"
                whileHover={redeemed[i] ? undefined : { scale: 1.06 }}
                whileTap={redeemed[i] ? undefined : { scale: 0.9 }}
                transition={spring.snappy}
              >
                {redeemed[i] ? 'Usado' : 'Canjear'}
              </motion.button>
            </motion.div>
            <AnimatePresence>
              {redeemed[i] && (
                <motion.span
                  className="pointer-events-none absolute top-1/2 left-1/2 rounded-lg border-[3px] border-green-600 px-2.5 py-0.5 font-display text-lg font-bold tracking-wider text-green-600 uppercase"
                  initial={{ opacity: 0, scale: 2.4, x: '-50%', y: '-50%', rotate: -4 }}
                  animate={{ opacity: 1, scale: 1, x: '-50%', y: '-50%', rotate: -12 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', visualDuration: 0.3, bounce: 0.45 }}
                >
                  ¡Canjeado!
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-2 text-center">
        <p className="text-sm font-semibold text-ink/70" aria-live="polite">
          {count === COUPONS.length
            ? '¡Usaste todos! 🥳'
            : `${count} de ${COUPONS.length} canjeados`}
        </p>
        {count > 0 && (
          <ReplayButton
            onClick={() => {
              onInteract()
              setRedeemed(COUPONS.map(() => false))
            }}
            label="Empezar de nuevo"
          />
        )}
      </div>
    </div>
  )
}
