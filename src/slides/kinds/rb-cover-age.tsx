import type { BuyerPhoto } from '../fields'
import { coverScene, type CoverData } from '../ribbly/cumple-art'
import { withoutPhotos, type Measure, type Scene } from '../ribbly/love-art'
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
  confetti: { delay: 0.5, scale: 0.8, pop: true, silent: true },
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
  const photo = ctx.noPhotos
    ? undefined
    : (ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(moments?.find((m) => m.photo)?.photo))
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
  const noPhotos = !!ctx.noPhotos
  const scene = buildCover(data, measure, noPhotos)

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
            noPhotos,
          ].join('|')}
          draw={(families) =>
            drawScene(buildCover(data, createMeasure(families), noPhotos), families)
          }
        />
      </Appear>
    </Stage>
  )
}

/**
 * Sin fotos: en el marco va la edad grande (o un corazón), con los colores del
 * diseño elegido.
 */
function buildCover(data: CoverData, measure: Measure, noPhotos: boolean): Scene {
  const scene = coverScene(data, measure)
  if (!noPhotos) return scene
  const celeste = data.variant === 'celeste'
  return withoutPhotos(
    scene,
    {
      colors: celeste ? ['#F3FAFF', '#BFE2F8'] : ['#FFF3F6', '#FFC6D8'],
      ink: celeste ? '#2F86C9' : '#E2557F',
      texts: [data.age],
    },
    measure,
  )
}
