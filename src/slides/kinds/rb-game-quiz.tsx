import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, Lightbulb, X } from 'lucide-react'
import { useState } from 'react'
import { EmojiText, Icon } from '@/ui/Icon'
import { Balloon, Bokeh, Burst, Confetti, Heart, Rays, ROSE } from '../ribbly/art'
import { Btn, Chip, editable, Stage, Steps, T, TapMark, u, useStored } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { ease, frames, Loop, shake, spring } from './motion'
import type { Props } from './shared'

type View = 'intro' | 'game' | 'win' | 'lose'

const LETTERS = ['A', 'B', 'C', 'D']
/** Colores de cada ocasión: fondo del juego, del final con premio y sin premio. */
const LOOK = {
  cumple: {
    letters: ['#F44E63', '#4FC3F7', '#F2A93B', '#B28DFF'],
    night: 'linear-gradient(170deg, #153A7A 0%, #2B2F7E 55%, #7B3A7E 100%)',
    sky: 'linear-gradient(180deg, #6FD0F5 0%, #9AA8F0 60%, #F7C9A8 100%)',
    dusk: 'linear-gradient(170deg, #14203F 0%, #2E2550 55%, #5B2B5E 100%)',
    cards: ['#4FC3F7', '#FFD35C'],
  },
  pareja: {
    letters: ['#F44E63', '#C88FD8', '#FFC56E', '#4FC3F7'],
    night: 'linear-gradient(170deg, #8E2A5E 0%, #6B2A8E 55%, #4A2A8E 100%)',
    sky: 'linear-gradient(180deg, #F7798A 0%, #F4836B 55%, #F2A93B 100%)',
    dusk: 'linear-gradient(170deg, #2A1430 0%, #5B2A6E 55%, #7B2A8E 100%)',
    cards: ['#C88FD8', '#FFC56E'],
  },
}

const slide = {
  initial: { opacity: 0, y: 26 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.out } },
  exit: { opacity: 0, y: -18, transition: { duration: 0.2 } },
}

export interface QuizResult {
  score: number | null
  total: number
  attempts: number
}

/**
 * 08 · Trivia. Seis vistas del diseño en una sola pantalla: portada, pregunta,
 * acierto, error, final con premio y final sin premio. Las preguntas son las
 * de quien regala (o las de ejemplo de la temática).
 */
export function GameQuiz({ theme, buyer, ctx }: Props<'game.quiz'>) {
  const calm = useReducedMotion()
  const pareja = theme.look === 'pareja'
  const look = LOOK[pareja ? 'pareja' : 'cumple']
  const NIGHT = look.night
  const SKY = look.sky
  const DUSK = look.dusk
  const LETTER_COLORS = look.letters
  const active = ctx.active
  const usable = (list: typeof theme.examples) =>
    list.filter((q) => q.question.trim() && q.options.filter((o) => o.trim()).length >= 2)
  const mine = usable(buyer.questions)
  const questions = (mine.length ? mine : usable(theme.examples)).map((q) => {
    const options = q.options.filter((o) => o.trim())
    return { ...q, options, correct: Math.min(q.correct, options.length) - 1 }
  })
  const total = questions.length
  const prize = buyer.prize.trim() || fill(theme.defaultPrize, ctx.vars)

  const [view, setView] = useState<View>('intro')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [hint, setHint] = useState(false)
  const [result, setResult] = useStored<QuizResult>(ctx, 'resultado', {
    score: null,
    total,
    attempts: 0,
  })

  const question = questions[index]
  const picked = answers[index]
  const answered = picked !== undefined
  const right = answered && question ? picked === question.correct : false
  const score = answers.filter((a, i) => a === questions[i]?.correct).length
  const counts = { n: String(score), total: String(total) }
  const canRetry = result.attempts < theme.maxAttempts

  const start = () => {
    setAnswers([])
    setIndex(0)
    setHint(false)
    setView(total ? 'game' : 'win')
  }

  const answer = (option: number) => {
    if (answered) return
    setAnswers((list) => [...list, option])
    if (option !== question?.correct && !calm) navigator.vibrate?.(60)
  }

  const next = () => {
    if (index < total - 1) {
      setIndex((i) => i + 1)
      setHint(false)
      return
    }
    setResult((r) => ({
      score: Math.max(score, r.score ?? 0),
      total,
      attempts: r.attempts + 1,
    }))
    setView(score === total ? 'win' : 'lose')
  }

  const steps = questions.map((q, i) => {
    const a = answers[i]
    if (a === undefined) return i === index ? 'on' : 'off'
    return a === q.correct ? 'ok' : 'bad'
  })

  return (
    <Stage bg={NIGHT} className={pareja ? 'is-pareja' : ''}>
      {/* El fondo cambia con el final: cielo con rayos si ganó, noche si no. */}
      <motion.div
        className="rb-bg"
        style={{ background: SKY }}
        initial={false}
        animate={{ opacity: view === 'win' ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      >
        <Rays at="50% 30%" strength={0.2} />
      </motion.div>
      <motion.div
        className="rb-bg"
        style={{ background: DUSK }}
        initial={false}
        animate={{ opacity: view === 'lose' ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />
      <div className="rb-bg">
        {view !== 'win' && <i className="rb-dots" />}
        {view !== 'win' && (
          <Bokeh
            seed={8}
            count={7}
            colors={['#F44E63', '#4FC3F7', '#F2A93B']}
            blur={14}
            maxOpacity={0.3}
          />
        )}
        {view === 'win' && <Confetti seed={8} count={30} colors={pareja ? ROSE : undefined} />}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'intro' && (
          <motion.div key="intro" className="rb-body" {...slide}>
            <span className="rb-qmark" style={{ left: '7%', top: '16%' }} aria-hidden>
              ?
            </span>
            <span
              className="rb-qmark"
              style={{ right: '8%', top: '22%', animationDelay: '-2s' }}
              aria-hidden
            >
              ?
            </span>
            <span
              className="rb-qmark"
              style={{ right: '12%', top: '65%', animationDelay: '-3.4s' }}
              aria-hidden
            >
              ?
            </span>
            {pareja ? (
              <>
                <Heart
                  color="#F44E63"
                  style={{ right: '17%', top: '11%', width: u(30) }}
                  duration={5.5}
                />
                <Heart
                  color="#F44E63"
                  style={{ left: '8%', top: '58%', width: u(42) }}
                  duration={6.5}
                  delay={-2}
                  tilt={8}
                />
              </>
            ) : (
              <>
                <Balloon
                  color="#F2A93B"
                  style={{ right: '16%', top: '10%', width: u(34) }}
                  duration={5.5}
                />
                <Balloon
                  color="#F44E63"
                  style={{ left: '8%', top: '56%', width: u(44) }}
                  duration={6.5}
                  delay={-2}
                  tilt={4}
                />
              </>
            )}

            <span className="rb-quiz-ribbon" style={{ marginTop: u(36) }}>
              <T text={theme.ribbon} ctx={ctx} />
            </span>
            <h2 className="rb-quiz-title" style={{ marginTop: u(16), maxWidth: u(290) }}>
              <T text={theme.title} ctx={ctx} />
            </h2>

            <div className="rb-grow">
              <Loop
                active={active}
                duration={4.5}
                frames={frames.float(8, 1.5)}
                className="rb-quiz-cards"
              >
                <i
                  style={{
                    background: look.cards[0],
                    transform: 'translateX(-52%) rotate(-13deg)',
                  }}
                >
                  <b
                    className="rb-fredoka"
                    style={{ fontSize: u(54), color: 'rgba(255,255,255,0.45)' }}
                  >
                    A
                  </b>
                </i>
                <i
                  style={{ background: look.cards[1], transform: 'translateX(52%) rotate(12deg)' }}
                >
                  <b
                    className="rb-fredoka"
                    style={{ fontSize: u(54), color: 'rgba(255,255,255,0.6)' }}
                  >
                    C
                  </b>
                </i>
                <i style={{ background: '#fff' }}>
                  {pareja ? (
                    <span style={{ display: 'grid', justifyItems: 'center', gap: u(6) }}>
                      <b
                        className="rb-fredoka"
                        style={{ fontSize: u(70), lineHeight: 1, color: 'var(--rb-coral)' }}
                      >
                        ?
                      </b>
                      <span style={{ display: 'flex', gap: u(4) }} aria-hidden>
                        {['#F44E63', '#C88FD8', '#FFC56E'].map((c) => (
                          <i
                            key={c}
                            style={{
                              position: 'static',
                              width: u(7),
                              height: u(7),
                              margin: 0,
                              borderRadius: '50%',
                              background: c,
                              boxShadow: 'none',
                            }}
                          />
                        ))}
                      </span>
                    </span>
                  ) : (
                    <Icon name="torta" size={u(66)} large />
                  )}
                </i>
              </Loop>
            </div>

            <div
              style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: u(8) }}
              {...editable(ctx, 'questions,prize')}
            >
              <Chip style={{ transform: 'rotate(-3deg)' }}>
                <T text={theme.chipQuestions} ctx={ctx} extra={counts} />
              </Chip>
              <Chip mods="is-yellow" style={{ transform: 'rotate(2deg)' }}>
                <T text={theme.chipPrize} ctx={ctx} />
              </Chip>
              <Chip
                mods="is-sky"
                style={{ transform: 'rotate(-2deg)', background: pareja ? '#C88FD8' : undefined }}
              >
                <T text={theme.chipHints} ctx={ctx} />
              </Chip>
            </div>

            <div className="rb-actions" style={{ marginTop: u(26) }}>
              <span style={{ position: 'relative' }}>
                <Btn
                  variant="primary"
                  mods="is-big rb-fredoka"
                  onClick={start}
                  style={{ fontWeight: 700, letterSpacing: '0.12em' }}
                >
                  <T text={theme.playLabel} ctx={ctx} />
                </Btn>
                <TapMark style={{ left: '50%', top: '50%' }} />
              </span>
            </div>
          </motion.div>
        )}

        {view === 'game' && question && (
          <motion.div key={`pregunta-${index}`} className="rb-body" {...slide}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: u(12),
                width: '100%',
                paddingRight: u(22),
              }}
            >
              <span className="rb-kicker" style={{ whiteSpace: 'nowrap' }}>
                <T
                  text={theme.progressLabel}
                  ctx={ctx}
                  extra={{ n: String(index + 1), total: String(total) }}
                />
              </span>
              <Steps states={steps} />
            </div>

            <div className="rb-q-card" style={{ marginTop: u(40) }} {...editable(ctx, 'questions')}>
              <motion.span
                className="rb-q-badge"
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0, transition: { ...spring.pop, delay: 0.15 } }}
              >
                {pareja ? '?' : <Icon name="globo" size={u(28)} />}
              </motion.span>
              <EmojiText text={question.question} />
            </div>

            <div className="rb-grow" style={{ justifyContent: 'center' }}>
              <div className="rb-q-options">
                {question.options.map((option, i) => {
                  const state = !answered
                    ? ''
                    : i === question.correct
                      ? right
                        ? 'is-ok'
                        : 'is-reveal'
                      : i === picked
                        ? 'is-bad'
                        : 'is-dim'
                  return (
                    <motion.button
                      key={i}
                      type="button"
                      className={`rb-q-option ${state}`}
                      disabled={answered}
                      onClick={() => answer(i)}
                      initial={{ opacity: 0, x: -24 }}
                      animate={
                        state === 'is-bad' && !calm
                          ? { opacity: 1, ...shake, transition: { duration: 0.45 } }
                          : state === 'is-ok'
                            ? {
                                opacity: 1,
                                x: 0,
                                scale: [1, 1.05, 1],
                                transition: { duration: 0.4 },
                              }
                            : {
                                opacity: state === 'is-dim' ? 0.32 : 1,
                                x: 0,
                                scale: 1,
                                // Entran de a una; después de responder, sin demora.
                                transition: {
                                  duration: 0.4,
                                  ease: ease.out,
                                  delay: answered ? 0 : 0.15 + i * 0.07,
                                },
                              }
                      }
                      whileTap={answered ? undefined : { scale: 0.97, y: 3 }}
                    >
                      <span
                        className="rb-q-letter"
                        style={{ background: LETTER_COLORS[i % LETTER_COLORS.length] }}
                      >
                        {state === 'is-ok' ? (
                          <Check size={20} strokeWidth={3.5} />
                        ) : state === 'is-bad' ? (
                          <X size={20} strokeWidth={3.5} />
                        ) : (
                          LETTERS[i]
                        )}
                      </span>
                      <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                        <EmojiText text={option} />
                      </span>
                      {state === 'is-reveal' && (
                        <span className="rb-q-reveal">
                          <T text={theme.revealLabel} ctx={ctx} />
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>

              {/* El sello cae inclinado sobre las opciones. */}
              <AnimatePresence>
                {answered && (
                  <motion.span
                    key="sello"
                    className="rb-ribbon"
                    style={{
                      position: 'absolute',
                      top: u(-18),
                      background: right ? 'var(--rb-acierto)' : 'var(--rb-coral)',
                      zIndex: 5,
                    }}
                    initial={{ scale: 2.2, opacity: 0, rotate: right ? -16 : 14 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      rotate: right ? -5 : 4,
                      transition: spring.pop,
                    }}
                  >
                    <T text={right ? theme.correctLabel : theme.wrongLabel} ctx={ctx} />
                  </motion.span>
                )}
              </AnimatePresence>
              {answered && right && <Burst key={`ok-${index}`} y="30%" count={40} />}
            </div>

            <div style={{ minHeight: u(118), width: '100%' }}>
              <AnimatePresence mode="wait" initial={false}>
                {answered ? (
                  <motion.div
                    key="siguiente"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.35 } }}
                  >
                    {question.comment && (
                      <p className="rb-hand rb-shadow-text" style={{ fontSize: u(23) }}>
                        <EmojiText text={question.comment} />
                      </p>
                    )}
                    <div className="rb-actions" style={{ marginTop: u(14) }}>
                      <Btn variant="primary" mods="is-wide" onClick={next}>
                        <T text={theme.nextLabel} ctx={ctx} />
                      </Btn>
                    </div>
                  </motion.div>
                ) : question.hint ? (
                  <motion.div key="pista" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
                    {hint ? (
                      <motion.p
                        className="rb-chip is-glass"
                        style={{
                          whiteSpace: 'normal',
                          padding: `${u(9)} ${u(16)}`,
                          fontWeight: 500,
                        }}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1, transition: spring.pop }}
                      >
                        <Lightbulb size={15} style={{ flex: 'none' }} />
                        <EmojiText text={question.hint} />
                      </motion.p>
                    ) : (
                      <Btn variant="glass" mods="is-small" onClick={() => setHint(true)}>
                        <Lightbulb size={15} />
                        <T text={theme.hintLabel} ctx={ctx} />
                      </Btn>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {view === 'win' && (
          <motion.div key="gano" className="rb-body" {...slide}>
            <Burst key="premio" y="24%" count={54} power={1.2} />
            <Loop
              active={active}
              duration={2.6}
              frames={frames.bounce(10)}
              style={{ marginTop: u(22) }}
            >
              <motion.div
                initial={{ scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0, transition: { ...spring.pop, delay: 0.1 } }}
              >
                <Icon name="trofeo" size={u(116)} large />
              </motion.div>
            </Loop>
            <h2
              className="rb-title"
              style={{
                fontWeight: 700,
                fontSize: u(35),
                marginTop: u(6),
                textShadow: `0 ${u(3)} 0 rgba(60,90,170,0.55)`,
              }}
            >
              <T text={theme.winTitle} ctx={ctx} />
            </h2>
            <Chip style={{ marginTop: u(12), fontSize: u(14) }}>
              <Check size={15} strokeWidth={3.5} color="#22A66B" />
              <T text={theme.scoreLabel} ctx={ctx} extra={counts} />
            </Chip>

            <div className="rb-grow">
              <motion.div
                className="rb-prize"
                {...editable(ctx, 'prize')}
                initial={{ opacity: 0, y: 40, rotate: -4 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  rotate: 0,
                  transition: { ...spring.bouncy, delay: 0.35 },
                }}
              >
                <p className="rb-kicker" style={{ fontSize: u(11), color: '#8A6A2A' }}>
                  <T text={theme.prizeKicker} ctx={ctx} />
                </p>
                <Icon name="regalo" size={u(44)} large style={{ margin: `${u(8)} 0 ${u(4)}` }} />
                <p
                  className="rb-fredoka"
                  style={{
                    fontWeight: 700,
                    fontSize: u(23),
                    lineHeight: 1.12,
                    textWrap: 'balance',
                  }}
                >
                  <EmojiText text={prize} />
                </p>
                <p style={{ fontSize: u(12), color: '#7A5E2A', marginTop: u(5), fontWeight: 500 }}>
                  <T text={theme.prizeBy} ctx={ctx} />
                </p>
                <div className="rb-prize-cut" />
                <p style={{ fontSize: u(13), fontWeight: 600 }}>
                  <T text={theme.prizeNote} ctx={ctx} />
                </p>
              </motion.div>
            </div>

            <div className="rb-actions">
              <Btn variant="white" mods="is-wide" onClick={ctx.next}>
                <T text={theme.continueLabel} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        )}

        {view === 'lose' && (
          <motion.div key="perdio" className="rb-body" {...slide}>
            <motion.div
              style={{ marginTop: u(26) }}
              initial={{ scale: 0, rotate: 20 }}
              animate={{ scale: 1, rotate: 0, transition: { ...spring.pop, delay: 0.1 } }}
            >
              <Icon name="uy" size={u(104)} large />
            </motion.div>
            <h2 className="rb-title" style={{ fontWeight: 700, fontSize: u(35), marginTop: u(6) }}>
              <T text={theme.loseTitle} ctx={ctx} />
            </h2>
            <Chip mods="is-glass" style={{ marginTop: u(12), fontSize: u(14) }}>
              <T text={theme.scoreLabel} ctx={ctx} extra={counts} />
            </Chip>

            <div className="rb-grow">
              <div className="rb-locked">
                <span className="rb-locked-ghost" aria-hidden>
                  {prize}
                </span>
                <div style={{ position: 'relative' }}>
                  <Loop active={active} duration={2.4} frames={frames.wiggle(7)}>
                    <Icon name="candado" size={u(54)} large />
                  </Loop>
                  <p style={{ fontWeight: 600, fontSize: u(18), marginTop: u(6) }}>
                    <T text={theme.lockedTitle} ctx={ctx} />
                  </p>
                  <p style={{ fontSize: u(13), opacity: 0.8, marginTop: u(3) }}>
                    <T text={theme.lockedNote} ctx={ctx} extra={counts} />
                  </p>
                </div>
              </div>
            </div>

            <div className="rb-actions">
              {canRetry && (
                <Btn variant="primary" mods="is-wide" onClick={start}>
                  <T text={theme.retryLabel} ctx={ctx} />
                </Btn>
              )}
              <Btn variant="glass" mods="is-wide" onClick={ctx.next} style={{ fontWeight: 500 }}>
                <T text={theme.skipLabel} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
