import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, Play } from 'lucide-react'
import { useId, useState } from 'react'
import { Appear, ease, spring } from './motion'
import type { Props } from './shared'

export function MediaStreaming({ theme, ctx }: Props<'media.streaming'>) {
  const active = ctx.active
  const [platformIndex, setPlatformIndex] = useState(0)
  const [showIndex, setShowIndex] = useState(0)
  const platform = theme.platforms[platformIndex] ?? theme.platforms[0]
  const show = platform?.shows[showIndex] ?? platform?.shows[0]
  const background = show?.image ? ctx.resolveMedia(show.image) : undefined
  const showKey = `${platformIndex}-${showIndex}`
  // Único por player: el editor puede tener dos abiertos (al lado y a pantalla completa).
  const underline = useId()

  return (
    <div className="bx-streaming">
      {/* Cada serie entra con un fundido y un leve acercamiento (como en las apps). */}
      <AnimatePresence initial={false}>
        <motion.div
          key={background ?? 'vacio'}
          className={`bx-streaming-bg ${background ? '' : 'is-empty'}`}
          style={{ backgroundImage: background ? `url(${background})` : undefined }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 0.6 }, scale: { duration: 1.4, ease: ease.out } }}
        />
      </AnimatePresence>
      <div className="bx-streaming-shade" />
      <Appear active={active} y={-20} className="bx-streaming-nav">
        {theme.platforms.map((p, i) => {
          const selected = i === platformIndex
          return (
            <motion.button
              type="button"
              key={i}
              className={`bx-platform-btn ${selected ? 'is-active' : ''}`}
              onClick={() => {
                setPlatformIndex(i)
                setShowIndex(0)
              }}
              aria-label={p.name}
              aria-pressed={selected}
              animate={{
                opacity: selected ? 1 : 0.4,
                scale: selected ? 1.1 : 0.9,
                filter: selected ? 'grayscale(0%)' : 'grayscale(100%)',
              }}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
            >
              {p.logo ? <img src={ctx.resolveMedia(p.logo)} alt={p.name} /> : p.name}
              {selected && (
                <motion.span
                  layoutId={underline}
                  className="bx-platform-underline"
                  transition={spring.snappy}
                />
              )}
            </motion.button>
          )
        })}
      </Appear>
      {show && (
        <div className="bx-movie">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={showKey}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
              }}
              initial={{ opacity: 0, y: 24 }}
              animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              exit={{ opacity: 0, y: -16, transition: { duration: 0.2 } }}
              transition={{ duration: 0.5, ease: ease.out, delay: active ? 0.2 : 0 }}
            >
              <div className="bx-movie-badge">{theme.badge}</div>
              <h1 className="bx-movie-title">{show.title}</h1>
              <div className="bx-movie-tags">
                <span>{show.tags}</span>
                <span className="dot">•</span>
                <span>HD</span>
              </div>
            </motion.div>
          </AnimatePresence>
          <Appear active={active} delay={0.35} y={20} className="bx-movie-actions">
            <motion.a
              className="bx-movie-btn is-play"
              href={show.link || '#'}
              target="_blank"
              rel="noreferrer"
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
            >
              <Play fill="black" size={20} /> {theme.watchLabel}
            </motion.a>
            <motion.button
              type="button"
              className="bx-movie-btn is-next"
              onClick={() => setShowIndex((i) => (i + 1) % (platform?.shows.length || 1))}
              whileTap={{ scale: 0.95 }}
              transition={spring.snappy}
            >
              <ArrowDown size={20} /> {theme.nextLabel}
            </motion.button>
          </Appear>
        </div>
      )}
    </div>
  )
}
