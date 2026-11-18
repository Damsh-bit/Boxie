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
