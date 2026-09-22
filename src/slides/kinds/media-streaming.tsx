import { ArrowDown, Play } from 'lucide-react'
import { useState } from 'react'
import type { Props } from './shared'

export function MediaStreaming({ theme, ctx }: Props<'media.streaming'>) {
  const [platformIndex, setPlatformIndex] = useState(0)
  const [showIndex, setShowIndex] = useState(0)
  const platform = theme.platforms[platformIndex] ?? theme.platforms[0]
  const show = platform?.shows[showIndex] ?? platform?.shows[0]
  const background = show?.image ? ctx.resolveMedia(show.image) : undefined

  return (
    <div className="bx-streaming">
      <div
        className={`bx-streaming-bg ${background ? '' : 'is-empty'}`}
        style={{ backgroundImage: background ? `url(${background})` : undefined }}
      />
      <div className="bx-streaming-shade" />
      <div className="bx-streaming-nav">
        {theme.platforms.map((p, i) => (
          <button
            type="button"
            key={i}
            className={`bx-platform-btn ${i === platformIndex ? 'is-active' : ''}`}
            onClick={() => {
              setPlatformIndex(i)
              setShowIndex(0)
            }}
            aria-label={p.name}
          >
            {p.logo ? <img src={ctx.resolveMedia(p.logo)} alt={p.name} /> : p.name}
          </button>
        ))}
      </div>
      {show && (
        <div className="bx-movie">
          <div className="bx-movie-badge">{theme.badge}</div>
          <h1 className="bx-movie-title">{show.title}</h1>
          <div className="bx-movie-tags">
            <span>{show.tags}</span>
            <span className="dot">•</span>
            <span>HD</span>
          </div>
          <div className="bx-movie-actions">
            <a
              className="bx-movie-btn is-play"
              href={show.link || '#'}
              target="_blank"
              rel="noreferrer"
            >
              <Play fill="black" size={20} /> {theme.watchLabel}
            </a>
            <button
              type="button"
              className="bx-movie-btn is-next"
              onClick={() => setShowIndex((i) => (i + 1) % (platform?.shows.length || 1))}
            >
              <ArrowDown size={20} /> {theme.nextLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
