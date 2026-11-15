import { EmojiText } from '@/ui/Icon'
import type { BuyerPhoto } from '../fields'
import { Bokeh, CoupleScene, Heart } from '../ribbly/art'
import { Btn, slideOfKind, Stage, T, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, Pop } from './motion'
import type { Props } from './shared'

/**
 * 03 · Edición especial (Love edition): la foto de ellos fuera de foco de
 * fondo y en una polaroid, el título editorial y una frase de quien regala.
 */
export function CoverEdition({ theme, buyer, ctx }: Props<'cover.edition'>) {
  const active = ctx.active
  const momentsKey = slideOfKind(ctx, theme.photoFromKind)
  const moments = momentsKey
    ? (ctx.buyerContent(momentsKey)?.moments as { photo?: BuyerPhoto | null }[] | undefined)
    : undefined
  const photo =
    ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(moments?.find((m) => m.photo)?.photo)
  const caption = buyer.caption.trim() || fill(theme.defaultCaption, ctx.vars)
  const wish = buyer.wish.trim() || fill(theme.defaultWish, ctx.vars)

  const picture = photo ? <img src={photo} alt="" draggable={false} /> : <CoupleScene />

  return (
    <Stage bg="#2A2433">
      <div className="rb-bg">
        <div className="rb-photo-bg">{picture}</div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(42,36,51,0.35) 0%, rgba(42,36,51,0.55) 55%, rgba(30,20,30,0.92) 100%)',
          }}
        />
        <Bokeh
          seed={33}
          count={12}
          colors={['#FFC56E', '#FFD9A0', '#F7798A']}
          blur={6}
          maxOpacity={0.45}
        />
      </div>

      <div className="rb-body" style={{ alignItems: 'stretch', textAlign: 'left' }}>
        <Appear
          as="p"
          active={active}
          y={10}
          className="rb-kicker"
          style={{ fontSize: u(11), marginTop: u(4) }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Appear
          as="h1"
          active={active}
          delay={0.12}
          x={-30}
          y={0}
          className="rb-edition-title"
          style={{ marginTop: u(12) }}
        >
          <T text={theme.title} ctx={ctx} />
        </Appear>
        <Appear
          as="p"
          active={active}
          delay={0.28}
          x={-20}
          y={0}
          className="rb-edition-sub"
          style={{ marginTop: u(4) }}
        >
          <T text={theme.subtitle} ctx={ctx} />
        </Appear>

        <div style={{ position: 'relative', flex: '1 1 0', minHeight: u(230) }}>
          {/* La inclinación va por fuera: la entrada (Pop) termina derecha. */}
          <div className="rb-edition-polaroid" style={{ transform: 'rotate(3deg)' }}>
            <Pop
              active={active}
              delay={0.45}
              from={0.6}
              rotate={14}
              className="rb-polaroid"
              style={{ position: 'relative', left: 0, top: 0, width: '100%', margin: 0 }}
            >
              <i className="rb-pin" style={{ left: '46%' }} aria-hidden />
              <div className="rb-polaroid-photo">{picture}</div>
              <p className="rb-polaroid-caption">
                <EmojiText text={caption} />
              </p>
            </Pop>
          </div>
          <Heart
            color="#F44E63"
            style={{ position: 'absolute', left: '4%', top: '32%', width: u(46) }}
            duration={5.4}
          />
        </div>

        <Appear
          active={active}
          delay={0.7}
          y={30}
          className="rb-glass rb-wish-card"
          style={{ maxWidth: 'none' }}
        >
          <p
            className="rb-kicker"
            style={{ color: '#F7798A', fontSize: u(11), marginBottom: u(8) }}
          >
            <T text={theme.wishLabel} ctx={ctx} />
          </p>
          <p className="rb-hand" style={{ fontSize: u(27), textAlign: 'left' }}>
            “<EmojiText text={wish} />”
          </p>
          {ctx.senderName && (
            <p style={{ marginTop: u(10), fontSize: u(13), opacity: 0.7, fontWeight: 500 }}>
              — {ctx.senderName}
            </p>
          )}
        </Appear>

        <div
          className="rb-actions"
          style={{ alignItems: 'flex-start', paddingLeft: 0, marginTop: u(20) }}
        >
          <Appear active={active} delay={0.9} y={20}>
            <Btn variant="white" onClick={ctx.next} style={{ fontSize: u(15) }}>
              <T text={theme.cta} ctx={ctx} />
            </Btn>
          </Appear>
        </div>
      </div>
    </Stage>
  )
}
