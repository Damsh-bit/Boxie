'use client'

import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion'
import Image from 'next/image'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { cn } from '@/ui/cn'
import { Float, ease, spring, useCalm } from '@/ui/motion'
import {
  CoverScene,
  LetterScene,
  PhotosScene,
  SongScene,
  SurpriseScene,
  TriviaScene,
  type SceneProps,
} from './hero-scenes'
import { PhoneFrame, useMouseParallax, useTilt } from './primitives'
import { lookOf, type HomeTheme } from './theme-look'

/** Las pantallas de la Boxie de muestra, en orden, y cuánto dura cada una. */
const SCENES = [
  { id: 'portada', label: 'Portada', emoji: '🎁', seconds: 4.2, light: false },
  { id: 'fotos', label: 'Fotos', emoji: '📸', seconds: 4.8, light: false },
  { id: 'dedicatoria', label: 'Dedicatoria', emoji: '💌', seconds: 6.2, light: true },
  { id: 'cancion', label: 'Su canción', emoji: '🎵', seconds: 5.2, light: false },
  { id: 'trivia', label: 'Trivia', emoji: '🧠', seconds: 6.4, light: true },
  { id: 'sorpresa', label: 'Sorpresa', emoji: '🎉', seconds: 6.8, light: false },
] as const

type SceneId = (typeof SCENES)[number]['id']

// Las etiquetas apenas pisan el borde del celular para no tapar la pantalla
// (entre lg y xl la columna es angosta: ahí son más chicas para no cortarse).
const LEFT = 'right-[calc(100%-18px)]'
const RIGHT = 'left-[calc(100%-18px)]'

/** Dónde flota cada etiqueta alrededor del celular y cuánto la corre el mouse. */
const CHIPS: { scene: SceneId; className: string; depth: number; float: number; delay: number }[] =
  [
    { scene: 'fotos', className: `${LEFT} top-[12%]`, depth: 16, float: 6, delay: 0.9 },
    { scene: 'dedicatoria', className: `${RIGHT} top-[27%]`, depth: -12, float: 7, delay: 1 },
    { scene: 'cancion', className: `${LEFT} top-[45%]`, depth: 20, float: 5.5, delay: 1.1 },
    { scene: 'trivia', className: `${RIGHT} top-[61%]`, depth: -16, float: 6.5, delay: 1.2 },
    { scene: 'sorpresa', className: `${LEFT} top-[78%]`, depth: 12, float: 6, delay: 1.3 },
  ]

/** Segundos sin tocar nada para que la Boxie vuelva a pasar sola. */
const RESUME_SECONDS = 9

/** La parte de la izquierda de la pantalla que vuelve atrás (como en las historias). */
const BACK_ZONE = 0.3

/**
 * Ancho (px) con el que se diseñaron las pantallas. En los celulares más
 * chicos se achica todo junto (`--s`), así se ve igual en cualquier tamaño.
 */
const CANVAS = 286

/** Hacia dónde salen las chispas de un toque. */
const SPARKS = [
  [0, -34],
  [28, -20],
  [30, 14],
  [0, 32],
  [-30, 14],
  [-28, -20],
] as const

type Hint = 'open' | 'next' | 'back' | 'again' | 'paused'

const HINTS: Record<Hint, string> = {
  open: 'Abrir 🎁',
  next: 'Seguir ›',
  back: '‹ Volver',
  again: 'De nuevo ↺',
  paused: '⏸ En pausa',
}

const slide = {
  enter: (dir: number) => ({
    x: dir === 0 ? '0%' : `${dir * 38}%`,
    opacity: 0,
    scale: dir === 0 ? 1.04 : 0.96,
  }),
  center: { x: '0%', opacity: 1, scale: 1, transition: { duration: 0.55, ease: ease.out } },
  exit: (dir: number) => ({
    x: dir === 0 ? '0%' : `${dir * -26}%`,
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.4, ease: ease.out },
  }),
}

/**
 * Una Boxie de muestra que se abre en el celular de la portada. Pasa sola
 * como una historia (portada con el nombre, fotos, dedicatoria, canción,
 * trivia y el regalo del final) y se puede tocar: la izquierda vuelve, la
 * derecha sigue, mantener apretado pausa y los juegos se juegan de verdad.
 * Lo que se elige en el armador (temática y nombre) vuelve a la portada para
 * mostrarlo. Las etiquetas de alrededor llevan a cada pantalla.
 */
export function HeroPreview({ theme, name }: { theme: HomeTheme; name: string }) {
  const calm = useCalm()
  const look = lookOf(theme.slug)
  const typed = name.trim()
  const phone = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const inView = useInView(phone, { amount: 0.35 })
  const tilt = useTilt(7)
  const mouse = useMouseParallax()

  // La pantalla que se ve y de qué lado entró (1 adelante, -1 atrás, 0 sin deslizar).
  const signature = `${theme.slug}|${typed}`
  const [view, setView] = useState({ index: 0, dir: 0, signature })
  const [auto, setAuto] = useState(true)
  const [touches, setTouches] = useState(0)
  const [held, setHeld] = useState(false)
  const [nameIndex, setNameIndex] = useState(0)
  // De qué lado del celular está el mouse (null: afuera o sobre algo que se toca).
  const [zone, setZone] = useState<'back' | 'forward' | null>(null)
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number }[]>([])
  const [warm, setWarm] = useState(false)
  const progress = useMotionValue(0)

  // Cambiaron la temática o el nombre en el armador: vuelve a la portada para mostrarlo.
  if (view.signature !== signature) {
    setView({ index: 0, dir: 0, signature })
    setAuto(true)
  }
  const { index, dir } = view
  const scene = SCENES[index]!
  const last = SCENES.length - 1
  const running = auto && !held && inView && !calm

  const go = (next: number) => {
    setView((v) => ({
      ...v,
      index: (next + SCENES.length) % SCENES.length,
      dir: next > v.index ? 1 : -1,
    }))
  }
  const touch = () => {
    setAuto(false)
    setTouches((n) => n + 1)
  }

  // Cada pantalla (o cada cambio en el armador) arranca con la barrita vacía.
  useEffect(() => {
    progress.set(0)
  }, [index, signature, progress])

  // Pasa sola: la barrita de la pantalla se llena y sigue con la próxima.
  useEffect(() => {
    if (!running) return
    const controls = animate(progress, 1, {
      duration: scene.seconds * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => setView((v) => ({ ...v, index: (v.index + 1) % SCENES.length, dir: 1 })),
    })
    return () => controls.stop()
  }, [running, index, signature, scene.seconds, progress])

  // Si la tocaron y la dejaron, al rato vuelve a pasar sola.
  useEffect(() => {
    if (auto || calm) return
    const timer = setTimeout(() => setAuto(true), RESUME_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [auto, calm, touches])

  // Sin nombre escrito, en la portada van pasando los de ejemplo.
  useEffect(() => {
    if (calm || typed || index !== 0) return
    const timer = setInterval(() => setNameIndex((i) => i + 1), 2600)
    return () => clearInterval(timer)
  }, [calm, typed, index])

  // Las fotos se piden un rato después de cargar (sin competir con la portada).
  useEffect(() => {
    const timer = setTimeout(() => setWarm(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  // ── Mouse y toques ──────────────────────────────────────────────────────

  // Dónde está el mouse sobre el celular (las capas de cada pantalla se corren con él).
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const pointerX = useSpring(px, { stiffness: 140, damping: 20 })
  const pointerY = useSpring(py, { stiffness: 140, damping: 20 })
  const pointer = { x: pointerX, y: pointerY }
  // El celular entero se corre un poco al revés que las etiquetas.
  const driftX = useTransform(mouse.x, (v) => v * -10)
  const driftY = useTransform(mouse.y, (v) => v * -8)
  // La etiqueta que sigue al mouse y dice qué hace el toque.
  const cursorX = useSpring(0, { stiffness: 600, damping: 40 })
  const cursorY = useSpring(0, { stiffness: 600, damping: 40 })
  const hold = useRef<{ timer?: ReturnType<typeof setTimeout>; held: boolean }>({ held: false })
  const sparkId = useRef(0)
  useEffect(() => () => clearTimeout(hold.current.timer), [])

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    tilt.handlers.onPointerMove(e)
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    if (!calm) {
      px.set(x - 0.5)
      py.set((e.clientY - r.top) / r.height - 0.5)
    }
    // Recién aparece: salta al mouse en vez de venir volando desde la esquina.
    const move = zone ? 'set' : 'jump'
    cursorX[move](e.clientX - r.left)
    cursorY[move](e.clientY - r.top)
    const onControl = (e.target as Element | null)?.closest?.('[data-hero-interactive]')
    setZone(onControl ? null : x < BACK_ZONE ? 'back' : 'forward')
  }
  const onPointerLeave = () => {
    tilt.handlers.onPointerLeave()
    px.set(0)
    py.set(0)
    setZone(null)
    release()
  }

  const press = () => {
    clearTimeout(hold.current.timer)
    hold.current.held = false
    hold.current.timer = setTimeout(() => {
      hold.current.held = true
      setHeld(true)
    }, 260)
  }
  const release = () => {
    clearTimeout(hold.current.timer)
    setHeld(false)
  }

  /** Chispas donde se tocó, con lo que flota en la temática. */
  const spark = (e: MouseEvent) => {
    const el = canvas.current
    if (!el || calm || e.detail === 0) return
    const r = el.getBoundingClientRect()
    const scale = r.width / CANVAS
    const id = ++sparkId.current
    setSparks((s) => [
      ...s.slice(-3),
      { id, x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale },
    ])
    setTimeout(() => setSparks((s) => s.filter((p) => p.id !== id)), 800)
  }

  const tap = (e: MouseEvent<HTMLButtonElement>, step: 1 | -1) => {
    // Soltar después de mantener apretado solo despausa.
    if (hold.current.held) {
      hold.current.held = false
      return
    }
    spark(e)
    touch()
    go(index + step)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    touch()
    go(index + (e.key === 'ArrowRight' ? 1 : -1))
  }

  const example = look.names[nameIndex % look.names.length]!
  const props: SceneProps = {
    theme,
    story: look.story,
    name: typed || example,
    auto: running,
    pointer,
    onInteract: touch,
    onRestart: () => {
      touch()
      go(0)
    },
  }
  // Lo que dice la etiqueta del mouse depende de la pantalla que se ve ahora.
  const shownHint: Hint | null = held
    ? 'paused'
    : !zone
      ? null
      : index === 0
        ? 'open'
        : zone === 'back'
          ? 'back'
          : index === last
            ? 'again'
            : 'next'

  return (
    <motion.div
      ref={phone}
      className="relative mx-auto w-[240px] [--s:0.7902] sm:w-[270px] sm:[--s:0.8951] lg:w-[300px] lg:[--s:1]"
      initial={{ opacity: 0, y: 70, rotate: 8 }}
      animate={{ opacity: 1, y: 0, rotate: 3 }}
      transition={{ ...spring.gentle, delay: 0.25 }}
    >
      <motion.div style={{ x: driftX, y: driftY }}>
        <Float distance={12} rotate={-1.5} duration={7}>
          <motion.div
            className="relative"
            style={tilt.style}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
          >
            <PhoneFrame>
              <div
                role="region"
                aria-roledescription="vista previa"
                aria-label={`Boxie de muestra para ${typed || example}`}
                onKeyDown={onKeyDown}
                ref={canvas}
                className="absolute top-0 left-0 w-[286px] origin-top-left select-none [-webkit-touch-callout:none]"
                style={{ transform: 'scale(var(--s))', height: 'calc(100% / var(--s))' }}
              >
                {warm && (
                  <div aria-hidden className="invisible absolute inset-0 -z-10">
                    {theme.images.slice(0, 2).map((src, i) => (
                      <Image
                        key={src}
                        src={src}
                        alt=""
                        fill
                        sizes={i === 0 ? '320px' : '120px'}
                        loading="eager"
                      />
                    ))}
                  </div>
                )}

                {/* Los toques: la izquierda vuelve, el resto sigue (en la portada, todo abre). */}
                <div className="absolute inset-0 flex">
                  {(
                    [
                      [index === 0 ? 1 : -1, index === 0 ? 'Abrir la Boxie' : 'Pantalla anterior'],
                      [
                        1,
                        index === 0
                          ? 'Abrir la Boxie'
                          : index === last
                            ? 'Ver de nuevo'
                            : 'Pantalla siguiente',
                      ],
                    ] as const
                  ).map(([step, label], i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={label}
                      className={cn(
                        'h-full cursor-pointer outline-none focus-visible:bg-white/10',
                        i === 0 ? 'w-[30%]' : 'flex-1',
                      )}
                      onPointerDown={press}
                      onPointerUp={release}
                      onPointerCancel={release}
                      onContextMenu={(e) => e.preventDefault()}
                      onClick={(e) => tap(e, step)}
                    />
                  ))}
                </div>

                <div className="pointer-events-none absolute inset-0 z-10">
                  <AnimatePresence initial={false} custom={dir}>
                    <motion.div
                      key={scene.id}
                      className="absolute inset-0"
                      custom={dir}
                      variants={slide}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      {scene.id === 'portada' ? (
                        <CoverScene
                          theme={theme}
                          typed={typed}
                          example={example}
                          pointer={pointer}
                        />
                      ) : (
                        <Scene id={scene.id} {...props} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="pointer-events-none absolute inset-x-3 top-8 z-20 flex gap-[3px]">
                  {SCENES.map((s, i) => (
                    <span
                      key={s.id}
                      className={cn(
                        'h-[3px] flex-1 overflow-hidden rounded-full transition-colors duration-500',
                        scene.light ? 'bg-ink/15' : 'bg-white/35',
                      )}
                    >
                      <Fill
                        progress={progress}
                        state={i < index ? 'done' : i === index ? 'current' : 'next'}
                        className={scene.light ? 'bg-ink/75' : 'bg-white'}
                      />
                    </span>
                  ))}
                </div>

                {sparks.map((s) => (
                  <span
                    key={s.id}
                    aria-hidden
                    className="pointer-events-none absolute z-30"
                    style={{ left: s.x, top: s.y }}
                  >
                    <motion.span
                      className="absolute -top-5 -left-5 size-10 rounded-full border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.6)]"
                      initial={{ scale: 0.2, opacity: 0.9 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.5, ease: ease.out }}
                    />
                    {SPARKS.map(([x, y], i) => (
                      <motion.span
                        key={i}
                        className="absolute -top-2 -left-1.5 text-sm [text-shadow:0_1px_4px_rgba(0,0,0,0.25)]"
                        style={{ color: i % 2 ? '#fff' : theme.color }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
                        animate={{ x, y, opacity: 0, scale: 1.15 }}
                        transition={{ duration: 0.7, ease: ease.out }}
                      >
                        {look.particle}
                      </motion.span>
                    ))}
                  </span>
                ))}

                <p className="sr-only" aria-live="polite">
                  {auto ? '' : `Pantalla ${index + 1} de ${SCENES.length}: ${scene.label}`}
                </p>
              </div>

              <motion.div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-30 mix-blend-soft-light"
                style={{ background: tilt.glare }}
              />
            </PhoneFrame>

            <AnimatePresence>
              {shownHint && (
                <motion.span
                  key="cursor"
                  aria-hidden
                  className="pointer-events-none absolute top-0 left-0 z-50"
                  style={{ x: cursorX, y: cursorY }}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={spring.snappy}
                >
                  <span className="mt-4 ml-4 block rounded-full bg-ink/85 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(42,36,51,0.3)] backdrop-blur">
                    {HINTS[shownHint]}
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </Float>
      </motion.div>

      {CHIPS.map((chip) => {
        const i = SCENES.findIndex((s) => s.id === chip.scene)
        const s = SCENES[i]!
        return (
          <Chip
            key={chip.scene}
            {...chip}
            label={`${s.emoji} ${s.label}`}
            active={i === index}
            mouse={mouse}
            onSelect={() => {
              touch()
              go(i)
            }}
          />
        )
      })}
    </motion.div>
  )
}

function Scene({ id, ...props }: SceneProps & { id: Exclude<SceneId, 'portada'> }) {
  switch (id) {
    case 'fotos':
      return <PhotosScene {...props} />
    case 'dedicatoria':
      return <LetterScene {...props} />
    case 'cancion':
      return <SongScene {...props} />
    case 'trivia':
      return <TriviaScene {...props} />
    case 'sorpresa':
      return <SurpriseScene {...props} />
  }
}

/** El relleno de un segmento de la barrita de arriba. */
function Fill({
  progress,
  state,
  className,
}: {
  progress: MotionValue<number>
  state: 'done' | 'current' | 'next'
  className: string
}) {
  // La actual sigue a la barrita (con "reducir movimiento" no avanza sola y queda vacía).
  const scaleX = state === 'current' ? progress : state === 'next' ? 0 : 1
  return (
    <motion.span
      className={cn(
        'block h-full origin-left rounded-full transition-colors duration-500',
        className,
      )}
      style={{ scaleX }}
    />
  )
}

/**
 * Una etiqueta que flota al lado del celular y lleva a esa pantalla. Se
 * corre con el mouse (cada una a su profundidad) y se prende cuando su
 * pantalla está a la vista.
 */
function Chip({
  label,
  className,
  depth,
  float,
  delay,
  active,
  mouse,
  onSelect,
}: {
  label: string
  className: string
  depth: number
  float: number
  delay: number
  active: boolean
  mouse: { x: MotionValue<number>; y: MotionValue<number> }
  onSelect(): void
}) {
  const calm = useCalm()
  const x = useTransform(mouse.x, (v) => v * depth)
  const y = useTransform(mouse.y, (v) => v * depth * 0.6)
  return (
    <motion.div
      className={cn('absolute z-10 hidden sm:block', className)}
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring.bouncy, delay }}
    >
      <motion.button
        type="button"
        onClick={onSelect}
        aria-pressed={active}
        className={cn(
          'block cursor-pointer rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-[background-color,color,box-shadow] duration-300 lg:px-3 lg:py-1.5 lg:text-xs xl:px-3.5 xl:py-2 xl:text-sm',
          active
            ? 'bg-brand text-white shadow-[0_14px_30px_rgba(244,78,99,0.45)]'
            : 'bg-white text-ink shadow-[0_12px_30px_rgba(42,36,51,0.15)] hover:bg-brand-soft',
        )}
        animate={{ scale: active ? 1.1 : 1 }}
        whileHover={{ scale: active ? 1.14 : 1.08, rotate: -3 }}
        whileTap={{ scale: 0.92 }}
        transition={spring.snappy}
      >
        <motion.span
          className="block"
          animate={
            calm
              ? undefined
              : { transform: ['translateY(0px)', 'translateY(-8px)', 'translateY(0px)'] }
          }
          transition={{ duration: float, repeat: Infinity, ease: 'easeInOut' }}
        >
          {label}
        </motion.span>
      </motion.button>
    </motion.div>
  )
}
