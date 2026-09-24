import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Appear, Loop, spring } from './motion'
import { useActivated, type Props } from './shared'

const BLOBS = [
  { className: 'bx-blob bx-blob-1', duration: 10, move: 'translate(30px, 50px) scale(1.1)' },
  { className: 'bx-blob bx-blob-2', duration: 10, move: 'translate(-30px, -40px) scale(1.1)' },
  { className: 'bx-blob bx-blob-3', duration: 15, move: 'translate(25px, -35px) scale(1.12)' },
]

export function StoryReasons({ theme, buyer, ctx }: Props<'story.reasons'>) {
  const own = buyer.reasons.map((r) => r.trim()).filter(Boolean)
  const reasons = own.length ? own : theme.suggestions.filter(Boolean)
  const activated = useActivated(ctx.active)
  const calm = useReducedMotion()

  const [state, setState] = useState({
    signature: '',
    index: 0,
    chars: 0,
    finished: false,
  })
  const signature = reasons.join('|')
  // Si el comprador edita las razones en la vista previa, la animación arranca de nuevo.
  if (state.signature !== signature) setState({ signature, index: 0, chars: 0, finished: false })
  const { index, chars, finished } = state
  const current = reasons[index] ?? ''

  useEffect(() => {
    if (!activated || finished) return
    if (index >= reasons.length) {
      const t = setTimeout(() => setState((s) => ({ ...s, finished: true })), 1000)
      return () => clearTimeout(t)
    }
    if (chars < current.length) {
      const t = setTimeout(() => setState((s) => ({ ...s, chars: s.chars + 1 })), 50)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setState((s) => ({ ...s, index: s.index + 1, chars: 0 })), 2000)
    return () => clearTimeout(t)
  }, [activated, finished, index, chars, current, reasons.length])

  // Cada razón es una sola tarjeta de principio a fin (misma clave): cuando se
  // termina de escribir, se desliza hacia arriba y le deja lugar a la próxima.
  const cards: { key: string; text: string; typing: boolean; old: boolean; n: number }[] = []
  if (!finished && activated && index < reasons.length) {
    cards.push({
      key: `r-${index}`,
      text: current.slice(0, chars),
      typing: true,
      old: false,
      n: index + 1,
    })
  }
  for (let j = Math.min(index, reasons.length) - 1; j >= 0; j--) {
    cards.push({ key: `r-${j}`, text: reasons[j]!, typing: false, old: true, n: j + 1 })
  }

  return (
    <div className="bx-reasons">
      {BLOBS.map((b) => (
        <Loop
          key={b.className}
          active={ctx.active}
          className={b.className}
          duration={b.duration}
          frames={['translate(0px, 0px) scale(1)', b.move, 'translate(0px, 0px) scale(1)']}
        />
      ))}
      <div style={{ position: 'relative', zIndex: 20, marginBottom: 25, textAlign: 'center' }}>
        <Appear
          as="h2"
          active={ctx.active}
          y={-14}
          style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            background: 'linear-gradient(var(--bx-primary), #a73748)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          {theme.title}
        </Appear>
        <AnimatePresence initial={false}>
          {!finished && (
            <motion.p
              key="subtitulo"
              style={{ fontSize: '0.9rem', color: '#887c9c', marginTop: 5, fontWeight: 500 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: ctx.active ? 1 : 0, transition: { delay: 0.2 } }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
            >
              {theme.subtitle}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
      <motion.div className="bx-reasons-feed" layoutScroll>
        <AnimatePresence initial={false} mode="popLayout">
          {finished && (
            <motion.div
              key="final"
              layout
              className="bx-reason"
              style={{
                background: 'linear-gradient(135deg, var(--bx-primary) 0%, #ff9a9e 100%)',
                color: 'white',
                border: 'none',
              }}
              initial={{ opacity: 0, scale: 0.6, y: -40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={spring.pop}
            >
              <div className="bx-reason-text" style={{ color: 'white', textShadow: 'none' }}>
                {theme.finalTitle}
                <br />
                <small>{theme.finalText}</small>
              </div>
            </motion.div>
          )}
          {cards.map((card) => (
            <motion.div
              key={card.key}
              layout
              className="bx-reason"
              initial={{ opacity: 0, y: -50, scale: 1 }}
              animate={{
                opacity: card.old ? 0.55 : 1,
                y: 0,
                scale: card.old ? 0.95 : 1,
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ ...spring.soft, opacity: { duration: 0.5 } }}
            >
              <AnimatePresence initial={false}>
                {card.typing && (
                  <motion.div
                    className="bx-reason-badge"
                    initial={{ opacity: 0, y: 6, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: -6, x: '-50%' }}
                  >
                    {theme.badgePrefix}
                    {card.n}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="bx-reason-text">
                {card.text}
                {card.typing && (
                  <motion.span
                    className="bx-cursor"
                    animate={calm ? undefined : { opacity: [1, 1, 0, 0] }}
                    transition={{
                      duration: 1,
                      times: [0, 0.5, 0.5, 1],
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
