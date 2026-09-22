import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { shareOrCopy, type Props } from './shared'

export function StoryDedication({ theme, buyer, ctx }: Props<'story.dedication'>) {
  const [notice, setNotice] = useState<string | null>(null)
  const image = ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(theme.defaultImage)
  const text = buyer.text.trim() || theme.defaultText

  const share = async () => {
    if (ctx.preview) return setNotice('En el regalo, este botón comparte el link.')
    const result = await shareOrCopy({
      title: 'Una carta especial',
      text: `Dedicatoria de ${ctx.senderName} para ${ctx.recipientName}. 💌`,
    })
    if (result === 'copied') setNotice('Link copiado.')
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: 30,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundColor: '#2a2433',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.2) 100%)',
          zIndex: 1,
        }}
      />
      <div style={{ position: 'absolute', top: 30, zIndex: 10, opacity: 0.7 }}>
        <img
          src={ctx.logoUrl}
          alt="Boxie"
          style={{ height: 30, filter: 'brightness(0) invert(1)' }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 10, marginBottom: 40, width: '100%' }}>
        <div
          className="bx-font-marker"
          style={{
            color: 'var(--bx-primary)',
            fontSize: '1.8rem',
            transform: 'rotate(-2deg)',
            marginBottom: 20,
            animation: 'bx-fade-in-up 0.8s ease',
          }}
        >
          {theme.heading}
        </div>
        <div
          className="bx-font-fredoka"
          style={{
            color: 'white',
            fontSize: '1.3rem',
            lineHeight: 1.6,
            fontWeight: 500,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            animation: 'bx-fade-in-up 0.8s ease 0.3s backwards',
            maxHeight: '40vh',
            overflowY: 'auto',
            whiteSpace: 'pre-line',
          }}
        >
          &quot;{text}&quot;
        </div>
        <div
          style={{
            marginTop: 20,
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.1rem',
            animation: 'bx-fade-in-up 0.8s ease 0.5s backwards',
          }}
        >
          - {ctx.senderName}
        </div>
      </div>
      <button type="button" className="bx-share-btn" onClick={share} style={{ zIndex: 10 }}>
        <Share2 size={20} /> {theme.buttonLabel}
      </button>
      {notice && (
        <p
          role="status"
          style={{
            position: 'relative',
            zIndex: 10,
            color: 'white',
            fontSize: '0.8rem',
            marginTop: 10,
            opacity: 0.85,
          }}
        >
          {notice}
        </p>
      )}
    </div>
  )
}
