import { youtubeId } from '../fields'
import type { Props } from './shared'

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
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
            allow="autoplay; encrypted-media"
            title={buyer.songTitle || 'Nuestra canción'}
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : !id ? (
          <div
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
          </div>
        ) : null}
      </div>

      <div className="bx-song-card">
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
          {buyer.songTitle} 🎵
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
      </div>
    </div>
  )
}
