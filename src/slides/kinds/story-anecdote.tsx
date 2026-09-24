import { AnimatePresence, motion } from 'framer-motion'
import { Heart, Share2 } from 'lucide-react'
import { useState } from 'react'
import { Appear, Pop, spring } from './motion'
import { ShareHint } from './share-hint'
import type { Props } from './shared'

/** Corazoncitos que salen del botón al dar "me encanta". */
const BURST = [-60, -30, 0, 30, 60, 90, -90].map((angle, i) => ({
  angle,
  distance: 34 + (i % 3) * 8,
}))

export function StoryAnecdote({ theme, buyer, ctx }: Props<'story.anecdote'>) {
  const active = ctx.active
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(0)
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
      <Pop
        active={active}
        from={0.9}
        y={50}
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255,255,255,0.95)',
          width: '100%',
          maxWidth: 380,
          borderRadius: 30,
          boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ height: 220, overflow: 'hidden', position: 'relative', background: '#eee' }}>
          {image && (
            <motion.img
              src={image}
              alt={title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              initial={{ scale: 1.15 }}
              animate={active ? { scale: 1 } : { scale: 1.15 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
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
          <Pop
            as="img"
            active={active}
            delay={0.35}
            from={0.3}
            rotate={-20}
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
          <Appear
            as="h3"
            active={active}
            delay={0.45}
            y={12}
            style={{
              fontSize: '1.6rem',
              fontWeight: 900,
              color: 'var(--bx-ink)',
              margin: '0 0 10px 0',
              letterSpacing: -0.5,
            }}
          >
            {title}
          </Appear>
          <Appear
            as="p"
            active={active}
            delay={0.55}
            y={12}
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
          </Appear>
          <Appear
            active={active}
            delay={0.65}
            y={12}
            style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}
          >
            <motion.button
              type="button"
              onClick={() => setHint(true)}
              whileTap={{ scale: 0.96 }}
              transition={spring.snappy}
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
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                setLiked((l) => !l)
                if (!liked) setLikes((n) => n + 1)
              }}
              aria-pressed={liked}
              aria-label="Me encanta"
              whileTap={{ scale: 0.85 }}
              animate={{ backgroundColor: liked ? '#ffe0e6' : '#f0f0f0' }}
              transition={spring.snappy}
              style={{
                position: 'relative',
                width: 55,
                border: 'none',
                color: 'var(--bx-primary)',
                borderRadius: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <motion.span
                key={liked ? `si-${likes}` : 'no'}
                initial={liked ? { scale: 0.3 } : false}
                animate={{ scale: 1 }}
                transition={spring.pop}
                style={{ display: 'grid' }}
              >
                <Heart
                  size={24}
                  fill={liked ? 'currentColor' : 'none'}
                  strokeWidth={liked ? 0 : 2.5}
                />
              </motion.span>
              <AnimatePresence>
                {liked &&
                  BURST.map((b, i) => (
                    <motion.span
                      key={`${likes}-${i}`}
                      aria-hidden
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        marginLeft: -5,
                        marginTop: -8,
                        fontSize: 12,
                        pointerEvents: 'none',
                      }}
                      initial={{ opacity: 1, x: 0, y: 0, scale: 0.4 }}
                      animate={{
                        opacity: 0,
                        x: Math.sin((b.angle * Math.PI) / 180) * b.distance,
                        y: -Math.cos((b.angle * Math.PI) / 180) * b.distance,
                        scale: 1,
                      }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    >
                      ❤
                    </motion.span>
                  ))}
              </AnimatePresence>
            </motion.button>
          </Appear>
        </div>
      </Pop>
      <AnimatePresence>{hint && <ShareHint onClose={() => setHint(false)} />}</AnimatePresence>
    </div>
  )
}
