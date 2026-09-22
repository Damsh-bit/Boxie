import { Play } from 'lucide-react'
import type { BuyerPhoto } from '../fields'
import type { Props } from './shared'

export function MediaPlaylists({ theme, ctx }: Props<'media.playlists'>) {
  const photo = ctx.buyerContent(theme.photoFromSlide)?.photo as BuyerPhoto | null | undefined
  const header = ctx.resolveMedia(photo) ?? ctx.resolveMedia(theme.fallbackImage)
  const first = theme.playlists[0]

  return (
    <div className="bx-spotify">
      <div
        className="bx-spotify-header"
        style={{ backgroundImage: header ? `url(${header})` : undefined }}
      >
        <div className="bx-spotify-shade" />
        <div className="bx-spotify-header-content">
          <h1 className="bx-spotify-title">{theme.title}</h1>
          <p className="bx-spotify-subtitle">
            {theme.subtitlePrefix} {ctx.recipientName} • {theme.playlists.length} Playlists
          </p>
        </div>
        <a
          className="bx-spotify-play"
          href={first?.url || 'https://open.spotify.com'}
          target="_blank"
          rel="noreferrer"
          aria-label="Escuchar"
        >
          <Play size={24} fill="white" />
        </a>
      </div>
      <div className="bx-spotify-list">
        {theme.playlists.map((pl, i) => (
          <a
            className="bx-spotify-row"
            key={i}
            href={pl.url || 'https://open.spotify.com'}
            target="_blank"
            rel="noreferrer"
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
          </a>
        ))}
      </div>
    </div>
  )
}
