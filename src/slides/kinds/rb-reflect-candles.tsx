import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Bokeh, Cake } from '../ribbly/art'
import { Btn, Stage, Steps, T, u, useStored } from '../ribbly/ui'
import { ease, spring } from './motion'
import type { Props } from './shared'

type View = 'intro' | 'write' | 'done'

/**
 * 15 · Velitas: un momento a oscuras. Quien recibe (no quien regala) escribe
 * sus deseos de a uno y, con el último, sopla. Quedan guardados en su
 * dispositivo: son los papelitos de la cápsula del tiempo.
 */
export function ReflectCandles({ theme, ctx }: Props<'reflect.candles'>) {
  const active = ctx.active
  const total = theme.wishCount
  const [wishes, setWishes] = useStored<string[]>(ctx, 'deseos', [])
  const [view, setView] = useState<View>('intro')
  const [step, setStep] = useState(0)
  const [draft, setDraft] = useState('')
  const counts = { n: String(step + 1), total: String(total) }
  const lit = view !== 'done'

  const begin = () => {
    setStep(0)
    setDraft(wishes[0] ?? '')
    setView('write')
  }

  const save = () => {
    const text = draft.trim()
    if (!text) return
    const next = [...wishes]
    next[step] = text
    setWishes(next.slice(0, total))
    if (step < total - 1) {
      setStep(step + 1)
      setDraft(wishes[step + 1] ?? '')
    } else {
      setView('done')
    }
  }

  return (
    <Stage tone="deep" bg="#120C1E">
      <div className="rb-bg">
        <i className="rb-candle-glow" style={{ opacity: lit ? 1 : 0.25 }} />
        <Bokeh seed={15} count={14} colors={['#F2A93B', '#FFD35C', '#F2843B']} maxOpacity={0.4} />
      </div>

      {/* La torta queda siempre abajo; al escribir se desenfoca detrás de la tarjeta. */}
      <motion.div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '16%',
          width: u(214),
          marginLeft: u(-107),
          zIndex: 1,
        }}
        initial={false}
        animate={{
          opacity: active ? 1 : 0,
          y: active ? 0 : 60,
          scale: view === 'write' ? 0.9 : 1,
          filter: view === 'write' ? 'blur(5px)' : 'blur(0px)',
        }}
        transition={{ duration: 0.7, ease: ease.out }}
      >
        <Cake
          age={ctx.vars.edad}
          lit={lit}
          flicker={active}
          flavor={ctx.style.torta}
          candles={ctx.style.velas}
        />
      </motion.div>

      <AnimatePresence mode="wait" initial={false}>
        {view === 'intro' && (
          <motion.div
            key="intro"
            className="rb-body"
            initial={{ opacity: 0 }}
            animate={{ opacity: active ? 1 : 0, transition: { duration: 0.6, delay: 0.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <p className="rb-kicker" style={{ color: 'var(--rb-sol)', marginTop: u(28) }}>
              <T text={theme.kicker} ctx={ctx} />
            </p>
            <h2
              className="rb-playfair"
              style={{ fontWeight: 900, fontSize: u(34), lineHeight: 1.08, marginTop: u(12) }}
            >
              <T text={theme.title1} ctx={ctx} />
              <br />
              <i>
                <T text={theme.title2} ctx={ctx} />
              </i>
            </h2>
            <p className="rb-sub" style={{ marginTop: u(12), maxWidth: u(300) }}>
              <T text={theme.subtitle} ctx={ctx} extra={counts} />
            </p>
            <div className="rb-actions">
              <Btn variant="yellow" mods="is-wide" onClick={begin}>
                <T text={theme.cta} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        )}

        {view === 'write' && (
          <motion.div
            key="escribir"
            className="rb-body"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0, transition: spring.soft }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
          >
            <form
              className="rb-frost"
              style={{ marginTop: u(8) }}
              onSubmit={(e) => {
                e.preventDefault()
                save()
              }}
            >
              <div style={{ display: 'flex' }}>
                <Steps
                  states={Array.from({ length: total }, (_, i) => (i <= step ? 'warm' : 'off'))}
                />
              </div>
              <p
                className="rb-kicker"
                style={{ color: 'var(--rb-naranja)', marginTop: u(16) }}
                aria-live="polite"
              >
                <T text={theme.stepLabel} ctx={ctx} extra={counts} />
              </p>
              <h3
                className="rb-playfair"
                style={{ fontWeight: 900, fontSize: u(29), lineHeight: 1.1, marginTop: u(6) }}
              >
                <T text={theme.promptTitle1} ctx={ctx} />{' '}
                <i>
                  <T text={theme.promptTitle2} ctx={ctx} />
                </i>
              </h3>
              <motion.textarea
                key={step}
                className="rb-input rb-wish-input"
                value={draft}
                onChange={(e) => setDraft(e.target.value.replace(/\n/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    save()
                  }
                }}
                maxLength={80}
                rows={2}
                placeholder={theme.placeholder}
                aria-label={`Deseo ${step + 1} de ${total}`}
                enterKeyHint={step < total - 1 ? 'next' : 'done'}
                autoFocus={!ctx.preview}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: u(16) }}>
                <Btn
                  variant="yellow"
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
            animate={{ opacity: 1, transition: { duration: 0.8, delay: 0.9 } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <h2
              className="rb-playfair"
              style={{ fontWeight: 900, fontStyle: 'italic', fontSize: u(34), marginTop: u(40) }}
            >
              <T text={theme.outroTitle} ctx={ctx} />
            </h2>
            <p className="rb-sub" style={{ marginTop: u(12), maxWidth: u(290) }}>
              <T text={theme.outroText} ctx={ctx} />
            </p>
            <div className="rb-actions">
              <Btn variant="glass" mods="is-small" onClick={begin}>
                <T text={theme.againLabel} ctx={ctx} />
              </Btn>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Stage>
  )
}
