import { useEffect, useState } from 'react'
import { useActivated, type Props } from './shared'

export function StoryReasons({ theme, buyer, ctx }: Props<'story.reasons'>) {
  const own = buyer.reasons.map((r) => r.trim()).filter(Boolean)
  const reasons = own.length ? own : theme.suggestions.filter(Boolean)
  const activated = useActivated(ctx.active)

  const [state, setState] = useState({
    signature: '',
    index: 0,
    chars: 0,
    shown: [] as string[],
    finished: false,
  })
  const signature = reasons.join('|')
  // Si el comprador edita las razones en la vista previa, la animación arranca de nuevo.
  if (state.signature !== signature)
    setState({ signature, index: 0, chars: 0, shown: [], finished: false })
  const { index, chars, shown, finished } = state
  const current = reasons[index] ?? ''
  const typed = current.slice(0, chars)

  useEffect(() => {
    if (!activated || finished) return
    if (index >= reasons.length) {
      const t = setTimeout(() => setState((s) => ({ ...s, finished: true })), 1000)
      return () => clearTimeout(t)
    }
    if (chars < current.length) {
      const t = setTimeout(() => setState((s) => ({ ...s, chars: s.chars + 1 })), 50)
      return () => clearTimeout(t)
    }
    const t = setTimeout(
      () => setState((s) => ({ ...s, shown: [...s.shown, current], index: s.index + 1, chars: 0 })),
      2000,
    )
    return () => clearTimeout(t)
  }, [activated, finished, index, chars, current, reasons.length])

  return (
    <div className="bx-reasons">
      <div className="bx-blob bx-blob-1" />
      <div className="bx-blob bx-blob-2" />
      <div className="bx-blob bx-blob-3" />
      <div style={{ position: 'relative', zIndex: 20, marginBottom: 25, textAlign: 'center' }}>
        <h2
          style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            background: 'linear-gradient(var(--bx-primary), #a73748)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: 0,
          }}
        >
          {theme.title}
        </h2>
        {!finished && (
          <p style={{ fontSize: '0.9rem', color: '#887c9c', marginTop: 5, fontWeight: 500 }}>
            {theme.subtitle}
          </p>
        )}
      </div>
      <div className="bx-reasons-feed">
        {!finished && activated && index < reasons.length && (
          <div className="bx-reason">
            <div className="bx-reason-badge">
              {theme.badgePrefix}
              {index + 1}
            </div>
            <div className="bx-reason-text">
              {typed}
              <span className="bx-cursor" />
            </div>
          </div>
        )}
        {[...shown].reverse().map((text, i) => (
          <div key={shown.length - i} className="bx-reason is-old">
            <div className="bx-reason-text">{text}</div>
          </div>
        ))}
        {finished && (
          <div
            className="bx-reason"
            style={{
              background: 'linear-gradient(135deg, var(--bx-primary) 0%, #ff9a9e 100%)',
              color: 'white',
              border: 'none',
            }}
          >
            <div className="bx-reason-text" style={{ color: 'white', textShadow: 'none' }}>
              {theme.finalTitle}
              <br />
              <small>{theme.finalText}</small>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
