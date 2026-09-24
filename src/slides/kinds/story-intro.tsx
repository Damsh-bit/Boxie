import { AnimatePresence, motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'
import { ease, frames, Loop, Pop, spring } from './motion'
import { useSequence, type Props } from './shared'

/** Un sticker: aparece con un resorte y queda torcido (`rot` grados). */
function Sticker({
  rot,
  delay = 0,
  style,
  children,
}: {
  rot: number
  delay?: number
  style: CSSProperties
  children: ReactNode
}) {
  return (
    <motion.div
      className="bx-sticker"
      style={style}
      initial={{ opacity: 0, scale: 0, rotate: rot - 25 }}
      animate={{ opacity: 1, scale: 1, rotate: rot, transition: { ...spring.pop, delay } }}
      exit={{ opacity: 0, scale: 0.85, rotate: rot, transition: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  )
}

const step = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: ease.out } },
}

export function StoryIntro({ theme, ctx }: Props<'story.intro'>) {
  const current = useSequence(ctx.active, [2200, 5500])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, var(--bx-primary) 0%, #FF8E9E 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        textAlign: 'center',
        overflow: 'hidden',
      }}
    >
      <Pop
        active={ctx.active}
        from={0.4}
        rotate={-15}
        style={{ position: 'absolute', top: 40, zIndex: 50 }}
      >
        <div
          style={{
            background: 'white',
            padding: '10px 15px',
            borderRadius: 15,
            transform: 'rotate(-3deg)',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          }}
        >
          <img src={ctx.logoUrl} alt="Boxie" style={{ height: 30 }} />
        </div>
      </Pop>

      <AnimatePresence mode="wait">
        {ctx.active && current === 0 && (
          <motion.div
            key="saludo"
            {...step}
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Sticker
              rot={-5}
              style={{
                background: 'var(--bx-ink)',
                color: 'white',
                fontSize: '4rem',
                textTransform: 'uppercase',
                lineHeight: 1,
              }}
            >
              {theme.greeting}
            </Sticker>
            <Sticker
              rot={3}
              delay={0.3}
              style={{
                background: 'white',
                color: 'var(--bx-primary)',
                fontSize: '3rem',
                marginTop: -10,
                overflowWrap: 'anywhere',
              }}
            >
              {ctx.recipientName || 'Alguien especial'}
            </Sticker>
            <motion.svg
              className="bx-scribble"
              style={{ width: 60, top: -20, right: -30 }}
              viewBox="0 0 50 50"
              aria-hidden
              initial={{ opacity: 0, rotate: -10 }}
              animate={{ opacity: 1, rotate: 10, transition: { delay: 0.5, duration: 0.3 } }}
            >
              <motion.path
                d="M10 40 Q 25 10, 40 20"
                stroke="white"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{
                  pathLength: 1,
                  transition: { delay: 0.55, duration: 0.5, ease: ease.out },
                }}
              />
            </motion.svg>
          </motion.div>
        )}

        {current === 1 && (
          <motion.div
            key="lineas"
            {...step}
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <motion.div
              className="bx-font-marker"
              style={{ color: 'white', fontSize: '1.5rem', rotate: -5, marginBottom: 10 }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } }}
            >
              {theme.line1}
            </motion.div>
            <Sticker
              rot={2}
              style={{
                background: 'white',
                color: 'var(--bx-ink)',
                fontSize: '1.8rem',
                textTransform: 'uppercase',
              }}
            >
              {theme.line2}
            </Sticker>
            <Sticker
              rot={-3}
              delay={0.3}
              style={{
                background: 'var(--bx-ink)',
                color: 'var(--bx-accent)',
                fontSize: '3rem',
                textTransform: 'uppercase',
                marginTop: -5,
              }}
            >
              {theme.line3}
            </Sticker>
            <Sticker
              rot={4}
              delay={0.6}
              style={{
                background: '#87CEEB',
                color: 'white',
                fontSize: '1.2rem',
                marginTop: 15,
                borderRadius: 20,
              }}
            >
              {theme.line4}
            </Sticker>
          </motion.div>
        )}

        {current === 2 && (
          <motion.div
            key="mensaje"
            {...step}
            style={{
              position: 'relative',
              zIndex: 10,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Sticker
              rot={-2}
              style={{
                background: 'white',
                color: 'var(--bx-primary)',
                fontSize: '0.9rem',
                borderRadius: 50,
                padding: '8px 20px',
                marginBottom: 20,
              }}
            >
              {theme.tag}
            </Sticker>
            <div style={{ marginBottom: 20 }}>
              <motion.span
                className="bx-font-marker"
                style={{
                  display: 'block',
                  color: 'white',
                  fontSize: '1.2rem',
                  textAlign: 'left',
                  marginLeft: -20,
                }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: 0.15, duration: 0.5 } }}
              >
                {theme.thoughtLabel}
              </motion.span>
              <Sticker
                rot={1}
                delay={0.2}
                style={{
                  background: 'var(--bx-ink)',
                  color: 'white',
                  fontSize: '2.5rem',
                  textTransform: 'uppercase',
                  padding: '10px 20px',
                  border: '3px solid white',
                }}
              >
                {theme.title}
              </Sticker>
            </div>
            <motion.p
              className="bx-font-fredoka"
              style={{
                color: 'white',
                fontSize: '1.4rem',
                fontWeight: 700,
                maxWidth: '90%',
                lineHeight: 1.4,
                textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: 0.5, duration: 0.8, ease: ease.out },
              }}
            >
              &quot;{theme.message}&quot;
            </motion.p>
            <motion.div
              style={{ marginTop: 50 }}
              initial={{ opacity: 0, y: 40 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { delay: 1, duration: 0.8, ease: ease.out },
              }}
            >
              <Loop
                active={ctx.active}
                delay={1.8}
                duration={2}
                frames={frames.bounce(10)}
                style={{ fontSize: '2rem' }}
              >
                👇
              </Loop>
              <p
                style={{
                  color: 'white',
                  fontSize: '0.8rem',
                  opacity: 0.8,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  marginTop: 5,
                }}
              >
                {theme.cta}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
