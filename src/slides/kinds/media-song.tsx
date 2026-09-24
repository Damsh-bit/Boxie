import { motion, useReducedMotion } from 'framer-motion'
import { youtubeId } from '../fields'
import { Appear, ease } from './motion'
import type { Props } from './shared'

/** Tres barritas de ecualizador que bailan mientras suena la canción. */
function Equalizer({ active }: { active: boolean }) {
  const calm = useReducedMotion()
  const run = active && !calm
  return (
    <span
      aria-hidden
      style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 3, height: 16 }}
    >
      {[0.9, 0.6, 1.1].map((speed, i) => (
        <motion.span
          key={i}
          style={{
            width: 4,
            height: 16,
            borderRadius: 2,
            background: 'var(--bx-primary)',
            transformOrigin: 'bottom',
          }}
          initial={{ transform: 'scaleY(0.3)' }}
          animate={
            run
              ? {
                  transform: [
                    'scaleY(0.3)',
                    'scaleY(1)',
                    'scaleY(0.5)',
                    'scaleY(0.85)',
                    'scaleY(0.3)',
                  ],
                }
              : { transform: 'scaleY(0.3)' }
          }
          transition={
            run
              ? { duration: speed, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }
              : { duration: 0.3 }
          }
        />
      ))}
    </span>
  )
}

/**
 * El video se monta solo con la slide en pantalla. En el prototipo se montaba
 * al estar a una slide de distancia y el audio arrancaba sobre la dedicatoria.
 */
export function MediaSong({ theme, buyer, ctx }: Props<'media.song'>) {
  const id = youtubeId(buyer.youtubeUrl)
  const params = new URLSearchParams({
    autoplay: '1',
    controls: '0',
    rel: '0',
    modestbranding: '1',
    loop: '1',
    playsinline: '1',
    ...(id ? { playlist: id } : {}),
  })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'black',
        overflow: 'hidden',
      }}
    >
      <div className="bx-video-frame">
        {id && ctx.active ? (
          <motion.iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
            allow="autoplay; encrypted-media"
            title={buyer.songTitle || 'Nuestra canción'}
            referrerPolicy="strict-origin-when-cross-origin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, delay: 0.3, ease: ease.out }}
          />
        ) : !id ? (
          <Appear
            active={ctx.active}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
            }}
          >
            {theme.emptyLabel}
          </Appear>
        ) : null}
      </div>

      <Appear active={ctx.active} delay={0.5} y={50} className="bx-song-card">
        <h3
          style={{
            color: 'white',
            fontSize: '1.2rem',
            margin: '0 0 5px 0',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
          }}
        >
          {buyer.songTitle} <Equalizer active={ctx.active && !!id} />
        </h3>
        <p
          style={{
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.95rem',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          <strong style={{ color: 'var(--bx-primary)' }}>{ctx.senderName}</strong> {theme.caption}
        </p>
      </Appear>
    </div>
  )
}
