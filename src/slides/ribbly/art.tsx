'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useMemo, type CSSProperties } from 'react'
import { seededRandom } from '../player/effects'

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
}: {
  seed?: number
  count?: number
  colors?: string[]
  opacity?: number
}) {
  const pieces = useMemo(() => {
    const rand = seededRandom(seed * 977 + count)
    return Array.from({ length: count }, () => {
      const duration = 7 + rand() * 8
      const long = rand() > 0.55
      return {
        '--x': `${n(rand() * 100)}%`,
        '--w': n(long ? 5 + rand() * 3 : 6 + rand() * 4),
        '--h': n(long ? 10 + rand() * 6 : 6 + rand() * 4),
        '--c': colors[Math.floor(rand() * colors.length)]!,
        '--r': rand() > 0.75 ? '50%' : '18%',
        '--d': `${n(duration)}s`,
        '--delay': `${n(-rand() * duration)}s`,
        '--sway': `${n((rand() - 0.5) * 16)}cqw`,
        '--spin': `${Math.round((rand() - 0.5) * 900)}deg`,
        '--rest': `${n(rand() * 100)}%`,
        '--o': opacity,
      } as Vars
    })
  }, [seed, count, colors, opacity])
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
        color: colors[Math.floor(rand() * colors.length)]!,
        round: rand() > 0.7,
        duration: n(1.5 + rand() * 1.1),
      }
    })
  }, [seed, count, colors, power])
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
  const dots = useMemo(() => {
    const rand = seededRandom(seed * 53 + count)
    return Array.from(
      { length: count },
      () =>
        ({
          '--x': `${n(rand() * 100)}%`,
          '--y': `${n(rand() * 100)}%`,
          '--s': n(18 + rand() * 60),
          '--c': colors[Math.floor(rand() * colors.length)]!,
          '--b': blur,
          '--o': n(0.12 + rand() * (maxOpacity - 0.12)),
          '--d': `${n(6 + rand() * 7)}s`,
          '--delay': `${n(-rand() * 6)}s`,
        }) as Vars,
    )
  }, [seed, count, colors, blur, maxOpacity])
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
  const flags = useMemo(() => {
    const count = 12
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count
      // Punto sobre la curva del hilo y su inclinación.
      const x = 400 * t
      const y = 2 * (1 - t) * t * 46 + 6
      const slope = (2 * (1 - 2 * t) * 46) / 400
      return { x, y, angle: (Math.atan(slope) * 180) / Math.PI, color: FLAGS[i % FLAGS.length]! }
    })
  }, [])
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

const SPRINKLES = [
  [44, 168, '#4FC3F7', 20],
  [58, 180, '#FFD35C', -30],
  [72, 166, '#5ED6A8', 50],
  [142, 172, '#FFD35C', 24],
  [154, 184, '#fff', -40],
  [166, 168, '#B28DFF', 70],
  [176, 180, '#4FC3F7', -12],
  [130, 186, '#F44E63', 36],
] as const

/**
 * Torta de dos pisos con las velas del número que cumple. Sin número, velas
 * comunes. `lit` enciende y apaga las llamas (al apagarse sale humo).
 */
export function Cake({
  age,
  lit = true,
  flicker = true,
  style,
}: {
  age?: string
  lit?: boolean
  flicker?: boolean
  style?: CSSProperties
}) {
  const calm = useReducedMotion()
  const digits = (age ?? '').slice(0, 3).split('')
  const candles = digits.length
    ? digits.map((digit, i) => ({ digit, x: 110 + (i - (digits.length - 1) / 2) * 36 }))
    : [82, 110, 138].map((x) => ({ digit: '', x }))
  const dance = lit && flicker && !calm

  return (
    <svg
      viewBox="0 0 220 236"
      role="img"
      aria-label={age ? `Torta con velas del ${age}` : 'Torta de cumpleaños'}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
        <linearGradient id="rb-cake-low" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF9DBB" />
          <stop offset="1" stopColor="#F2608E" />
        </linearGradient>
        <linearGradient id="rb-cake-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C6A9FF" />
          <stop offset="1" stopColor="#9B74F0" />
        </linearGradient>
        <linearGradient id="rb-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE58A" />
          <stop offset="0.55" stopColor="#FFC94A" />
          <stop offset="1" stopColor="#F2A93B" />
        </linearGradient>
        <radialGradient id="rb-flame" cx="50%" cy="70%" r="60%">
          <stop offset="0" stopColor="#FFF6C4" />
          <stop offset="0.5" stopColor="#FFC94A" />
          <stop offset="1" stopColor="#F2843B" />
        </radialGradient>
      </defs>

      {/* Plato */}
      <ellipse cx="110" cy="216" rx="104" ry="14" fill="rgba(28,42,90,0.16)" />
      <ellipse cx="110" cy="208" rx="100" ry="13" fill="#fff" />
      <ellipse cx="110" cy="205" rx="92" ry="10" fill="#EDEAF4" />

      {/* Piso de abajo */}
      <rect x="26" y="142" width="168" height="66" rx="14" fill="url(#rb-cake-low)" />
      <path
        d="M26 156 v-6 a8 8 0 0 1 8 -8 h152 a8 8 0 0 1 8 8 v8 q-9 16 -18 2 q-8 20 -18 2 q-10 14 -19 0 q-9 18 -19 2 q-9 14 -18 0 q-9 18 -19 0 q-9 14 -18 0 q-8 12 -17 -8 z"
        fill="#fff"
      />
      {SPRINKLES.map(([x, y, color, angle], i) => (
        <rect
          key={i}
          x={x}
          y={y}
          width="9"
          height="3.4"
          rx="1.7"
          fill={color}
          transform={`rotate(${angle} ${x + 4.5} ${y + 1.7})`}
        />
      ))}

      {/* Piso de arriba */}
      <rect x="60" y="92" width="100" height="54" rx="12" fill="url(#rb-cake-top)" />
      <path
        d="M60 106 v-6 a8 8 0 0 1 8 -8 h84 a8 8 0 0 1 8 8 v8 q-8 14 -16 0 q-9 18 -17 2 q-9 12 -17 0 q-8 16 -17 0 q-8 12 -16 -6 z"
        fill="#fff"
      />

      {/* Velas */}
      {candles.map((c, i) => (
        <g key={i}>
          {c.digit ? (
            <text
              x={c.x}
              y="92"
              textAnchor="middle"
              fontFamily="var(--font-fredoka), sans-serif"
              fontWeight="700"
              fontSize="50"
              fill="url(#rb-gold)"
              stroke="#E0952B"
              strokeWidth="1.6"
              paintOrder="stroke"
            >
              {c.digit}
            </text>
          ) : (
            <rect x={c.x - 3.5} y="62" width="7" height="32" rx="3" fill="url(#rb-gold)" />
          )}
          <rect x={c.x - 0.9} y={c.digit ? 44 : 54} width="1.8" height="9" fill="#7A5E2A" />
          <g transform={`translate(${c.x} ${c.digit ? 44 : 54})`}>
            {/* Resplandor */}
            <motion.circle
              r="15"
              fill="#FFD35C"
              initial={false}
              animate={{ opacity: lit ? 0.3 : 0 }}
              transition={{ duration: 0.35 }}
            />
            <motion.path
              d="M0 -22 C7 -12 7 -4 0 0 C-7 -4 -7 -12 0 -22 Z"
              fill="url(#rb-flame)"
              style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
              initial={false}
              animate={
                !lit
                  ? { scale: 0, opacity: 0 }
                  : dance
                    ? {
                        scale: [1, 1.14, 0.94, 1.08, 1],
                        rotate: [0, -5, 4, -2, 0],
                        opacity: 1,
                      }
                    : { scale: 1, opacity: 1, rotate: 0 }
              }
              transition={
                !lit
                  ? { duration: 0.25, ease: 'easeIn', delay: i * 0.07 }
                  : dance
                    ? { duration: 1 + i * 0.13, repeat: Infinity, ease: 'easeInOut' }
                    : { duration: 0.4 }
              }
            />
            {/* Humo: solo cuando se apagan. */}
            {!lit && !calm && (
              <motion.path
                d="M0 -6 q-7 -9 0 -18 t0 -18"
                fill="none"
                stroke="rgba(255,255,255,0.75)"
                strokeWidth="2.6"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0, y: 0 }}
                animate={{ pathLength: [0, 1, 1], opacity: [0, 0.85, 0], y: [0, -6, -22] }}
                transition={{ duration: 1.8, delay: 0.15 + i * 0.07, ease: 'easeOut' }}
              />
            )}
          </g>
        </g>
      ))}
    </svg>
  )
}

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
