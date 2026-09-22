import type { CSSProperties } from 'react'
import { useSequence, type Props } from './shared'

const sticker = (rot: string, extra: CSSProperties = {}): CSSProperties =>
  ({ '--rot': rot, ...extra }) as CSSProperties

export function StoryIntro({ theme, ctx }: Props<'story.intro'>) {
  const step = useSequence(ctx.active, [2200, 5500])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, var(--bx-primary) 0%, #FF8E9E 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 40,
          background: 'white',
          padding: '10px 15px',
          borderRadius: 15,
          transform: 'rotate(-3deg)',
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          zIndex: 50,
        }}
      >
        <img src={ctx.logoUrl} alt="Boxie" style={{ height: 30 }} />
      </div>

      {ctx.active && step === 0 && (
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            className="bx-sticker"
            style={sticker('-5deg', {
              background: 'var(--bx-ink)',
              color: 'white',
              fontSize: '4rem',
              textTransform: 'uppercase',
              lineHeight: 1,
            })}
          >
            {theme.greeting}
          </div>
          <div
            className="bx-sticker"
            style={sticker('3deg', {
              background: 'white',
              color: 'var(--bx-primary)',
              fontSize: '3rem',
              marginTop: -10,
              animationDelay: '0.3s',
              overflowWrap: 'anywhere',
            })}
          >
            {ctx.recipientName || 'Alguien especial'}
          </div>
          <svg
            className="bx-scribble"
            style={sticker('10deg', { width: 60, top: -20, right: -30 })}
            viewBox="0 0 50 50"
            aria-hidden
          >
            <path
              d="M10 40 Q 25 10, 40 20"
              stroke="white"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {step === 1 && (
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            className="bx-font-marker"
            style={{
              color: 'white',
              fontSize: '1.5rem',
              transform: 'rotate(-5deg)',
              marginBottom: 10,
              animation: 'bx-slide-in-up 0.5s ease',
            }}
          >
            {theme.line1}
          </div>
          <div
            className="bx-sticker"
            style={sticker('2deg', {
              background: 'white',
              color: 'var(--bx-ink)',
              fontSize: '1.8rem',
              textTransform: 'uppercase',
            })}
          >
            {theme.line2}
          </div>
          <div
            className="bx-sticker"
            style={sticker('-3deg', {
              background: 'var(--bx-ink)',
              color: 'var(--bx-accent)',
              fontSize: '3rem',
              textTransform: 'uppercase',
              marginTop: -5,
              animationDelay: '0.3s',
            })}
          >
            {theme.line3}
          </div>
          <div
            className="bx-sticker"
            style={sticker('4deg', {
              background: '#87CEEB',
              color: 'white',
              fontSize: '1.2rem',
              marginTop: 15,
              animationDelay: '0.6s',
              borderRadius: 20,
            })}
          >
            {theme.line4}
          </div>
        </div>
      )}

      {step === 2 && (
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            className="bx-sticker"
            style={sticker('-2deg', {
              background: 'white',
              color: 'var(--bx-primary)',
              fontSize: '0.9rem',
              borderRadius: 50,
              padding: '8px 20px',
              marginBottom: 20,
            })}
          >
            {theme.tag}
          </div>
          <div style={{ marginBottom: 20 }}>
            <span
              className="bx-font-marker"
              style={{
                display: 'block',
                color: 'white',
                fontSize: '1.2rem',
                textAlign: 'left',
                marginLeft: -20,
              }}
            >
              {theme.thoughtLabel}
            </span>
            <div
              className="bx-sticker"
              style={sticker('1deg', {
                background: 'var(--bx-ink)',
                color: 'white',
                fontSize: '2.5rem',
                textTransform: 'uppercase',
                padding: '10px 20px',
                border: '3px solid white',
              })}
            >
              {theme.title}
            </div>
          </div>
          <p
            className="bx-font-fredoka"
            style={{
              color: 'white',
              fontSize: '1.4rem',
              fontWeight: 700,
              maxWidth: '90%',
              lineHeight: 1.4,
              textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
              animation: 'bx-slide-in-up 0.8s ease 0.5s backwards',
            }}
          >
            &quot;{theme.message}&quot;
          </p>
          <div style={{ marginTop: 50, animation: 'bx-slide-in-up 0.8s ease 1s backwards' }}>
            <div style={{ fontSize: '2rem', animation: 'bx-bounce 2s infinite' }}>👇</div>
            <p
              style={{
                color: 'white',
                fontSize: '0.8rem',
                opacity: 0.8,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginTop: 5,
              }}
            >
              {theme.cta}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
