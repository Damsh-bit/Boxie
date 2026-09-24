import { AnimatePresence, motion } from 'framer-motion'
import { ease } from './motion'
import { useSequence, type Props } from './shared'

/** Telón que se abre: arranca lento, toma envión y frena al llegar (como uno de verdad). */
const curtain = { duration: 2.4, ease: [0.45, 0.05, 0.25, 1] as const }

export function ConnectorCinema({ theme, ctx }: Props<'connector.cinema'>) {
  // Se abre el telón a los 300 ms; a los 3,5 s cambia el mensaje.
  const step = useSequence(ctx.active, [300, 3500])
  const open = ctx.active && step >= 1
  const textStep = step >= 2 ? 1 : 0

  return (
    <div className="bx-cinema">
      <div className="bx-valance" />
      <motion.div
        className="bx-curtain bx-curtain-left"
        initial={false}
        animate={open ? { x: '-95%', skewY: [0, -1.5, 0] } : { x: '0%', skewY: 0 }}
        transition={open ? curtain : { duration: 0.5, ease: ease.out }}
      />
      <motion.div
        className="bx-curtain bx-curtain-right"
        initial={false}
        animate={open ? { x: '95%', skewY: [0, 1.5, 0] } : { x: '0%', skewY: 0 }}
        transition={open ? curtain : { duration: 0.5, ease: ease.out }}
      />
      <motion.div
        className="bx-cinema-content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={open ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 1.5, ease: ease.out, delay: open ? 0.8 : 0 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {textStep === 0 ? (
            <motion.div
              key="estreno"
              className="bx-cinema-message"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.95 }}
              transition={{ duration: 0.8, ease: ease.out }}
            >
              <h1 className="bx-cinema-title">{theme.title}</h1>
              <p className="bx-cinema-subtitle">{theme.subtitle}</p>
              <motion.div
                style={{
                  fontSize: '4rem',
                  marginTop: 20,
                  filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))',
                }}
                animate={open ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 1.6, delay: 1.6, ease: 'easeInOut' }}
              >
                {theme.emoji}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="mensaje"
              className="bx-cinema-message"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: ease.out }}
            >
              <div style={{ fontSize: '3rem', marginBottom: 20 }}>{theme.secondEmoji}</div>
              <h2
                style={{
                  color: 'white',
                  fontSize: '1.5rem',
                  lineHeight: 1.4,
                  textShadow: '0 2px 10px black',
                }}
              >
                <span
                  style={{
                    color: 'var(--bx-primary)',
                    fontWeight: 900,
                    fontSize: '1.8rem',
                    textTransform: 'uppercase',
                  }}
                >
                  {ctx.senderName || 'Alguien'}
                </span>
                <br />
                {theme.message}
              </h2>
              <p
                style={{
                  color: 'rgba(255,255,255,0.9)',
                  fontSize: '1.1rem',
                  marginTop: 20,
                  fontStyle: 'italic',
                  background: 'rgba(0,0,0,0.6)',
                  padding: 15,
                  borderRadius: 15,
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                {theme.quote}
              </p>
              <div
                style={{
                  marginTop: 30,
                  fontSize: '0.8rem',
                  opacity: 0.7,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                }}
              >
                {theme.footer}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
