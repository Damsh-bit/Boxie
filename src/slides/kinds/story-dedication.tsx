import { AnimatePresence, motion } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { Appear, frames, Loop, spring } from './motion'
import { shareOrCopy, type Props } from './shared'

export function StoryDedication({ theme, buyer, ctx }: Props<'story.dedication'>) {
  const active = ctx.active
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
      {/* La foto se acerca muy despacio (efecto Ken Burns) mientras se lee. */}
      <Loop
        active={active}
        duration={24}
        frames={['scale(1)', 'scale(1.1)', 'scale(1)']}
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
      <Appear active={active} y={-10} style={{ position: 'absolute', top: 30, zIndex: 10 }}>
        <img
          src={ctx.logoUrl}
          alt="Boxie"
          style={{ height: 30, filter: 'brightness(0) invert(1)', opacity: 0.7 }}
        />
      </Appear>

      <div style={{ position: 'relative', zIndex: 10, marginBottom: 40, width: '100%' }}>
        <Appear
          active={active}
          className="bx-font-marker"
          style={{
            color: 'var(--bx-primary)',
            fontSize: '1.8rem',
            rotate: -2,
            marginBottom: 20,
          }}
        >
          {theme.heading}
        </Appear>
        <Appear
          active={active}
          delay={0.3}
          className="bx-font-fredoka"
          style={{
            color: 'white',
            fontSize: '1.3rem',
            lineHeight: 1.6,
            fontWeight: 500,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
            maxHeight: '40vh',
            overflowY: 'auto',
            whiteSpace: 'pre-line',
          }}
        >
          &quot;{text}&quot;
        </Appear>
        <Appear
          active={active}
          delay={0.55}
          style={{
            marginTop: 20,
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.1rem',
          }}
        >
          - {ctx.senderName}
        </Appear>
      </div>
      <Appear active={active} delay={0.8} style={{ position: 'relative', zIndex: 10 }}>
        <Loop active={active} delay={2.2} duration={2} frames={frames.pulse(1.05)}>
          <motion.button
            type="button"
            className="bx-share-btn"
            onClick={share}
            whileTap={{ scale: 0.94 }}
            transition={spring.snappy}
          >
            <Share2 size={20} /> {theme.buttonLabel}
          </motion.button>
        </Loop>
      </Appear>
      <AnimatePresence>
        {notice && (
          <motion.p
            key={notice}
            role="status"
            style={{
              position: 'relative',
              zIndex: 10,
              color: 'white',
              fontSize: '0.8rem',
              marginTop: 10,
              opacity: 0.85,
            }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.85, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {notice}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
