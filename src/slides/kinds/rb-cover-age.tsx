import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion'
import { useEffect } from 'react'
import { Icon } from '@/ui/Icon'
import { Balloon, Confetti } from '../ribbly/art'
import { Btn, Chip, Stage, T, u } from '../ribbly/ui'
import { Appear, ease, Pop } from './motion'
import type { Props } from './shared'

/** El número cuenta desde cero hasta la edad cuando la pantalla entra. */
function CountUp({ to, active }: { to: number; active: boolean }) {
  const calm = useReducedMotion()
  const value = useMotionValue(0)
  const shown = useTransform(value, (v) => String(Math.round(v)))
  useEffect(() => {
    if (calm) return value.set(to)
    if (!active) return value.set(0)
    const controls = animate(value, to, { duration: 1.5, delay: 0.25, ease: ease.out })
    return () => controls.stop()
  }, [active, calm, to, value])
  return (
    <span className="rb-age" aria-label={String(to)}>
      <motion.span className="rb-age-back" aria-hidden>
        {shown}
      </motion.span>
      <motion.span className="rb-age-front" aria-hidden>
        {shown}
      </motion.span>
    </span>
  )
}

/** 03 · Edición cumple: la edad en dorado bajo un haz de luz y un deseo para empezar. */
export function CoverAge({ theme, buyer, ctx }: Props<'cover.age'>) {
  const active = ctx.active
  const age = Number(ctx.vars.edad)
  const wish = buyer.wish.trim() || theme.defaultWish

  return (
    <Stage bg="linear-gradient(180deg, #2B1B5E 0%, #5B2A7E 55%, #7B3FA0 100%)">
      <div className="rb-bg">
        <i className="rb-beam" />
        <Confetti seed={3} count={18} opacity={0.85} />
      </div>
      <Balloon
        color="#FFD35C"
        style={{ right: '6%', top: '13%', width: u(40), opacity: 0.9 }}
        duration={7}
      />

      <div className="rb-body">
        <Appear
          as="p"
          active={active}
          y={10}
          className="rb-kicker"
          style={{ color: 'var(--rb-sol)', marginTop: u(8) }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>

        <Pop active={active} delay={0.1} from={0.4} style={{ marginTop: u(14) }}>
          {age > 0 ? (
            <CountUp to={age} active={active} />
          ) : (
            <Icon name="torta" size={u(120)} large />
          )}
        </Pop>
        <Appear
          as="p"
          active={active}
          delay={0.5}
          className="rb-hand"
          style={{ fontSize: u(31), fontWeight: 700, marginTop: u(4) }}
        >
          <T text={theme.caption} ctx={ctx} />
        </Appear>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: u(8),
            margin: `${u(26)} 0 ${u(8)}`,
          }}
        >
          <Pop active={active} delay={0.75} from={0.3} rotate={-14}>
            <Chip mods="is-yellow" style={{ transform: 'rotate(-3deg)' }}>
              <T text={theme.chip1} ctx={ctx} />
            </Chip>
          </Pop>
          <Pop active={active} delay={0.9} from={0.3} rotate={14}>
            <Chip style={{ transform: 'rotate(2deg)' }}>
              <T text={theme.chip2} ctx={ctx} />
            </Chip>
          </Pop>
        </div>

        <div className="rb-grow">
          <Appear active={active} delay={1.05} y={30} className="rb-glass rb-wish-card">
            <p
              className="rb-kicker"
              style={{ color: 'var(--rb-lila)', fontSize: u(11), marginBottom: u(8) }}
            >
              <T text={theme.wishLabel} ctx={ctx} />
            </p>
            <p className="rb-hand" style={{ fontSize: u(27), textAlign: 'left' }}>
              “{wish}”
            </p>
            {ctx.senderName && (
              <p style={{ marginTop: u(10), fontSize: u(13), color: '#C9B8E8', fontWeight: 500 }}>
                — {ctx.senderName}
              </p>
            )}
          </Appear>
        </div>

        <div className="rb-actions" style={{ alignItems: 'flex-start', paddingLeft: 0 }}>
          <Appear active={active} delay={1.3} y={20}>
            <Btn variant="white" onClick={ctx.next} style={{ fontSize: u(15) }}>
              <T text={theme.cta} ctx={ctx} />
            </Btn>
          </Appear>
        </div>
      </div>
    </Stage>
  )
}
