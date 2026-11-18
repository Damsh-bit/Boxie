'use client'

import { motion, useReducedMotion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { CAKE_CANDLES, CAKE_FLAVORS } from './piece-options'

/**
 * La torta de cumpleaños (02 · El festejo y 15 · Velas), con los sabores y
 * las velas que puede elegir el comprador (ejes `torta` y `velas`). La de
 * siempre es la clásica de dos pisos con las velas del número que cumple.
 */

type Flavor = (typeof CAKE_FLAVORS)[number][0]
type CandleStyle = (typeof CAKE_CANDLES)[number][0]

interface FlavorLook {
  low: [string, string]
  top: [string, string]
  frosting: string
  sprinkles: string[]
}

const FLAVORS: Record<Exclude<Flavor, 'cupcake'>, FlavorLook> = {
  original: {
    low: ['#FF9DBB', '#F2608E'],
    top: ['#C6A9FF', '#9B74F0'],
    frosting: '#FFFFFF',
    sprinkles: [
      '#4FC3F7',
      '#FFD35C',
      '#5ED6A8',
      '#FFD35C',
      '#FFFFFF',
      '#B28DFF',
      '#4FC3F7',
      '#F44E63',
    ],
  },
  chocolate: {
    low: ['#9A6542', '#5E3A24'],
    top: ['#B07A55', '#6E452C'],
    frosting: '#3E2416',
    sprinkles: [
      '#FFFFFF',
      '#FFD35C',
      '#FF8FB1',
      '#FFFFFF',
      '#FFD35C',
      '#FFFFFF',
      '#FF8FB1',
      '#FFD35C',
    ],
  },
  frutilla: {
    low: ['#FFF4F7', '#FFD3E0'],
    top: ['#FFFFFF', '#FFE3EC'],
    frosting: '#F25C8A',
    sprinkles: [],
  },
}

const SPRINKLES = [
  [44, 168, 20],
  [58, 180, -30],
  [72, 166, 50],
  [142, 172, 24],
  [154, 184, -40],
  [166, 168, 70],
  [176, 180, -12],
  [130, 186, 36],
] as const

/** Una frutilla: corazón rojo con semillas y hojitas. */
function Strawberry({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 14 C-9 8 -10 0 -8 -4 C-5 -9 5 -9 8 -4 C10 0 9 8 0 14 Z" fill="#E8344E" />
      <path
        d="M-4 -2 h0.1 M3 0 h0.1 M-1 5 h0.1 M4 6 h0.1 M-5 4 h0.1"
        stroke="#FFE08A"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M-6 -6 L0 -3 L6 -6 L3 -9 L0 -6 L-3 -9 Z" fill="#3FA34D" />
    </g>
  )
}

/** Torta de dos pisos (clásica, chocolate o frutilla). */
function TieredCake({ flavor, id }: { flavor: Exclude<Flavor, 'cupcake'>; id: string }) {
  const look = FLAVORS[flavor]
  return (
    <>
      <defs>
        <linearGradient id={`${id}-low`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.low[0]} />
          <stop offset="1" stopColor={look.low[1]} />
        </linearGradient>
        <linearGradient id={`${id}-top`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.top[0]} />
          <stop offset="1" stopColor={look.top[1]} />
        </linearGradient>
      </defs>
      {/* Piso de abajo */}
      <rect x="26" y="142" width="168" height="66" rx="14" fill={`url(#${id}-low)`} />
      <path
        d="M26 156 v-6 a8 8 0 0 1 8 -8 h152 a8 8 0 0 1 8 8 v8 q-9 16 -18 2 q-8 20 -18 2 q-10 14 -19 0 q-9 18 -19 2 q-9 14 -18 0 q-9 18 -19 0 q-9 14 -18 0 q-8 12 -17 -8 z"
        fill={look.frosting}
      />
      {look.sprinkles.length > 0 &&
        SPRINKLES.map(([x, y, angle], i) => (
          <rect
            key={i}
            x={x}
            y={y}
            width="9"
            height="3.4"
            rx="1.7"
            fill={look.sprinkles[i % look.sprinkles.length]}
            transform={`rotate(${angle} ${x + 4.5} ${y + 1.7})`}
          />
        ))}
      {flavor === 'frutilla' && (
        <>
          <Strawberry x={52} y={180} r={-12} />
          <Strawberry x={110} y={184} />
          <Strawberry x={168} y={180} r={12} />
        </>
      )}
      {flavor === 'chocolate' && (
        <path
          d="M30 196 h160"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Piso de arriba */}
      <rect x="60" y="92" width="100" height="54" rx="12" fill={`url(#${id}-top)`} />
      <path
        d="M60 106 v-6 a8 8 0 0 1 8 -8 h84 a8 8 0 0 1 8 8 v8 q-8 14 -16 0 q-9 18 -17 2 q-9 12 -17 0 q-8 16 -17 0 q-8 12 -16 -6 z"
        fill={look.frosting}
      />
      {flavor === 'frutilla' && (
        <>
          <Strawberry x={72} y={128} r={-10} s={0.8} />
          <Strawberry x={148} y={128} r={10} s={0.8} />
        </>
      )}
      {flavor === 'chocolate' && (
        <>
          <circle cx="84" cy="128" r="3" fill="#FFD35C" />
          <circle cx="110" cy="132" r="3" fill="#FFFFFF" />
          <circle cx="136" cy="128" r="3" fill="#FF8FB1" />
        </>
      )}
    </>
  )
}

/** Un cupcake gigante: pirotín a rayas y crema en espiral. */
function Cupcake({ id }: { id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-cup`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF8FB1" />
          <stop offset="1" stopColor="#E85A86" />
        </linearGradient>
        <linearGradient id={`${id}-cream`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#F3E9FF" />
        </linearGradient>
      </defs>
      {/* Pirotín */}
      <path d="M40 132 L180 132 L164 208 L56 208 Z" fill={`url(#${id}-cup)`} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const t = (i + 0.5) / 7
        const top = 40 + 140 * t
        const bottom = 56 + 108 * t
        return (
          <path
            key={i}
            d={`M${top} 132 L${bottom} 208`}
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        )
      })}
      {/* Crema */}
      <ellipse cx="110" cy="132" rx="80" ry="20" fill={`url(#${id}-cream)`} />
      <ellipse cx="110" cy="116" rx="64" ry="19" fill={`url(#${id}-cream)`} />
      <ellipse cx="110" cy="100" rx="46" ry="17" fill={`url(#${id}-cream)`} />
      <path
        d="M40 134 q20 10 40 0 q20 10 40 0 q20 10 40 0 q12 6 20 0"
        fill="none"
        stroke="#E7DAFA"
        strokeWidth="3"
      />
      {/* Granas */}
      {[
        [70, 128, '#4FC3F7', 30],
        [96, 136, '#FFD35C', -20],
        [126, 134, '#5ED6A8', 40],
        [152, 126, '#F44E63', -30],
        [84, 112, '#B28DFF', 10],
        [136, 110, '#4FC3F7', -40],
        [110, 98, '#F44E63', 20],
      ].map(([x, y, color, a], i) => (
        <rect
          key={i}
          x={x as number}
          y={y as number}
          width="8"
          height="3"
          rx="1.5"
          fill={color as string}
          transform={`rotate(${a} ${(x as number) + 4} ${(y as number) + 1.5})`}
        />
      ))}
    </>
  )
}

/** Donde se apoyan las velas (la base del número): más abajo en el cupcake. */
const CANDLE_BASE: Record<Flavor, number> = {
  original: 92,
  chocolate: 92,
  frutilla: 92,
  cupcake: 88,
}

/** La llama, con resplandor, baile y humo al apagarse. */
function Flame({
  x,
  y,
  i,
  lit,
  dance,
  calm,
}: {
  x: number
  y: number
  i: number
  lit: boolean
  dance: boolean
  calm: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
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
              ? { scale: [1, 1.14, 0.94, 1.08, 1], rotate: [0, -5, 4, -2, 0], opacity: 1 }
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
      <Smoke lit={lit} calm={calm} i={i} />
    </g>
  )
}

function Smoke({ lit, calm, i }: { lit: boolean; calm: boolean; i: number }) {
  if (lit || calm) return null
  return (
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
  )
}

/** Chispas de bengala: rayitas que titilan alrededor de la punta. */
function Sparkler({
  x,
  y,
  i,
  lit,
  calm,
}: {
  x: number
  y: number
  i: number
  lit: boolean
  calm: boolean
}) {
  const rays = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <g transform={`translate(${x} ${y})`}>
      <motion.g
        initial={false}
        animate={
          !lit
            ? { opacity: 0, scale: 0.2 }
            : calm
              ? { opacity: 1, scale: 1 }
              : {
                  opacity: [0.7, 1, 0.8, 1],
                  scale: [0.85, 1.12, 0.92, 1.05],
                  rotate: [0, 18, 30, 45],
                }
        }
        transition={
          !lit
            ? { duration: 0.25, delay: i * 0.07 }
            : { duration: 0.5 + i * 0.07, repeat: Infinity, ease: 'linear' }
        }
      >
        <circle r="9" fill="#FFF3B0" opacity="0.55" />
        {rays.map((a, j) => (
          <path
            key={a}
            d={`M0 0 L0 ${j % 2 ? -14 : -20}`}
            stroke={j % 3 ? '#FFE58A' : '#FFFFFF'}
            strokeWidth="1.8"
            strokeLinecap="round"
            transform={`rotate(${a})`}
          />
        ))}
        <circle r="3.2" fill="#FFFFFF" />
      </motion.g>
      <Smoke lit={lit} calm={calm} i={i} />
    </g>
  )
}

/**
 * Torta con las velas del número que cumple (sin número, velas comunes).
 * `lit` enciende y apaga las llamas (al apagarse sale humo).
 */
export function Cake({
  age,
  lit = true,
  flicker = true,
  flavor = 'original',
  candles: candleStyle = 'original',
  style,
}: {
  age?: string
  lit?: boolean
  flicker?: boolean
  /** Eje `torta`: clásica, chocolate, frutilla o cupcake. */
  flavor?: string
  /** Eje `velas`: con el número, finitas o bengalas. */
  candles?: string
  style?: CSSProperties
}) {
  const calm = useReducedMotion() ?? false
  const kind: Flavor = (CAKE_FLAVORS.find(([v]) => v === flavor)?.[0] ?? 'original') as Flavor
  const candleKind = (CAKE_CANDLES.find(([v]) => v === candleStyle)?.[0] ??
    'original') as CandleStyle
  const base = CANDLE_BASE[kind]
  const dance = lit && flicker && !calm
  const id = `rb-cake-${kind}`
  const digits = (age ?? '').slice(0, 3).split('')
  const years = Number.parseInt(age ?? '', 10)

  let candleNodes: ReactNode
  if (candleKind === 'finitas') {
    // Una vela por año, hasta siete (después ya no entran).
    const count = Math.min(Math.max(Number.isFinite(years) && years > 0 ? years : 5, 3), 7)
    const spread = kind === 'cupcake' ? 60 : 78
    candleNodes = Array.from({ length: count }, (_, i) => {
      const x = 110 + (count === 1 ? 0 : (i / (count - 1) - 0.5) * spread)
      const top = base - 40 + (i % 2) * 4
      return (
        <g key={i}>
          <rect x={x - 2.4} y={top} width="4.8" height={base - top + 4} rx="2" fill="#FFFFFF" />
          {[0, 1, 2, 3].map((s) => {
            const y = top + 6 + s * 9
            return (
              <path
                key={s}
                d={`M${x - 2.4} ${y + 3} L${x + 2.4} ${y} L${x + 2.4} ${y + 3.6} L${x - 2.4} ${y + 6.6} Z`}
                fill={['#F44E63', '#4FC3F7', '#FFD35C', '#B28DFF', '#5ED6A8'][i % 5]}
              />
            )
          })}
          <rect x={x - 0.7} y={top - 7} width="1.4" height="7" fill="#7A5E2A" />
          <Flame x={x} y={top - 7} i={i} lit={lit} dance={dance} calm={calm} />
        </g>
      )
    })
  } else if (candleKind === 'bengalas') {
    candleNodes = [-26, 26].map((dx, i) => {
      const x = 110 + dx
      const tip = base - 50 - i * 6
      return (
        <g key={i}>
          <path
            d={`M${x} ${base + 2} L${x + dx * 0.25} ${tip}`}
            stroke="#8C8C99"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <path
            d={`M${x + dx * 0.18} ${tip + 16} L${x + dx * 0.25} ${tip}`}
            stroke="#4A4A55"
            strokeWidth="3.4"
            strokeLinecap="round"
          />
          <Sparkler x={x + dx * 0.25} y={tip} i={i} lit={lit} calm={calm} />
        </g>
      )
    })
  } else {
    const list = digits.length
      ? digits.map((digit, i) => ({ digit, x: 110 + (i - (digits.length - 1) / 2) * 36 }))
      : [82, 110, 138].map((x) => ({ digit: '', x }))
    candleNodes = list.map((c, i) => (
      <g key={i}>
        {c.digit ? (
          <text
            x={c.x}
            y={base}
            textAnchor="middle"
            fontFamily="var(--rb-display, var(--font-fredoka)), sans-serif"
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
          <rect x={c.x - 3.5} y={base - 30} width="7" height="32" rx="3" fill="url(#rb-gold)" />
        )}
        <rect x={c.x - 0.9} y={base - (c.digit ? 48 : 38)} width="1.8" height="9" fill="#7A5E2A" />
        <Flame x={c.x} y={base - (c.digit ? 48 : 38)} i={i} lit={lit} dance={dance} calm={calm} />
      </g>
    ))
  }

  const flavorLabel = CAKE_FLAVORS.find(([v]) => v === kind)?.[1] ?? 'Torta'
  return (
    <svg
      viewBox="0 0 220 236"
      role="img"
      aria-label={age ? `${flavorLabel} con velas del ${age}` : `${flavorLabel} de cumpleaños`}
      style={{ display: 'block', overflow: 'visible', ...style }}
    >
      <defs>
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

      {kind === 'cupcake' ? <Cupcake id={id} /> : <TieredCake flavor={kind} id={id} />}

      {candleNodes}
    </svg>
  )
}
