import { useSequence, type Props } from './shared'

export function ConnectorCinema({ theme, ctx }: Props<'connector.cinema'>) {
  // Se abre el telón a los 300 ms; a los 3,5 s cambia el mensaje.
  const step = useSequence(ctx.active, [300, 3500])
  const open = step >= 1
  const textStep = step >= 2 ? 1 : 0

  return (
    <div className={`bx-cinema ${open ? 'is-open' : ''}`}>
      <div className="bx-valance" />
      <div className="bx-curtain bx-curtain-left" />
      <div className="bx-curtain bx-curtain-right" />
      <div className="bx-cinema-content">
        <div className={`bx-cinema-message ${textStep === 0 ? 'is-shown' : 'is-hidden'}`}>
          <h1 className="bx-cinema-title">{theme.title}</h1>
          <p className="bx-cinema-subtitle">{theme.subtitle}</p>
          <div
            style={{
              fontSize: '4rem',
              marginTop: 20,
              filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.5))',
            }}
          >
            {theme.emoji}
          </div>
        </div>
        <div className={`bx-cinema-message ${textStep === 1 ? 'is-shown' : 'is-hidden'}`}>
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
        </div>
      </div>
    </div>
  )
}
