import { motion } from 'framer-motion'
import { Share2 } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '@/ui/Icon'
import type { BuyerPhoto } from '../fields'
import { CoupleScene, PartyScene } from '../ribbly/art'
import { useCue } from '../player/use-sound'
import { pickMagazine } from '../ribbly/magazine'
import { Brand, Btn, editable, Sheet, slideOfKind, Stage, T, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, ease } from './motion'
import type { Props } from './shared'

/**
 * 13 · Revista: tapa editorial sobre papel, con doble filete. El texto sale
 * del banco de 100 variaciones según el vínculo y el tono que eligió quien
 * regala (o es el suyo, si lo escribió).
 */
/** También es la revista de Pareja (`story.magazine-love`): cambian el banco y los vínculos. */
export function StoryMagazine({
  theme,
  buyer,
  ctx,
}: Props<'story.magazine'> | Props<'story.magazine-love'>) {
  const pareja = theme.look === 'pareja'
  const active = ctx.active
  const [sharing, setSharing] = useState(false)
  // La tapa, como una página de revista que se da vuelta.
  useCue(active, 'paper', 0.12)

  const text = pickMagazine({
    bank: theme.bank,
    relation: buyer.relation,
    tone: buyer.tone,
    version: buyer.version,
    seed: `${ctx.recipientName}|${ctx.senderName}`,
  })
  // Sin edad cargada, las frases que la nombran no se pueden decir.
  const closing =
    ctx.vars.edad || !text.closing.includes('{{edad}}') ? fill(text.closing, ctx.vars) : ''
  const own = buyer.ownText.trim()

  // La foto: la de acá o, si no, la primera de los momentos.
  const momentsKey = slideOfKind(ctx, theme.photoFromKind)
  const moments = momentsKey
    ? (ctx.buyerContent(momentsKey)?.moments as { photo?: BuyerPhoto | null }[] | undefined)
    : undefined
  // Sin fotos (lo eligió quien regala): va la ilustración del diseño.
  const photo = ctx.noPhotos
    ? undefined
    : (ctx.resolveMedia(buyer.photo) ?? ctx.resolveMedia(moments?.find((m) => m.photo)?.photo))

  return (
    <Stage tone="soft" bg={pareja ? '#FFFFFF' : '#FFF9EE'} className={pareja ? 'is-pareja' : ''}>
      <div
        className="rb-mag"
        data-tapa={ctx.style.tapa && ctx.style.tapa !== 'original' ? ctx.style.tapa : undefined}
        data-marco={ctx.style.marco && ctx.style.marco !== 'original' ? ctx.style.marco : undefined}
      >
        <h2 className="rb-mag-title" {...editable(ctx, '', 'tapa')}>
          {text.title.map((line, i) => (
            <span key={i}>
              <motion.b
                style={{ fontStyle: i === 1 ? 'italic' : undefined }}
                initial={false}
                animate={active ? { y: '0%' } : { y: '105%' }}
                transition={{ duration: 0.75, delay: active ? 0.15 + i * 0.12 : 0, ease: ease.out }}
              >
                {fill(line, ctx.vars)}
              </motion.b>
            </span>
          ))}
        </h2>

        <div
          className="rb-scroll"
          style={{
            flex: '1 1 0',
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            marginTop: u(22),
          }}
        >
          <Appear
            as="p"
            active={active}
            delay={0.6}
            className="rb-mag-text"
            lang="es"
            {...editable(ctx, 'relation,tone,version,ownText')}
          >
            {own ? (
              own
            ) : (
              <>
                {fill(text.before, ctx.vars)}{' '}
                <span className="rb-mag-mark">{fill(text.mark, ctx.vars)}</span>
                {fill(text.after, ctx.vars)}
              </>
            )}
          </Appear>

          <Appear
            active={active}
            delay={0.8}
            y={30}
            className="rb-mag-photo"
            {...editable(ctx, 'photo', 'marco')}
          >
            {photo ? <img src={photo} alt="" /> : pareja ? <CoupleScene /> : <PartyScene />}
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: u(12),
                display: 'flex',
                justifyContent: 'center',
                color: '#fff',
                filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.45))',
              }}
            >
              <Brand size={18} />
            </span>
          </Appear>

          {!own && closing && (
            <Appear as="p" active={active} delay={1} className="rb-mag-text" lang="es">
              {closing}
            </Appear>
          )}
        </div>

        <Appear
          active={active}
          delay={1.2}
          style={{ display: 'flex', justifyContent: 'center', marginTop: u(16) }}
        >
          <Btn
            variant="white"
            onClick={() => setSharing(true)}
            style={{ fontWeight: 700, fontSize: u(13.5), letterSpacing: '0.14em' }}
          >
            <Share2 size={16} color="#1E88C9" />
            <T text={theme.shareLabel} ctx={ctx} />
          </Btn>
        </Appear>
      </div>

      <Sheet
        open={sharing}
        onClose={() => setSharing(false)}
        icon={<Icon name="camara" size="1em" large />}
        title="¡Presumí tu tapa!"
      >
        Hacé una <strong>captura de pantalla</strong> de esta página (ya tiene la marca) y subila a
        tus historias. Etiquetanos para que la veamos: <strong>@ribbly</strong>
      </Sheet>
    </Stage>
  )
}
