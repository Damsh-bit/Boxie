import { useId, type CSSProperties } from 'react'
import { HEART_PATH, STORY_H, STORY_W, type Wave } from './love-art'

/**
 * Piezas de las pantallas de Pareja con ondas orgánicas (03 y 05): las ondas
 * como SVG, el corazón y la marca en minúscula. La geometría es la de
 * love-art.ts, la misma que dibuja la imagen para compartir.
 */

/** Las ondas, estiradas a lo que mida el escenario. */
export function Waves({ waves, style }: { waves: Wave[]; style?: CSSProperties }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      className="rb-waves"
      viewBox={`0 0 ${STORY_W} ${STORY_H}`}
      preserveAspectRatio="none"
      style={style}
      aria-hidden
    >
      <defs>
        {waves.map((w, i) =>
          w.gradient ? (
            <linearGradient
              key={i}
              id={`${id}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2={STORY_H}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor={w.gradient[0]} />
              <stop offset="1" stopColor={w.gradient[1]} />
            </linearGradient>
          ) : null,
        )}
      </defs>
      {waves.map((w, i) =>
        w.stroke ? (
          <path
            key={i}
            d={w.d}
            fill="none"
            stroke={w.stroke}
            strokeWidth={w.strokeWidth ?? 1}
            strokeLinecap="round"
            opacity={w.opacity}
            vectorEffect="non-scaling-stroke"
          />
        ) : (
          <path
            key={i}
            d={w.d}
            fill={w.gradient ? `url(#${id}-${i})` : w.fill}
            opacity={w.opacity}
          />
        ),
      )}
    </svg>
  )
}

export function HeartIcon({
  fill = 'none',
  stroke,
  strokeWidth = 1.8,
  className,
  style,
}: {
  fill?: string
  stroke?: string
  strokeWidth?: number
  className?: string
  style?: CSSProperties
}) {
  return (
    <svg viewBox="0 0 24 25" className={className} style={style} aria-hidden>
      <path
        d={HEART_PATH}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? strokeWidth : undefined}
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** "ribbly♥" en minúscula (el wordmark de estas pantallas). */
export function Wordmark({ color, style }: { color: string; style?: CSSProperties }) {
  return (
    <span className="rb-wordmark" style={{ color, ...style }} aria-label="Ribbly">
      <span aria-hidden>ribbly</span>
      <HeartIcon fill="currentColor" className="rb-wordmark-heart" />
    </span>
  )
}
