import { AnimatePresence, motion } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { useState } from 'react'
import type { BuyerPhoto } from '../fields'
import { RichText } from '../RichText'
import { Appear, ease, spring } from './motion'
import { ShareHint } from './share-hint'
import type { Props } from './shared'

export function StoryEditorial({ theme, ctx }: Props<'story.editorial'>) {
  const active = ctx.active
  const [hint, setHint] = useState(false)
  const photo = ctx.buyerContent(theme.photoFromSlide)?.photo as BuyerPhoto | null | undefined
  const image = ctx.resolveMedia(photo) ?? ctx.resolveMedia(theme.fallbackImage)

  return (
    <div className="bx-editorial">
      <motion.div
        className="bx-editorial-border"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={active ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 1.04 }}
        transition={{ duration: 0.9, ease: ease.out }}
      />
      <Appear as="h1" active={active} y={24} className="bx-editorial-title">
        <RichText value={theme.title} marks={{ accent: 'bx-editorial-accent' }} />
      </Appear>
      <div className="bx-editorial-grid">
        <Appear active={active} delay={0.2} y={16} className="bx-editorial-body">
          <p>
            <RichText value={theme.body1} />
          </p>
        </Appear>
        {/* La foto se descubre como una página que se abre y de a poco toma color. */}
        <motion.div
          className="bx-editorial-photo"
          initial={{ clipPath: 'inset(0% 0% 100% 0%)' }}
          animate={
            active
              ? {
                  clipPath: 'inset(0% 0% 0% 0%)',
                  transition: { delay: 0.35, duration: 0.9, ease: ease.out },
                }
              : { clipPath: 'inset(0% 0% 100% 0%)', transition: { duration: 0.2 } }
          }
        >
          {image && (
            <motion.img
              src={image}
              alt="Nosotros"
              className="bx-editorial-img"
              initial={{ filter: 'grayscale(100%) contrast(1.1)', scale: 1.08 }}
              animate={
                active
                  ? {
                      filter: 'grayscale(0%) contrast(1)',
                      scale: 1,
                      transition: {
                        filter: { delay: 1.6, duration: 2.2, ease: ease.inOut },
                        scale: { delay: 0.35, duration: 1.6, ease: ease.out },
                      },
                    }
                  : {
                      filter: 'grayscale(100%) contrast(1.1)',
                      scale: 1.08,
                      transition: { duration: 0.2 },
                    }
              }
            />
          )}
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
        </motion.div>
        <Appear active={active} delay={0.5} y={16} className="bx-editorial-body">
          <p>
            <RichText value={theme.body2} />
          </p>
        </Appear>
      </div>
      <Appear active={active} delay={0.7} y={16} style={{ marginTop: 15 }}>
        <motion.button
          type="button"
          onClick={() => setHint(true)}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          transition={spring.snappy}
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
        </motion.button>
      </Appear>
      <AnimatePresence>{hint && <ShareHint onClose={() => setHint(false)} />}</AnimatePresence>
    </div>
  )
}
