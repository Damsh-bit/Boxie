'use client'

import type { CSSProperties } from 'react'

/**
 * Piezas que se eligen como variaciones (docs/PLAN-VARIACIONES.md) y se usan
 * en más de una pantalla: globos de número metalizados, entre otras.
 */

type Vars = CSSProperties & Record<`--${string}`, string | number>

const FOILS = {
  dorado: ['#FFF4C2', '#F5C451', '#C98A1B', '#FFE7A0'],
  plateado: ['#FFFFFF', '#D9DEE8', '#8E98AC', '#F4F6FA'],
  rosa: ['#FFE4EC', '#F4A6BE', '#C25B7E', '#FFD3E0'],
} as const
export type Foil = keyof typeof FOILS

/**
 * Globo metalizado de un número (la edad). Cada dígito es un globo que flota
 * con su hilo. Se posiciona con `style` (left/top/width del grupo).
 */
export function FoilNumber({
  value,
  foil = 'dorado',
  style,
  duration = 6.4,
}: {
  value: string
  foil?: Foil
  style?: CSSProperties
  duration?: number
}) {
  const digits = value.slice(0, 3).split('')
  const [light, mid, deep, shine] = FOILS[foil]
  const id = `rb-foil-${foil}`
  const width = digits.length * 62
  return (
    <svg
      className="rb-balloon"
      viewBox={`0 0 ${width} 150`}
      aria-hidden
      style={
        {
          '--d': `${duration}s`,
          '--delay': '0s',
          '--tilt': '-2deg',
          overflow: 'visible',
          ...style,
        } as Vars
      }
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="0.35" stopColor={mid} />
          <stop offset="0.7" stopColor={deep} />
          <stop offset="1" stopColor={mid} />
        </linearGradient>
      </defs>
      {digits.map((digit, i) => {
        const x = 31 + i * 62
        return (
          <g key={i} transform={`rotate(${i % 2 ? 4 : -4} ${x} 60)`}>
            <path
              d={`M${x} 104 q-5 12 2 22 t-2 22`}
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="1.2"
            />
            <text
              x={x}
              y="104"
              textAnchor="middle"
              fontFamily="var(--font-fredoka), sans-serif"
              fontWeight="700"
              fontSize="112"
              fill={`url(#${id})`}
              stroke={shine}
              strokeWidth="3"
              paintOrder="stroke"
              style={{ filter: 'drop-shadow(0 4px 6px rgba(40,20,60,0.25))' }}
            >
              {digit}
            </text>
            <ellipse
              cx={x - 12}
              cy="30"
              rx="4"
              ry="12"
              fill="#fff"
              opacity="0.55"
              transform={`rotate(-18 ${x - 12} 30)`}
            />
          </g>
        )
      })}
    </svg>
  )
}

/** 07 · Un vinilo que gira asomando de su sobre. */
export function Vinyl({ color, label, spin }: { color: string; label: string; spin: boolean }) {
  return (
    <svg
      viewBox="0 0 250 142"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <radialGradient id="rb-vinyl" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#2A2A33" />
          <stop offset="0.7" stopColor="#15151B" />
          <stop offset="1" stopColor="#0B0B10" />
        </radialGradient>
      </defs>
      {/* El sobre */}
      <rect x="22" y="6" width="130" height="130" rx="8" fill={color} />
      <path
        d="M40 30 h60 M40 42 h40"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="132" cy="114" r="10" fill="rgba(255,255,255,0.35)" />
      {/* El disco */}
      <g
        className={spin ? 'rb-spin' : undefined}
        style={{ transformOrigin: '160px 71px', transformBox: 'view-box' }}
      >
        <circle cx="160" cy="71" r="66" fill="url(#rb-vinyl)" />
        {[56, 48, 40, 32].map((r) => (
          <circle
            key={r}
            cx="160"
            cy="71"
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth="1.2"
          />
        ))}
        <path
          d="M118 40 A52 52 0 0 1 150 22"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="160" cy="71" r="22" fill={label} />
        <circle
          cx="160"
          cy="71"
          r="22"
          fill="none"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="1"
        />
        <circle cx="160" cy="71" r="3" fill="#0B0B10" />
      </g>
    </svg>
  )
}

/** 07 · Un cassette con sus dos ruedas girando. */
export function Cassette({
  color,
  accent,
  spin,
}: {
  color: string
  accent: string
  spin: boolean
}) {
  const reel = (cx: number) => (
    <g
      className={spin ? 'rb-spin' : undefined}
      style={{ transformOrigin: `${cx}px 74px`, transformBox: 'view-box' }}
    >
      <circle cx={cx} cy="74" r="15" fill="#F7F4EE" />
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <rect
          key={a}
          x={cx - 2}
          y="61"
          width="4"
          height="7"
          rx="1"
          fill="#3A3540"
          transform={`rotate(${a} ${cx} 74)`}
        />
      ))}
      <circle cx={cx} cy="74" r="5" fill="#3A3540" />
    </g>
  )
  return (
    <svg
      viewBox="0 0 250 142"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <rect x="30" y="10" width="190" height="122" rx="12" fill="#2C2833" />
      <rect x="40" y="20" width="170" height="74" rx="8" fill={color} />
      <rect x="40" y="20" width="170" height="20" rx="8" fill={accent} />
      <path d="M52 52 h90" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" />
      <rect x="78" y="58" width="94" height="32" rx="16" fill="#1E1B24" />
      <path d="M96 74 h58" stroke="#5B4B3A" strokeWidth="10" />
      {reel(96)}
      {reel(154)}
      <path d="M62 132 l12 -26 h102 l12 26 Z" fill="#3A3540" />
      {[84, 110, 140, 166].map((x) => (
        <circle key={x} cx={x} cy="120" r="3.5" fill="#1E1B24" />
      ))}
    </svg>
  )
}

/** 07 · Un parlante retro (boombox) con los parlantes latiendo. */
export function Boombox({ color, accent, beat }: { color: string; accent: string; beat: boolean }) {
  const speaker = (cx: number) => (
    <g
      className={beat ? 'rb-beat' : undefined}
      style={{ transformOrigin: `${cx}px 86px`, transformBox: 'view-box' }}
    >
      <circle cx={cx} cy="86" r="30" fill="#1E1B24" />
      <circle cx={cx} cy="86" r="22" fill="#34303C" />
      <circle cx={cx} cy="86" r="9" fill={accent} />
    </g>
  )
  return (
    <svg
      viewBox="0 0 250 142"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <path
        d="M78 26 V12 a8 8 0 0 1 8 -8 h78 a8 8 0 0 1 8 8 v14"
        fill="none"
        stroke="#2C2833"
        strokeWidth="8"
      />
      <rect x="18" y="26" width="214" height="112" rx="16" fill={color} />
      <rect x="18" y="26" width="214" height="20" rx="10" fill="rgba(255,255,255,0.18)" />
      <rect x="100" y="56" width="50" height="26" rx="5" fill="#1E1B24" />
      <path d="M106 69 h38" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      {[104, 116, 128, 140].map((x) => (
        <rect key={x} x={x} y="92" width="8" height="8" rx="2" fill="#2C2833" />
      ))}
      {speaker(60)}
      {speaker(190)}
    </svg>
  )
}
