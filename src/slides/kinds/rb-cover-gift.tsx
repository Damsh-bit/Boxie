import { motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Bokeh, Bow, Burst, Heart, ROSE } from '../ribbly/art'
import { Btn, editable, piece, Stage, T, TapMark, u } from '../ribbly/ui'
import { Appear, ease, frames, Loop, Pop, spring } from './motion'
import type { Props } from './shared'

function nameSize(name: string): number {
  const length = name.length
  if (length <= 6) return 60
  if (length <= 9) return 50
  if (length <= 13) return 40
  return 31
}

/**
 * 02 · Portada de Pareja: una caja de regalo que salta y se abre al tocarla, y
 * su nombre con un subrayado hecho a mano. La caja es el punto de toque.
 */
export function CoverGift({ theme, ctx }: Props<'cover.gift'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const [open, setOpen] = useState(false)
  // Al volver a la portada, la caja está cerrada de nuevo.
  if (!active && open) setOpen(false)
  const name = ctx.recipientName || 'Alguien especial'

  const tap = () => (open ? ctx.next() : setOpen(true))

  return (
    <Stage bg="linear-gradient(165deg, #F7798A 0%, #F44E63 55%, #E8405A 100%)">
      <div className="rb-bg">
        <Bokeh
          seed={22}
          count={14}
          colors={['#FFFFFF', '#FFCCD5', '#FFC56E']}
          blur={8}
          maxOpacity={0.4}
        />
        {/* La R de fondo, gigante y apenas visible. */}
        <i
          className="rb-mark"
          style={{
            position: 'absolute',
            right: '-18%',
            top: '2%',
            height: '62%',
            color: 'rgba(255,255,255,0.07)',
          }}
          aria-hidden
        />
      </div>

      <div className="rb-body">
        <Appear
          as="p"
          active={active}
          y={-8}
          aria-hidden
          style={{ marginTop: u(26), letterSpacing: '0.6em', fontSize: u(11), opacity: 0.75 }}
        >
          ♥ ♥ ♥ ♥ ♥ ♥
        </Appear>

        <div className="rb-grow" style={{ justifyContent: 'center' }}>
          <Appear active={active} delay={0.15} y={60} duration={0.9}>
            <Loop
              active={active && !open}
              duration={2.8}
              frames={frames.wiggle(3)}
              style={{ transformOrigin: '50% 100%' }}
            >
              <motion.button
                type="button"
                className="rb-gift-tap rb-gift"
                onClick={tap}
                aria-label={open ? 'Seguir' : 'Abrir el regalo'}
                whileTap={{ scale: 0.95 }}
                animate={open && !calm ? { y: [0, -26, 0], scale: [1, 1.06, 1] } : { y: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                style={{ width: u(150), height: u(140) }}
                {...piece(ctx, 'regalo')}
              >
                <motion.i
                  className="rb-gift-light"
                  initial={false}
                  animate={{ opacity: open ? 1 : 0 }}
                  transition={{ duration: 0.5, delay: 0.25 }}
                />
                <div className="rb-gift-box" />
                <motion.div
                  className="rb-gift-lid"
                  initial={false}
                  animate={
                    open
                      ? {
                          y: '-150%',
                          x: '30%',
                          rotate: 24,
                          transition: { ...spring.bouncy, delay: 0.2 },
                        }
                      : { y: '0%', x: '0%', rotate: 0 }
                  }
                >
                  <Bow />
                </motion.div>
                {!open && <TapMark style={{ left: '50%', top: '62%' }} />}
              </motion.button>
            </Loop>
            {open && (
              <>
                <Burst key="abrio" y="30%" count={40} colors={ROSE} />
                {[
                  { x: -70, rotate: -18, size: 30 },
                  { x: 8, rotate: 6, size: 40 },
                  { x: 74, rotate: 16, size: 26 },
                ].map((h, i) => (
                  <motion.div
                    key={i}
                    aria-hidden
                    style={{ position: 'absolute', left: '50%', top: '18%', width: u(h.size) }}
                    initial={{ opacity: 0, x: 0, y: 0, scale: 0.3 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      x: `calc(var(--u) * ${h.x})`,
                      y: `calc(var(--u) * -120)`,
                      scale: 1,
                      rotate: h.rotate,
                    }}
                    transition={{ duration: 1.8, delay: 0.35 + i * 0.12, ease: ease.out }}
                  >
                    <Heart still />
                  </motion.div>
                ))}
              </>
            )}
          </Appear>

          <Appear
            as="p"
            active={active}
            delay={0.4}
            className="rb-sub"
            style={{ fontWeight: 600, fontSize: u(16), marginTop: u(46) }}
          >
            <T text={theme.kicker} ctx={ctx} />
          </Appear>
          <Pop
            as="h1"
            active={active}
            delay={0.55}
            from={0.5}
            className="rb-love-name"
            style={{ fontSize: u(nameSize(name)), marginTop: u(10), maxWidth: '100%' }}
            {...editable(ctx, '@recipientName')}
          >
            {name}
            <svg
              className="rb-underline"
              viewBox="0 0 200 16"
              preserveAspectRatio="none"
              aria-hidden
            >
              <motion.path
                d="M4 10 C40 2 70 14 104 7 S170 4 196 9"
                fill="none"
                stroke="#fff"
                strokeWidth="4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={false}
                animate={{ pathLength: active ? 1 : 0 }}
                transition={{ duration: 0.8, delay: active ? 1 : 0, ease: ease.out }}
              />
            </svg>
          </Pop>
        </div>

        <div className="rb-actions" style={{ marginTop: 0 }}>
          <Appear active={active} delay={0.9} y={20} style={{ position: 'relative' }}>
            <Btn variant="glass" mods="is-ink" onClick={tap} style={{ fontSize: u(15) }}>
              <T text={open ? theme.opened : theme.hint} ctx={ctx} />
            </Btn>
          </Appear>
          <Appear
            as="p"
            active={active}
            delay={1.05}
            y={10}
            className="rb-sender"
            {...editable(ctx, '@senderName')}
          >
            <T text={theme.senderPrefix} ctx={ctx} /> {ctx.senderName}
          </Appear>
        </div>
      </div>
    </Stage>
  )
}
