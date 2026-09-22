import type { Props } from './shared'

const SHAPES = [
  { char: '✖', left: '10%', size: '2rem', delay: '0s', duration: '6s' },
  { char: '○', left: '80%', size: '3rem', delay: '1s', duration: '8s' },
  { char: '△', left: '20%', size: '4rem', delay: '2.5s', duration: '7s', color: '#ff9a9e' },
  { char: '□', left: '70%', size: '2.5rem', delay: '0.5s', duration: '9s' },
  { char: '✖', left: '50%', size: '1.5rem', delay: '3s', duration: '5s' },
]

export function ConnectorGamer({ theme }: Props<'connector.gamer'>) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#fdfbfb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {SHAPES.map((s, i) => (
        <div
          key={i}
          className="bx-gamer-shape"
          style={{
            left: s.left,
            fontSize: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
            color: s.color,
          }}
          aria-hidden
        >
          {s.char}
        </div>
      ))}
      <div
        style={{
          zIndex: 10,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            fontSize: '5rem',
            filter: 'drop-shadow(0 10px 20px rgba(244, 78, 99, 0.3))',
            animation: 'bx-pulse-soft 2s infinite ease-in-out',
          }}
        >
          {theme.emoji}
        </div>
        <div>
          <h2
            style={{
              color: 'var(--bx-ink)',
              fontSize: '2rem',
              margin: 0,
              fontWeight: 900,
              letterSpacing: -1,
            }}
          >
            {theme.title}
          </h2>
          <p
            style={{
              color: 'var(--bx-primary)',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              margin: '5px 0 0 0',
              textTransform: 'uppercase',
              letterSpacing: 2,
            }}
          >
            {theme.subtitle}
          </p>
        </div>
        <div
          style={{
            width: 150,
            height: 4,
            background: '#eee',
            borderRadius: 10,
            marginTop: 20,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'var(--bx-primary)',
              animation: 'bx-loading 1.5s infinite ease-in-out',
            }}
          />
        </div>
      </div>
    </div>
  )
}
