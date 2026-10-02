'use client'

import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ConfettiBurst } from '@/ui/ConfettiBurst'
import { cn } from '@/ui/cn'
import { Emoji, EmojiText, Icon } from '@/ui/Icon'
import { Swap, ease, spring, useCalm } from '@/ui/motion'
import { useTimers } from './demos'
import { lookOf, themeGradient, type HomeTheme, type ThemeStory } from './theme-look'

/**
 * Las pantallas de la Boxie de muestra del celular de la portada. Son
 * maquetas livianas (no usan el player) que cuentan una Boxie de punta a
 * punta: portada, fotos, dedicatoria, canción, un juego y el regalo final.
 * Todo lo que no se toca deja pasar el clic al celular (que avanza como una
 * historia); lo que se toca lleva `data-hero-interactive`.
 */

export interface SceneProps {
  theme: HomeTheme
  story: ThemeStory
  /** El nombre que se escribió en el armador o el de ejemplo. */
  name: string
  /** La Boxie pasa sola: los juegos se juegan solos si nadie los toca. */
  auto: boolean
  /** Dónde está el mouse sobre el celular, de -0.5 a 0.5 (0 es el centro). */
  pointer: { x: MotionValue<number>; y: MotionValue<number> }
  /** La persona tocó algo: la Boxie deja de pasar sola por un rato. */
  onInteract(): void
  /** Volver a la portada. */
  onRestart(): void
}

const MARKER: CSSProperties = { fontFamily: 'var(--font-marker)' }

/** Marca lo que se puede tocar dentro de una pantalla. */
const interactive = { 'data-hero-interactive': '' }

/** Desplaza una capa según el mouse: más profundidad, más se mueve. */
function useDepth(pointer: SceneProps['pointer'], x: number, y = x) {
  return {
    x: useTransform(pointer.x, (v) => v * x),
    y: useTransform(pointer.y, (v) => v * y),
  }
}

function Eyebrow({
  children,
  className,
  style,
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
}) {
  return (
    <motion.p
      className={cn('font-fun text-[0.7rem] font-semibold tracking-[0.24em] uppercase', className)}
      style={style}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: ease.out, delay: 0.1 }}
    >
      {children}
    </motion.p>
  )
}

/** Un dedo fantasma que "toca" cuando la Boxie se juega sola. */
function TapHint({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={cn('pointer-events-none absolute z-20 size-9', className)}
      initial={{ opacity: 0, scale: 1.7 }}
      animate={{ opacity: 1, scale: [1.7, 1, 0.8, 1] }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.2 } }}
      transition={{ duration: 0.75, times: [0, 0.55, 0.8, 1], ease: ease.out }}
    >
      <span className="absolute inset-0 rounded-full bg-white/75 shadow-[0_6px_18px_rgba(0,0,0,0.25)] ring-2 ring-white" />
      <motion.span
        className="absolute inset-0 rounded-full ring-2 ring-white"
        initial={{ scale: 1, opacity: 0 }}
        animate={{ scale: 2.4, opacity: [0, 0.9, 0] }}
        transition={{ duration: 0.7, delay: 0.5, ease: 'easeOut' }}
      />
    </motion.span>
  )
}

// ── Portada ────────────────────────────────────────────────────────────────

const PARTICLES = [
  { left: '10%', size: 18, duration: 7, delay: 0 },
  { left: '27%', size: 12, duration: 9, delay: 2.2 },
  { left: '45%', size: 22, duration: 8, delay: 4.1 },
  { left: '63%', size: 14, duration: 10, delay: 1.2 },
  { left: '80%', size: 20, duration: 7.5, delay: 3.3 },
  { left: '91%', size: 11, duration: 9.5, delay: 5.5 },
]

/** Tamaño de la letra según el largo del nombre, para que entre siempre en la portada. */
function nameSize(name: string) {
  if (name.length <= 7) return 'text-[2.5rem]'
  if (name.length <= 10) return 'text-[2rem]'
  if (name.length <= 13) return 'text-[1.6rem]'
  return 'text-[1.3rem]'
}

/**
 * La portada, en vivo: el color de la temática elegida y el nombre que se
 * escribe al lado (letra por letra). Sin nombre, pasan los de ejemplo.
 */
export function CoverScene({
  theme,
  typed,
  example,
  pointer,
}: Pick<SceneProps, 'theme' | 'pointer'> & { typed: string; example: string }) {
  const calm = useCalm()
  const look = lookOf(theme.slug)
  const icon = useDepth(pointer, 28, 22)
  const text = useDepth(pointer, 12, 9)
  const glow = useDepth(pointer, -36, -30)

  return (
    <div className="absolute inset-0 overflow-hidden text-white">
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
      <motion.div className="absolute inset-0" style={glow}>
        <div className="absolute -top-10 -left-16 size-56 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute right-[-60px] bottom-10 size-48 rounded-full bg-white/10 blur-3xl" />
      </motion.div>

      {PARTICLES.map((p, i) => (
        <motion.span
          key={`${theme.slug}-${i}`}
          aria-hidden
          className="absolute bottom-0 text-white/70 motion-reduce:hidden"
          style={{ left: p.left }}
          initial={{ opacity: 0 }}
          animate={
            calm
              ? undefined
              : {
                  transform: ['translateY(20px) rotate(0deg)', 'translateY(-640px) rotate(200deg)'],
                  opacity: [0, 0.9, 0],
                }
          }
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        >
          <Emoji value={look.particle} size={p.size + 4} />
        </motion.span>
      ))}

      <div className="relative flex h-full flex-col items-center justify-center px-4 pb-6 text-center">
        <motion.div
          className="mb-6 grid h-16 place-items-center drop-shadow-[0_10px_10px_rgba(0,0,0,0.2)]"
          style={icon}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={theme.slug}
              className="block"
              initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.3, rotate: 30 }}
              transition={spring.bouncy}
            >
              <motion.span
                className="block"
                animate={
                  calm
                    ? undefined
                    : {
                        transform: [
                          'rotate(0deg) scale(1)',
                          'rotate(-9deg) scale(1.1)',
                          'rotate(7deg) scale(1.1)',
                          'rotate(0deg) scale(1)',
                        ],
                      }
                }
                transition={{
                  duration: 1.1,
                  repeat: Infinity,
                  repeatDelay: 1.6,
                  ease: 'easeInOut',
                }}
              >
                {/* Las temáticas creadas en el panel llevan su propio ícono. */}
                <Emoji value={look.icon ?? theme.emoji} size={76} />
              </motion.span>
            </motion.span>
          </AnimatePresence>
        </motion.div>

        <motion.div className="w-full" style={text}>
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
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-[74px] flex justify-center">
        <motion.span
          className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-bold ring-1 ring-white/35 backdrop-blur-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9, ease: ease.out }}
        >
          <motion.span
            aria-hidden
            className="block"
            animate={
              calm
                ? undefined
                : { transform: ['translateY(0px)', 'translateY(-4px)', 'translateY(0px)'] }
            }
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon name="toca-aca" size={18} />
          </motion.span>
          Tocá para abrir
        </motion.span>
      </div>
      <p className="absolute inset-x-0 bottom-10 text-center text-[0.6rem] font-semibold tracking-[0.2em] text-white/80 uppercase">
        De parte de: vos
      </p>
    </div>
  )
}

// ── Fotos ──────────────────────────────────────────────────────────────────

/**
 * Una foto a pantalla completa que se acerca despacio (y se corre con el
 * mouse), y una polaroid que entra de costado y se puede agarrar y revolear.
 */
export function PhotosScene({ theme, story, name, pointer, onInteract }: SceneProps) {
  const calm = useCalm()
  const [first, second = first] = theme.images
  const pan = useDepth(pointer, -18, -14)

  return (
    <div className="absolute inset-0 overflow-hidden bg-night text-white">
      {first && (
        <motion.div className="absolute -inset-5" style={pan}>
          <motion.div
            className="absolute inset-0"
            initial={{ scale: calm ? 1.04 : 1.2 }}
            animate={{ scale: 1.04 }}
            transition={{ duration: 6, ease: 'easeOut' }}
          >
            <Image src={first} alt="" fill sizes="320px" className="object-cover" />
          </motion.div>
        </motion.div>
      )}
      <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-black/80 via-black/35 to-transparent" />

      {second && (
        <motion.div
          {...interactive}
          className="pointer-events-auto absolute top-[78px] right-4 w-[116px] cursor-grab rounded-[4px] bg-white p-1.5 pb-7 shadow-[0_18px_36px_rgba(0,0,0,0.4)] active:cursor-grabbing"
          style={{ touchAction: 'none' }}
          initial={{ opacity: 0, y: 70, x: 30, rotate: 22, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, x: 0, rotate: 7, scale: 1 }}
          transition={{ ...spring.bouncy, delay: 1 }}
          drag
          dragSnapToOrigin
          dragElastic={0.5}
          dragTransition={{ bounceStiffness: 320, bounceDamping: 16 }}
          whileHover={{ rotate: 0, scale: 1.05 }}
          whileDrag={{ rotate: -6, scale: 1.12 }}
          onDragStart={onInteract}
        >
          <div className="relative aspect-square overflow-hidden bg-neutral-200">
            <Image
              src={second}
              alt=""
              fill
              sizes="120px"
              draggable={false}
              className="pointer-events-none object-cover"
            />
          </div>
          <p className="absolute inset-x-0 bottom-1.5 truncate px-1 text-center font-fun text-[0.7rem] font-semibold text-ink">
            <EmojiText text={story.captions[1]} />
          </p>
        </motion.div>
      )}

      <motion.div
        className="absolute inset-x-5 bottom-12"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.18, delayChildren: 0.35 } } }}
      >
        {[
          <p
            key="a"
            className="font-fun text-[0.7rem] font-semibold tracking-[0.24em] text-white/75 uppercase"
          >
            Nuestros momentos
          </p>,
          <h3
            key="b"
            className="mt-1 font-fun text-[1.75rem] leading-tight font-bold [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]"
          >
            <EmojiText text={story.captions[0]} />
          </h3>,
          <p key="c" className="mt-1.5 text-sm font-medium text-white/80">
            Con {name}, siempre{' '}
            <Icon name="destellos" size="1.2em" style={{ verticalAlign: '-0.25em' }} />
          </p>,
        ].map((child) => (
          <motion.div
            key={child.key}
            variants={{
              hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
              show: { opacity: 1, y: 0, filter: 'blur(0px)' },
            }}
            transition={{ duration: 0.55, ease: ease.out }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ── Dedicatoria ────────────────────────────────────────────────────────────

const HEART_PATHS = [-22, 12, -6, 20, 2, -14]

/** Una carta en papel rayado que se escribe sola, con un corazón para mandar amor. */
export function LetterScene({ theme, story, name, pointer, onInteract }: SceneProps) {
  const calm = useCalm()
  const rotateX = useTransform(pointer.y, (v) => v * -12)
  const rotateY = useTransform(pointer.x, (v) => v * 14)
  const [bursts, setBursts] = useState<number[]>([])
  const burstId = useRef(0)
  const timers = useTimers()
  const accent = `color-mix(in srgb, ${theme.color} 70%, #2a2433)`

  const love = () => {
    onInteract()
    const id = ++burstId.current
    setBursts((b) => [...b, id])
    timers.at(1300, () => setBursts((b) => b.filter((x) => x !== id)))
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center overflow-hidden px-5 pt-[62px] pb-8 text-ink"
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${theme.color} 8%, #fff), color-mix(in srgb, ${theme.color} 34%, #fff))`,
      }}
    >
      <Eyebrow style={{ color: accent }}>Para vos</Eyebrow>
      <motion.h3
        className="mt-1 font-fun text-2xl font-bold"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: ease.out, delay: 0.15 }}
      >
        Mi dedicatoria
      </motion.h3>

      <motion.div
        className="relative mt-7 w-full"
        style={{ rotateX, rotateY, transformPerspective: 700 }}
        initial={{ opacity: 0, y: 50, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: -1.5 }}
        transition={spring.gentle}
      >
        <div className="rounded-2xl bg-white bg-[repeating-linear-gradient(transparent_0,transparent_27px,rgba(42,36,51,0.07)_27px,rgba(42,36,51,0.07)_28px)] bg-[length:100%_28px] bg-[position:0_18px] px-5 pt-[18px] pb-5 shadow-[0_22px_44px_-14px_rgba(42,36,51,0.4)]">
          <motion.div
            className="font-fun text-[0.95rem] leading-[28px]"
            initial="hidden"
            animate="show"
            variants={{
              show: { transition: { staggerChildren: calm ? 0 : 0.55, delayChildren: 0.4 } },
            }}
          >
            {[`${name}:`, ...story.letter].map((line, i) => (
              <motion.p
                key={i}
                className={i === 0 ? 'font-bold' : undefined}
                style={i === 0 ? { color: accent } : undefined}
                variants={{
                  hidden: { opacity: 0, y: 6, filter: 'blur(3px)' },
                  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
                }}
                transition={{ duration: 0.5, ease: ease.out }}
              >
                <EmojiText text={line} />
              </motion.p>
            ))}
            <motion.p
              className="pt-1 text-right text-lg"
              style={MARKER}
              variants={{
                hidden: { opacity: 0, x: 10 },
                show: { opacity: 1, x: 0 },
              }}
            >
              — vos
            </motion.p>
          </motion.div>
        </div>

        <motion.button
          {...interactive}
          type="button"
          onClick={love}
          aria-label="Mandar corazones"
          className="pointer-events-auto absolute -top-5 -right-3 grid size-12 place-items-center rounded-full bg-white shadow-[0_8px_20px_rgba(0,0,0,0.25)] ring-4 ring-white/70"
          initial={{ scale: 0, rotate: -40 }}
          animate={{ scale: 1, rotate: 12 }}
          transition={{ ...spring.bouncy, delay: 0.8 }}
          whileHover={{ scale: 1.15, rotate: 0 }}
          whileTap={{ scale: 0.82 }}
        >
          <motion.span
            aria-hidden
            className="block"
            animate={
              calm
                ? undefined
                : { transform: ['scale(1)', 'scale(1.22)', 'scale(1)', 'scale(1.12)', 'scale(1)'] }
            }
            transition={{ duration: 1.3, repeat: Infinity, repeatDelay: 0.6 }}
          >
            <Icon name="corazon" size={26} />
          </motion.span>
          {bursts.map((id) =>
            HEART_PATHS.map((dx, i) => (
              <motion.span
                key={`${id}-${i}`}
                aria-hidden
                className="pointer-events-none absolute"
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: 0, x: dx * 1.6, y: -70 - (i % 3) * 22, scale: 1.1, rotate: dx }}
                transition={{ duration: 1.1, ease: ease.out, delay: i * 0.03 }}
              >
                <Icon name="corazon" size={18} />
              </motion.span>
            )),
          )}
        </motion.button>
      </motion.div>
    </div>
  )
}

// ── Canción ────────────────────────────────────────────────────────────────

const SONG_SECONDS = 214
const formatTime = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Un vinilo con la foto de la temática en el centro. Gira mientras suena y
 * se puede agarrar y girar con el mouse (o el dedo), como un DJ.
 */
export function SongScene({ theme, story, onInteract }: SceneProps) {
  const calm = useCalm()
  const disc = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(true)
  const [scratching, setScratching] = useState(false)
  const spin = useMotionValue(0)
  const progress = useMotionValue(0.18)
  const elapsed = useTransform(progress, (p) => formatTime(p * SONG_SECONDS))
  const width = useTransform(progress, (p) => `${p * 100}%`)
  const grab = useRef({ cx: 0, cy: 0, angle: 0 })
  const tint = `color-mix(in srgb, ${theme.color} 45%, #2a2433)`
  const label = theme.images[0]

  useAnimationFrame((_, delta) => {
    if (!playing || scratching) return
    if (!calm) spin.set(spin.get() + delta * 0.06)
    progress.set((progress.get() + delta / (SONG_SECONDS * 1000)) % 1)
  })

  const angleOf = (e: PointerEvent) =>
    (Math.atan2(e.clientY - grab.current.cy, e.clientX - grab.current.cx) * 180) / Math.PI

  const toggle = () => {
    onInteract()
    setPlaying((p) => !p)
  }

  return (
    <div
      className="absolute inset-0 flex flex-col items-center px-6 pt-[62px] pb-9 text-white"
      style={{ background: `radial-gradient(circle at 50% 30%, ${tint}, #1a191d 72%)` }}
    >
      <Eyebrow className="text-white/70">Su canción</Eyebrow>

      <div className="relative mt-7">
        <motion.div
          aria-hidden
          className="absolute -inset-7 rounded-full blur-2xl"
          style={{ background: theme.color }}
          animate={{ opacity: playing ? 0.55 : 0.18, scale: playing ? 1 : 0.85 }}
          transition={spring.soft}
        />
        <motion.div
          {...interactive}
          ref={disc}
          role="img"
          aria-label="Vinilo: se puede girar"
          className="pointer-events-auto relative grid size-[172px] cursor-grab place-items-center rounded-full bg-[repeating-radial-gradient(circle,#1a191d_0_2px,#2c2a31_2px_4px)] shadow-[0_22px_50px_rgba(0,0,0,0.55)] active:cursor-grabbing"
          style={{ rotate: spin, touchAction: 'pan-y' }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={spring.gentle}
          whileHover={{ scale: 1.03 }}
          onPanStart={(e) => {
            const r = disc.current!.getBoundingClientRect()
            grab.current = { cx: r.left + r.width / 2, cy: r.top + r.height / 2, angle: 0 }
            grab.current.angle = angleOf(e)
            setScratching(true)
            onInteract()
          }}
          onPan={(e) => {
            const angle = angleOf(e)
            let delta = angle - grab.current.angle
            if (delta > 180) delta -= 360
            if (delta < -180) delta += 360
            spin.set(spin.get() + delta)
            grab.current.angle = angle
          }}
          onPanEnd={() => setScratching(false)}
        >
          <div className="relative size-16 overflow-hidden rounded-full ring-4 ring-black/40">
            {label ? (
              <Image
                src={label}
                alt=""
                fill
                sizes="64px"
                draggable={false}
                className="pointer-events-none object-cover"
              />
            ) : (
              <div className="size-full" style={{ background: theme.color }} />
            )}
          </div>
          <span className="absolute size-2 rounded-full bg-night-deep" />
        </motion.div>
        {/* El brillo queda quieto mientras el disco gira. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full bg-[conic-gradient(from_30deg,transparent_0deg,rgba(255,255,255,0.13)_35deg,transparent_75deg,transparent_180deg,rgba(255,255,255,0.08)_215deg,transparent_255deg)]"
        />
        {/* El brazo de la bandeja: se apoya cuando suena. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-3 -right-6 h-[116px] w-10 drop-shadow-[0_4px_6px_rgba(0,0,0,0.4)]"
          style={{ transformOrigin: '30px 10px' }}
          initial={false}
          animate={{ rotate: playing && !scratching ? 20 : 2 }}
          transition={spring.soft}
        >
          <svg viewBox="0 0 40 116" className="size-full">
            <circle cx="30" cy="10" r="8" fill="#d9d4dc" />
            <circle cx="30" cy="10" r="3" fill="#8f8796" />
            <path
              d="M30 10 L27 84 L16 102"
              fill="none"
              stroke="#d9d4dc"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <rect
              x="9"
              y="98"
              width="12"
              height="9"
              rx="2"
              fill="#f2eef4"
              transform="rotate(35 15 102)"
            />
          </svg>
        </motion.div>
      </div>

      <motion.h3
        className="mt-7 font-fun text-2xl font-bold"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: ease.out, delay: 0.3 }}
      >
        {story.song.title}
      </motion.h3>
      <p className="mt-0.5 text-sm text-white/60">{story.song.artist}</p>

      <div className="mt-4 flex h-7 items-end gap-1" aria-hidden>
        {[0.9, 1.1, 0.8, 1.25, 1, 0.95, 1.15].map((d, i) => (
          <motion.span
            key={i}
            className="w-1.5 origin-bottom rounded-full"
            style={{ height: 28, background: theme.color }}
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
                : { transform: 'scaleY(0.2)' }
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
        <div className="mt-2.5 flex items-center justify-center gap-7">
          <SkipBack className="size-5 fill-current text-white/45" aria-hidden />
          <motion.button
            {...interactive}
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pausar' : 'Reproducir'}
            className="pointer-events-auto grid size-14 place-items-center rounded-full bg-white text-ink shadow-lg"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.86 }}
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
          <SkipForward className="size-5 fill-current text-white/45" aria-hidden />
        </div>
      </div>
    </div>
  )
}

// ── Trivia ─────────────────────────────────────────────────────────────────

/** Una pregunta de la trivia. Si nadie la toca, se contesta sola (con un dedo fantasma). */
export function TriviaScene({ theme, story, auto, onInteract }: SceneProps) {
  const calm = useCalm()
  const timers = useTimers()
  const { question, options, answer } = story.trivia
  const [picked, setPicked] = useState<number | null>(null)
  const [won, setWon] = useState(false)
  const [misses, setMisses] = useState(0)
  const [ghost, setGhost] = useState(false)

  const choose = (i: number) => {
    if (picked !== null || won) return
    setPicked(i)
    timers.at(850, () => {
      if (i === answer) setWon(true)
      else setMisses((m) => m + 1)
      setPicked(null)
    })
  }

  // Jugando sola: a los 2 s aparece el dedo y toca la correcta.
  useEffect(() => {
    if (!auto || calm) return
    const hint = setTimeout(() => setGhost(true), 2000)
    const tap = setTimeout(() => {
      setGhost(false)
      choose(answer)
    }, 2750)
    return () => {
      clearTimeout(hint)
      clearTimeout(tap)
      setGhost(false)
    }
    // Solo cuando cambia el modo: `choose` no cambia lo que hace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, calm, answer])

  return (
    <div
      className="absolute inset-0 overflow-hidden px-5 pt-[62px] pb-8 text-ink"
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${theme.color} 18%, #fff), color-mix(in srgb, ${theme.color} 55%, #c893d7))`,
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {won ? (
          <motion.div
            key="premio"
            className="flex h-full flex-col items-center justify-center pb-6 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={spring.bouncy}
          >
            <ConfettiBurst count={36} seed={11} className="top-1/3" />
            <motion.span
              aria-hidden
              className="block"
              initial={{ scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ ...spring.bouncy, delay: 0.1 }}
            >
              <Icon name="trofeo" size={84} />
            </motion.span>
            <h3 className="mt-4 font-fun text-3xl font-bold">¡Acertaste!</h3>
            <p className="mt-2 text-sm font-medium text-ink/75">
              Vas 1 de 3 para desbloquear tu premio
            </p>
            <div className="mt-4 flex gap-1.5" aria-hidden>
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-2 rounded-full bg-white"
                  initial={{ width: 8, opacity: 0.5 }}
                  animate={{ width: i === 0 ? 26 : 8, opacity: i === 0 ? 1 : 0.5 }}
                  transition={{ ...spring.bouncy, delay: 0.35 }}
                />
              ))}
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
              className="mx-auto mt-3 w-fit"
              animate={calm ? undefined : { rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Icon name="pensar" size={56} />
            </motion.div>
            <motion.div
              className="mt-3 rounded-2xl bg-white/90 p-4 text-center shadow-lg"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.15 }}
            >
              <h3 className="font-fun text-xl leading-tight font-bold">{question}</h3>
            </motion.div>
            <div className="mt-4 space-y-2.5">
              {options.map((option, i) => {
                const chosen = picked === i
                const right = chosen && i === answer
                const wrong = chosen && i !== answer
                return (
                  <motion.button
                    key={option}
                    {...interactive}
                    type="button"
                    onClick={() => {
                      onInteract()
                      choose(i)
                    }}
                    className={cn(
                      'pointer-events-auto relative flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left font-fun text-[0.95rem] font-semibold shadow-md transition-colors duration-200',
                      right
                        ? 'bg-green-500 text-white'
                        : wrong
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-ink hover:bg-white/85',
                    )}
                    initial={{ opacity: 0, x: 30 }}
                    animate={wrong ? { opacity: 1, x: [0, -9, 9, -6, 6, 0] } : { opacity: 1, x: 0 }}
                    transition={
                      wrong ? { duration: 0.45 } : { ...spring.soft, delay: 0.25 + i * 0.08 }
                    }
                    whileHover={picked === null ? { scale: 1.03 } : undefined}
                    whileTap={picked === null ? { scale: 0.96 } : undefined}
                  >
                    <span>
                      <EmojiText text={option} />
                    </span>
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
                    <AnimatePresence>
                      {ghost && i === answer && <TapHint className="top-1/2 right-10 -mt-[18px]" />}
                    </AnimatePresence>
                  </motion.button>
                )
              })}
            </div>
            <p
              className="mt-auto min-h-5 text-center text-xs font-semibold text-ink/70"
              aria-live="polite"
            >
              <EmojiText text={misses > 0 ? 'Casi 😅 ¡probá otra!' : 'Tocá una respuesta'} />
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Sorpresa ───────────────────────────────────────────────────────────────

/**
 * El cierre: una caja de regalo que se abre (se sacude con el mouse encima)
 * y deja ver el regalo que eligió quien la armó.
 */
export function SurpriseScene({ theme, story, auto, onInteract, onRestart }: SceneProps) {
  const calm = useCalm()
  const [open, setOpen] = useState(false)
  const [ghost, setGhost] = useState(false)
  const { surprise } = story
  const ribbon = `color-mix(in srgb, ${theme.color} 85%, #2a2433)`

  useEffect(() => {
    if (!auto || calm || open) return
    const hint = setTimeout(() => setGhost(true), 1300)
    const tap = setTimeout(() => {
      setGhost(false)
      setOpen(true)
    }, 2050)
    return () => {
      clearTimeout(hint)
      clearTimeout(tap)
      setGhost(false)
    }
  }, [auto, calm, open])

  return (
    <div className="absolute inset-0 flex flex-col items-center overflow-hidden px-5 pt-[62px] pb-8 text-white">
      <div className="absolute inset-0" style={{ background: themeGradient(theme.color) }} />
      {/* Rayos de sol que giran detrás de la caja. */}
      <motion.div
        aria-hidden
        className="absolute top-1/2 left-1/2 size-[640px] -translate-x-1/2 -translate-y-[58%] [mask-image:radial-gradient(circle,#000_10%,transparent_60%)]"
        animate={{ opacity: open ? 0.9 : 0.45 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="size-full bg-[repeating-conic-gradient(from_0deg,rgba(255,255,255,0.16)_0deg_9deg,transparent_9deg_18deg)]"
          animate={calm ? undefined : { transform: ['rotate(0deg)', 'rotate(360deg)'] }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        />
      </motion.div>

      <Eyebrow className="relative text-white/80">Tu premio</Eyebrow>
      <h3 className="relative mt-1 h-8 w-full text-center font-fun text-2xl font-bold">
        <Swap id={open ? 'abierto' : 'cerrado'}>{open ? '¡Sorpresa!' : 'Abrí tu regalo'}</Swap>
      </h3>

      <div className="relative mt-4 grid h-[250px] w-full place-items-center">
        {open && <ConfettiBurst count={48} seed={5} className="top-1/3" />}

        <AnimatePresence>
          {open && (
            <motion.div
              key="ticket"
              className="absolute z-10 w-[212px] overflow-hidden rounded-2xl bg-white text-center text-ink shadow-[0_24px_50px_-10px_rgba(0,0,0,0.45)]"
              initial={{ opacity: 0, y: 70, scale: 0.5, rotate: -8 }}
              animate={{ opacity: 1, y: -8, scale: 1, rotate: -3 }}
              transition={{ ...spring.bouncy, delay: 0.35 }}
            >
              <div className="px-4 pt-4 pb-3">
                <motion.span
                  aria-hidden
                  className="block w-fit"
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...spring.bouncy, delay: 0.7 }}
                >
                  <Emoji value={surprise.emoji} size={52} />
                </motion.span>
                <p className="mt-2 font-fun text-lg leading-tight font-bold">{surprise.title}</p>
                <p className="mt-1 text-xs text-ink/60">{surprise.detail}</p>
              </div>
              <div className="relative border-t-2 border-dashed border-ink/15 py-2 text-[0.6rem] font-extrabold tracking-[0.2em] text-ink/45 uppercase">
                <span className="absolute top-0 -left-2 size-4 -translate-y-1/2 rounded-full bg-black/25" />
                <span className="absolute top-0 -right-2 size-4 -translate-y-1/2 rounded-full bg-black/25" />
                <span className="inline-flex items-center gap-1">
                  Vale por siempre <Icon name="infinito" size={16} />
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          {...interactive}
          type="button"
          onClick={() => {
            if (open) return
            onInteract()
            setGhost(false)
            setOpen(true)
          }}
          aria-label="Abrir el regalo"
          disabled={open}
          className="pointer-events-auto relative mt-10 h-[150px] w-[150px] cursor-pointer disabled:cursor-default"
          initial="rest"
          animate={open ? 'open' : 'rest'}
          whileHover={open ? undefined : 'hover'}
          whileTap={open ? undefined : 'press'}
        >
          {/* La caja */}
          <motion.span
            className="absolute inset-x-3 bottom-0 h-[96px] rounded-t-md rounded-b-2xl bg-white shadow-[0_20px_40px_-10px_rgba(0,0,0,0.4)]"
            variants={{
              rest: { y: 0, rotate: 0, opacity: 1, scale: 1 },
              hover: { rotate: [0, -4, 4, -3, 3, 0], transition: { duration: 0.6 } },
              press: { scale: 0.94 },
              open: {
                y: 60,
                opacity: 0,
                scale: 0.8,
                transition: { duration: 0.6, ease: ease.in, delay: 0.25 },
              },
            }}
          >
            <span
              className="absolute inset-y-0 left-1/2 w-5 -translate-x-1/2"
              style={{ background: ribbon }}
            />
            <span className="absolute inset-x-0 top-0 h-3 rounded-t-md bg-black/5" />
          </motion.span>
          {/* La tapa, con el moño */}
          <motion.span
            className="absolute inset-x-0 bottom-[88px] h-[34px]"
            variants={{
              rest: { y: 0, x: 0, rotate: 0, opacity: 1 },
              hover: { y: -10, rotate: -5, transition: spring.snappy },
              press: { y: -4 },
              open: {
                y: -190,
                x: 70,
                rotate: 38,
                opacity: 0,
                transition: { duration: 0.7, ease: ease.out },
              },
            }}
          >
            <span className="absolute inset-0 rounded-lg bg-white shadow-[0_6px_14px_rgba(0,0,0,0.18)]" />
            <span
              className="absolute inset-y-0 left-1/2 w-5 -translate-x-1/2"
              style={{ background: ribbon }}
            />
            <svg
              aria-hidden
              viewBox="0 0 64 34"
              className="absolute -top-[26px] left-1/2 w-16 -translate-x-1/2 drop-shadow-[0_3px_4px_rgba(0,0,0,0.15)]"
              style={{ fill: ribbon }}
            >
              <g stroke="#fff" strokeWidth="2.5" strokeLinejoin="round">
                <path d="M32 27C22 8 6 3 5 16c-1 10 14 13 27 11Z" />
                <path d="M32 27C42 8 58 3 59 16c1 10-14 13-27 11Z" />
              </g>
              <path d="M31 22 15 16c-2 4 1 8 16 9Z" fill="rgba(0,0,0,0.12)" />
              <path d="m33 22 16-6c2 4-1 8-16 9Z" fill="rgba(0,0,0,0.12)" />
              <circle cx="32" cy="26" r="6" />
            </svg>
          </motion.span>
          <AnimatePresence>{ghost && <TapHint className="top-[62%] left-[58%]" />}</AnimatePresence>
        </motion.button>
      </div>

      <div className="relative mt-auto flex h-20 flex-col items-center justify-end gap-3">
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div
              key="fin"
              className="flex flex-col items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: ease.out, delay: 1.1 }}
            >
              <p className="text-lg" style={MARKER}>
                <EmojiText text="Con amor, vos 💖" />
              </p>
              <motion.button
                {...interactive}
                type="button"
                onClick={onRestart}
                className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1.5 text-xs font-bold ring-1 ring-white/35 backdrop-blur-sm"
                whileHover={{ scale: 1.06, backgroundColor: 'rgba(255,255,255,0.3)' }}
                whileTap={{ scale: 0.92 }}
                transition={spring.snappy}
              >
                <motion.span
                  aria-hidden
                  className="block"
                  whileHover={{ rotate: -300 }}
                  transition={spring.gentle}
                >
                  <RotateCcw className="size-3.5" />
                </motion.span>
                Ver de nuevo
              </motion.button>
            </motion.div>
          ) : (
            <motion.p
              key="toca"
              className="text-xs font-semibold text-white/85"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <EmojiText text="Tocá la caja 🎁" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
