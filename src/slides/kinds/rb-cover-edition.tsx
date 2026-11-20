import type { BuyerPhoto } from '../fields'
import { CoupleScene } from '../ribbly/art'
import { EDITION_PHOTO, editionScene, STORY_H, STORY_W } from '../ribbly/love-art'
import { SceneView, useSceneMeasure, type Entrance } from '../ribbly/scene-svg'
import { createMeasure, drawScene } from '../ribbly/story-image'
import { StoryShare } from '../ribbly/StoryShare'
import { editable, slideOfKind, Stage } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear } from './motion'
import type { Props } from './shared'

const ENTRANCES: Record<string, Entrance> = {
  logo: { y: -10 },
  caption: { delay: 0.35, scale: 0.7, rotate: -12, pop: true },
  'caption-heart': { delay: 0.5, scale: 0.4, pop: true },
  'quote-heart': { delay: 0.45, scale: 0.3, pop: true },
  'quote-0': { delay: 0.55, x: -24 },
  'quote-1': { delay: 0.68, x: -24 },
  'quote-2': { delay: 0.8, x: -24 },
  'quote-3': { delay: 0.9, x: -24 },
  sign: { delay: 0.95, y: 12 },
  doodles: { delay: 1.1, scale: 0.6, pop: true },
}

/**
 * 03 · Love edition: la foto de ellos ocupa casi toda la pantalla, enmarcada
 * por ondas rosas y crema; arriba la marca, sobre la foto un "nosotros" a
 * mano y al pie la frase de quien regala en dos colores, firmada. Calcada del
 * diseño en 9:16: se comparte tal cual como historia de Instagram. Se avanza
 * tocando.
 */
export function CoverEdition({ theme, buyer, ctx }: Props<'cover.edition'>) {
  const active = ctx.active
  const momentsKey = slideOfKind(ctx, theme.photoFromKind)
  const moments = momentsKey
    ? (ctx.buyerContent(momentsKey)?.moments as { photo?: BuyerPhoto | null }[] | undefined)
    : undefined
  // Sin fotos (lo eligió quien regala): va la ilustración del diseño.
  const photo = ctx.noPhotos
    ? undefined
    : (ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(moments?.find((m) => m.photo)?.photo))
  const caption = (buyer.caption.trim() || fill(theme.defaultCaption, ctx.vars))
    .replace(/\s*♥\s*$/, '')
    .trim()
  const wish = buyer.wish.trim() || fill(theme.defaultWish, ctx.vars)
  const sender = ctx.senderName.trim()
  const data = { caption, wish, sender }

  const measure = useSceneMeasure()
  const scene = editionScene(data, measure)

  return (
    <Stage bg="#FEFAF4" className="rb-le" onClick={ctx.next}>
      <div className="rb-bg">
        {/* Del borde de arriba hasta donde la tapan las ondas (en la escala de la escena). */}
        <div
          className="rb-le-photo"
          {...editable(ctx, 'photo')}
          style={{
            height: `calc(${EDITION_PHOTO.h} * min(100cqw / ${STORY_W}, 100cqh / ${STORY_H}))`,
          }}
        >
          {photo ? <img src={photo} alt="" draggable={false} /> : <CoupleScene />}
        </div>
      </div>
      <SceneView
        scene={scene}
        active={active}
        editing={ctx.editing}
        entrances={ENTRANCES}
        label={`${caption}. “${wish}”${sender ? ` — ${sender}` : ''}`}
      />

      <Appear active={active} delay={1.1} y={12} className="rb-le-share">
        <StoryShare
          active={active}
          label={fill(theme.shareLabel, ctx.vars) || 'Compartir en Instagram'}
          fileName="ribbly-love-edition.png"
          deps={[photo, caption, wish, sender].join('|')}
          draw={(families) =>
            drawScene(editionScene(data, createMeasure(families)), families, {
              ...EDITION_PHOTO,
              src: photo,
            })
          }
        />
      </Appear>
    </Stage>
  )
}
