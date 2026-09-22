import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { RichText } from '../RichText'
import { useSequence, type Props } from './shared'

type View = 'intro' | 'questions' | 'outro'

export function ReflectGratitude({ theme, ctx }: Props<'reflect.gratitude'>) {
  const [view, setView] = useState<View>('intro')
  const [step, setStep] = useState(0)
  const [answer, setAnswer] = useState('')
  const introStep = useSequence(ctx.active && view === 'intro', [1500, 4500])
  const questions = theme.questions.length
    ? theme.questions
    : [{ icon: '✨', label: '', question: '', placeholder: '' }]
  const question = questions[step] ?? questions[0]!

  const next = () => {
    if (step < questions.length - 1) {
      setAnswer('')
      setStep(step + 1)
    } else {
      setView('outro')
    }
  }

  const reveal = (visible: boolean, delay = '0s') => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(20px)',
    transition: `all 1s ease ${delay}`,
  })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, var(--bx-ink) 0%, #1a1520 100%)',
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
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          opacity: 0.03,
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden
      >
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img
              src={ctx.logoUrl}
              alt=""
              style={{
                width: 25,
                transform: `rotate(${i % 2 === 0 ? 15 : -15}deg)`,
                filter: 'grayscale(1) brightness(2)',
              }}
            />
          </div>
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
          width: 130,
          zIndex: 10,
          filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))',
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
          <div style={{ height: 100 }} />
          <div style={reveal(true)}>
            <div style={{ fontSize: '3rem', marginBottom: 20 }}>{theme.introEmoji}</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: 10 }}>
              {theme.introTitle}
            </h2>
          </div>
          <p
            style={{
              ...reveal(introStep >= 1),
              fontSize: '1.1rem',
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.8)',
              maxWidth: 300,
            }}
          >
            <RichText value={theme.introText} />
          </p>
          <div
            style={{
              opacity: introStep >= 2 ? 1 : 0,
              marginTop: 40,
              transition: 'all 1s ease 0.5s',
            }}
          >
            <button
              type="button"
              onClick={() => setView('questions')}
              style={{
                background: 'var(--bx-primary)',
                color: 'white',
                border: 'none',
                padding: '15px 40px',
                borderRadius: 50,
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 10px 30px rgba(244, 78, 99, 0.3)',
              }}
            >
              {theme.startLabel}
            </button>
          </div>
        </div>
      )}

      {view === 'questions' && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 30,
            animation: 'bx-fade-in 1s',
            zIndex: 2,
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', gap: 5, marginTop: 120, marginBottom: 30 }}>
            {questions.map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 3,
                  background: i <= step ? 'var(--bx-primary)' : 'rgba(255,255,255,0.1)',
                  borderRadius: 2,
                }}
              />
            ))}
          </div>
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                color: 'var(--bx-primary)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: 2,
                fontSize: '0.8rem',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {question.icon} {question.label}
            </div>
            <h2 style={{ fontSize: '2rem', lineHeight: 1.3, marginBottom: 30 }}>
              {question.question}
            </h2>
            <textarea
              key={step}
              autoFocus
              placeholder={question.placeholder}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '2px solid rgba(255,255,255,0.2)',
                color: 'white',
                fontSize: '1.2rem',
                padding: '10px 0',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            <button
              type="button"
              onClick={next}
              disabled={answer.trim().length < 2}
              aria-label="Siguiente"
              style={{
                background: 'white',
                color: 'var(--bx-ink)',
                border: 'none',
                width: 50,
                height: 50,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: answer.trim().length < 2 ? 0.3 : 1,
                transition: 'all 0.2s',
                cursor: 'pointer',
              }}
            >
              <ArrowRight size={24} />
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
          <div style={{ fontSize: '4rem', marginBottom: 20 }}>{theme.outroEmoji}</div>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>{theme.outroTitle}</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 10 }}>
            <RichText value={theme.outroText} />
          </p>
          <div
            style={{
              marginTop: 40,
              padding: 15,
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 15,
              fontSize: '0.9rem',
              color: 'var(--bx-primary)',
            }}
          >
            {theme.outroBadge}
          </div>
        </div>
      )}
    </div>
  )
}
