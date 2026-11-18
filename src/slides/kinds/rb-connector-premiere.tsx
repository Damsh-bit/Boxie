import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Stars } from '../ribbly/art'
import { useRbPalette } from '../ribbly/look'
import { editable, Stage, T, u } from '../ribbly/ui'
import { Appear, ease, frames, Loop, spring } from './motion'
import type { Props } from './shared'

const PUFFS = [
  [36, 64, 20],
  [64, 46, 24],
  [100, 38, 26],
  [136, 46, 24],
  [164, 64, 20],
  [50, 82, 20],
  [82, 68, 24],
  [118, 68, 24],
  [150, 82, 20],
  [100, 84, 22],
] as const

/** Balde de pochoclos a rayas. */
function Popcorn() {
  return (
    <svg
      viewBox="0 0 200 250"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <clipPath id="rb-bucket">
          <path d="M30 96 H170 L152 244 H48 Z" />
        </clipPath>
        <radialGradient id="rb-puff" cx="38%" cy="32%" r="70%">
          <stop offset="0" stopColor="#FFFBEA" />
          <stop offset="1" stopColor="#F7E2A4" />
        </radialGradient>
      </defs>
      {PUFFS.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill="url(#rb-puff)" />
      ))}
      <g clipPath="url(#rb-bucket)">
        <rect x="20" y="90" width="160" height="160" fill="#fff" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M${34 + i * 38} 90 h19 l-4 160 h-11 Z`} fill="#E63950" />
        ))}
        <path d="M130 90 h50 v160 h-36 Z" fill="rgba(28,42,90,0.1)" />
      </g>
      <rect x="22" y="88" width="156" height="14" rx="7" fill="#fff" />
      <rect x="22" y="97" width="156" height="5" rx="2.5" fill="rgba(28,42,90,0.12)" />
    </svg>
  )
}

/** Vaso de gaseosa con tapa, sorbete y burbujas. */
function Soda({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 200 250"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <clipPath id="rb-cup">
          <path d="M44 78 H156 L140 244 H60 Z" />
        </clipPath>
      </defs>
      <path d="M118 6 L108 74" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path
        d="M118 6 L108 74"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray="10 10"
      />
      <g clipPath="url(#rb-cup)">
        <rect x="30" y="70" width="140" height="180" fill="#fff" />
        <path d="M30 120 C70 108 130 132 170 118 V250 H30 Z" fill={color} />
        {[
          [80, 170, 5],
          [112, 150, 4],
          [98, 206, 6],
          [126, 190, 3.5],
        ].map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="rgba(255,255,255,0.6)" />
        ))}
        <path d="M130 78 h40 v172 h-44 Z" fill="rgba(28,42,90,0.1)" />
      </g>
      <rect x="36" y="64" width="128" height="18" rx="9" fill="#fff" />
      <path d="M50 64 Q100 40 150 64 Z" fill="#fff" />
      <rect x="36" y="76" width="128" height="6" rx="3" fill="rgba(28,42,90,0.12)" />
    </svg>
  )
}

/** Bolsa de golosinas con caramelos asomando. */
function Candy({ color, accent }: { color: string; accent: string }) {
  const candies: [number, number, string, number][] = [
    [62, 70, '#FF8FB1', -20],
    [96, 56, '#4FC3F7', 10],
    [132, 68, '#5ED6A8', 30],
    [80, 90, '#FFD35C', -40],
    [118, 88, '#B28DFF', 15],
  ]
  return (
    <svg
      viewBox="0 0 200 250"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      {candies.map(([x, y, c, r], i) => (
        <g key={i} transform={`rotate(${r} ${x} ${y})`}>
          <path d={`M${x - 22} ${y} l8 -8 v16 Z M${x + 22} ${y} l-8 -8 v16 Z`} fill={c} />
          <ellipse cx={x} cy={y} rx="15" ry="11" fill={c} />
          <path
            d={`M${x - 8} ${y - 4} q8 -6 16 0`}
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      ))}
      <path d="M36 96 H164 L150 244 H50 Z" fill={color} />
      <path d="M36 96 H164 L160 120 H40 Z" fill="rgba(0,0,0,0.12)" />
      <path d="M60 150 h80 M66 176 h68" stroke={accent} strokeWidth="10" strokeLinecap="round" />
      <path d="M128 96 h36 l-14 148 h-30 Z" fill="rgba(28,42,90,0.1)" />
    </svg>
  )
}

/**
 * 09 · Cine: se abre el telón y aparecen los pochoclos, la marquesina y una
 * entrada VIP a nombre de quien cumple. Un toque (o unos segundos) y sigue.
 */
export function ConnectorPremiere({ theme, ctx }: Props<'connector.premiere'>) {
  const active = ctx.active
  const palette = useRbPalette()
  const { autoAdvance } = theme
  const { preview, next } = ctx

  useEffect(() => {
    if (!active || preview || !autoAdvance) return
    // El telón tarda en abrirse: los segundos cuentan desde que se ve todo.
    const timer = setTimeout(next, (autoAdvance + 1.6) * 1000)
    return () => clearTimeout(timer)
  }, [active, preview, autoAdvance, next])

  const open = active
  const curtain = (side: -1 | 1) => ({
    initial: false as const,
    animate: { x: open ? `${side * 66}%` : '0%', skewX: open ? side * -3 : 0 },
    transition: { duration: 1.5, delay: open ? 0.25 : 0, ease: ease.inOut },
  })

  return (
    <Stage
      tone="deep"
      className={theme.look === 'pareja' ? 'is-pareja' : ''}
      bg={
        theme.look === 'pareja'
          ? 'radial-gradient(120% 70% at 50% 100%, #4A1E44 0%, #2A1430 60%, #1A0C1E 100%)'
          : 'radial-gradient(120% 70% at 50% 100%, #3A2466 0%, #1B1338 60%, #120C24 100%)'
      }
      onClick={next}
      style={{ cursor: 'pointer' }}
      data-telon={ctx.style.telon && ctx.style.telon !== 'original' ? ctx.style.telon : undefined}
    >
      <div className="rb-bg">
        <i className="rb-beam" style={{ height: '78%', opacity: 0.8 }} />
        <Stars seed={9} count={14} sparks={0} area={60} />
      </div>
      <motion.i className="rb-curtain" style={{ left: 0 }} {...curtain(-1)} aria-hidden />
      <motion.i className="rb-curtain" style={{ right: 0 }} {...curtain(1)} aria-hidden />
      <i className="rb-valance" aria-hidden {...editable(ctx, '', 'telon')} />

      <div className="rb-body" style={{ zIndex: 5, pointerEvents: 'none' }}>
        <Appear
          as="p"
          active={active}
          delay={1}
          className="rb-kicker"
          style={{
            color: theme.look === 'pareja' ? '#FFC56E' : 'var(--rb-sol)',
            marginTop: u(56),
          }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Appear
          as="h2"
          active={active}
          delay={1.1}
          className="rb-title"
          style={{ fontSize: u(33), marginTop: u(8), maxWidth: u(260) }}
        >
          <T text={theme.title} ctx={ctx} />
        </Appear>
        <Appear as="p" active={active} delay={1.25} className="rb-sub" style={{ marginTop: u(8) }}>
          <T text={theme.subtitle} ctx={ctx} />
        </Appear>

        <div className="rb-grow" style={{ justifyContent: 'flex-end' }}>
          <motion.div
            {...editable(ctx, '', 'snack')}
            style={{ position: 'relative', width: u(196), marginBottom: u(54) }}
            initial={false}
            animate={
              active
                ? { y: 0, opacity: 1, scale: 1, transition: { ...spring.bouncy, delay: 1.35 } }
                : { y: 80, opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
            }
          >
            <Loop active={active} delay={2.2} duration={3.4} frames={frames.pulse(1.025)}>
              {ctx.style.snack === 'gaseosa' ? (
                <Soda color={palette?.primary ?? '#E63950'} />
              ) : ctx.style.snack === 'golosinas' ? (
                <Candy
                  color={palette?.primary ?? '#F44E63'}
                  accent={palette?.accent ?? '#FFD35C'}
                />
              ) : (
                <Popcorn />
              )}
            </Loop>
            <span className="rb-marquee">
              <T text={theme.marquee} ctx={ctx} />
            </span>
            <motion.div
              className="rb-vip"
              initial={false}
              animate={
                active
                  ? { x: 0, opacity: 1, rotate: -8, transition: { ...spring.bouncy, delay: 1.8 } }
                  : { x: 80, opacity: 0, rotate: 10, transition: { duration: 0.2 } }
              }
            >
              <p className="rb-kicker" style={{ fontSize: u(10), color: 'var(--rb-coral)' }}>
                <T text={theme.ticketKicker} ctx={ctx} />
              </p>
              <p
                className="rb-fredoka"
                style={{ fontWeight: 700, fontSize: u(16), marginTop: u(3) }}
              >
                <T text={theme.ticketName} ctx={ctx} />
              </p>
              <p style={{ fontSize: u(11), color: 'var(--rb-tinta-2)', fontWeight: 500 }}>
                <T
                  text={
                    // Si el detalle nombra la edad y no hay edad, otro detalle.
                    !ctx.vars.edad && theme.ticketDetail.includes('{{edad}}')
                      ? 'Fila 1 · la mejor butaca 🍿'
                      : theme.ticketDetail
                  }
                  ctx={ctx}
                />
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </Stage>
  )
}
