import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Icon } from '@/ui/Icon'
import { Bunting, Burst, Rays } from '../ribbly/art'
import { Btn, editable, Sheet, Stage, T, TapMark, u } from '../ribbly/ui'
import { Loop, spring } from './motion'
import type { Props } from './shared'

const STRIPES = ['#F44E63', '#FFD35C', '#4FC3F7', '#5ED6A8', '#B28DFF', '#FF8FB1', '#F2A93B']
const STAR = 'M100 6 L128 70 L196 76 L144 122 L160 190 L100 154 L40 190 L56 122 L4 76 L72 70 Z'
const CANDY = ['#F44E63', '#FFD35C', '#4FC3F7', '#5ED6A8', '#B28DFF', '#FF8FB1', '#7A4A2A']

/** Estrella de papel picado a rayas, con ojitos. `half` dibuja una sola mitad. */
function PinataStar({ half }: { half?: 'left' | 'right' }) {
  const id = `rb-pinata-${half ?? 'full'}`
  return (
    <svg
      viewBox="0 0 200 196"
      style={{ display: 'block', width: '100%', overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <clipPath id={id}>
          <path d={STAR} />
        </clipPath>
        <clipPath id={`${id}-half`}>
          {half === 'left' ? (
            <path d="M-10 -10 H104 L92 40 L108 80 L90 120 L106 160 L96 210 H-10 Z" />
          ) : half === 'right' ? (
            <path d="M210 -10 H104 L92 40 L108 80 L90 120 L106 160 L96 210 H210 Z" />
          ) : (
            <rect x="-10" y="-10" width="220" height="220" />
          )}
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-half)`}>
        <g clipPath={`url(#${id})`}>
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`M-4 ${i * 20} h208 v15 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 l-8 7 l-8 -7 Z`}
              fill={STRIPES[i % STRIPES.length]}
            />
          ))}
          <path d={STAR} fill="none" stroke="rgba(120,40,40,0.14)" strokeWidth="6" />
        </g>
        <circle cx="80" cy="96" r="7" fill="#1C2A5A" />
        <circle cx="120" cy="96" r="7" fill="#1C2A5A" />
        <circle cx="82" cy="94" r="2.2" fill="#fff" />
        <circle cx="122" cy="94" r="2.2" fill="#fff" />
      </g>
    </svg>
  )
}

/**
 * 17 · Piñata. Dos vistas: la piñata colgando (cada toque la sacude y suma un
 * golpe) y, cuando se rompe, la lluvia de caramelos con el mensaje sobre el
 * año que empieza.
 */
export function GamePinata({ theme, buyer, ctx }: Props<'game.pinata'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const swing = useAnimationControls()
  const [hits, setHits] = useState(0)
  const [saving, setSaving] = useState(false)
  const needed = theme.hits
  const broken = hits >= needed
  // Sin mensaje propio, uno del banco: siempre el mismo para el mismo regalo.
  const bank = theme.messages.filter((m) => m.trim())
  const seed = (ctx.recipientName + ctx.senderName).length
  const message = buyer.message.trim() || bank[seed % Math.max(bank.length, 1)] || ''
  const cheer = hits > 0 ? theme.cheers[Math.min(hits, theme.cheers.length) - 1] : ''

  const hit = () => {
    if (broken) return
    const next = hits + 1
    setHits(next)
    if (!calm) navigator.vibrate?.(next >= needed ? [30, 40, 80] : 30)
    void swing.start({
      rotate: [0, next % 2 ? 24 : -24, -14, 8, -3, 0],
      transition: { duration: 0.9, ease: 'easeOut' },
    })
  }

  return (
    <Stage bg="linear-gradient(180deg, #FFD98A 0%, #FFAE6B 45%, #F79AB0 100%)">
      <div className="rb-bg">
        <Rays at={broken ? '50% 40%' : '50% 55%'} strength={0.18} />
      </div>
      <Bunting />

      <div className="rb-body">
        <AnimatePresence mode="wait" initial={false}>
          {!broken ? (
            <motion.div
              key="golpear"
              style={{ display: 'contents' }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <p className="rb-kicker" style={{ color: 'var(--rb-noche)', marginTop: u(64) }}>
                <T text={theme.kicker} ctx={ctx} />
              </p>
              <h2 className="rb-pinata-title" style={{ marginTop: u(8) }}>
                <T text={theme.title} ctx={ctx} />
              </h2>
              <p
                className="rb-sub"
                style={{
                  color: 'var(--rb-noche)',
                  fontWeight: 600,
                  fontSize: u(13),
                  marginTop: u(6),
                }}
              >
                <T text={theme.subtitle} ctx={ctx} />
              </p>

              <div className="rb-grow">
                {/* Se mece sola desde la cuerda; cada golpe le da un envión. */}
                <Loop
                  active={active && !calm}
                  duration={3.6}
                  frames={['rotate(-5deg)', 'rotate(5deg)', 'rotate(-5deg)']}
                  style={{ position: 'absolute', inset: 0, transformOrigin: '50% -40%' }}
                >
                  <motion.button
                    type="button"
                    className="rb-pinata"
                    onClick={hit}
                    aria-label={`Golpear la piñata (${hits} de ${needed})`}
                    animate={swing}
                    whileTap={{ scale: 0.94 }}
                  >
                    <i className="rb-rope" aria-hidden />
                    <span style={{ display: 'block', position: 'relative' }}>
                      <PinataStar />
                      {hits === 0 && <TapMark style={{ left: '50%', top: '56%' }} />}
                    </span>
                  </motion.button>
                </Loop>
                {hits > 0 && (
                  <Burst key={hits} y="48%" seed={hits} count={16} power={0.7} colors={CANDY} />
                )}
              </div>

              <div className="rb-hits" aria-hidden>
                {Array.from({ length: needed }, (_, i) => (
                  <i key={i} className={i < hits ? 'is-on' : ''}>
                    {i < hits && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={spring.pop}
                      >
                        💥
                      </motion.span>
                    )}
                  </i>
                ))}
              </div>
              <p
                className="rb-hand"
                style={{
                  color: 'var(--rb-coral)',
                  fontSize: u(25),
                  minHeight: u(30),
                  margin: `${u(12)} 0 ${u(34)}`,
                }}
                aria-live="polite"
              >
                <T text={cheer} ctx={ctx} />
              </p>
            </motion.div>
          ) : (
            <motion.div key="mensaje" style={{ display: 'contents' }}>
              <Burst key="rota" y="26%" count={60} power={1.4} colors={CANDY} />
              <div
                style={{
                  position: 'relative',
                  width: u(210),
                  height: u(170),
                  marginTop: u(72),
                  flex: 'none',
                }}
              >
                {(['left', 'right'] as const).map((half) => (
                  <motion.div
                    key={half}
                    style={{ position: 'absolute', inset: 0 }}
                    initial={{ x: 0, rotate: 0, y: 30 }}
                    animate={{
                      x: half === 'left' ? '-16%' : '16%',
                      y: 0,
                      rotate: half === 'left' ? -22 : 20,
                      transition: spring.bouncy,
                    }}
                  >
                    <PinataStar half={half} />
                  </motion.div>
                ))}
                {(['chupetin', 'chocolate', 'estrella', 'chupetin', 'estrella'] as const).map(
                  (icon, i) => (
                    <motion.div
                      key={i}
                      style={{ position: 'absolute', left: `${12 + i * 19}%`, top: '34%' }}
                      initial={{ opacity: 0, y: -20, scale: 0.3 }}
                      animate={{
                        opacity: 1,
                        y: [0, 40 + (i % 3) * 22],
                        rotate: (i - 2) * 24,
                        scale: 1,
                        transition: { duration: 0.9, delay: 0.1 + i * 0.07, ease: 'easeOut' },
                      }}
                    >
                      <Icon name={icon} size={u(30)} />
                    </motion.div>
                  ),
                )}
              </div>

              <div className="rb-grow">
                <motion.div
                  className="rb-fortune"
                  initial={{ opacity: 0, y: 50, rotate: 8, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    rotate: -2,
                    scale: 1,
                    transition: { ...spring.bouncy, delay: 0.45 },
                  }}
                >
                  <p className="rb-kicker" style={{ fontSize: u(11), color: 'var(--rb-coral)' }}>
                    <T text={theme.messageKicker} ctx={ctx} />
                  </p>
                  <p
                    {...editable(ctx, 'message')}
                    className="rb-playfair"
                    style={{
                      fontWeight: 700,
                      fontStyle: 'italic',
                      fontSize: u(message.length > 80 ? 19 : 22.5),
                      lineHeight: 1.25,
                      marginTop: u(10),
                      textWrap: 'balance',
                    }}
                  >
                    “{message}”
                  </p>
                </motion.div>
                <motion.p
                  className="rb-hand rb-shadow-text"
                  style={{ fontSize: u(30), fontWeight: 700, marginTop: u(26) }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1, transition: { ...spring.pop, delay: 0.8 } }}
                >
                  <T text={theme.celebration} ctx={ctx} />
                </motion.p>
              </div>

              <motion.div
                className="rb-actions"
                style={{ marginTop: 0 }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 1 } }}
              >
                <Btn variant="white" onClick={() => setSaving(true)}>
                  <T text={theme.saveLabel} ctx={ctx} />
                </Btn>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Sheet
        open={saving}
        onClose={() => setSaving(false)}
        icon={<Icon name="camara" size="1em" large />}
        title="Guardá tu mensaje"
      >
        Hacé una <strong>captura de pantalla</strong> y te queda en tus fotos para acordarte todo el
        año.
      </Sheet>
    </Stage>
  )
}
