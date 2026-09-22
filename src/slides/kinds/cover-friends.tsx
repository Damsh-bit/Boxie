import { RichText } from '../RichText'
import { tint, type Props } from './shared'

export function CoverFriends({ theme, ctx }: Props<'cover.friends'>) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-20%',
          width: 350,
          height: 350,
          background: tint('--bx-primary', 15),
          borderRadius: '50%',
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-20%',
          width: 350,
          height: 350,
          background: tint('--bx-ink', 10),
          borderRadius: '50%',
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <div
          className="bx-font-fredoka"
          style={{
            fontSize: '0.9rem',
            color: 'var(--bx-primary)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 20,
            background: 'white',
            padding: '10px 25px',
            borderRadius: 30,
            boxShadow: `0 4px 15px ${tint('--bx-primary', 15)}`,
          }}
        >
          {theme.badge}
        </div>

        <h1
          className="bx-font-fredoka"
          style={{
            color: 'var(--bx-primary)',
            fontSize: '4.5rem',
            lineHeight: 0.9,
            marginBottom: 40,
            textAlign: 'center',
            textShadow: `3px 3px 0px ${tint('--bx-primary', 10)}`,
            animation: ctx.active
              ? 'bx-scale-up 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards'
              : undefined,
            overflowWrap: 'anywhere',
            padding: '0 12px',
          }}
        >
          {ctx.recipientName || 'Alguien especial'}
        </h1>

        <div
          style={{
            background: 'white',
            padding: 30,
            borderRadius: 25,
            maxWidth: '85%',
            textAlign: 'center',
            boxShadow: '0 15px 35px rgba(0,0,0,0.08)',
            border: `2px solid ${tint('--bx-primary', 10)}`,
            animation: ctx.active ? 'bx-cover-pop 0.8s ease-out 0.3s backwards' : undefined,
          }}
        >
          <p
            className="bx-font-fredoka"
            style={{
              fontSize: '1.3rem',
              color: '#555',
              margin: 0,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            <RichText value={theme.quote} />
          </p>
          <div
            style={{
              marginTop: 20,
              color: 'var(--bx-primary)',
              fontWeight: 800,
              fontSize: '1.2rem',
              letterSpacing: 0.5,
            }}
          >
            {theme.thanks}
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: -90,
            left: '10%',
            fontSize: '3.5rem',
            animation: 'bx-emoji-float 3s infinite ease-in-out',
            opacity: 0.9,
          }}
        >
          {theme.emojiTop}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: -60,
            right: '10%',
            fontSize: '3.5rem',
            animation: 'bx-emoji-float 4s infinite ease-in-out 1s',
            opacity: 0.9,
          }}
        >
          {theme.emojiBottom}
        </div>
      </div>

      <div
        className="bx-font-fredoka"
        style={{
          marginTop: 50,
          borderBottom: '2px solid var(--bx-primary)',
          paddingBottom: 5,
          color: 'var(--bx-ink)',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {theme.senderPrefix} {ctx.senderName}
      </div>
    </div>
  )
}
