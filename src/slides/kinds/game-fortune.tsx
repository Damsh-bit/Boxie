import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ConfettiLayer, GradientDrift } from '../player/effects'
import { RichText } from '../RichText'
import { Appear, ease, frames, Loop, spring } from './motion'
import { useSequence, type Props } from './shared'

type View = 'choose' | 'opening' | 'result'

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
}

export function GameFortune({ theme, ctx }: Props<'game.fortune'>) {
  const lines = theme.introLines.length ? theme.introLines : ['']
  // Una frase cada 1,2 s, después la bola de cristal y a los 0,9 s la elección.
  const delays = [...lines.map((_, i) => (i + 1) * 1200), lines.length * 1200 + 900]
  const intro = useSequence(ctx.active, delays)
  const [view, setView] = useState<View | null>(null)
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const current: View | 'intro' = view ?? (intro > lines.length ? 'choose' : 'intro')

  const pick = () => {
    const fortunes = theme.fortunes.length ? theme.fortunes : ['']
    setMessage(fortunes[Math.floor(Math.random() * fortunes.length)]!)
    setView('opening')
    timer.current = setTimeout(() => setView('result'), 1500)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <GradientDrift colors={['#FF9A9E', 'var(--bx-primary)', '#a18cd1', '#fbc2eb']} />
      <Appear
        as="img"
        active={ctx.active}
        y={-14}
        src={ctx.logoUrl}
        alt="Boxie"
        style={{
          position: 'absolute',
          top: 30,
          left: 0,
          right: 0,
          margin: 'auto',
          width: 80,
          filter: 'brightness(0) invert(1) drop-shadow(0 2px 5px rgba(0,0,0,0.2))',
          zIndex: 10,
        }}
      />

      <AnimatePresence mode="wait">
        {current === 'intro' && (
          <motion.div
            key="intro"
            {...fade}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 30,
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: '2.2rem',
                fontWeight: 900,
                color: 'white',
                textTransform: 'uppercase',
                letterSpacing: -1,
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              }}
            >
              <AnimatePresence mode="wait">
                {intro < lines.length ? (
                  <motion.span
                    key={intro}
                    style={{ display: 'inline-block' }}
                    initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
                    transition={{ duration: 0.45, ease: ease.out }}
                  >
                    {lines[intro]}
                  </motion.span>
                ) : (
                  <motion.div
                    key="bola"
                    style={{ fontSize: '5rem', filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.2))' }}
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={spring.pop}
                  >
                    {theme.introEmoji}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {current === 'choose' && (
          <motion.div
            key="elegir"
            {...fade}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              position: 'relative',
            }}
          >
            <div style={{ height: 60 }} />
            <motion.h2
              style={{
                color: 'white',
                fontSize: '2rem',
                fontWeight: 900,
                marginBottom: 10,
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0,0,0,0.2)',
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: ease.out }}
            >
              {theme.chooseTitle}
            </motion.h2>
            <motion.p
              style={{
                color: 'white',
                marginBottom: 40,
                fontSize: '1.1rem',
                textAlign: 'center',
                maxWidth: 300,
                lineHeight: 1.5,
                fontWeight: 500,
              }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: ease.out }}
            >
              <RichText value={theme.chooseText} />
            </motion.p>
            <div
              style={{
                display: 'flex',
                gap: 15,
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              {[1, 2, 3].map((n) => (
                <motion.div
                  key={n}
                  initial={{ opacity: 0, y: 40, scale: 0.6 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...spring.pop, delay: 0.2 + n * 0.1 }}
                >
                  <Loop active={ctx.active} duration={3 + n} frames={frames.float(15)}>
                    <motion.button
                      type="button"
                      onClick={pick}
                      whileHover={{ scale: 1.08, rotate: -6 }}
                      whileTap={{ scale: 0.9 }}
                      transition={spring.snappy}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        padding: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: '4.5rem',
                          filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))',
                        }}
                      >
                        🥠
                      </div>
                      <div
                        style={{
                          marginTop: 10,
                          background: 'rgba(255,255,255,0.2)',
                          padding: '5px 10px',
                          borderRadius: 10,
                          fontSize: '0.7rem',
                          color: 'white',
                          fontWeight: 'bold',
                        }}
                      >
                        {theme.optionLabel} {n}
                      </div>
                    </motion.button>
                  </Loop>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {current === 'opening' && (
          <motion.div
            key="abriendo"
            {...fade}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* La galleta tiembla cada vez más y se agranda antes de abrirse. */}
            <motion.div
              style={{ fontSize: '7rem', filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.2))' }}
              initial={{ scale: 0.8 }}
              animate={{
                scale: [0.8, 1, 1.05, 1.1, 1.25],
                rotate: [0, -6, 6, -10, 10, -14, 14, 0],
                x: [0, -4, 4, -6, 6, -8, 8, 0],
              }}
              transition={{ duration: 1.4, ease: 'easeIn' }}
            >
              🥠
            </motion.div>
          </motion.div>
        )}

        {current === 'result' && (
          <motion.div key="resultado" className="bx-prize-overlay" {...fade}>
            <ConfettiLayer standalone seed={77} />
            <motion.div
              style={{
                background: 'white',
                width: '85%',
                maxWidth: 350,
                borderRadius: 25,
                overflow: 'hidden',
                boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...spring.pop, delay: 0.1 }}
            >
              <div
                style={{
                  height: 150,
                  overflow: 'hidden',
                  position: 'relative',
                  backgroundColor: '#fff0f5',
                }}
              >
                <Loop
                  active={ctx.active}
                  duration={10}
                  frames={[
                    'translate(0%, 0%) scale(1)',
                    'translate(-8%, -6%) scale(1.15)',
                    'translate(0%, 0%) scale(1)',
                  ]}
                  style={{
                    position: 'absolute',
                    inset: '-20%',
                    backgroundImage:
                      'radial-gradient(circle at 20% 30%, rgba(244, 78, 99, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(161, 140, 209, 0.15) 0%, transparent 50%)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(255,255,255,1) 5%, transparent 100%)',
                  }}
                />
                <motion.div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: 90,
                    height: 90,
                    marginTop: -45,
                    marginLeft: -45,
                    background: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 10,
                  }}
                  initial={{ scale: 0, rotate: -30 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ ...spring.pop, delay: 0.35 }}
                >
                  <img src={ctx.logoUrl} alt="" style={{ width: 60, height: 'auto' }} />
                </motion.div>
              </div>
              <motion.div
                style={{
                  padding: '10px 30px 40px 30px',
                  textAlign: 'center',
                  position: 'relative',
                  zIndex: 5,
                }}
                initial="hidden"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } } }}
              >
                <motion.div
                  variants={reveal}
                  style={{
                    color: 'var(--bx-primary)',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    fontSize: '0.8rem',
                    marginBottom: 15,
                    marginTop: 10,
                  }}
                >
                  {theme.resultLabel}
                </motion.div>
                <motion.h3
                  variants={reveal}
                  style={{
                    fontFamily: 'serif',
                    fontSize: '1.4rem',
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                    color: 'var(--bx-ink)',
                    marginBottom: 25,
                  }}
                >
                  &quot;{message}&quot;
                </motion.h3>
                <motion.div
                  variants={{
                    hidden: { scaleX: 0 },
                    show: { scaleX: 1, transition: { duration: 0.6, ease: ease.out } },
                  }}
                  style={{
                    width: 50,
                    height: 3,
                    background: '#eee',
                    margin: '0 auto 20px auto',
                    borderRadius: 2,
                  }}
                />
                <motion.p variants={reveal} style={{ fontSize: '0.85rem', color: '#888' }}>
                  <RichText value={theme.resultFooter} marks={{ accent: 'bx-fortune-accent' }} />
                </motion.p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const reveal = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
}
