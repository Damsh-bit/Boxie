import { useEffect, useRef, useState } from 'react'
import { RichText } from '../RichText'
import type { Props } from './shared'

export function GameJackpot({ theme, ctx }: Props<'game.jackpot'>) {
  const [spinning, setSpinning] = useState(false)
  const [stopped, setStopped] = useState([true, true, true])
  const [won, setWon] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const spin = () => {
    if (spinning) return
    setSpinning(true)
    setStopped([false, false, false])
    setWon(false)
    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms))
    at(1200, () => setStopped([true, false, false]))
    at(1800, () => setStopped([true, true, false]))
    at(2500, () => {
      setStopped([true, true, true])
      setSpinning(false)
      at(500, () => setWon(true))
      if (!ctx.preview && typeof navigator !== 'undefined' && 'vibrate' in navigator)
        navigator.vibrate([100, 50, 100, 50, 300])
    })
  }

  const symbols = theme.symbols.length ? theme.symbols : ['🎁']

  return (
    <div className="bx-slot">
      <div className="bx-slot-lights" />
      {won && (
        <>
          <div className="bx-coin" style={{ left: '10%', animationDelay: '0s' }}>
            ✨
          </div>
          <img
            src={ctx.logoUrl}
            className="bx-coin"
            style={{ left: '30%', width: 50, animationDelay: '0.5s' }}
            alt=""
          />
          <div className="bx-coin" style={{ left: '50%', animationDelay: '1s' }}>
            🎁
          </div>
        </>
      )}
      <h1 className="bx-slot-title">
        <RichText value={theme.title} />
      </h1>
      <div className="bx-reels">
        <div className="bx-payline" />
        {[0, 1, 2].map((reel) => (
          <div key={reel} className={`bx-reel ${!stopped[reel] ? 'is-spinning' : ''}`}>
            {stopped[reel] ? (
              <div className="bx-slot-icon" style={{ height: '100%', animation: 'bx-pop 0.3s' }}>
                <img src={ctx.logoUrl} alt="Boxie" />
              </div>
            ) : (
              <div className="bx-reel-strip">
                {[...symbols, ...symbols].map((symbol, i) => (
                  <div key={i} className="bx-slot-icon">
                    {symbol}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {!won ? (
        <button type="button" className="bx-spin-btn" onClick={spin} disabled={spinning}>
          {spinning ? '...' : theme.spinLabel}
        </button>
      ) : (
        <div
          style={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.5rem',
            animation: 'bx-pulse 1s infinite',
            zIndex: 10,
          }}
        >
          {theme.wonLabel}
        </div>
      )}
      {won && (
        <div className="bx-win-overlay">
          <img
            src={ctx.logoUrl}
            alt="Boxie"
            style={{
              width: 140,
              filter: 'drop-shadow(0 0 25px var(--bx-primary))',
              marginBottom: 20,
              animation: 'bx-pop 0.8s',
            }}
          />
          <h1 className="bx-win-title">{theme.winTitle}</h1>
          <p style={{ fontSize: '1.4rem', color: 'white', marginBottom: 20 }}>{theme.winText}</p>
          <div className="bx-win-hint">{theme.scrollHint}</div>
        </div>
      )}
    </div>
  )
}
