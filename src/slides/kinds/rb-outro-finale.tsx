import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { Balloon, Bokeh, Bow, Bunting, Burst, Confetti, Heart, Stars } from '../ribbly/art'
import { Brand, Btn, Stage, T, u } from '../ribbly/ui'
import { Appear, ease, frames, Loop, Pop, spring } from './motion'
import type { Props } from './shared'

type Step = 'box' | 'gift' | 'finale'

const LOOK = {
  cumple: {
    night: 'linear-gradient(180deg, #13224E 0%, #2B2F7E 55%, #3B2A6E 100%)',
    sunset: 'linear-gradient(175deg, #F4607E 0%, #FA8A6E 50%, #FFB45C 100%)',
  },
  pareja: {
    night: 'linear-gradient(180deg, #2A1430 0%, #4A2A6E 55%, #3B1830 100%)',
    sunset: 'linear-gradient(175deg, #C8305A 0%, #A82A4E 50%, #8E2A42 100%)',
  },
}

/**
 * 20 · Cierre. Si quien regala cargó un regalo sorpresa, primero aparece la
 * caja ("Una última cosa..."): se abre y sale la gift card. Después, el
 * ¡Feliz cumple! final, con repetir y regalar.
 */
export function OutroFinale({ theme, buyer, ctx }: Props<'outro.finale'>) {
  const active = ctx.active
  const calm = useReducedMotion()
  const gift = buyer.gift.trim()
  const [step, setStep] = useState<Step>(gift ? 'box' : 'finale')
  // Si se carga (o se saca) el regalo en el editor, la pantalla acompaña.
  const [hadGift, setHadGift] = useState(!!gift)
  if (hadGift !== !!gift) {
    setHadGift(!!gift)
    setStep(gift ? 'box' : 'finale')
  }
  const finale = step === 'finale'
  const opened = step === 'gift'
  const pareja = theme.look === 'pareja'
  const { night: NIGHT, sunset: SUNSET } = LOOK[pareja ? 'pareja' : 'cumple']

  return (
    <Stage bg={NIGHT} className={pareja ? 'is-pareja' : ''}>
      <motion.div
        className="rb-bg"
        style={{ background: SUNSET }}
        initial={false}
        animate={{ opacity: finale ? 1 : 0 }}
        transition={{ duration: 0.7 }}
      >
        {pareja ? (
          <>
            <Bokeh
              seed={20}
              count={14}
              colors={['#FFC56E', '#FFCCD5', '#FFFFFF']}
              blur={9}
              maxOpacity={0.4}
            />
            <svg
              viewBox="0 0 390 120"
              preserveAspectRatio="none"
              aria-hidden
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '24%',
                width: '100%',
                height: '16%',
              }}
            >
              <path
                d="M0 70 C90 30 200 100 390 40 V62 C220 118 100 52 0 92 Z"
                fill="#fff"
                opacity="0.9"
              />
              <path
                d="M0 92 C100 52 220 118 390 62 V76 C230 130 110 70 0 108 Z"
                fill="#FFE4E9"
                opacity="0.6"
              />
            </svg>
          </>
        ) : (
          <Confetti seed={20} count={30} />
        )}
      </motion.div>
      {!finale && (
        <div className="rb-bg">
          <Stars seed={20} count={22} sparks={6} area={90} />
        </div>
      )}
      {finale && !pareja && <Bunting />}

      <AnimatePresence mode="wait" initial={false}>
        {!finale ? (
          <motion.div
            key="regalo"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -30, transition: { duration: 0.3 } }}
          >
            <Appear
              as="h2"
              active={active}
              className="rb-hand"
              style={{ fontSize: u(28), marginTop: u(10) }}
            >
              <T text={theme.lastThing} ctx={ctx} />
            </Appear>

            <Loop
              active={active && !opened && !calm}
              duration={2.6}
              frames={frames.wiggle(3)}
              className="rb-gift"
              style={{ marginTop: u(84) }}
            >
              {/* La luz sale de la caja cuando se abre. */}
              <motion.i
                className="rb-gift-light"
                initial={false}
                animate={{ opacity: opened ? 1 : 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              />
              <div className="rb-gift-box" />
              <motion.div
                className="rb-gift-lid"
                initial={false}
                animate={
                  opened
                    ? {
                        y: '-130%',
                        x: '34%',
                        rotate: 26,
                        transition: { ...spring.bouncy, delay: 0.05 },
                      }
                    : { y: '0%', x: '0%', rotate: 0 }
                }
              >
                <Bow />
              </motion.div>
            </Loop>
            {opened && <Burst key="abrio" y="34%" count={44} power={1.1} />}

            <div className="rb-grow">
              <AnimatePresence>
                {opened && (
                  <motion.div
                    key="tarjeta"
                    initial={{ opacity: 0, y: -90, scale: 0.4, rotate: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      rotate: -4,
                      transition: { duration: 0.8, delay: 0.3, ease: ease.out },
                    }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <div className="rb-giftcard">
                      <div className="rb-giftcard-main">
                        <p
                          className="rb-kicker"
                          style={{ fontSize: u(10), color: 'var(--rb-sol)' }}
                        >
                          <T text={theme.giftKicker} ctx={ctx} />
                        </p>
                        <p
                          className="rb-fredoka"
                          style={{
                            fontWeight: 600,
                            fontSize: u(gift.length > 36 ? 18 : 21),
                            lineHeight: 1.15,
                            marginTop: u(8),
                            overflowWrap: 'anywhere',
                          }}
                        >
                          <EmojiText text={gift} />
                        </p>
                        {buyer.giftDetail.trim() && (
                          <p
                            style={{
                              fontSize: u(11.5),
                              opacity: 0.85,
                              marginTop: u(6),
                              fontWeight: 500,
                            }}
                          >
                            <EmojiText text={buyer.giftDetail} />
                          </p>
                        )}
                        <p
                          className="rb-caveat"
                          style={{
                            marginTop: 'auto',
                            paddingTop: u(12),
                            textAlign: 'right',
                            fontWeight: 600,
                            fontSize: u(17),
                            color: pareja ? '#FFCCD5' : 'var(--rb-sol)',
                          }}
                        >
                          {buyer.giftSignature.trim() || `de ${ctx.senderName}`}
                        </p>
                      </div>
                      <div className="rb-giftcard-stub">
                        <i className="rb-barcode" aria-hidden />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {opened && (
              <motion.p
                className="rb-sub"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 1 } }}
                style={{ marginBottom: u(6) }}
              >
                <T text={theme.giftNote} ctx={ctx} />
              </motion.p>
            )}
            <div className="rb-actions" style={{ marginTop: u(10) }}>
              {!opened ? (
                <Appear active={active} delay={0.5} y={20}>
                  <Btn variant="primary" mods="is-wide is-flat" onClick={() => setStep('gift')}>
                    <T text={theme.giftCta} ctx={ctx} />
                  </Btn>
                </Appear>
              ) : (
                <motion.div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: u(10),
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 1.1 } }}
                >
                  {buyer.giftLink && (
                    <Btn variant="primary" mods="is-flat" href={buyer.giftLink}>
                      <T text={theme.giftOpenLabel} ctx={ctx} />
                    </Btn>
                  )}
                  <Btn variant="white" onClick={() => setStep('finale')}>
                    <T text={theme.continueLabel} ctx={ctx} />
                  </Btn>
                </motion.div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="final"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            {!pareja && (
              <>
                <Balloon
                  color="#4FC3F7"
                  style={{ left: '7%', top: '41%', width: u(62) }}
                  duration={6.2}
                />
                <Balloon
                  color="#FFD35C"
                  style={{ right: '7%', top: '39%', width: u(68) }}
                  duration={7}
                  delay={-2.5}
                  tilt={4}
                />
              </>
            )}

            <h2 className="rb-finale-title" style={{ marginTop: u(64) }}>
              <Pop as="span" active={active} delay={0.1} from={0.5} rotate={-8}>
                <T text={theme.title1} ctx={ctx} />
              </Pop>
              <Pop as="span" active={active} delay={0.28} from={0.5} rotate={6}>
                <T text={theme.title2} ctx={ctx} />
              </Pop>
            </h2>
            <Appear
              as="p"
              active={active}
              delay={0.55}
              className="rb-hand rb-shadow-text"
              style={{ fontSize: u(27), marginTop: u(12) }}
            >
              <T text={theme.subtitle} ctx={ctx} />
            </Appear>

            <div className="rb-grow">
              {pareja && (
                <Pop active={active} delay={0.65} from={0.3} style={{ marginBottom: u(28) }}>
                  <Heart
                    color="#F44E63"
                    style={{ width: u(64), position: 'relative' }}
                    duration={3.2}
                    tilt={-4}
                  />
                </Pop>
              )}
              <Appear active={active} delay={0.75}>
                <Brand size={30} />
              </Appear>
              <Appear
                as="p"
                active={active}
                delay={0.85}
                style={{ fontSize: u(12), fontWeight: 500, marginTop: u(12) }}
              >
                <T text={theme.credit} ctx={ctx} />
              </Appear>
            </div>

            <div className="rb-actions">
              <Appear
                active={active}
                delay={1}
                y={20}
                style={{ width: '100%', display: 'grid', justifyItems: 'center' }}
              >
                <Btn variant="white" mods="is-wide" onClick={() => ctx.goTo(0)}>
                  <T text={theme.replayLabel} ctx={ctx} />
                </Btn>
              </Appear>
              {theme.shopUrl && (
                <Appear
                  active={active}
                  delay={1.1}
                  y={20}
                  style={{ width: '100%', display: 'grid', justifyItems: 'center' }}
                >
                  <Btn variant="glass" mods="is-wide" href={theme.shopUrl}>
                    <T text={theme.shopLabel} ctx={ctx} />
                  </Btn>
                </Appear>
              )}
              <Appear
                as="p"
                active={active}
                delay={1.2}
                style={{ fontSize: u(11), fontWeight: 500, opacity: 0.75, marginTop: u(6) }}
              >
                <T text={theme.handle} ctx={ctx} />
              </Appear>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
