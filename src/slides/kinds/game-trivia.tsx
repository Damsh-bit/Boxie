import { Camera, CircleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { RichText } from '../RichText'
import { ConfettiLayer, LogoPattern } from '../player/effects'
import type { Props } from './shared'

type View = 'intro' | 'game' | 'prize'

export function GameTrivia({ theme, ctx }: Props<'game.trivia'>) {
  const questions = theme.questions.filter((q) => q.question && q.options.length >= 2)
  const [view, setView] = useState<View>('intro')
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [showHint, setShowHint] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const question = questions[qIndex]
  const correctIndex = question ? Math.min(question.correct, question.options.length) - 1 : -1

  const answer = (index: number) => {
    if (selected !== null || !question) return
    setSelected(index)
    timer.current = setTimeout(() => {
      if (index === correctIndex) {
        if (qIndex < questions.length - 1) {
          setQIndex((q) => q + 1)
          setShowHint(false)
        } else {
          setView('prize')
        }
      }
      setSelected(null)
    }, 1000)
  }

  return (
    <div className="bx-trivia">
      <LogoPattern logoUrl={ctx.logoUrl} />

      {view === 'intro' && (
        <div className="bx-trivia-intro">
          <div
            style={{ fontSize: '4rem', marginBottom: 10, animation: 'bx-float-logo 3s infinite' }}
          >
            {theme.introEmoji}
          </div>
          <h2 className="bx-trivia-title">{theme.introTitle}</h2>
          <p className="bx-trivia-text">
            <RichText value={theme.introText} />
          </p>
          <button
            type="button"
            className="bx-btn-primary"
            onClick={() => setView(questions.length ? 'game' : 'prize')}
          >
            {theme.startLabel}
          </button>
        </div>
      )}

      {view === 'game' && question && (
        <div className="bx-trivia-game" key={qIndex}>
          <div className="bx-trivia-card">
            <div className="bx-trivia-mascot">🤔</div>
            <p className="bx-trivia-question">{question.question}</p>
          </div>
          {question.hint &&
            (showHint ? (
              <div className="bx-hint-box">
                {theme.hintPrefix} {question.hint}
              </div>
            ) : (
              <button type="button" className="bx-hint-btn" onClick={() => setShowHint(true)}>
                <CircleAlert size={16} /> {theme.hintLabel}
              </button>
            ))}
          <div className="bx-trivia-options">
            {question.options.map((option, i) => {
              const state =
                selected === null
                  ? ''
                  : i === correctIndex
                    ? 'is-correct'
                    : i === selected
                      ? 'is-wrong'
                      : ''
              return (
                <button
                  type="button"
                  key={i}
                  className={`bx-trivia-option ${state}`}
                  onClick={() => answer(i)}
                >
                  {option}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {view === 'prize' && (
        <div className="bx-prize-overlay">
          <ConfettiLayer standalone seed={42} />
          <div className="bx-winner-card">
            <div
              style={{
                width: 100,
                height: 100,
                margin: '-80px auto 20px',
                background: 'white',
                borderRadius: '50%',
                padding: 15,
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                animation: 'bx-float-logo 3s infinite ease-in-out',
              }}
            >
              <img
                src={ctx.logoUrl}
                alt="Boxie"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <h2
              style={{
                color: 'var(--bx-primary)',
                fontSize: '2rem',
                fontWeight: 900,
                margin: 0,
                lineHeight: 1.1,
                textTransform: 'uppercase',
              }}
            >
              <RichText value={theme.prizeTitle} />
            </h2>
            <p style={{ color: '#666', fontSize: '1rem', marginTop: 10 }}>{theme.prizeText}</p>
            <div className="bx-winner-badge">
              <div style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: 2 }}>
                {theme.prizeBadge}
              </div>
              <div
                style={{
                  fontSize: '0.8rem',
                  marginTop: 5,
                  opacity: 0.95,
                  borderTop: '1px solid rgba(255,255,255,0.4)',
                  paddingTop: 5,
                  width: '80%',
                }}
              >
                {theme.prizeDetail}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                color: 'var(--bx-ink)',
                opacity: 0.7,
                fontSize: '0.8rem',
              }}
            >
              <Camera size={16} />
              <span>{theme.prizeFootnote}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
