import { Heart, Share2 } from 'lucide-react'
import { useState } from 'react'
import { ShareHint } from './share-hint'
import type { Props } from './shared'

export function StoryAnecdote({ theme, buyer, ctx }: Props<'story.anecdote'>) {
  const [liked, setLiked] = useState(false)
  const [hint, setHint] = useState(false)
  const image = ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(theme.fallbackImage)
  const title = buyer.title.trim() || theme.defaultTitle
  const text = buyer.text.trim() || theme.defaultText

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: image ? `url(${image})` : undefined,
          backgroundColor: '#fcecee',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(25px) brightness(1.1) saturate(1.3)',
          transform: 'scale(1.1)',
          zIndex: 0,
        }}
      />
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.1)', zIndex: 1 }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255,255,255,0.95)',
          width: '100%',
          maxWidth: 380,
          borderRadius: 30,
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          animation: ctx.active
            ? 'bx-card-in 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            : undefined,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 220, overflow: 'hidden', position: 'relative', background: '#eee' }}>
          {image && (
            <img
              src={image}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '40%',
              background: 'linear-gradient(to top, rgba(255,255,255,1), transparent)',
            }}
          />
        </div>
        <div style={{ padding: '10px 30px 30px', textAlign: 'center', position: 'relative' }}>
          <img
            src={ctx.logoUrl}
            alt="Boxie"
            style={{
              width: 60,
              height: 'auto',
              margin: '-30px auto 15px',
              display: 'block',
              position: 'relative',
              zIndex: 5,
              filter: 'drop-shadow(0 5px 10px rgba(255,255,255,0.8))',
            }}
          />
          <h3
            style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: 'var(--bx-ink)',
              margin: '0 0 10px 0',
              letterSpacing: -0.5,
            }}
          >
            {title}
          </h3>
          <p
            style={{
              fontSize: '1rem',
              color: '#555',
              lineHeight: 1.5,
              marginBottom: 30,
              fontStyle: 'italic',
              whiteSpace: 'pre-line',
            }}
          >
            &quot;{text}&quot;
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <button
              type="button"
              onClick={() => setHint(true)}
              style={{
                flex: 1,
                border: 'none',
                background: 'linear-gradient(90deg, var(--bx-primary) 0%, #ff9a9e 100%)',
                color: 'white',
                padding: 16,
                borderRadius: 18,
                fontSize: '0.95rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 10px 20px rgba(244, 78, 99, 0.25)',
              }}
            >
              <Share2 size={18} /> {theme.shareLabel}
            </button>
            <button
              type="button"
              onClick={() => setLiked((l) => !l)}
              aria-pressed={liked}
              aria-label="Me encanta"
              style={{
                width: 55,
                border: 'none',
                background: liked ? '#ffe0e6' : '#f0f0f0',
                color: 'var(--bx-primary)',
                borderRadius: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
              }}
            >
              <Heart
                size={24}
                fill={liked ? 'currentColor' : 'none'}
                strokeWidth={liked ? 0 : 2.5}
              />
            </button>
          </div>
        </div>
      </div>
      {hint && <ShareHint onClose={() => setHint(false)} />}
    </div>
  )
}
