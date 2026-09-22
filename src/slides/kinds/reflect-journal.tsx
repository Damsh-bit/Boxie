import { useMemo, useState } from 'react'
import { seededRandom } from '../player/effects'
import { RichText } from '../RichText'
import { useSequence, type Props } from './shared'

type View = 'intro' | 'writing' | 'outro'

export function ReflectJournal({ theme, ctx }: Props<'reflect.journal'>) {
  const [view, setView] = useState<View>('intro')
  const [entry, setEntry] = useState('')
  const introStep = useSequence(ctx.active && view === 'intro', [1500, 4000])

  const bubbles = useMemo(() => {
    const rand = seededRandom(1717)
    return Array.from({ length: 20 }, () => {
      const size = rand() * 60 + 20
      return {
        left: `${rand() * 100}%`,
        size,
        duration: `${rand() * 10 + 15}s`,
        delay: `${rand() * 5}s`,
      }
    })
  }, [])

  const reveal = (visible: boolean) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(30px)',
    transition: 'all 1s ease',
  })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden
      >
        {bubbles.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              bottom: -100,
              left: b.left,
              width: b.size,
              height: b.size,
              background: 'rgba(255,255,255,0.15)',
              borderRadius: '50%',
              backdropFilter: 'blur(2px)',
              animation: `bx-bubbles ${b.duration} infinite linear`,
              animationDelay: b.delay,
            }}
          />
        ))}
      </div>
      <img
        src={ctx.logoUrl}
        alt="Boxie"
        style={{
          position: 'absolute',
          top: 40,
          left: 0,
          right: 0,
          margin: 'auto',
          width: 80,
          filter: 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,100,200,0.2))',
          zIndex: 10,
          opacity: 0.9,
        }}
      />

      {view === 'intro' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 30,
            textAlign: 'center',
            zIndex: 2,
            position: 'relative',
          }}
        >
          <div style={{ height: 80 }} />
          <div style={reveal(true)}>
            <div
              style={{
                fontSize: '4rem',
                marginBottom: 20,
                filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.4))',
              }}
            >
              {theme.introEmoji}
            </div>
            <h2
              style={{
                fontSize: '2.5rem',
                fontWeight: 900,
                marginBottom: 10,
                textShadow: '0 5px 15px rgba(0,100,200,0.2)',
              }}
            >
              {theme.introTitle}
            </h2>
          </div>
          <p
            style={{
              ...reveal(introStep >= 1),
              fontSize: '1.2rem',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.95)',
              maxWidth: 320,
              fontWeight: 500,
            }}
          >
            <RichText value={theme.introText} />
          </p>
          <div
            style={{
              opacity: introStep >= 2 ? 1 : 0,
              marginTop: 50,
              transform: introStep >= 2 ? 'scale(1)' : 'scale(0.9)',
              transition: 'all 0.8s ease 0.3s',
            }}
          >
            <button
              type="button"
              onClick={() => setView('writing')}
              style={{
                background: 'white',
                color: '#00c6fb',
                border: 'none',
                padding: '18px 50px',
                borderRadius: 50,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 15px 40px rgba(0,198,251,0.3)',
              }}
            >
              {theme.openLabel}
            </button>
          </div>
        </div>
      )}

      {view === 'writing' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 30,
            animation: 'bx-fade-in-up 0.8s',
            zIndex: 2,
            position: 'relative',
            textAlign: 'left',
          }}
        >
          <div style={{ height: 70 }} />
          <div
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
          >
            <div
              style={{
                color: 'white',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 3,
                fontSize: '0.9rem',
                marginBottom: 15,
                opacity: 0.9,
                textShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {theme.promptTitle}
            </div>
            <h2
              style={{
                fontSize: '2rem',
                lineHeight: 1.3,
                marginBottom: 30,
                fontWeight: 800,
                textShadow: '0 5px 20px rgba(0,100,200,0.2)',
              }}
            >
              {theme.promptText}
            </h2>
            <div style={{ position: 'relative', flex: 1, maxHeight: '40vh' }}>
              <textarea
                autoFocus
                placeholder={theme.placeholder}
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                style={{
                  width: '100%',
                  height: '100%',
                  background: 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: 25,
                  color: 'white',
                  fontSize: '1.2rem',
                  padding: 25,
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                  lineHeight: 1.6,
                  backdropFilter: 'blur(15px)',
                  boxShadow: '0 20px 50px rgba(0,100,200,0.15)',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 30 }}>
            <button
              type="button"
              onClick={() => entry.trim().length > 5 && setView('outro')}
              disabled={entry.trim().length <= 5}
              style={{
                background: 'white',
                color: '#00c6fb',
                border: 'none',
                padding: '15px 40px',
                borderRadius: 50,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                opacity: entry.trim().length <= 5 ? 0.5 : 1,
                transform: entry.trim().length <= 5 ? 'scale(0.95)' : 'scale(1)',
                transition: 'all 0.3s',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(0,198,251,0.2)',
              }}
            >
              {theme.saveLabel}
            </button>
          </div>
        </div>
      )}

      {view === 'outro' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            animation: 'bx-fade-in 1s',
            padding: 30,
            zIndex: 2,
            position: 'relative',
          }}
        >
          <div
            style={{
              fontSize: '5rem',
              marginBottom: 20,
              filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.6))',
            }}
          >
            {theme.outroEmoji}
          </div>
          <h2
            style={{
              fontSize: '2.5rem',
              fontWeight: 900,
              margin: 0,
              textShadow: '0 5px 15px rgba(0,100,200,0.2)',
            }}
          >
            {theme.outroTitle}
          </h2>
          <p
            style={{
              color: 'rgba(255,255,255,0.95)',
              marginTop: 20,
              fontSize: '1.2rem',
              lineHeight: 1.5,
              maxWidth: 350,
            }}
          >
            {theme.outroQuote}
          </p>
          <div
            style={{
              marginTop: 50,
              padding: '15px 35px',
              background: 'rgba(255,255,255,0.3)',
              borderRadius: 30,
              fontSize: '1rem',
              color: 'white',
              fontWeight: 'bold',
              border: '1px solid rgba(255,255,255,0.4)',
              backdropFilter: 'blur(10px)',
            }}
          >
            {theme.outroBadge}
          </div>
        </div>
      )}
    </div>
  )
}
