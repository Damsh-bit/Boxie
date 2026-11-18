'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, type CSSProperties } from 'react'
import { seededRandom } from '../player/effects'
import { usePartyColors, useRbPalette } from './look'

/**
 * Ilustraciones y efectos de ambiente de las pantallas de Ribbly, dibujados
 * con SVG y CSS (sin imágenes que descargar). El azar es determinístico: el
 * servidor y el navegador dibujan lo mismo.
 */

export const PARTY = ['#F44E63', '#FFD35C', '#4FC3F7', '#B28DFF', '#5ED6A8', '#FF8FB1', '#FFFFFF']

type Vars = CSSProperties & Record<`--${string}`, string | number>

const n = (value: number, digits = 2) => Number(value.toFixed(digits))

/** Confeti que cae sin parar (ambiente). */
export function Confetti({
  seed = 1,
  count = 26,
  colors = PARTY,
  opacity = 0.95,
  petals = false,
}: {
  seed?: number
  count?: number
  colors?: string[]
  opacity?: number
  /** Pétalos en vez de papelitos. */
  petals?: boolean
}) {
  const party = usePartyColors(colors)
  const pieces = useMemo(() => {
    const rand = seededRandom(seed * 977 + count)
    return Array.from({ length: count }, () => {
      const duration = petals ? 10 + rand() * 9 : 7 + rand() * 8
      const long = rand() > 0.55
      return {
        '--x': `${n(rand() * 100)}%`,
        '--w': petals ? n(9 + rand() * 6) : n(long ? 5 + rand() * 3 : 6 + rand() * 4),
        '--h': petals ? n(7 + rand() * 4) : n(long ? 10 + rand() * 6 : 6 + rand() * 4),
        '--c': party[Math.floor(rand() * party.length)]!,
        '--r': petals ? '80% 0 80% 0' : rand() > 0.75 ? '50%' : '18%',
        '--d': `${n(duration)}s`,
        '--delay': `${n(-rand() * duration)}s`,
        '--sway': `${n((rand() - 0.5) * (petals ? 30 : 16))}cqw`,
        '--spin': `${Math.round((rand() - 0.5) * 900)}deg`,
        '--rest': `${n(rand() * 100)}%`,
        '--o': opacity,
      } as Vars
    })
  }, [seed, count, party, opacity, petals])
  return (
    <div className="rb-confetti" aria-hidden>
      {pieces.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  )
}

/**
 * Explosión de confeti, una vez. Se dispara al montarse: darle una `key`
 * nueva para repetirla.
 */
export function Burst({
  x = '50%',
  y = '45%',
  seed = 7,
  count = 34,
  colors = PARTY,
  power = 1,
}: {
  x?: string
  y?: string
  seed?: number
  count?: number
  colors?: string[]
  power?: number
}) {
  const calm = useReducedMotion()
  const party = usePartyColors(colors)
  const pieces = useMemo(() => {
    const rand = seededRandom(seed * 131 + count)
    return Array.from({ length: count }, () => {
      const angle = rand() * Math.PI * 2
      const reach = (18 + rand() * 34) * power
      return {
        dx: n(Math.cos(angle) * reach),
        up: n(Math.abs(Math.sin(angle)) * reach * 0.9 + 8),
        fall: n(30 + rand() * 40),
        spin: Math.round((rand() - 0.5) * 1080),
        size: n(5 + rand() * 6),
        color: party[Math.floor(rand() * party.length)]!,
        round: rand() > 0.7,
        duration: n(1.5 + rand() * 1.1),
      }
    })
  }, [seed, count, party, power])
  if (calm) return null
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', left: x, top: y, width: 0, height: 0, zIndex: 40 }}
    >
      {pieces.map((p, i) => (
        <motion.i
          key={i}
          style={{
            position: 'absolute',
            width: `calc(var(--u) * ${p.size})`,
            height: `calc(var(--u) * ${p.round ? p.size : p.size * 1.6})`,
            background: p.color,
            borderRadius: p.round ? '50%' : '18%',
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [1, 1, 1, 0],
            transform: [
              'translate(0cqw, 0cqh) rotate(0deg) scale(0.3)',
              `translate(${n(p.dx * 0.75)}cqw, ${-p.up}cqh) rotate(${p.spin / 2}deg) scale(1)`,
              `translate(${p.dx}cqw, ${n(-p.up * 0.4)}cqh) rotate(${n(p.spin * 0.8)}deg) scale(1)`,
              `translate(${n(p.dx * 1.1)}cqw, ${p.fall}cqh) rotate(${p.spin}deg) scale(0.9)`,
            ],
          }}
          transition={{ duration: p.duration, times: [0, 0.28, 0.5, 1], ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

/** Rayos que giran detrás del protagonista. `at` es el centro ("50% 45%"). */
export function Rays({ at = '50% 45%', strength = 0.13 }: { at?: string; strength?: number }) {
  const [left, top] = at.split(' ')
  return <i className="rb-rays" aria-hidden style={{ left, top, '--rb-rays': strength } as Vars} />
}

/** Luces fuera de foco que derivan despacio. */
export function Bokeh({
  seed = 3,
  count = 12,
  colors = ['#F2A93B', '#FFD35C', '#FF8FB1'],
  blur = 7,
  maxOpacity = 0.5,
}: {
  seed?: number
  count?: number
  colors?: string[]
  blur?: number
  maxOpacity?: number
}) {
  const palette = useRbPalette()
  const lights = useMemo(
    () => (palette ? [palette.accent, palette.tint, palette.primary] : colors),
    [palette, colors],
  )
  const dots = useMemo(() => {
    const rand = seededRandom(seed * 53 + count)
    return Array.from(
      { length: count },
      () =>
        ({
          '--x': `${n(rand() * 100)}%`,
          '--y': `${n(rand() * 100)}%`,
          '--s': n(18 + rand() * 60),
          '--c': lights[Math.floor(rand() * lights.length)]!,
          '--b': blur,
          '--o': n(0.12 + rand() * (maxOpacity - 0.12)),
          '--d': `${n(6 + rand() * 7)}s`,
          '--delay': `${n(-rand() * 6)}s`,
        }) as Vars,
    )
  }, [seed, count, lights, blur, maxOpacity])
  return (
    <div className="rb-bokeh" aria-hidden style={{ position: 'absolute', inset: 0 }}>
      {dots.map((style, i) => (
        <i key={i} style={style} />
      ))}
    </div>
  )
}

/** Estrellas que titilan; algunas son destellos de cuatro puntas. */
export function Stars({
  seed = 5,
  count = 26,
  sparks = 4,
  area = 70,
}: {
  seed?: number
  count?: number
  sparks?: number
  /** Hasta qué altura (en %) hay estrellas. */
  area?: number
}) {
  const stars = useMemo(() => {
    const rand = seededRandom(seed * 89 + count)
    return Array.from({ length: count }, (_, i) => ({
      spark: i < sparks,
      style: {
        '--x': `${n(rand() * 100)}%`,
        '--y': `${n(rand() * area)}%`,
        '--s': i < sparks ? n(9 + rand() * 7) : n(1.6 + rand() * 2.6),
        '--d': `${n(2.4 + rand() * 3.5)}s`,
        '--delay': `${n(-rand() * 5)}s`,
      } as Vars,
    }))
  }, [seed, count, sparks, area])
  return (
    <div className="rb-stars" aria-hidden style={{ position: 'absolute', inset: 0 }}>
      {stars.map((star, i) => (
        <i key={i} className={star.spark ? 'is-spark' : ''} style={star.style} />
      ))}
    </div>
  )
}

const FLAGS = ['#F44E63', '#FFD35C', '#4FC3F7', '#5ED6A8', '#B28DFF', '#FF8FB1']

/** Guirnalda de banderines colgada de lado a lado. */
export function Bunting({ style, dim = false }: { style?: CSSProperties; dim?: boolean }) {
  const palette = useRbPalette()
  const colors = useMemo(() => palette?.party.filter((c) => c !== '#FFFFFF') ?? FLAGS, [palette])
  const flags = useMemo(() => {
    const count = 12
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count
      // Punto sobre la curva del hilo y su inclinación.
      const x = 400 * t
      const y = 2 * (1 - t) * t * 46 + 6
      const slope = (2 * (1 - 2 * t) * 46) / 400
      return { x, y, angle: (Math.atan(slope) * 180) / Math.PI, color: colors[i % colors.length]! }
    })
  }, [colors])
  return (
    <svg
      className="rb-bunting"
      viewBox="0 0 400 76"
      aria-hidden
      style={{ opacity: dim ? 0.85 : 1, ...style }}
    >
      <path d="M0 6 Q200 52 400 6" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" />
      {flags.map((f, i) => (
        <path
          key={i}
          d="M-13 0 L13 0 L0 30 Z"
          fill={f.color}
          transform={`translate(${n(f.x)} ${n(f.y)}) rotate(${n(f.angle)})`}
        />
      ))}
    </svg>
  )
}

/** Globo con brillo e hilo. Se posiciona con `style` (left/top/width). */
export function Balloon({
  color,
  style,
  duration = 6,
  delay = 0,
  tilt = -3,
}: {
  color: string
  style?: CSSProperties
  duration?: number
  delay?: number
  tilt?: number
}) {
  const id = `rb-balloon-${color.replace('#', '')}`
  return (
    <svg
      className="rb-balloon"
      viewBox="0 0 60 118"
      aria-hidden
      style={
        { '--d': `${duration}s`, '--delay': `${delay}s`, '--tilt': `${tilt}deg`, ...style } as Vars
      }
    >
      <defs>
        <radialGradient id={id} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.28" stopColor={color} />
          <stop offset="1" stopColor={color} />
        </radialGradient>
      </defs>
      <path
        d="M30 76 q-4 10 2 18 t-2 22"
        fill="none"
        stroke="rgba(255,255,255,0.8)"
        strokeWidth="1.2"
      />
      <ellipse cx="30" cy="38" rx="27" ry="34" fill={`url(#${id})`} />
      <ellipse cx="30" cy="38" rx="27" ry="34" fill="rgba(0,0,0,0.06)" />
      <path d="M26 71 L34 71 L30 78 Z" fill={color} />
      <ellipse
        cx="20"
        cy="24"
        rx="5"
        ry="9"
        fill="#fff"
        opacity="0.45"
        transform="rotate(-24 20 24)"
      />
    </svg>
  )
}

// La torta vive en cake.tsx (sabores y velas a elegir).
export { Cake } from './cake'

// ── Escenas (lo que se ve cuando todavía no hay foto) ───────────────────────

const HATS = ['#FFD35C', '#4FC3F7', '#FF8FB1', '#5ED6A8', '#B28DFF']

/** Fiesta de noche: luces, siluetas con bonete y confeti. */
export function PartyScene({ style }: { style?: CSSProperties }) {
  const people = [
    [40, 250, 0],
    [112, 232, 1],
    [186, 244, 2],
    [258, 236, 3],
    [330, 252, 4],
  ] as const
  return (
    <svg
      viewBox="0 0 360 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    >
      <defs>
        <linearGradient id="rb-sc-party" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3B2A8E" />
          <stop offset="0.55" stopColor="#7B3A9E" />
          <stop offset="1" stopColor="#C2478E" />
        </linearGradient>
      </defs>
      <rect width="360" height="300" fill="url(#rb-sc-party)" />
      {[
        [50, 60, 34, '#F2A93B'],
        [150, 110, 46, '#FF8FB1'],
        [280, 50, 40, '#F2A93B'],
        [320, 150, 30, '#B28DFF'],
        [90, 170, 26, '#4FC3F7'],
      ].map(([x, y, r, c], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={c as string} opacity="0.22" />
      ))}
      <path d="M0 22 Q90 54 180 30 T360 24" fill="none" stroke="#1C2A5A" strokeWidth="1.5" />
      {Array.from({ length: 13 }, (_, i) => {
        const x = 12 + i * 28
        const y = 26 + Math.sin(i * 0.9) * 9 + 6
        return <circle key={i} cx={x} cy={y} r="4.2" fill={HATS[i % HATS.length]} />
      })}
      {[
        [70, 90],
        [130, 70],
        [210, 96],
        [250, 130],
        [300, 104],
        [170, 150],
        [36, 140],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="7"
          height="11"
          rx="1.5"
          fill={PARTY[i % 6]}
          transform={`rotate(${i * 37} ${x} ${y})`}
        />
      ))}
      {people.map(([x, y, hat], i) => (
        <g key={i} fill="#160F33">
          <circle cx={x} cy={y - 34} r="24" />
          <path d={`M${x - 34} 300 V${y + 8} a34 34 0 0 1 68 0 V300 Z`} />
          {i % 2 === 1 && <path d={`M${x + 22} ${y + 6} l22 -70 l12 4 l-16 74 Z`} />}
          <path
            d={`M${x - 15} ${y - 52} L${x} ${y - 96} L${x + 15} ${y - 52} Z`}
            fill={HATS[hat]}
          />
        </g>
      ))}
    </svg>
  )
}

/** Playa: sol, mar y sombrilla. */
export function BeachScene({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 360 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    >
      <rect width="360" height="300" fill="#8FD8F8" />
      <circle cx="270" cy="70" r="34" fill="#FFD35C" />
      <rect y="150" width="360" height="70" fill="#2C8FD6" />
      <path d="M0 162 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 V176 H0 Z" fill="#59B5EC" />
      <rect y="206" width="360" height="94" fill="#F6D9A0" />
      <path d="M150 232 L156 132" stroke="#8A6A2A" strokeWidth="5" strokeLinecap="round" />
      <path d="M92 150 Q156 76 222 142 Q190 128 156 134 Q120 128 92 150 Z" fill="#F44E63" />
      <path d="M124 136 Q156 92 156 134 Z M190 134 Q170 96 156 134 Z" fill="#fff" opacity="0.85" />
      <rect x="196" y="236" width="20" height="34" rx="6" fill="#1C2A5A" />
      <rect x="224" y="240" width="20" height="30" rx="6" fill="#1C2A5A" />
    </svg>
  )
}

/** Montañas al atardecer con un camino. */
export function MountainScene({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 360 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    >
      <defs>
        <linearGradient id="rb-sc-mount" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFC98A" />
          <stop offset="1" stopColor="#FF9A8A" />
        </linearGradient>
      </defs>
      <rect width="360" height="300" fill="url(#rb-sc-mount)" />
      <circle cx="250" cy="84" r="30" fill="#FFE9B0" />
      <path d="M0 210 L90 96 L150 170 L220 80 L360 220 V300 H0 Z" fill="#B28DFF" />
      <path d="M0 250 L110 150 L190 232 L270 160 L360 250 V300 H0 Z" fill="#C9483E" />
      <path d="M0 300 V262 L130 206 L240 262 L360 232 V300 Z" fill="#8E3A2E" />
      <path
        d="M170 300 Q200 262 176 240 T196 204"
        fill="none"
        stroke="#F6D9A0"
        strokeWidth="9"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const SCENES = [BeachScene, MountainScene, PartyScene] as const

/** Garabatos de colores de las tarjetas claras. */
export function Squiggles() {
  const items = [
    ['6%', '17%', '#FFD35C', 0, 'M2 12 q8 -14 16 0 t16 0 t16 0'],
    ['78%', '23%', '#4FC3F7', 78, 'M2 12 q8 -14 16 0 t16 0'],
    ['80%', '74%', '#F44E63', -14, 'M2 12 q8 -14 16 0 t16 0 t16 0'],
    ['8%', '79%', '#B28DFF', 64, 'M2 12 q8 -14 16 0 t16 0 t16 0'],
  ] as const
  return (
    <>
      {items.map(([left, top, color, rotate, d], i) => (
        <svg
          key={i}
          viewBox="0 0 54 24"
          aria-hidden
          className="rb-loop"
          style={{
            position: 'absolute',
            left,
            top,
            width: 'calc(var(--u) * 56)',
            transform: `rotate(${rotate}deg)`,
            opacity: 0.9,
          }}
        >
          <path d={d} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
        </svg>
      ))}
    </>
  )
}

// ── Pareja ──────────────────────────────────────────────────────────────────

export const ROSE = ['#F44E63', '#F7798A', '#FFCCD5', '#FFFFFF', '#FFC56E']
export const PETALS = ['#F7798A', '#F44E63', '#FFB3C1', '#FFCCD5']

const HEART_PATH =
  'M50 88 C20 66 2 48 2 28 C2 13 14 2 28 2 C38 2 46 8 50 16 C54 8 62 2 72 2 C86 2 98 13 98 28 C98 48 80 66 50 88 Z'

/** Corazón con brillo, como de vidrio. Flota como los globos. */
export function Heart({
  color = '#F44E63',
  style,
  duration = 6,
  delay = 0,
  tilt = -6,
  still = false,
}: {
  color?: string
  style?: CSSProperties
  duration?: number
  delay?: number
  tilt?: number
  /** Sin flotar (cuando lo mueve otra animación). */
  still?: boolean
}) {
  const id = `rb-heart-${color.replace('#', '')}`
  return (
    <svg
      className={still ? undefined : 'rb-balloon'}
      viewBox="0 0 100 92"
      aria-hidden
      style={
        {
          '--d': `${duration}s`,
          '--delay': `${delay}s`,
          '--tilt': `${tilt}deg`,
          display: 'block',
          overflow: 'visible',
          ...style,
        } as Vars
      }
    >
      <defs>
        <radialGradient id={id} cx="32%" cy="26%" r="80%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.22" stopColor={color} />
          <stop offset="1" stopColor={color} />
        </radialGradient>
      </defs>
      <path d={HEART_PATH} fill={`url(#${id})`} />
      <path
        d={HEART_PATH}
        fill="rgba(80,0,20,0.12)"
        transform="translate(0 4) scale(1 0.96)"
        opacity="0.5"
      />
      <path d={HEART_PATH} fill={`url(#${id})`} />
      <ellipse
        cx="27"
        cy="22"
        rx="10"
        ry="6"
        fill="#fff"
        opacity="0.55"
        transform="rotate(-28 27 22)"
      />
    </svg>
  )
}

/** La cinta de la R, que cruza la pantalla como un hilo (intro de Pareja). */
export function Ribbon({ style, active = true }: { style?: CSSProperties; active?: boolean }) {
  const d =
    'M-40 250 C40 170 150 210 140 290 C132 350 60 362 54 318 C46 262 170 240 250 300 C320 352 360 420 440 430'
  return (
    <svg viewBox="0 0 390 440" preserveAspectRatio="xMidYMax slice" aria-hidden style={style}>
      <defs>
        <linearGradient id="rb-ribbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F7798A" />
          <stop offset="0.5" stopColor="#F44E63" />
          <stop offset="1" stopColor="#E8405A" />
        </linearGradient>
      </defs>
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(150,20,50,0.18)"
        strokeWidth="36"
        strokeLinecap="round"
        transform="translate(4 8)"
        initial={false}
        animate={{ pathLength: active ? 1 : 0 }}
        transition={{ duration: active ? 1.6 : 0.2, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke="url(#rb-ribbon)"
        strokeWidth="34"
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: active ? 1 : 0 }}
        transition={{ duration: active ? 1.6 : 0.2, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.path
        d={d}
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="5"
        strokeLinecap="round"
        transform="translate(-4 -7)"
        initial={false}
        animate={{ pathLength: active ? 1 : 0 }}
        transition={{
          duration: active ? 1.6 : 0.2,
          delay: active ? 0.1 : 0,
          ease: [0.65, 0, 0.35, 1],
        }}
      />
    </svg>
  )
}

/** Guirnalda de lamparitas cálidas que titilan. */
export function StringLights({ style, count = 11 }: { style?: CSSProperties; count?: number }) {
  const bulbs = Array.from({ length: count }, (_, i) => {
    const t = (i + 0.5) / count
    return { x: 400 * t, y: 2 * (1 - t) * t * 40 + 8, delay: n((i % 4) * -0.6) }
  })
  return (
    <svg
      viewBox="0 0 400 64"
      preserveAspectRatio="none"
      aria-hidden
      style={{ overflow: 'visible', ...style }}
    >
      <path
        d="M0 8 Q200 48 400 8"
        fill="none"
        stroke="rgba(30,15,20,0.75)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
      {bulbs.map((b, i) => (
        <g key={i} transform={`translate(${n(b.x)} ${n(b.y)})`}>
          <rect x="-2.5" y="0" width="5" height="5" rx="1" fill="#3a2a2a" />
          <circle
            className="rb-bulb"
            cy="11"
            r="6"
            fill="#FFE2A0"
            style={{ animationDelay: `${b.delay}s` }}
          />
        </g>
      ))}
    </svg>
  )
}

/** Atardecer con la pareja de la mano (cuando todavía no hay foto). */
export function CoupleScene({ style }: { style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 360 300"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    >
      <defs>
        <linearGradient id="rb-sc-dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6B2A6E" />
          <stop offset="0.45" stopColor="#F4607E" />
          <stop offset="0.8" stopColor="#FFB06B" />
        </linearGradient>
      </defs>
      <rect width="360" height="300" fill="url(#rb-sc-dusk)" />
      <circle cx="180" cy="196" r="70" fill="#FFD9A0" opacity="0.9" />
      <circle cx="180" cy="196" r="96" fill="#FFD9A0" opacity="0.18" />
      <rect y="214" width="360" height="86" fill="#3B1830" />
      <path d="M0 214 h360" stroke="#FFC56E" strokeWidth="2" opacity="0.6" />
      <g fill="#2A1430">
        <circle cx="156" cy="128" r="15" />
        <path d="M138 214 V160 a18 18 0 0 1 36 0 V214 Z" />
        <circle cx="206" cy="122" r="16" />
        <path d="M187 214 V156 a19 19 0 0 1 38 0 V214 Z" />
        <path d="M172 178 Q182 190 190 176 l2 8 Q182 198 170 186 Z" />
      </g>
    </svg>
  )
}

/** Ciudad de noche con luna llena. */
export function CityNightScene({ style }: { style?: CSSProperties }) {
  const towers = [
    [0, 150, 44],
    [40, 118, 36],
    [74, 168, 40],
    [112, 96, 30],
    [140, 140, 48],
    [186, 110, 34],
    [218, 160, 42],
    [258, 86, 32],
    [288, 130, 40],
    [326, 104, 40],
  ] as const
  return (
    <svg
      viewBox="0 0 360 300"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    >
      <defs>
        <linearGradient id="rb-sc-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1F5E" />
          <stop offset="0.6" stopColor="#4A2A6E" />
          <stop offset="1" stopColor="#2A1430" />
        </linearGradient>
        <radialGradient id="rb-sc-moon" cx="40%" cy="38%" r="70%">
          <stop offset="0" stopColor="#FFF6DA" />
          <stop offset="1" stopColor="#F3DDA6" />
        </radialGradient>
      </defs>
      <rect width="360" height="300" fill="url(#rb-sc-night)" />
      <circle cx="226" cy="84" r="74" fill="#FFE9B8" opacity="0.12" />
      <circle cx="226" cy="84" r="52" fill="url(#rb-sc-moon)" />
      <circle cx="210" cy="72" r="8" fill="#E6CB8E" opacity="0.5" />
      <circle cx="240" cy="98" r="6" fill="#E6CB8E" opacity="0.45" />
      {towers.map(([x, h, w], i) => (
        <g key={i}>
          <rect x={x} y={300 - h} width={w} height={h} fill={i % 2 ? '#24163F' : '#1B1033'} />
          {Array.from({ length: Math.floor(h / 22) }, (_, r) =>
            Array.from({ length: Math.floor(w / 12) }, (_, c) =>
              (r * 7 + c * 3 + i) % 4 === 0 ? (
                <rect
                  key={`${r}-${c}`}
                  x={x + 5 + c * 11}
                  y={300 - h + 10 + r * 20}
                  width="4"
                  height="6"
                  fill="#FFD27A"
                  opacity="0.85"
                />
              ) : null,
            ),
          )}
        </g>
      ))}
    </svg>
  )
}

export const SCENES_PAREJA = [CoupleScene, BeachScene, CityNightScene] as const

/**
 * Galletita de la fortuna. `half` dibuja una de las dos mitades partidas;
 * `open`, la galletita ya abierta (sin el papelito que asoma).
 */
export function Cookie({
  half,
  open = false,
  style,
}: {
  half?: 'left' | 'right'
  open?: boolean
  style?: CSSProperties
}) {
  const id = `rb-cookie-${half ?? 'whole'}`
  return (
    <svg
      viewBox="0 0 120 96"
      aria-hidden
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE7A3" />
          <stop offset="0.55" stopColor="#F6C25C" />
          <stop offset="1" stopColor="#E09A3A" />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          {half === 'left' ? (
            <path d="M-10 -10 H64 L56 40 L66 60 L58 110 H-10 Z" />
          ) : half === 'right' ? (
            <path d="M130 -10 H64 L56 40 L66 60 L58 110 H130 Z" />
          ) : (
            <rect x="-10" y="-10" width="140" height="120" />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-c)`}>
        <path
          d="M8 62 C6 30 38 6 64 12 C92 18 114 42 112 66 C104 56 88 52 74 58 C64 63 60 76 52 86 C34 88 10 80 8 62 Z"
          fill={`url(#${id}-g)`}
        />
        <path
          d="M52 86 C56 66 68 56 84 54"
          fill="none"
          stroke="#C8822E"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d="M22 40 C30 28 44 20 58 20"
          fill="none"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.45"
        />
      </g>
      {!half && !open && (
        <path d="M70 62 l20 -4 l3 9 l-20 5 Z" fill="#FFFDF5" stroke="rgba(0,0,0,0.08)" />
      )}
    </svg>
  )
}

/** Luna creciente. */
export function Moon({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 60 60" aria-hidden style={{ display: 'block', ...style }}>
      <defs>
        <mask id="rb-moon-cut">
          <rect width="60" height="60" fill="#fff" />
          <circle cx="40" cy="22" r="22" fill="#000" />
        </mask>
      </defs>
      <circle cx="28" cy="30" r="24" fill="#FFF1C8" mask="url(#rb-moon-cut)" />
    </svg>
  )
}

/** Constelación: estrellas unidas por líneas finas. */
export function Constellation({ style }: { style?: CSSProperties }) {
  const pts = [
    [10, 60],
    [70, 40],
    [130, 64],
    [190, 30],
    [250, 70],
    [310, 50],
    [370, 76],
  ] as const
  return (
    <svg
      viewBox="0 0 380 100"
      aria-hidden
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <polyline
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.2"
      />
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          className="rb-bulb"
          cx={x}
          cy={y}
          r="3"
          fill="#FFF6DA"
          style={{ animationDelay: `${-i * 0.5}s` }}
        />
      ))}
    </svg>
  )
}

/** Moño de una caja de regalo (portada de Pareja y cierre). */
export function Bow() {
  return (
    <svg className="rb-bow" viewBox="0 0 86 44" aria-hidden>
      <path d="M43 30 C22 2 2 4 6 22 C8 36 28 36 43 30 Z" fill="#F8627A" />
      <path d="M43 30 C64 2 84 4 80 22 C78 36 58 36 43 30 Z" fill="#F44E63" />
      <circle cx="43" cy="30" r="9" fill="#D63A55" />
    </svg>
  )
}
