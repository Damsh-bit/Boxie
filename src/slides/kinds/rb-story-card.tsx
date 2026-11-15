import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bookmark } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '@/ui/Icon'
import { Balloon, Confetti, Squiggles } from '../ribbly/art'
import { Btn, Sheet, Stage, T, TapMark, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, ease, spring } from './motion'
import type { Props } from './shared'

/**
 * 04 · Tarjeta de cumple. Dos vistas: el sobre cerrado (se abre tocando el
 * sticker) y la tarjeta, que se despliega como una de papel: el lomo de color
 * y la hoja con la carta escrita por quien regala.
 */
export function StoryCard({ theme, buyer, ctx }: Props<'story.card'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // Si se va de la pantalla, la tarjeta vuelve a su sobre.
  if (!active && open) setOpen(false)

  const text = buyer.text.trim() || fill(theme.defaultText, ctx.vars)
  const spine = ctx.vars.edad ? fill(theme.spine, ctx.vars) : ''
  const textSize = text.length > 210 ? 17.5 : text.length > 150 ? 19 : 20.5

  return (
    <Stage bg="linear-gradient(170deg, #F2FAFE 0%, #EDE6F7 60%, #F9D9E2 100%)">
      <div className="rb-bg">
        <Confetti seed={4} count={16} opacity={0.8} />
        <Squiggles />
      </div>

      <div className="rb-body" style={{ color: 'var(--rb-noche)' }}>
        <Appear
          as="p"
          active={active}
          y={10}
          className="rb-kicker"
          style={{ color: 'var(--rb-cielo-p)', marginTop: u(8) }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Appear
          as="h2"
          active={active}
          delay={0.1}
          className="rb-title"
          style={{ fontWeight: 700, fontSize: u(29), marginTop: u(4) }}
        >
          <T text={theme.title} ctx={ctx} />
        </Appear>
        <Appear
          as="p"
          active={active}
          delay={0.2}
          className="rb-hand"
          style={{ color: 'var(--rb-coral)', fontSize: u(21) }}
        >
          <T text={theme.subtitle} ctx={ctx} />
        </Appear>

        <div className="rb-grow" style={{ margin: `${u(10)} 0` }}>
          <AnimatePresence mode="wait" initial={false}>
            {!open ? (
              <motion.div
                key="sobre"
                initial={{ opacity: 0, y: 40, rotate: -8, scale: 0.9 }}
                animate={{
                  opacity: active ? 1 : 0,
                  y: active ? 0 : 40,
                  rotate: -3,
                  scale: 1,
                  transition: { ...spring.bouncy, delay: active ? 0.3 : 0 },
                }}
                exit={{
                  opacity: 0,
                  y: 60,
                  rotate: 4,
                  scale: 0.86,
                  transition: { duration: 0.28, ease: ease.inOut },
                }}
              >
                <div className="rb-envelope">
                  <div className="rb-stamp">
                    <Icon name="globo" size={u(30)} />
                  </div>
                  <motion.button
                    type="button"
                    className="rb-seal"
                    onClick={() => setOpen(true)}
                    aria-label="Abrir la tarjeta"
                    whileTap={{ scale: 0.88 }}
                  >
                    <Icon name="torta" size={u(38)} />
                  </motion.button>
                  <TapMark style={{ left: '50%', top: '62%', zIndex: 4 }} />
                  <p
                    className="rb-hand"
                    style={{
                      position: 'absolute',
                      left: u(18),
                      right: u(18),
                      bottom: u(14),
                      textAlign: 'left',
                      fontSize: u(21),
                      transform: 'rotate(-2deg)',
                      zIndex: 2,
                    }}
                  >
                    <T text={theme.envelopeLine} ctx={ctx} />
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tarjeta"
                className="rb-card"
                initial={{ opacity: 0, scale: 0.7, y: 40, rotate: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: -1.5, transition: spring.bouncy }}
                exit={{ opacity: 0, scale: 0.8, y: 30, transition: { duration: 0.22 } }}
              >
                <div className="rb-card-spine">
                  <Balloon
                    color="#F44E63"
                    style={{ left: '12%', top: '8%', width: u(46) }}
                    duration={5}
                  />
                  <Balloon
                    color="#4FC3F7"
                    style={{ left: '48%', top: '19%', width: u(40) }}
                    duration={6}
                    delay={-2}
                    tilt={4}
                  />
                  {spine && <span className="rb-card-age">{spine}</span>}
                </div>
                {/* La hoja se abre como la tapa de una tarjeta. */}
                <motion.div
                  className="rb-card-page"
                  initial={calm ? false : { rotateY: -115 }}
                  animate={{ rotateY: 0 }}
                  transition={{ duration: 0.9, delay: 0.25, ease: ease.out }}
                >
                  <p
                    className="rb-hand"
                    style={{
                      color: 'var(--rb-coral)',
                      fontWeight: 700,
                      fontSize: u(28),
                      textAlign: 'left',
                    }}
                  >
                    {ctx.recipientName || 'Para vos'}:
                  </p>
                  {/* La carta se va "escribiendo": aparece de arriba hacia abajo. */}
                  <motion.p
                    className="rb-card-text"
                    style={{ fontSize: u(textSize) }}
                    initial={calm ? false : { clipPath: 'inset(0 0 100% 0)' }}
                    animate={{ clipPath: 'inset(0 0 0% 0)' }}
                    transition={{ duration: 2.2, delay: 0.95, ease: 'linear' }}
                  >
                    {text}
                  </motion.p>
                  <motion.p
                    className="rb-hand"
                    style={{
                      color: 'var(--rb-coral)',
                      fontSize: u(23),
                      textAlign: 'right',
                      marginTop: u(6),
                    }}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: calm ? 0 : 3 }}
                  >
                    — {ctx.senderName}
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {!open ? (
            <motion.div
              key="acciones-sobre"
              className="rb-actions"
              style={{ marginTop: 0 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: active ? 1 : 0, y: 0, transition: { delay: 0.6 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <p
                className="rb-chip"
                style={{ fontWeight: 500, fontSize: u(13.5), padding: `${u(9)} ${u(16)}` }}
              >
                <T text={theme.hint} ctx={ctx} />
              </p>
              <Btn variant="primary" mods="is-flat" onClick={() => setOpen(true)}>
                <T text={theme.openLabel} ctx={ctx} />
              </Btn>
            </motion.div>
          ) : (
            <motion.div
              key="acciones-tarjeta"
              className="rb-actions is-row"
              style={{ marginTop: 0 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.5 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <Btn variant="white" onClick={() => setOpen(false)} style={{ fontSize: u(15) }}>
                <T text={theme.closeLabel} ctx={ctx} />
              </Btn>
              <Btn
                variant="primary"
                mods="is-flat"
                onClick={() => setSaving(true)}
                style={{ fontSize: u(15) }}
              >
                <Bookmark size={16} fill="currentColor" />
                <T text={theme.saveLabel} ctx={ctx} />
              </Btn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Sheet
        open={saving}
        onClose={() => setSaving(false)}
        icon={<Icon name="camara" size="1em" large />}
        title="Guardá tu tarjeta"
      >
        Hacé una <strong>captura de pantalla</strong> con la tarjeta abierta y te queda guardada en
        tus fotos, lista para volver a leerla cuando quieras.
      </Sheet>
    </Stage>
  )
}
