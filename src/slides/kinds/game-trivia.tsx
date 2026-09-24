import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Camera, CircleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ConfettiLayer, LogoPattern } from '../player/effects'
import { RichText } from '../RichText'
import { ease, frames, Loop, shake, spring } from './motion'
import type { Props } from './shared'

type View = 'intro' | 'game' | 'prize'

const view = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.25 } },
}

export function GameTrivia({ theme, ctx }: Props<'game.trivia'>) {
  const questions = theme.questions.filter((q) => q.question && q.options.length >= 2)
  const calm = useReducedMotion()
  const [current, setView] = useState<View>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const question = questions[qIndex]
  const correctIndex = question ? Math.min(question.correct, question.options.length) - 1 : -1

  const answer = (index: number) => {
    if (selected !== null || !question) return
    setSelected(index)
    timer.current = setTimeout(() => {
      if (index === correctIndex) {
        if (qIndex < questions.length - 1) {
          setQIndex((q) => q + 1)
          setShowHint(false)
        } else {
          setView('prize')
        }
      }
      setSelected(null)
    }, 1000)
  }

  return (
    <div className="bx-trivia">
      <LogoPattern logoUrl={ctx.logoUrl} />

      <AnimatePresence mode="wait" initial={false}>
        {current === 'intro' && (
          <motion.div key="intro" className="bx-trivia-intro" {...view}>
            <Loop
              active={ctx.active}
              duration={3}
              frames={frames.float(10, 6)}
              style={{ fontSize: '4rem', marginBottom: 10 }}
            >
              {theme.introEmoji}
            </Loop>
            <h2 className="bx-trivia-title">{theme.introTitle}</h2>
            <p className="bx-trivia-text">
              <RichText value={theme.introText} />
            </p>
            <Loop active={ctx.active} delay={1.2} duration={2} frames={frames.pulse(1.05)}>
              <motion.button
                type="button"
                className="bx-btn-primary"
                onClick={() => setView(questions.length ? 'game' : 'prize')}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.95 }}
                transition={spring.snappy}
              >
                {theme.startLabel}
              </motion.button>
            </Loop>
          </motion.div>
        )}

        {current === 'game' && question && (
          <motion.div key={`pregunta-${qIndex}`} className="bx-trivia-game" {...view}>
            <div className="bx-trivia-card">
              <motion.div
                className="bx-trivia-mascot"
                initial={{ scale: 0, rotate: -30, x: '-50%' }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  x: '-50%',
                  transition: { ...spring.pop, delay: 0.15 },
                }}
              >
                🤔
              </motion.div>
              <p className="bx-trivia-question">{question.question}</p>
            </div>
            {question.hint && (
              <AnimatePresence mode="wait" initial={false}>
                {showHint ? (
                  <motion.div
                    key="pista"
                    className="bx-hint-box"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={spring.pop}
                  >
                    {theme.hintPrefix} {question.hint}
                  </motion.div>
                ) : (
                  <motion.button
                    key="pedir"
                    type="button"
                    className="bx-hint-btn"
                    onClick={() => setShowHint(true)}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.12 } }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <CircleAlert size={16} /> {theme.hintLabel}
                  </motion.button>
                )}
              </AnimatePresence>
            )}
            <motion.div
              className="bx-trivia-options"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
            >
              {question.options.map((option, i) => {
                const state =
                  selected === null
                    ? ''
                    : i === correctIndex
                      ? 'is-correct'
                      : i === selected
                        ? 'is-wrong'
                        : ''
                return (
                  <motion.button
                    type="button"
                    key={i}
                    className={`bx-trivia-option ${state}`}
                    onClick={() => answer(i)}
                    variants={{
                      hidden: { opacity: 0, y: 16 },
                      show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: ease.out } },
                    }}
                    animate={
                      state === 'is-wrong' && !calm
                        ? { ...shake, transition: { duration: 0.4 } }
                        : state === 'is-correct'
                          ? { scale: [1, 1.05, 1], transition: { duration: 0.35 } }
                          : undefined
                    }
                    whileTap={{ y: 3 }}
                  >
                    {option}
                  </motion.button>
                )
              })}
            </motion.div>
          </motion.div>
        )}

        {current === 'prize' && (
          <motion.div
            key="premio"
            className="bx-prize-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
          >
            <ConfettiLayer standalone seed={42} />
            <motion.div
              className="bx-winner-card"
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ ...spring.pop, delay: 0.1 }}
            >
              <Loop
                active={ctx.active}
                duration={3}
                frames={frames.bounce(10)}
                style={{
                  width: 100,
                  height: 100,
                  margin: '-80px auto 20px',
                  background: 'white',
                  borderRadius: '50%',
                  padding: 15,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                }}
              >
                <img
                  src={ctx.logoUrl}
                  alt="Boxie"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              </Loop>
              <h2
                style={{
                  color: 'var(--bx-primary)',
                  fontSize: '2rem',
                  fontWeight: 900,
                  margin: 0,
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                }}
              >
                <RichText value={theme.prizeTitle} />
              </h2>
              <p style={{ color: '#666', fontSize: '1rem', marginTop: 10 }}>{theme.prizeText}</p>
              <motion.div
                className="bx-winner-badge"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ ...spring.pop, delay: 0.45 }}
              >
                {/* Brillo que cruza la medalla (transform: sin repintar). */}
                <motion.span
                  aria-hidden
                  className="bx-shine"
                  animate={
                    calm ? undefined : { transform: ['translateX(-120%)', 'translateX(220%)'] }
                  }
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear', repeatDelay: 0 }}
                />
                <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: 2 }}>
                  {theme.prizeBadge}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    marginTop: 5,
                    opacity: 0.95,
                    borderTop: '1px solid rgba(255,255,255,0.4)',
                    paddingTop: 5,
                    width: '80%',
                  }}
                >
                  {theme.prizeDetail}
                </div>
              </motion.div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  color: 'var(--bx-ink)',
                  opacity: 0.7,
                  fontSize: '0.8rem',
                }}
              >
                <Camera size={16} />
                <span>{theme.prizeFootnote}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
