import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { seededRandom } from '../player/effects'
import { RichText } from '../RichText'
import { Appear, ease, Pop, spring } from './motion'
import { useSequence, type Props } from './shared'

type View = 'intro' | 'writing' | 'outro'

const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.6 } },
  exit: { opacity: 0, transition: { duration: 0.3 } },
}

export function ReflectJournal({ theme, ctx }: Props<'reflect.journal'>) {
  const [view, setView] = useState<View>('intro')
  const [entry, setEntry] = useState('')
  const introStep = useSequence(ctx.active && view === 'intro', [1500, 4000])
  const calm = useReducedMotion()
  const canSave = entry.trim().length > 5

  const bubbles = useMemo(() => {
    const rand = seededRandom(1717)
    return Array.from({ length: 20 }, () => {
      const size = rand() * 60 + 20
      return {
        left: `${rand() * 100}%`,
        size,
        duration: rand() * 10 + 15,
        delay: rand() * 5,
      }
    })
  }, [])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden
      >
        {bubbles.map((b, i) => (
          <motion.div
            key={i}
            className="bx-decor"
            style={{
              position: 'absolute',
              bottom: -100,
              left: b.left,
              width: b.size,
              height: b.size,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '50%',
            }}
            initial={{ opacity: 0 }}
            animate={
              calm
                ? undefined
                : {
                    transform: [
                      'translateY(0vh) scale(1)',
                      'translateY(-24vh) scale(1.1)',
                      'translateY(-96vh) scale(1.4)',
                      'translateY(-120vh) scale(1.5)',
                    ],
                    opacity: [0, 0.6, 0.3, 0],
                  }
            }
            transition={{
              duration: b.duration,
              delay: b.delay,
              times: [0, 0.2, 0.8, 1],
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        ))}
      </div>
      <Appear
        as="img"
        active={ctx.active}
        y={-16}
        src={ctx.logoUrl}
        alt="Boxie"
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          margin: 'auto',
          width: 80,
          filter: 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,100,200,0.2))',
          zIndex: 10,
        }}
      />

      <AnimatePresence mode="wait" initial={false}>
        {view === 'intro' && (
          <motion.div
            key="intro"
            {...fade}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 30,
              textAlign: 'center',
              zIndex: 2,
              position: 'relative',
            }}
          >
            <div style={{ height: 80 }} />
            <Appear active={ctx.active} y={30} duration={1}>
              <div
                style={{
                  fontSize: '4rem',
                  marginBottom: 20,
                  filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))',
                }}
              >
                {theme.introEmoji}
              </div>
              <h2
                style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  marginBottom: 10,
                  textShadow: '0 5px 15px rgba(0,100,200,0.2)',
                }}
              >
                {theme.introTitle}
              </h2>
            </Appear>
            <Appear
              as="p"
              active={ctx.active && introStep >= 1}
              y={30}
              duration={1}
              style={{
                fontSize: '1.2rem',
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.95)',
                maxWidth: 320,
                fontWeight: 500,
              }}
            >
              <RichText value={theme.introText} />
            </Appear>
            <Pop
              active={ctx.active && introStep >= 2}
              from={0.85}
              delay={0.3}
              style={{ marginTop: 50 }}
            >
              <motion.button
                type="button"
                onClick={() => setView('writing')}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
                transition={spring.snappy}
                style={{
                  background: 'white',
                  color: '#00c6fb',
                  border: 'none',
                  padding: '18px 50px',
                  borderRadius: 50,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 15px 40px rgba(0,198,251,0.3)',
                }}
              >
                {theme.openLabel}
              </motion.button>
            </Pop>
          </motion.div>
        )}

        {view === 'writing' && (
          <motion.div
            key="escribir"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: ease.out } }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: 30,
              zIndex: 2,
              position: 'relative',
              textAlign: 'left',
            }}
          >
            <div style={{ height: 70 }} />
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  color: 'white',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                  fontSize: '0.9rem',
                  marginBottom: 15,
                  opacity: 0.9,
                  textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              >
                {theme.promptTitle}
              </div>
              <h2
                style={{
                  fontSize: '2rem',
                  lineHeight: 1.3,
                  marginBottom: 30,
                  fontWeight: 800,
                  textShadow: '0 5px 20px rgba(0,100,200,0.2)',
                }}
              >
                {theme.promptText}
              </h2>
              <div style={{ position: 'relative', flex: 1, maxHeight: '40vh' }}>
                <textarea
                  autoFocus
                  placeholder={theme.placeholder}
                  value={entry}
                  onChange={(e) => setEntry(e.target.value)}
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'rgba(255,255,255,0.25)',
                    border: '1px solid rgba(255,255,255,0.5)',
                    borderRadius: 25,
                    color: 'white',
                    fontSize: '1.2rem',
                    padding: 25,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.6,
                    backdropFilter: 'blur(15px)',
                    boxShadow: '0 20px 50px rgba(0,100,200,0.15)',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
              <motion.button
                type="button"
                onClick={() => canSave && setView('outro')}
                disabled={!canSave}
                animate={{ opacity: canSave ? 1 : 0.5, scale: canSave ? 1 : 0.95 }}
                whileHover={canSave ? { y: -2 } : undefined}
                whileTap={canSave ? { scale: 0.95 } : undefined}
                transition={spring.snappy}
                style={{
                  background: 'white',
                  color: '#00c6fb',
                  border: 'none',
                  padding: '15px 40px',
                  borderRadius: 50,
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  cursor: 'pointer',
                  boxShadow: '0 10px 30px rgba(0,198,251,0.2)',
                }}
              >
                {theme.saveLabel}
              </motion.button>
            </div>
          </motion.div>
        )}

        {view === 'outro' && (
          <motion.div
            key="final"
            {...fade}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: 30,
              zIndex: 2,
              position: 'relative',
            }}
          >
            <Pop
              active
              from={0.2}
              rotate={-20}
              style={{
                fontSize: '5rem',
                marginBottom: 20,
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.6))',
              }}
            >
              {theme.outroEmoji}
            </Pop>
            <Appear
              as="h2"
              active
              delay={0.2}
              style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                margin: 0,
                textShadow: '0 5px 15px rgba(0,100,200,0.2)',
              }}
            >
              {theme.outroTitle}
            </Appear>
            <Appear
              as="p"
              active
              delay={0.35}
              style={{
                color: 'rgba(255,255,255,0.95)',
                marginTop: 20,
                fontSize: '1.2rem',
                lineHeight: 1.5,
                maxWidth: 350,
              }}
            >
              {theme.outroQuote}
            </Appear>
            <Appear
              active
              delay={0.55}
              style={{
                marginTop: 50,
                padding: '15px 35px',
                background: 'rgba(255,255,255,0.3)',
                borderRadius: 30,
                fontSize: '1rem',
                color: 'white',
                fontWeight: 'bold',
                border: '1px solid rgba(255,255,255,0.4)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {theme.outroBadge}
            </Appear>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
