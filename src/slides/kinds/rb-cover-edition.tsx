import { EmojiText } from '@/ui/Icon'
import type { BuyerPhoto } from '../fields'
import { CoupleScene } from '../ribbly/art'
import {
  EDITION_DOODLES,
  EDITION_PHOTO_BOTTOM,
  EDITION_WAVES,
  splitAccent,
  STORY_H,
  STORY_W,
} from '../ribbly/love-art'
import { HeartIcon, Waves, Wordmark } from '../ribbly/love'
import { drawEditionImage } from '../ribbly/story-image'
import { StoryShare } from '../ribbly/StoryShare'
import { slideOfKind, Stage, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, Pop } from './motion'
import type { Props } from './shared'

/** Posición en el lienzo de 360 × 640, como porcentaje del escenario. */
const px = (x: number) => `${(x / STORY_W) * 100}%`
const py = (y: number) => `${(y / STORY_H) * 100}%`

/**
 * 03 · Love edition: la foto de ellos ocupa casi toda la pantalla, enmarcada
 * por ondas rosas y crema; arriba la marca, sobre la foto un "nosotros" a
 * mano y al pie la frase de quien regala en dos colores, firmada. Es 9:16:
 * se comparte tal cual como historia de Instagram. Se avanza tocando.
 */
export function CoverEdition({ theme, buyer, ctx }: Props<'cover.edition'>) {
  const active = ctx.active
  const momentsKey = slideOfKind(ctx, theme.photoFromKind)
  const moments = momentsKey
    ? (ctx.buyerContent(momentsKey)?.moments as { photo?: BuyerPhoto | null }[] | undefined)
    : undefined
  const photo =
    ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(moments?.find((m) => m.photo)?.photo)
  const caption = (buyer.caption.trim() || fill(theme.defaultCaption, ctx.vars)).replace(
    /\s*♥\s*$/,
    '',
  )
  const wish = buyer.wish.trim() || fill(theme.defaultWish, ctx.vars)
  const [plain, accent] = splitAccent(wish, 2)
  const sender = ctx.senderName.trim()

  return (
    <Stage bg="#FDFAF5" className="rb-le" onClick={ctx.next}>
      <div className="rb-bg">
        <div className="rb-le-photo" style={{ height: py(EDITION_PHOTO_BOTTOM) }}>
          {photo ? <img src={photo} alt="" draggable={false} /> : <CoupleScene />}
        </div>
        <Waves waves={EDITION_WAVES} />
        {EDITION_DOODLES.map((d, i) => (
          <HeartIcon
            key={i}
            stroke="#F3A5BF"
            strokeWidth={1.4}
            style={{
              position: 'absolute',
              left: px(d.x),
              top: py(d.y),
              width: u(d.size * 1.1),
              transform: `translate(-50%, -50%) rotate(${d.rotate}deg)`,
            }}
          />
        ))}
      </div>

      <div className="rb-body rb-le-body">
        <Appear active={active} y={-10} className="rb-le-logo">
          <Wordmark color="#F23A74" />
        </Appear>

        {caption && (
          // El giro va por fuera: la entrada (Pop) termina derecha.
          <div className="rb-le-caption" style={{ top: py(150) }}>
            <Pop active={active} delay={0.35} from={0.7} rotate={-12} className="rb-le-caption-in">
              <span>
                <EmojiText text={caption} />
              </span>
              <span className="rb-le-caption-heart">
                <HeartIcon stroke="#F64482" strokeWidth={2.2} />
                <i aria-hidden />
              </span>
            </Pop>
          </div>
        )}

        <div className="rb-le-quote" style={{ top: py(456) }}>
          <Pop active={active} delay={0.45} from={0.3} className="rb-le-quote-heart">
            <HeartIcon fill="#EA245F" />
          </Pop>
          <blockquote>
            {plain && (
              <Appear as="p" active={active} delay={0.55} x={-24} y={0} className="rb-le-l1">
                “<EmojiText text={plain} />
              </Appear>
            )}
            <Appear as="p" active={active} delay={0.7} x={-24} y={0} className="rb-le-l2">
              {plain ? '' : '“'}
              <EmojiText text={accent} />”
            </Appear>
          </blockquote>
          {sender && (
            <Appear as="p" active={active} delay={0.85} className="rb-le-sign">
              — {sender}
            </Appear>
          )}
        </div>

        <Appear active={active} delay={1} y={12} className="rb-le-share">
          <StoryShare
            active={active}
            label={fill(theme.shareLabel, ctx.vars) || 'Compartir en Instagram'}
            fileName="ribbly-love-edition.png"
            deps={[photo, caption, wish, sender].join('|')}
            draw={(fonts) => drawEditionImage({ photo, caption, wish, sender }, fonts)}
          />
        </Appear>
      </div>
    </Stage>
  )
}
