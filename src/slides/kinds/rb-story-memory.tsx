import { motion } from 'framer-motion'
import { Heart, Share2 } from 'lucide-react'
import { useState } from 'react'
import { EmojiText, Icon } from '@/ui/Icon'
import { Burst, CoupleScene, PartyScene } from '../ribbly/art'
import { Brand, Btn, editable, Sheet, Stage, T, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { frames, Loop, spring } from './motion'
import type { Props } from './shared'

/**
 * 18 · Anécdota: una tarjeta con la foto y el recuerdo que escribió quien
 * regala, lista para Stories. El corazón es para quien la recibe.
 */
export function StoryMemory({ theme, buyer, ctx }: Props<'story.memory'>) {
  const active = ctx.active
  const [liked, setLiked] = useState(false)
  const [sharing, setSharing] = useState(false)
  const photo = ctx.resolveMedia(buyer.photo)
  const title = buyer.title.trim() || fill(theme.defaultTitle, ctx.vars)
  const text = buyer.text.trim() || fill(theme.defaultText, ctx.vars)

  const pareja = theme.look === 'pareja'
  const picture = photo ? <img src={photo} alt="" /> : pareja ? <CoupleScene /> : <PartyScene />

  return (
    <Stage
      tone="deep"
      bg={
        pareja
          ? 'linear-gradient(180deg, #6A8F55 0%, #9ABF7A 55%, #C9DDB0 100%)'
          : 'linear-gradient(180deg, #2B1B4E 0%, #5B2A6E 55%, #8E3A6E 100%)'
      }
      className={pareja ? 'is-pareja' : ''}
    >
      <div className="rb-bg">
        {/* La misma foto, fuera de foco, tiñe el fondo. */}
        <div className="rb-memory-blur">{picture}</div>
      </div>

      <div className="rb-body" style={{ justifyContent: 'center', paddingBottom: u(58) }}>
        <Loop
          active={active}
          duration={7}
          frames={frames.float(7, 0.6)}
          style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
        >
          <motion.article
            className="rb-memory"
            {...editable(ctx, '', 'tarjeta')}
            data-tarjeta={
              ctx.style.tarjeta && ctx.style.tarjeta !== 'original' ? ctx.style.tarjeta : undefined
            }
            data-marco={
              ctx.style.marco && ctx.style.marco !== 'original' ? ctx.style.marco : undefined
            }
            initial={false}
            animate={
              active
                ? {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    rotate: 0,
                    transition: { ...spring.bouncy, delay: 0.15 },
                  }
                : { opacity: 0, y: 60, scale: 0.9, rotate: 3, transition: { duration: 0.2 } }
            }
          >
            <div className="rb-memory-photo" {...editable(ctx, 'photo', 'marco')}>
              {picture}
            </div>
            <div style={{ padding: `${u(2)} ${u(24)} ${u(24)}`, position: 'relative' }}>
              <span style={{ color: 'var(--rb-coral)', display: 'flex', justifyContent: 'center' }}>
                <Brand size={19} />
              </span>
              <h2
                className="rb-title"
                style={{ fontSize: u(title.length > 26 ? 21 : 24.5), marginTop: u(16) }}
                {...editable(ctx, 'title')}
              >
                <EmojiText text={title} />
              </h2>
              <p
                style={{
                  fontSize: u(15.5),
                  fontStyle: 'italic',
                  lineHeight: 1.45,
                  color: '#8A8FA3',
                  marginTop: u(12),
                  textWrap: 'pretty',
                }}
                {...editable(ctx, 'text')}
              >
                “{text}”
              </p>

              <div style={{ display: 'flex', gap: u(10), marginTop: u(26), position: 'relative' }}>
                <Btn
                  variant="primary"
                  mods="is-flat"
                  style={{ flex: 1, borderRadius: u(16) }}
                  onClick={() => setSharing(true)}
                >
                  <Share2 size={17} />
                  <T text={theme.shareLabel} ctx={ctx} />
                </Btn>
                <motion.button
                  type="button"
                  className="rb-btn rb-btn-icon"
                  style={{ background: '#F1F3F9', borderRadius: u(16), color: 'var(--rb-coral)' }}
                  onClick={() => setLiked((v) => !v)}
                  aria-label="Me gusta"
                  aria-pressed={liked}
                  whileTap={{ scale: 0.82 }}
                  animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <Heart size={22} strokeWidth={2.4} fill={liked ? 'currentColor' : 'none'} />
                </motion.button>
                {liked && (
                  <Burst
                    key="like"
                    x="90%"
                    y="50%"
                    count={14}
                    power={0.5}
                    colors={['#F44E63', '#FF8FB1', '#FFD35C']}
                  />
                )}
              </div>
            </div>
          </motion.article>
        </Loop>
      </div>

      <Sheet
        open={sharing}
        onClose={() => setSharing(false)}
        icon={<Icon name="camara" size="1em" large />}
        title="¡Compartí el recuerdo!"
      >
        Hacé una <strong>captura de pantalla</strong> de esta tarjeta (ya tiene la marca) y subila a
        tus historias. Etiquetanos para que la veamos: <strong>@ribbly</strong>
      </Sheet>
    </Stage>
  )
}
