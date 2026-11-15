import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { Icon } from '@/ui/Icon'
import { Burst, Constellation, Cookie, Moon, Stars } from '../ribbly/art'
import { Btn, Sheet, Stage, T, TapMark, u } from '../ribbly/ui'
import { ease, frames, Loop, spring } from './motion'
import type { Props } from './shared'

const GOLD = ['#FFC56E', '#FFE8C8', '#FFFFFF', '#F7798A']

/**
 * 17 · Fortuna. Dos vistas: tres galletitas bajo las estrellas (la del medio
 * con un halo) y, al elegir una, la galletita se parte y sale el papelito con
 * el mensaje. El resultado no depende de cuál elija.
 */
export function GameCookie({ theme, buyer, ctx }: Props<'game.cookie'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const [picked, setPicked] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  if (!active && picked !== null) setPicked(null)
  const bank = theme.messages.filter((m) => m.trim())
  const seed = (ctx.recipientName + ctx.senderName).length
  const message = buyer.message.trim() || bank[seed % Math.max(bank.length, 1)] || ''

  return (
    <Stage bg="linear-gradient(180deg, #5B2A8E 0%, #3A2A8E 45%, #1E2A6E 100%)">
      <div className="rb-bg">
        <Stars seed={17} count={34} sparks={6} area={100} />
      </div>
      <Moon style={{ position: 'absolute', left: '7%', top: '25%', width: u(46) }} />

      <AnimatePresence mode="wait" initial={false}>
        {picked === null ? (
          <motion.div
            key="elegir"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <p className="rb-hand" style={{ color: '#FFC56E', fontSize: u(23), marginTop: u(16) }}>
              <T text={theme.kicker} ctx={ctx} />
            </p>
            <h2
              className="rb-playfair"
              style={{
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: u(46),
                lineHeight: 1.05,
                color: '#FFE8C8',
                textShadow: `0 0 ${u(24)} rgba(255,197,110,0.45)`,
              }}
            >
              <T text={theme.title} ctx={ctx} />
            </h2>
            <p className="rb-sub" style={{ fontWeight: 600, fontSize: u(13), marginTop: u(6) }}>
              <T text={theme.subtitle} ctx={ctx} />
            </p>

            <div className="rb-grow">
              <div className="rb-cookies">
                {[0, 1, 2].map((i) => {
                  const hint = i === 1
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      className={`rb-cookie ${hint ? 'is-hint' : ''}`}
                      onClick={() => setPicked(i)}
                      aria-label={`Elegir la galletita ${theme.labels[i] ?? i + 1}`}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        transition: { ...spring.bouncy, delay: 0.2 + i * 0.12 },
                      }}
                      whileTap={{ scale: 0.92 }}
                      whileHover={{ y: -6 }}
                    >
                      {hint && <i className="rb-halo" aria-hidden />}
                      <Loop
                        active={active}
                        delay={i * 0.5}
                        duration={3.4}
                        frames={frames.float(7, i === 1 ? 0 : i === 0 ? -4 : 4)}
                      >
                        <Cookie style={{ width: u(hint ? 118 : 88) }} />
                      </Loop>
                      {hint && <TapMark style={{ left: '50%', top: '38%' }} />}
                      <span className="rb-cookie-label">{theme.labels[i] ?? i + 1}</span>
                    </motion.button>
                  )
                })}
              </div>
              <Constellation style={{ width: '110%', marginTop: u(30), opacity: 0.85 }} />
            </div>

            <p className="rb-hand" style={{ fontSize: u(25), margin: `0 ${u(30)} ${u(30)}` }}>
              <T text={theme.instinct} ctx={ctx} />
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="mensaje"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <Burst key="partio" y="20%" count={30} power={0.9} colors={GOLD} />
            <div
              style={{
                position: 'relative',
                width: u(240),
                height: u(120),
                marginTop: u(20),
                flex: 'none',
              }}
            >
              {(['left', 'right'] as const).map((half) => (
                <motion.div
                  key={half}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    width: u(110),
                    marginLeft: u(-55),
                  }}
                  initial={{ x: 0, rotate: 0 }}
                  animate={{
                    x: `calc(var(--u) * ${half === 'left' ? -58 : 58})`,
                    rotate: half === 'left' ? -24 : 22,
                    transition: calm ? { duration: 0 } : spring.bouncy,
                  }}
                >
                  <Cookie
                    open
                    style={{
                      width: '100%',
                      transform: half === 'right' ? 'scaleX(-1)' : undefined,
                    }}
                  />
                </motion.div>
              ))}
            </div>

            <div className="rb-grow">
              <motion.div
                className="rb-fortune"
                style={{ background: '#FFF9EE' }}
                initial={{ opacity: 0, y: -70, scaleY: 0.2, rotate: 0 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scaleY: 1,
                  rotate: -2,
                  transition: { duration: 0.7, delay: 0.35, ease: ease.out },
                }}
              >
                <p className="rb-kicker" style={{ fontSize: u(11), color: 'var(--rb-coral)' }}>
                  <T text={theme.messageKicker} ctx={ctx} />
                </p>
                <p
                  className="rb-playfair"
                  style={{
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontSize: u(message.length > 100 ? 18 : 21.5),
                    lineHeight: 1.28,
                    marginTop: u(10),
                    color: '#2A2433',
                    textWrap: 'balance',
                  }}
                >
                  “{message}”
                </p>
              </motion.div>
              <motion.p
                className="rb-sub"
                style={{ marginTop: u(34) }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1 } }}
              >
                <T text={theme.closing1} ctx={ctx} />
              </motion.p>
              <motion.p
                className="rb-playfair"
                style={{
                  fontWeight: 900,
                  fontStyle: 'italic',
                  fontSize: u(44),
                  color: '#FFE8C8',
                  textShadow: `0 0 ${u(24)} rgba(255,197,110,0.5)`,
                }}
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1, transition: { ...spring.pop, delay: 1.25 } }}
              >
                <T text={theme.closing2} ctx={ctx} />
              </motion.p>
            </div>

            <motion.div
              className="rb-actions"
              style={{ marginTop: 0 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 1.4 } }}
            >
              <Btn variant="glass" mods="is-wide" onClick={() => setSaving(true)}>
                <T text={theme.saveLabel} ctx={ctx} />
              </Btn>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet
        open={saving}
        onClose={() => setSaving(false)}
        icon={<Icon name="camara" size="1em" large />}
        title="Guardá tu fortuna"
      >
        Hacé una <strong>captura de pantalla</strong> y te queda en tus fotos para releerla cuando
        la necesites.
      </Sheet>
    </Stage>
  )
}
