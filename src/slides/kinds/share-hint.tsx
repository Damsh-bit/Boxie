/** "¡Presumí tu regalo!": cómo compartir una captura en Stories (revista y anécdota). */
export function ShareHint({
  onClose,
  handle = '@boxie.app',
}: {
  onClose: () => void
  handle?: string
}) {
  return (
    <div className="bx-modal-overlay" onClick={onClose}>
      <div
        className="bx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Compartir en Stories"
      >
        <div style={{ fontSize: '3rem', marginBottom: 10 }}>📸</div>
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
        <button
          type="button"
          onClick={onClose}
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
        </button>
      </div>
    </div>
  )
}
