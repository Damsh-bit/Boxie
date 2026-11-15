import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { Stars } from '../ribbly/art'
import { Stage, T, u } from '../ribbly/ui'
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

/**
 * 09 · Cine: se abre el telón y aparecen los pochoclos, la marquesina y una
 * entrada VIP a nombre de quien cumple. Un toque (o unos segundos) y sigue.
 */
export function ConnectorPremiere({ theme, ctx }: Props<'connector.premiere'>) {
  const active = ctx.active
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
      bg="radial-gradient(120% 70% at 50% 100%, #3A2466 0%, #1B1338 60%, #120C24 100%)"
      onClick={next}
      style={{ cursor: 'pointer' }}
    >
      <div className="rb-bg">
        <i className="rb-beam" style={{ height: '78%', opacity: 0.8 }} />
        <Stars seed={9} count={14} sparks={0} area={60} />
      </div>
      <motion.i className="rb-curtain" style={{ left: 0 }} {...curtain(-1)} aria-hidden />
      <motion.i className="rb-curtain" style={{ right: 0 }} {...curtain(1)} aria-hidden />
      <i className="rb-valance" aria-hidden />

      <div className="rb-body" style={{ zIndex: 5, pointerEvents: 'none' }}>
        <Appear
          as="p"
          active={active}
          delay={1}
          className="rb-kicker"
          style={{ color: 'var(--rb-sol)', marginTop: u(56) }}
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
            style={{ position: 'relative', width: u(196), marginBottom: u(54) }}
            initial={false}
            animate={
              active
                ? { y: 0, opacity: 1, scale: 1, transition: { ...spring.bouncy, delay: 1.35 } }
                : { y: 80, opacity: 0, scale: 0.8, transition: { duration: 0.2 } }
            }
          >
            <Loop active={active} delay={2.2} duration={3.4} frames={frames.pulse(1.025)}>
              <Popcorn />
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
                  text={ctx.vars.edad ? theme.ticketDetail : 'Fila 1 · la mejor butaca 🍿'}
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
