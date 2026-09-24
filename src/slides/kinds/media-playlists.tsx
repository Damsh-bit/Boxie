import { motion } from 'framer-motion'
import { Play } from 'lucide-react'
import type { BuyerPhoto } from '../fields'
import { Appear, ease, frames, Loop, Pop, spring } from './motion'
import type { Props } from './shared'

export function MediaPlaylists({ theme, ctx }: Props<'media.playlists'>) {
  const active = ctx.active
  const photo = ctx.buyerContent(theme.photoFromSlide)?.photo as BuyerPhoto | null | undefined
  const header = ctx.resolveMedia(photo) ?? ctx.resolveMedia(theme.fallbackImage)
  const first = theme.playlists[0]

  return (
    <div className="bx-spotify">
      <div className="bx-spotify-header" style={{ overflow: 'visible' }}>
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: header ? `url(${header})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
            initial={{ scale: 1.15 }}
            animate={active ? { scale: 1 } : { scale: 1.15 }}
            transition={{ duration: 1.6, ease: ease.out }}
          />
        </div>
        <div className="bx-spotify-shade" />
        <div className="bx-spotify-header-content">
          <Appear as="h1" active={active} delay={0.15} y={20} className="bx-spotify-title">
            {theme.title}
          </Appear>
          <Appear as="p" active={active} delay={0.3} y={10} className="bx-spotify-subtitle">
            {theme.subtitlePrefix} {ctx.recipientName} • {theme.playlists.length} Playlists
          </Appear>
        </div>
        <Pop
          active={active}
          delay={0.45}
          from={0.2}
          style={{ position: 'absolute', right: 20, bottom: -27, zIndex: 20 }}
        >
          <Loop active={active} delay={1.4} duration={2.2} frames={frames.pulse(1.08)}>
            <motion.a
              className="bx-spotify-play"
              href={first?.url || 'https://open.spotify.com'}
              target="_blank"
              rel="noreferrer"
              aria-label="Escuchar"
              whileTap={{ scale: 0.9 }}
              transition={spring.snappy}
              style={{ position: 'static' }}
            >
              <Play size={24} fill="white" />
            </motion.a>
          </Loop>
        </Pop>
      </div>
      <motion.div
        className="bx-spotify-list"
        initial="hidden"
        animate={active ? 'show' : 'hidden'}
        variants={{
          hidden: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
          show: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } },
        }}
      >
        {theme.playlists.map((pl, i) => (
          <motion.a
            className="bx-spotify-row"
            key={i}
            href={pl.url || 'https://open.spotify.com'}
            target="_blank"
            rel="noreferrer"
            variants={{
              hidden: { opacity: 0, x: -16 },
              show: { opacity: 1, x: 0, transition: { duration: 0.45, ease: ease.out } },
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="bx-spotify-index">{i + 1}</span>
            <div
              className="bx-spotify-cover"
              style={{
                backgroundImage: pl.image ? `url(${ctx.resolveMedia(pl.image)})` : undefined,
              }}
            />
            <div>
              <h4>{pl.title}</h4>
              <p>{pl.description}</p>
            </div>
            <div className="bx-spotify-duration">...</div>
          </motion.a>
        ))}
      </motion.div>
    </div>
  )
}
