import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { EmojiText } from '@/ui/Icon'
import { Stars } from '../ribbly/art'
import { Btn, Stage, Steps, T, u, useStored } from '../ribbly/ui'
import { ease, spring } from './motion'
import type { Props } from './shared'

type View = 'intro' | 'write' | 'done'

/**
 * 15 · Gratitud: una pausa para respirar (los anillos laten a cuatro tiempos)
 * y tres preguntas que responde quien recibe. Quedan en su dispositivo.
 */
export function ReflectPause({ theme, ctx }: Props<'reflect.pause'>) {
  const active = ctx.active
  const questions = theme.questions.filter((q) => q.line1.trim() || q.line2.trim())
  const total = questions.length
  const [answers, setAnswers] = useStored<string[]>(ctx, 'respuestas', [])
  const [view, setView] = useState<View>('intro')
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState('')
  const question = questions[step]

  const begin = () => {
    setStep(0)
    setDraft(answers[0] ?? '')
    setView(total ? 'write' : 'done')
  }

  const save = () => {
    const text = draft.trim()
    if (!text) return
    const next = [...answers]
    next[step] = text
    setAnswers(next.slice(0, total))
    if (step < total - 1) {
      setStep(step + 1)
      setDraft(answers[step + 1] ?? '')
    } else {
      setView('done')
    }
  }

  return (
    <Stage bg="linear-gradient(180deg, #A890D8 0%, #E0A8C8 45%, #FFCDB8 100%)">
      <div className="rb-bg">
        <Stars seed={15} count={14} sparks={3} area={50} />
        <svg className="rb-hills" viewBox="0 0 390 200" preserveAspectRatio="none" aria-hidden>
          <path
            d="M0 90 C90 40 170 110 260 70 C320 44 360 60 390 52 V200 H0 Z"
            fill="rgba(240,150,170,0.55)"
          />
          <path
            d="M0 140 C110 96 210 150 300 118 C340 104 370 112 390 108 V200 H0 Z"
            fill="rgba(214,110,140,0.55)"
          />
        </svg>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'intro' && (
          <motion.div
            key="intro"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0, transition: { duration: 0.6, delay: 0.15 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <p className="rb-kicker" style={{ marginTop: u(26) }}>
              <T text={theme.kicker} ctx={ctx} />
            </p>
            <h2
              className="rb-playfair"
              style={{ fontWeight: 900, fontSize: u(40), lineHeight: 1.04, marginTop: u(12) }}
            >
              <T text={theme.title1} ctx={ctx} />
              <br />
              <i>
                <T text={theme.title2} ctx={ctx} />
              </i>
            </h2>
            <p className="rb-sub" style={{ marginTop: u(12), maxWidth: u(310) }}>
              <T text={theme.subtitle} ctx={ctx} />
            </p>
            <div className="rb-grow">
              <div className="rb-breath" aria-hidden>
                <i />
                <i />
                <i />
                <span
                  className="rb-kicker"
                  style={{ position: 'relative', fontSize: u(11), opacity: 0.8 }}
                >
                  <T text={theme.breath} ctx={ctx} />
                </span>
              </div>
            </div>
            <div className="rb-actions">
              <Btn variant="glass" mods="is-wide" onClick={begin}>
                <T text={answers.length ? theme.againLabel : theme.cta} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        )}

        {view === 'write' && question && (
          <motion.div
            key="escribir"
            className="rb-body"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0, transition: spring.soft }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
          >
            <form
              className="rb-frost is-rose"
              style={{ marginTop: u(8) }}
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
            >
              <div style={{ display: 'flex' }}>
                <Steps states={questions.map((_, i) => (i <= step ? 'on' : 'off'))} />
              </div>
              <p
                className="rb-kicker"
                style={{ color: 'var(--rb-coral)', marginTop: u(16) }}
                aria-live="polite"
              >
                <T
                  text={theme.stepLabel}
                  ctx={ctx}
                  extra={{ label: question.label, n: String(step + 1), total: String(total) }}
                />
              </p>
              <h3
                className="rb-playfair"
                style={{
                  fontWeight: 900,
                  fontSize: u(28),
                  lineHeight: 1.12,
                  marginTop: u(6),
                  color: '#2A2433',
                }}
              >
                <EmojiText text={question.line1} />{' '}
                <i>
                  <EmojiText text={question.line2} />
                </i>
              </h3>
              <motion.textarea
                key={step}
                className="rb-input rb-answer"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\n/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    save()
                  }
                }}
                maxLength={120}
                rows={2}
                placeholder={question.placeholder}
                aria-label={`${question.line1} ${question.line2}`}
                enterKeyHint={step < total - 1 ? 'next' : 'done'}
                autoFocus={!ctx.preview}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: ease.out }}
                style={{ color: '#2A2433' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: u(16) }}>
                <Btn
                  variant="primary"
                  mods="is-flat"
                  type="submit"
                  disabled={!draft.trim()}
                  style={{ opacity: draft.trim() ? 1 : 0.5 }}
                >
                  <T text={step < total - 1 ? theme.nextLabel : theme.doneLabel} ctx={ctx} />
                </Btn>
              </div>
            </form>
          </motion.div>
        )}

        {view === 'done' && (
          <motion.div
            key="listo"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <h2
              className="rb-playfair"
              style={{ fontWeight: 900, fontStyle: 'italic', fontSize: u(46), marginTop: u(40) }}
            >
              <T text={theme.outroTitle} ctx={ctx} />
            </h2>
            <p className="rb-sub" style={{ marginTop: u(10), maxWidth: u(290) }}>
              <T text={theme.outroText} ctx={ctx} />
            </p>
            <div className="rb-grow" style={{ gap: u(10), justifyContent: 'center' }}>
              {answers.slice(0, total).map((answer, i) => (
                <motion.p
                  key={i}
                  className="rb-glass"
                  style={{ padding: `${u(10)} ${u(16)}`, width: '100%', textAlign: 'left' }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.3 + i * 0.15 } }}
                >
                  <span className="rb-kicker" style={{ fontSize: u(10), display: 'block' }}>
                    {questions[i]?.label}
                  </span>
                  <span className="rb-hand" style={{ fontSize: u(22) }}>
                    <EmojiText text={answer} />
                  </span>
                </motion.p>
              ))}
            </div>
            <div className="rb-actions">
              <Btn variant="glass" mods="is-small" onClick={begin}>
                Cambiar mis respuestas
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
