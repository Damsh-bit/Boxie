import { useEffect, useRef, useState } from 'react'
import { ConfettiLayer } from '../player/effects'
import { RichText } from '../RichText'
import { useSequence, type Props } from './shared'

type View = 'choose' | 'opening' | 'result'

export function GameFortune({ theme, ctx }: Props<'game.fortune'>) {
  const lines = theme.introLines.length ? theme.introLines : ['']
  // Una frase cada 1,2 s, después la bola de cristal y a los 0,9 s la elección.
  const delays = [...lines.map((_, i) => (i + 1) * 1200), lines.length * 1200 + 900]
  const intro = useSequence(ctx.active, delays)
  const [view, setView] = useState<View | null>(null)
  const [message, setMessage] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const current: View | 'intro' = view ?? (intro > lines.length ? 'choose' : 'intro')

  const pick = () => {
    const fortunes = theme.fortunes.length ? theme.fortunes : ['']
    setMessage(fortunes[Math.floor(Math.random() * fortunes.length)]!)
    setView('opening')
    timer.current = setTimeout(() => setView('result'), 1500)
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(-45deg, #FF9A9E, var(--bx-primary), #a18cd1, #fbc2eb)',
        backgroundSize: '400% 400%',
        animation: 'bx-gradient 15s ease infinite',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <img
        src={ctx.logoUrl}
        alt="Boxie"
        style={{
          position: 'absolute',
          top: 30,
          left: 0,
          right: 0,
          margin: 'auto',
          width: 80,
          filter: 'brightness(0) invert(1) drop-shadow(0 2px 5px rgba(0,0,0,0.2))',
          zIndex: 10,
        }}
      />

      {current === 'intro' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 30,
          }}
        >
          <div
            style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: 'white',
              textTransform: 'uppercase',
              letterSpacing: -1,
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            {intro < lines.length ? (
              <span key={intro} style={{ animation: 'bx-fade-in 0.5s', display: 'inline-block' }}>
                {lines[intro]}
              </span>
            ) : (
              <div
                style={{
                  animation: 'bx-pop 0.5s',
                  fontSize: '5rem',
                  filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.2))',
                }}
              >
                {theme.introEmoji}
              </div>
            )}
          </div>
        </div>
      )}

      {current === 'choose' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'bx-fade-in 0.5s',
            padding: 20,
          }}
        >
          <div style={{ height: 60 }} />
          <h2
            style={{
              color: 'white',
              fontSize: '2rem',
              fontWeight: 900,
              marginBottom: 10,
              textAlign: 'center',
              textShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}
          >
            {theme.chooseTitle}
          </h2>
          <p
            style={{
              color: 'white',
              marginBottom: 40,
              fontSize: '1.1rem',
              textAlign: 'center',
              maxWidth: 300,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            <RichText value={theme.chooseText} />
          </p>
          <div
            style={{
              display: 'flex',
              gap: 15,
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {[1, 2, 3].map((n) => (
              <button
                type="button"
                key={n}
                onClick={pick}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'pointer',
                  animation: `bx-float-cookie ${3 + n}s infinite ease-in-out`,
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                <div
                  style={{ fontSize: '4.5rem', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.2))' }}
                >
                  🥠
                </div>
                <div
                  style={{
                    marginTop: 10,
                    background: 'rgba(255,255,255,0.2)',
                    padding: '5px 10px',
                    borderRadius: 10,
                    fontSize: '0.7rem',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  {theme.optionLabel} {n}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {current === 'opening' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              fontSize: '7rem',
              animation: 'bx-shake 0.5s infinite',
              filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.2))',
            }}
          >
            🥠
          </div>
        </div>
      )}

      {current === 'result' && (
        <div className="bx-prize-overlay">
          <ConfettiLayer standalone seed={77} />
          <div
            style={{
              background: 'white',
              width: '85%',
              maxWidth: 350,
              borderRadius: 25,
              overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              animation: 'bx-pop-fade 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                height: 150,
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: '#fff0f5',
                backgroundImage:
                  'radial-gradient(circle at 20% 30%, rgba(244, 78, 99, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(161, 140, 209, 0.15) 0%, transparent 50%)',
                backgroundSize: '150% 150%',
                animation: 'bx-header-pattern 10s ease infinite alternate',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(255,255,255,1) 5%, transparent 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 90,
                  height: 90,
                  background: 'white',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                  zIndex: 10,
                }}
              >
                <img src={ctx.logoUrl} alt="" style={{ width: 60, height: 'auto' }} />
              </div>
            </div>
            <div
              style={{
                padding: '10px 30px 40px 30px',
                textAlign: 'center',
                position: 'relative',
                zIndex: 5,
              }}
            >
              <div
                style={{
                  color: 'var(--bx-primary)',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  fontSize: '0.8rem',
                  marginBottom: 15,
                  marginTop: 10,
                }}
              >
                {theme.resultLabel}
              </div>
              <h3
                style={{
                  fontFamily: 'serif',
                  fontSize: '1.4rem',
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                  color: 'var(--bx-ink)',
                  marginBottom: 25,
                }}
              >
                &quot;{message}&quot;
              </h3>
              <div
                style={{
                  width: 50,
                  height: 3,
                  background: '#eee',
                  margin: '0 auto 20px auto',
                  borderRadius: 2,
                }}
              />
              <p style={{ fontSize: '0.85rem', color: '#888' }}>
                <RichText value={theme.resultFooter} marks={{ accent: 'bx-fortune-accent' }} />
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
