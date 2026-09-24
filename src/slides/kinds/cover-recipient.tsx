import { Gift } from 'lucide-react'
import { Appear, frames, Loop, Pop } from './motion'
import type { Props } from './shared'

/** Portada clásica (la de Pareja). Con video o imagen de fondo sirve para cualquier temática. */
export function CoverRecipient({ theme, ctx }: Props<'cover.recipient'>) {
  const active = ctx.active
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
      <Loop
        active={active}
        className="bx-shape bx-shape-1"
        duration={15}
        frames={[
          'translate(0px, 0px) scale(1)',
          'translate(30px, 50px) scale(1.1)',
          'translate(0px, 0px) scale(1)',
        ]}
      />
      <Loop
        active={active}
        className="bx-shape bx-shape-2"
        duration={15}
        delay={2}
        frames={[
          'translate(0px, 0px) scale(1)',
          'translate(-30px, -40px) scale(1.1)',
          'translate(0px, 0px) scale(1)',
        ]}
      />
      {theme.showGiftIcon && (
        <Pop
          active={active}
          from={0.3}
          rotate={-20}
          y={20}
          style={{ position: 'relative', zIndex: 2 }}
        >
          <Loop
            active={active}
            delay={0.8}
            duration={6}
            frames={frames.float(15)}
            className="bx-gift-icon"
            style={{ marginBottom: 30 }}
          >
            <Gift size={80} color="white" strokeWidth={1.5} />
          </Loop>
        </Pop>
      )}
      <Appear
        as="p"
        active={active}
        delay={0.5}
        y={10}
        className="bx-cover-label"
        style={{ position: 'relative', zIndex: 2 }}
      >
        {theme.label}
      </Appear>
      <Pop
        as="h1"
        active={active}
        delay={0.8}
        from={0.5}
        className="bx-cover-name bx-font-fredoka"
        style={{ position: 'relative', zIndex: 2 }}
      >
        {ctx.recipientName || 'Alguien especial'}
      </Pop>
      <Appear active={active} delay={1.5} y={10} className="bx-cover-sender" style={{ zIndex: 2 }}>
        {theme.senderPrefix} {ctx.senderName}
      </Appear>
    </div>
  )
}
