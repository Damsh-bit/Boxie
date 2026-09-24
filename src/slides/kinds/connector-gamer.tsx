import { motion, useReducedMotion } from 'framer-motion'
import { Appear, frames, Loop, Pop } from './motion'
import type { Props } from './shared'

const SHAPES = [
  { char: '✖', left: '10%', size: '2rem', delay: 0, duration: 6 },
  { char: '○', left: '80%', size: '3rem', delay: 1, duration: 8 },
  { char: '△', left: '20%', size: '4rem', delay: 2.5, duration: 7, color: '#ff9a9e' },
  { char: '□', left: '70%', size: '2.5rem', delay: 0.5, duration: 9 },
  { char: '✖', left: '50%', size: '1.5rem', delay: 3, duration: 5 },
]

export function ConnectorGamer({ theme, ctx }: Props<'connector.gamer'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fdfbfb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {SHAPES.map((s, i) => (
        <Loop
          key={i}
          active={active}
          className="bx-gamer-shape"
          delay={s.delay}
          duration={s.duration}
          easing="linear"
          frames={[
            'translateY(100px) rotate(0deg)',
            'translateY(-20vh) rotate(72deg)',
            'translateY(-80vh) rotate(288deg)',
            'translateY(-100vh) rotate(360deg)',
          ]}
          opacity={[0, 0.6, 0.6, 0]}
          times={[0, 0.2, 0.8, 1]}
          style={{ left: s.left, fontSize: s.size, color: s.color }}
          aria-hidden
        >
          {s.char}
        </Loop>
      ))}
      <div
        style={{
          zIndex: 10,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <Pop active={active} from={0.3} rotate={-20}>
          <Loop
            active={active}
            delay={0.8}
            duration={2}
            frames={frames.pulse(1.06)}
            style={{
              fontSize: '5rem',
              filter: 'drop-shadow(0 10px 20px rgba(244, 78, 99, 0.3))',
            }}
          >
            {theme.emoji}
          </Loop>
        </Pop>
        <div>
          <Appear
            as="h2"
            active={active}
            delay={0.2}
            y={14}
            style={{
              color: 'var(--bx-ink)',
              fontSize: '2rem',
              margin: 0,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            {theme.title}
          </Appear>
          <Appear
            as="p"
            active={active}
            delay={0.35}
            y={14}
            style={{
              color: 'var(--bx-primary)',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              margin: '5px 0 0 0',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            {theme.subtitle}
          </Appear>
        </div>
        <Appear
          active={active}
          delay={0.5}
          y={10}
          style={{
            width: 150,
            height: 4,
            background: '#eee',
            borderRadius: 10,
            marginTop: 20,
            overflow: 'hidden',
          }}
        >
          {/* Barra de "cargando" indeterminada: cruza de lado a lado. */}
          <motion.div
            style={{
              width: '60%',
              height: '100%',
              borderRadius: 10,
              background: 'var(--bx-primary)',
            }}
            initial={{ transform: 'translateX(-100%)' }}
            animate={
              active && !calm
                ? { transform: ['translateX(-100%)', 'translateX(170%)'] }
                : { transform: 'translateX(-100%)' }
            }
            transition={
              active && !calm
                ? { duration: 1.3, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }
                : { duration: 0.2 }
            }
          />
        </Appear>
      </div>
    </div>
  )
}
