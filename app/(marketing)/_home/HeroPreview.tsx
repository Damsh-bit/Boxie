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
import { ArrowRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import type { Occasion } from '@/content/home'
import { themeDetail } from '@/content/social-proof'
import { isFresh, timeAgo, type PurchaseEvent } from '@/domain/social-proof'
import type { Showcase, ShowcaseSlide, ShowcaseTheme } from '@/slides/showcase'
import { cn } from '@/ui/cn'
import { Emoji, EmojiText } from '@/ui/Icon'
import { SLIDE_SPRING } from '@/slides/player/motion'
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
import { avatarGradient, lookOf, type HomeTheme } from './theme-look'

/**
 * Las pantallas de verdad se cargan aparte (registro de pantallas y sus
 * estilos): mientras tanto se ve la portada, que no las necesita.
 */
const loadReel = () => import('./HeroReel')
const HeroReel = dynamic(() => loadReel().then((m) => m.HeroReel), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(170deg,#ff8a9a,#f44e63)]">
      <span className="size-10 animate-pulse rounded-full bg-white/40" />
    </div>
  ),
})

/** Una pantalla de la Ribbly que pasa en el celular. */
interface BaseItem {
  id: string
  /** Cómo se llama (lo anuncia el lector de pantalla al pasarla a mano). */
  label: string
  /** Cuánto dura cuando pasa sola. */
  seconds: number
  /** Fondo claro: la barrita de arriba va oscura. */
  light: boolean
}

type HandmadeScene = 'fotos' | 'dedicatoria' | 'cancion' | 'trivia' | 'sorpresa'

type Item = BaseItem &
  (
    | { type: 'cover' }
    | { type: 'scene'; scene: HandmadeScene }
    | { type: 'real'; theme: ShowcaseTheme; slide: ShowcaseSlide }
  )

/** La portada de la Ribbly de muestra: la temática y el nombre del armador. */
const COVER: Item = {
  type: 'cover',
  id: 'portada',
  label: 'Portada',
  seconds: 4.2,
  light: false,
}

/**
 * Las pantallas dibujadas a mano para la portada: quedan por si una temática
 * no tiene ninguna pantalla para la vidriera (src/slides/showcase.ts).
 */
const HANDMADE: Item[] = [
  COVER,
  {
    type: 'scene',
    scene: 'fotos',
    id: 'fotos',
    label: 'Fotos',
    seconds: 4.8,
    light: false,
  },
  {
    type: 'scene',
    scene: 'dedicatoria',
    id: 'dedicatoria',
    label: 'Dedicatoria',
    seconds: 6.2,
    light: true,
  },
  {
    type: 'scene',
    scene: 'cancion',
    id: 'cancion',
    label: 'Su canción',
    seconds: 5.2,
    light: false,
  },
  {
    type: 'scene',
    scene: 'trivia',
    id: 'trivia',
    label: 'Trivia',
    seconds: 6.4,
    light: true,
  },
  {
    type: 'scene',
    scene: 'sorpresa',
    id: 'sorpresa',
    label: 'Sorpresa',
    seconds: 6.8,
    light: false,
  },
]

// Las etiquetas apenas pisan el borde del celular para no tapar la pantalla
// (entre lg y xl la columna es angosta: ahí son más chicas para no cortarse).
// Las de la derecha no entran entre el celular y el borde de la pantalla entre
// lg y xl: ahí quedan solo las de la izquierda.
const LEFT = 'right-[calc(100%-18px)] sm:block'
const RIGHT = 'left-[calc(100%-18px)] sm:block lg:hidden xl:block'

/** Dónde flotan las etiquetas alrededor del celular (de arriba abajo) y cuánto las corre el mouse. */
const CHIP_SPOTS: { className: string; depth: number; float: number; delay: number }[] = [
  { className: `${LEFT} top-[12%]`, depth: 16, float: 6, delay: 0.9 },
  { className: `${RIGHT} top-[27%]`, depth: -12, float: 7, delay: 1 },
  { className: `${LEFT} top-[45%]`, depth: 20, float: 5.5, delay: 1.1 },
  { className: `${RIGHT} top-[61%]`, depth: -16, float: 6.5, delay: 1.2 },
  { className: `${LEFT} top-[78%]`, depth: 12, float: 6, delay: 1.3 },
]

/** Segundos sin tocar nada para que la Ribbly vuelva a pasar sola. */
const RESUME_SECONDS = 9

/** La parte de la izquierda de la pantalla que vuelve atrás (como en las historias). */
const BACK_ZONE = 0.3

/**
 * Ancho (px) con el que se diseñaron las pantallas. En los celulares más
 * chicos se achica todo junto (`--s`), así se ve igual en cualquier tamaño.
 */
const CANVAS = 286

/** Lo que se toca dentro de una pantalla (no pasa ni vuelve: se juega). */
const CONTROL =
  '[data-hero-interactive], [data-hero-reel] :is(button, a, input, textarea, select, label, [role="button"])'

/** Las flechas: abajo y a la derecha siguen, arriba y a la izquierda vuelven. */
const STEP_KEYS: Record<string, 1 | -1> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
}

/** Hacia dónde salen las chispas de un toque. */
const SPARKS = [
  [0, -34],
  [28, -20],
  [30, 14],
  [0, 32],
  [-30, 14],
  [-28, -20],
] as const

type Hint = 'open' | 'next' | 'back' | 'again' | 'paused' | 'play'

const HINTS: Record<Hint, string> = {
  open: 'Abrir 🎁',
  next: 'Seguir ↓',
  back: '↑ Volver',
  again: 'De nuevo ↺',
  paused: 'En pausa',
  play: 'Tocá 👆',
}

/** El resorte del maquetador, y el lugar en el mazo (arriba o abajo) sin animarse. */
const DECK = { default: SLIDE_SPRING, zIndex: { duration: 0 } }

/**
 * Como en el maquetador: la pantalla que sigue sube desde abajo tapando a la
 * actual, que se achica y se oscurece atrás; al volver, la de adelante baja y
 * deja ver la anterior. Sin dirección (cambió el armador), aparece.
 */
const deck = {
  enter: (dir: number) =>
    dir > 0
      ? { y: '100%', scale: 1, opacity: 1, filter: 'brightness(1)', borderRadius: 30, zIndex: 2 }
      : dir < 0
        ? {
            y: '-28%',
            scale: 0.9,
            opacity: 1,
            filter: 'brightness(0.5)',
            borderRadius: 30,
            zIndex: 1,
          }
        : { y: '0%', scale: 1.03, opacity: 0, filter: 'brightness(1)', borderRadius: 0, zIndex: 2 },
  center: {
    y: '0%',
    scale: 1,
    opacity: 1,
    filter: 'brightness(1)',
    borderRadius: 0,
    transition: DECK,
  },
  exit: (dir: number) =>
    dir > 0
      ? {
          y: '-28%',
          scale: 0.9,
          filter: 'brightness(0.5)',
          borderRadius: 30,
          zIndex: 1,
          transition: DECK,
        }
      : dir < 0
        ? { y: '100%', borderRadius: 30, zIndex: 2, transition: DECK }
        : { opacity: 0, zIndex: 1, transition: { duration: 0.35, ease: ease.out } },
}

/** Las pantallas que pasan: la portada y las de la vidriera (o las dibujadas a mano). */
function itemsOf(showcase: Showcase | null, slug: string, mix: boolean): Item[] {
  if (!showcase) return HANDMADE
  const byslug = new Map(showcase.themes.map((t) => [t.slug, t]))
  const picked =
    mix && showcase.mix.length
      ? showcase.mix.flatMap(({ theme, index }) => {
          const source = byslug.get(theme)
          const slide = source?.slides[index]
          return source && slide ? [{ theme: source, slide }] : []
        })
      : (byslug.get(slug)?.slides.map((slide) => ({ theme: byslug.get(slug)!, slide })) ?? [])
  if (!picked.length) return HANDMADE
  return [
    COVER,
    ...picked.map(({ theme, slide }): Item => ({
      type: 'real',
      id: slide.id,
      label: slide.label,
      seconds: slide.seconds,
      light: slide.light,
      theme,
      slide,
    })),
  ]
}

/** Dónde va la compra reciente (a la derecha, abajo); el resto son momentos para regalarla. */
const PURCHASE_SPOT = 3

type Spot = { type: 'occasions'; list: Occasion[] } | { type: 'purchase' }

/**
 * Las etiquetas de alrededor: los momentos para regalarla repartidos entre los
 * lugares (cada uno va pasando los suyos) y, si hay ventas, una compra reciente.
 * Los momentos se intercalan por temática: arrancan uno de cada una.
 */
function spotsOf(occasions: Occasion[], purchases: boolean): Spot[] {
  const byTheme = new Map<string, Occasion[]>()
  for (const o of occasions) byTheme.set(o.theme, [...(byTheme.get(o.theme) ?? []), o])
  const groups = [...byTheme.values()]
  const mixed: Occasion[] = []
  for (let i = 0; mixed.length < occasions.length; i++) {
    for (const group of groups) if (group[i]) mixed.push(group[i]!)
  }
  const places = CHIP_SPOTS.map((_, i) => i).filter((i) => !purchases || i !== PURCHASE_SPOT)
  return CHIP_SPOTS.map((_, i): Spot => {
    if (purchases && i === PURCHASE_SPOT) return { type: 'purchase' }
    const place = places.indexOf(i)
    return { type: 'occasions', list: mixed.filter((_, k) => k % places.length === place) }
  })
}

/**
 * Una Ribbly de muestra que se abre en el celular de la portada y pasa sola
 * como una historia: primero la portada con el nombre del armador y después
 * pantallas de verdad, las mismas del regalo (la torta que se sopla, el
 * tragamonedas, la piñata…). Mientras no se elige temática ni se escribe un
 * nombre, intercala lo mejor de cada Ribbly; después, las de la elegida.
 *
 * Se puede tocar: la izquierda vuelve, la derecha sigue, mantener apretado
 * pausa y los juegos se juegan de verdad (si nadie los toca, se juegan solos).
 * Alrededor flotan los momentos para regalarla (tocarlos elige esa temática)
 * y una compra reciente de verdad.
 */
export function HeroPreview({
  theme,
  themes,
  name,
  showcase,
  occasions,
  purchases,
  mix,
  onPickTheme,
}: {
  theme: HomeTheme
  themes: HomeTheme[]
  name: string
  showcase: Showcase | null
  /** Los momentos para regalarla (las etiquetas de alrededor). */
  occasions: Occasion[]
  /** Compras recientes de verdad (una etiqueta las va pasando). */
  purchases: PurchaseEvent[]
  /** Intercalar lo mejor de cada Ribbly (todavía no eligieron temática). */
  mix: boolean
  onPickTheme(slug: string): void
}) {
  const calm = useCalm()
  const look = lookOf(theme.slug)
  const typed = name.trim()
  const phone = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLDivElement>(null)
  const inView = useInView(phone, { amount: 0.35 })
  // Con apenas un pedacito a la vista, la pantalla sigue animada.
  const visible = useInView(phone)
  const tilt = useTilt(7)
  const mouse = useMouseParallax()

  const items = itemsOf(showcase, theme.slug, mix)
  const spots = spotsOf(occasions, purchases.length > 0)
  const hasReal = items.some((i) => i.type === 'real')

  // La pantalla que se ve y de qué lado entró (1 adelante, -1 atrás, 0 sin deslizar).
  const signature = `${mix ? 'mezcla' : theme.slug}|${typed}`
  const [view, setView] = useState({ index: 0, dir: 0, signature })
  const [auto, setAuto] = useState(true)
  const [touches, setTouches] = useState(0)
  const [held, setHeld] = useState(false)
  const [nameIndex, setNameIndex] = useState(0)
  // De qué lado del celular está el mouse (null: afuera); `control`: sobre algo que se toca.
  const [zone, setZone] = useState<'back' | 'forward' | 'control' | null>(null)
  const [sparks, setSparks] = useState<{ id: number; x: number; y: number; particle: string }[]>([])
  const [warm, setWarm] = useState(false)
  const progress = useMotionValue(0)

  // Cambiaron la temática o el nombre en el armador: vuelve a la portada para mostrarlo.
  if (view.signature !== signature) {
    setView({ index: 0, dir: 0, signature })
    setAuto(true)
  }
  const index = Math.min(view.index, items.length - 1)
  const { dir } = view
  const item = items[index]!
  const last = items.length - 1
  const running = auto && !held && inView && !calm

  const go = (next: number) => {
    setView((v) => ({
      ...v,
      index: (next + items.length) % items.length,
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
      duration: item.seconds * (1 - progress.get()),
      ease: 'linear',
      onComplete: () => setView((v) => ({ ...v, index: (v.index + 1) % items.length, dir: 1 })),
    })
    return () => controls.stop()
  }, [running, index, signature, item.seconds, items.length, progress])

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

  // Las fotos y las pantallas se piden un rato después de cargar (sin competir con la portada).
  useEffect(() => {
    const timer = setTimeout(() => setWarm(true), 1500)
    return () => clearTimeout(timer)
  }, [])
  useEffect(() => {
    if (warm && hasReal) void loadReel()
  }, [warm, hasReal])

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
  // Un toque de demostración (el juego que se juega solo): no cuenta como que la tocaron.
  const demo = useRef(false)
  useEffect(() => () => clearTimeout(hold.current.timer), [])

  const particleOf = (i: Item) => lookOf(i.type === 'real' ? i.theme.slug : theme.slug).particle

  /** Chispas en un punto del lienzo, con lo que flota en la temática. */
  const sparkAt = (x: number, y: number, particle: string) => {
    if (calm) return
    const id = ++sparkId.current
    setSparks((s) => [...s.slice(-3), { id, x, y, particle }])
    setTimeout(() => setSparks((s) => s.filter((p) => p.id !== id)), 800)
  }

  // Si nadie la toca, el juego de la pantalla se juega solo, con chispas donde "toca".
  const demoTap = useEffectEvent((selector: string) => {
    const root = canvas.current
    const target = root?.querySelector<HTMLElement>(
      `[data-reel-item="${CSS.escape(item.id)}"] ${selector}`,
    )
    if (!root || !target || target.matches(':disabled')) return
    const r = root.getBoundingClientRect()
    const t = target.getBoundingClientRect()
    const scale = r.width / CANVAS
    sparkAt(
      (t.left + t.width / 2 - r.left) / scale,
      (t.top + t.height / 2 - r.top) / scale,
      particleOf(item),
    )
    // Un juego que se juega solo no hace vibrar el celular de quien mira (la
    // piñata vibra con cada golpe): durante el toque, vibrar no hace nada.
    const vibrate = Object.getOwnPropertyDescriptor(navigator, 'vibrate')
    Object.defineProperty(navigator, 'vibrate', { value: () => false, configurable: true })
    demo.current = true
    try {
      target.click()
    } finally {
      demo.current = false
      if (vibrate) Object.defineProperty(navigator, 'vibrate', vibrate)
      else Reflect.deleteProperty(navigator, 'vibrate')
    }
  })
  const taps = item.type === 'real' ? item.slide.taps : undefined
  useEffect(() => {
    if (!running || !taps?.length) return
    const elapsed = progress.get() * item.seconds
    const timers = taps
      .filter(([, at]) => at >= elapsed)
      .map(([selector, at]) => setTimeout(() => demoTap(selector), (at - elapsed) * 1000))
    return () => timers.forEach(clearTimeout)
  }, [running, taps, item.id, item.seconds, progress])

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
    const target = e.target as Element | null
    const onControl = target?.closest?.(CONTROL)
    // Las pantallas dibujadas a mano no avisan de sus botones: ahí no se muestra nada.
    setZone(
      onControl
        ? target?.closest('[data-hero-reel]')
          ? 'control'
          : null
        : x < BACK_ZONE
          ? 'back'
          : 'forward',
    )
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

  /** Chispas donde se tocó. */
  const spark = (e: MouseEvent) => {
    const el = canvas.current
    if (!el || e.detail === 0) return
    const r = el.getBoundingClientRect()
    const scale = r.width / CANVAS
    sparkAt((e.clientX - r.left) / scale, (e.clientY - r.top) / scale, particleOf(item))
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

  // Tocaron algo de una pantalla de verdad (un botón, la torta, la piñata): se
  // juega y la Ribbly espera un rato antes de seguir sola.
  const onCanvasClick = (e: MouseEvent<HTMLDivElement>) => {
    if (demo.current) return
    const target = e.target as Element | null
    if (!target?.closest('[data-hero-reel]')) return
    spark(e)
    touch()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    const step = STEP_KEYS[e.key]
    if (!step) return
    e.preventDefault()
    touch()
    go(index + step)
  }

  const example = look.names[nameIndex % look.names.length]!
  const shownName = typed || example
  const props: SceneProps = {
    theme,
    story: look.story,
    name: shownName,
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
      : zone === 'control'
        ? 'play'
        : index === 0
          ? 'open'
          : zone === 'back'
            ? 'back'
            : index === last
              ? 'again'
              : 'next'

  // En la mezcla, de qué Ribbly es la pantalla que se ve.
  const source =
    mix && item.type === 'real' ? themes.find((t) => t.slug === item.theme.slug) : undefined

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
                aria-label={`Ribbly de muestra para ${shownName}`}
                onKeyDown={onKeyDown}
                onClickCapture={onCanvasClick}
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
                      [index === 0 ? 1 : -1, index === 0 ? 'Abrir Ribbly' : 'Pantalla anterior'],
                      [
                        1,
                        index === 0
                          ? 'Abrir Ribbly'
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
                      key={item.id}
                      className="absolute inset-0 overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.22)]"
                      custom={dir}
                      variants={deck}
                      initial="enter"
                      animate="center"
                      exit="exit"
                    >
                      {item.type === 'cover' ? (
                        <CoverScene
                          theme={theme}
                          typed={typed}
                          example={example}
                          pointer={pointer}
                        />
                      ) : item.type === 'scene' ? (
                        <Scene id={item.scene} {...props} />
                      ) : (
                        <HeroReel
                          theme={item.theme}
                          item={item.slide}
                          order={index}
                          canvas={CANVAS}
                          name={shownName}
                          active={visible}
                          onNext={() => go(index + 1)}
                          onRestart={() => go(0)}
                        />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="pointer-events-none absolute inset-x-3 top-8 z-20 flex gap-[3px]">
                  {items.map((s, i) => (
                    <span
                      key={s.id}
                      className={cn(
                        'h-[3px] flex-1 overflow-hidden rounded-full transition-colors duration-500',
                        item.light ? 'bg-ink/15' : 'bg-white/35',
                      )}
                    >
                      <Fill
                        progress={progress}
                        state={i < index ? 'done' : i === index ? 'current' : 'next'}
                        className={item.light ? 'bg-ink/75' : 'bg-white'}
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
                        {s.particle}
                      </motion.span>
                    ))}
                  </span>
                ))}

                <p className="sr-only" aria-live="polite">
                  {auto ? '' : `Pantalla ${index + 1} de ${items.length}: ${item.label}`}
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
                    <EmojiText text={HINTS[shownHint]} />
                  </span>
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </Float>
      </motion.div>

      {spots.map((spot, i) =>
        spot.type === 'occasions' ? (
          <OccasionChip
            key={i}
            {...CHIP_SPOTS[i]!}
            list={spot.list}
            offset={i * 1.3}
            running={inView && !calm}
            mouse={mouse}
            onPick={(o) => {
              if (themes.some((t) => t.slug === o.theme)) onPickTheme(o.theme)
            }}
          />
        ) : (
          <PurchaseChip
            key={i}
            {...CHIP_SPOTS[i]!}
            events={purchases}
            themes={themes}
            running={inView && !calm}
            mouse={mouse}
          />
        ),
      )}

      {/* En la mezcla: de qué Ribbly es lo que se ve, y un toque para armar esa. */}
      <div className="absolute top-[calc(100%+22px)] left-1/2 z-10 -translate-x-1/2">
        <AnimatePresence mode="wait" initial={false}>
          {source && (
            <motion.button
              key={source.slug}
              type="button"
              onClick={() => onPickTheme(source.slug)}
              className="group flex cursor-pointer items-center gap-1.5 rounded-full bg-white/90 py-1.5 pr-2 pl-3 text-xs font-bold whitespace-nowrap text-ink shadow-[0_10px_26px_rgba(42,36,51,0.16)] ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.9, transition: { duration: 0.18 } }}
              transition={spring.snappy}
              whileTap={{ scale: 0.94 }}
            >
              <Emoji value={source.emoji} size={16} />
              Ribbly de {source.name}
              <span className="ml-0.5 grid size-5 place-items-center rounded-full bg-brand text-white transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="size-3" aria-hidden />
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

function Scene({ id, ...props }: SceneProps & { id: HandmadeScene }) {
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

/** Cada cuánto cambia lo que dice una etiqueta (con varias cosas para decir). */
const CHIP_EVERY = 5.2

/** Lo que va cambiando en una etiqueta: el índice, cada CHIP_EVERY segundos. */
function useRotation(count: number, running: boolean, offset: number, start = 0) {
  const [index, setIndex] = useState(start)
  useEffect(() => {
    if (!running || count < 2) return
    let interval: ReturnType<typeof setInterval> | undefined
    const first = setTimeout(
      () => {
        setIndex((i) => i + 1)
        interval = setInterval(() => setIndex((i) => i + 1), CHIP_EVERY * 1000)
      },
      (CHIP_EVERY + offset) * 1000,
    )
    return () => {
      clearTimeout(first)
      clearInterval(interval)
    }
  }, [count, running, offset])
  return count ? index % count : 0
}

const chipLook =
  'block rounded-full bg-white text-ink shadow-[0_12px_30px_rgba(42,36,51,0.15)] whitespace-nowrap'

/**
 * Una etiqueta que flota al lado del celular: se corre con el mouse (cada una
 * a su profundidad), sube y baja sola, y lo que dice cambia con un fundido.
 */
function FloatingChip({
  className,
  depth,
  float,
  delay,
  mouse,
  swap,
  children,
}: {
  className: string
  depth: number
  float: number
  delay: number
  mouse: { x: MotionValue<number>; y: MotionValue<number> }
  /** Cambia cuando cambia lo que dice (para el fundido). */
  swap: string
  children: ReactNode
}) {
  const calm = useCalm()
  const x = useTransform(mouse.x, (v) => v * depth)
  const y = useTransform(mouse.y, (v) => v * depth * 0.6)
  return (
    <motion.div
      className={cn('absolute z-10 hidden', className)}
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...spring.bouncy, delay }}
    >
      <motion.div
        animate={
          calm
            ? undefined
            : { transform: ['translateY(0px)', 'translateY(-8px)', 'translateY(0px)'] }
        }
        transition={{ duration: float, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={swap}
            initial={
              calm ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.92, filter: 'blur(3px)' }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={calm ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.92, filter: 'blur(3px)' }}
            transition={{ duration: 0.35, ease: ease.out }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

/** Un momento para regalarla ("Para su cumple"): tocarlo elige esa temática en el armador. */
function OccasionChip({
  list,
  offset,
  running,
  onPick,
  ...spot
}: (typeof CHIP_SPOTS)[number] & {
  list: Occasion[]
  /** Segundos de más antes del primer cambio (así no cambian todas juntas). */
  offset: number
  running: boolean
  mouse: { x: MotionValue<number>; y: MotionValue<number> }
  onPick(occasion: Occasion): void
}) {
  const occasion = list[useRotation(list.length, running, offset)]
  if (!occasion) return null
  return (
    <FloatingChip {...spot} swap={occasion.id}>
      <motion.button
        type="button"
        onClick={() => onPick(occasion)}
        className={cn(
          chipLook,
          'flex cursor-pointer items-center gap-1.5 px-3.5 py-2 text-sm font-semibold transition-colors hover:bg-brand-soft lg:px-3 lg:py-1.5 lg:text-xs xl:px-3.5 xl:py-2 xl:text-sm',
        )}
        whileHover={{ scale: 1.08, rotate: -3 }}
        whileTap={{ scale: 0.92 }}
        transition={spring.snappy}
      >
        <Emoji value={occasion.emoji} size="1.35em" />
        {occasion.moment ?? occasion.label}
      </motion.button>
    </FloatingChip>
  )
}

/** Una compra de verdad ("Martina regaló una Ribbly · para su mamá"), una por vez. */
function PurchaseChip({
  events,
  themes,
  running,
  ...spot
}: (typeof CHIP_SPOTS)[number] & {
  events: PurchaseEvent[]
  themes: HomeTheme[]
  running: boolean
  mouse: { x: MotionValue<number>; y: MotionValue<number> }
}) {
  // Arranca por la mitad: la cinta de compras de arriba arranca por la primera.
  const event = events[useRotation(events.length, running, 0.6, Math.ceil(events.length / 2))]
  if (!event) return null
  const theme = themes.find((t) => t.slug === event.theme)
  const detail =
    event.detail ?? themeDetail[event.theme] ?? (theme ? `temática ${theme.name}` : 'de regalo')
  return (
    // Es la más ancha: pisa un poco más el celular y en las tablets chicas no va.
    <FloatingChip
      {...spot}
      className={cn(spot.className, 'left-[calc(100%-34px)] sm:hidden md:block')}
      swap={event.id}
    >
      <div className={cn(chipLook, 'flex items-center gap-2 py-1.5 pr-3.5 pl-1.5 text-left')}>
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full font-fun text-sm font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
          style={{ background: avatarGradient(theme?.color ?? '#F44E63') }}
        >
          {event.name.charAt(0)}
        </span>
        <span className="leading-tight">
          <span className="block text-xs text-ink">
            <b className="font-bold">{event.name}</b> regaló una Ribbly
          </span>
          <span className="block max-w-[10rem] truncate text-[11px] font-medium text-ink/55">
            {detail}
            {isFresh(event.minutesAgo) ? ' · recién' : ` · ${timeAgo(event.minutesAgo)}`}
          </span>
        </span>
      </div>
    </FloatingChip>
  )
}
