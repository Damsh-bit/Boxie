import { motion } from 'framer-motion'
import { spring } from './motion'

/**
 * "¡Presumí tu regalo!": cómo compartir una captura en Stories (revista y
 * anécdota). Va dentro de un AnimatePresence: entra y sale animado.
 */
export function ShareHint({
  onClose,
  handle = '@boxie.app',
}: {
  onClose: () => void
  handle?: string
}) {
  return (
    <motion.div
      className="bx-modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2, delay: 0.05 } }}
    >
      <motion.div
        className="bx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Compartir en Stories"
        initial={{ opacity: 0, scale: 0.85, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: spring.bouncy }}
        exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.18 } }}
      >
        <motion.div
          style={{ fontSize: '3rem', marginBottom: 10 }}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0, transition: { ...spring.pop, delay: 0.1 } }}
        >
          📸
        </motion.div>
        <h3 style={{ color: 'var(--bx-ink)', margin: '0 0 10px 0', fontSize: '1.4rem' }}>
          ¡Presumí tu regalo!
        </h3>
        <p style={{ color: '#666', fontSize: '0.95rem', marginBottom: 20, lineHeight: 1.5 }}>
          Hacé una <strong>captura de pantalla</strong> de esta tarjeta (ya tiene el logo 😉) y
          subila a tus Historias.
        </p>
        <div
          style={{
            background: '#f8f8f8',
            padding: 12,
            borderRadius: 12,
            fontSize: '0.85rem',
            color: '#555',
            marginBottom: 25,
          }}
        >
          Etiquetanos para que lo veamos:
          <br />
          <strong style={{ color: 'var(--bx-primary)', fontSize: '1rem' }}>{handle}</strong>
        </div>
        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ scale: 0.96 }}
          style={{
            background: 'var(--bx-ink)',
            border: 'none',
            padding: '12px 30px',
            borderRadius: 30,
            color: 'white',
            fontWeight: 'bold',
            fontSize: '0.9rem',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          ¡Entendido!
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
