import { Gift } from 'lucide-react'
import type { Props } from './shared'

/** Portada clásica (la de Pareja). Con video o imagen de fondo sirve para cualquier temática. */
export function CoverRecipient({ theme, ctx }: Props<'cover.recipient'>) {
  const video = ctx.resolveMedia(theme.backgroundVideo)
  const image = video ? undefined : ctx.resolveMedia(theme.backgroundImage)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 10,
      }}
    >
      {video && ctx.active && (
        <video
          className="bx-cover-media"
          src={video}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
      )}
      {image && <img className="bx-cover-media" src={image} alt="" />}
      {(video || image) && <div className="bx-cover-media-shade" />}
      <div className="bx-shape bx-shape-1" />
      <div className="bx-shape bx-shape-2" />
      {theme.showGiftIcon && (
        <div className="bx-gift-icon" style={{ marginBottom: 30, position: 'relative', zIndex: 2 }}>
          <Gift size={80} color="white" strokeWidth={1.5} />
        </div>
      )}
      <p className="bx-cover-label" style={{ position: 'relative', zIndex: 2 }}>
        {theme.label}
      </p>
      <h1 className="bx-cover-name bx-font-fredoka" style={{ position: 'relative', zIndex: 2 }}>
        {ctx.recipientName || 'Alguien especial'}
      </h1>
      <div className="bx-cover-sender" style={{ zIndex: 2 }}>
        {theme.senderPrefix} {ctx.senderName}
      </div>
    </div>
  )
}
