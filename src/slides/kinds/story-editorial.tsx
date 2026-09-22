import { Share2 } from 'lucide-react'
import { useState } from 'react'
import type { BuyerPhoto } from '../fields'
import { RichText } from '../RichText'
import { ShareHint } from './share-hint'
import type { Props } from './shared'

export function StoryEditorial({ theme, ctx }: Props<'story.editorial'>) {
  const [hint, setHint] = useState(false)
  const photo = ctx.buyerContent(theme.photoFromSlide)?.photo as BuyerPhoto | null | undefined
  const image = ctx.resolveMedia(photo) ?? ctx.resolveMedia(theme.fallbackImage)

  return (
    <div className="bx-editorial">
      <div className="bx-editorial-border" />
      <h1 className="bx-editorial-title">
        <RichText value={theme.title} marks={{ accent: 'bx-editorial-accent' }} />
      </h1>
      <div className="bx-editorial-grid">
        <div className="bx-editorial-body">
          <p>
            <RichText value={theme.body1} />
          </p>
        </div>
        <div className="bx-editorial-photo">
          {image && <img src={image} alt="Nosotros" className="bx-editorial-img" />}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '50%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 20,
              pointerEvents: 'none',
            }}
          >
            <img
              src={ctx.logoUrl}
              alt="Boxie"
              style={{
                width: 70,
                height: 'auto',
                filter: 'brightness(0) invert(1) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                opacity: 0.9,
              }}
            />
          </div>
        </div>
        <div className="bx-editorial-body">
          <p>
            <RichText value={theme.body2} />
          </p>
        </div>
      </div>
      <div style={{ marginTop: 15 }}>
        <button
          type="button"
          onClick={() => setHint(true)}
          style={{
            background: 'white',
            border: '1px solid #eee',
            color: 'var(--bx-ink)',
            padding: '12px 25px',
            borderRadius: 50,
            fontSize: '0.85rem',
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
            margin: '0 auto',
            fontFamily: 'var(--font-outfit), sans-serif',
          }}
        >
          <Share2 size={16} color="var(--bx-primary)" /> {theme.shareLabel}
        </button>
      </div>
      {hint && <ShareHint onClose={() => setHint(false)} />}
    </div>
  )
}
