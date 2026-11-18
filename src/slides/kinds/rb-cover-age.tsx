import type { BuyerPhoto } from '../fields'
import { coverScene } from '../ribbly/cumple-art'
import { SceneView, useSceneMeasure, type Entrance } from '../ribbly/scene-svg'
import { createMeasure, drawScene } from '../ribbly/story-image'
import { StoryShare } from '../ribbly/StoryShare'
import { slideOfKind, Stage } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear } from './motion'
import type { Props } from './shared'

const ENTRANCES: Record<string, Entrance> = {
  photo: { delay: 0.05, scale: 0.94 },
  logo: { y: -10 },
  'balloons-right': { delay: 0.25, y: 40 },
  'balloons-left': { delay: 0.35, y: 40 },
  confetti: { delay: 0.5, scale: 0.8, pop: true },
  caption: { delay: 0.55, scale: 0.7, rotate: -12, pop: true },
  title: { delay: 0.6, y: 16 },
  wish: { delay: 0.8, y: 14 },
}

/**
 * 03 · Edición cumple: su foto en un marco orgánico dorado, con globos,
 * confeti y garabatos; abajo "Feliz cumpleaños" en dos colores y un deseo a
 * mano. Dos diseños (rosa o celeste) que elige quien regala. Calcada del
 * diseño en 9:16: se comparte como historia de Instagram. Se avanza tocando.
 */
export function CoverAge({ theme, buyer, ctx }: Props<'cover.age'>) {
  const active = ctx.active
  const momentsKey = slideOfKind(ctx, theme.photoFromKind)
  const moments = momentsKey
    ? (ctx.buyerContent(momentsKey)?.moments as { photo?: BuyerPhoto | null }[] | undefined)
    : undefined
  const photo =
    ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(moments?.find((m) => m.photo)?.photo)
  const data = {
    variant: buyer.variant,
    photo,
    caption: buyer.caption.trim(),
    title: buyer.title.trim() || fill(theme.defaultTitle, ctx.vars),
    wish: buyer.wish.trim() || fill(theme.defaultWish, ctx.vars),
    age: ctx.vars.edad,
    style: {
      marco: ctx.style.marco,
      globos: ctx.style.globos,
      letra: ctx.style.letra,
      detalles: ctx.style.detalles,
    },
  }

  const measure = useSceneMeasure()
  const scene = coverScene(data, measure)

  return (
    <Stage
      bg={data.variant === 'celeste' ? '#E3F2FC' : '#FDF8F0'}
      className="rb-le"
      onClick={ctx.next}
    >
      <SceneView
        scene={scene}
        active={active}
        editing={ctx.editing}
        entrances={ENTRANCES}
        label={`${data.title}. ${data.wish}`}
      />
      <Appear active={active} delay={1} y={12} className="rb-le-share">
        <StoryShare
          active={active}
          label={fill(theme.shareLabel, ctx.vars) || 'Compartir en Instagram'}
          fileName="ribbly-feliz-cumple.png"
          deps={[
            data.variant,
            photo,
            data.caption,
            data.title,
            data.wish,
            data.age,
            JSON.stringify(data.style),
          ].join('|')}
          draw={(families) => drawScene(coverScene(data, createMeasure(families)), families)}
        />
      </Appear>
    </Stage>
  )
}
