import { Music, Share2 } from 'lucide-react'
import { useState } from 'react'
import { EmojiText, Icon } from '@/ui/Icon'
import type { BuyerPhoto } from '../fields'
import { useCue } from '../player/use-sound'
import { Bokeh, Bunting, Confetti, SCENES, SCENES_PAREJA } from '../ribbly/art'
import { Brand, Btn, editable, Sheet, slideOfKind, Stage, T, u, useStored } from '../ribbly/ui'
import { Appear, Pop } from './motion'
import type { QuizResult } from './rb-game-quiz'
import { shareOrCopy, type Props } from './shared'

/**
 * 19 · Todo lo que festejamos: el resumen para compartir. Los números salen
 * de lo que esta Ribbly tiene cargado: cuántas sorpresas trae, cómo le fue en
 * la trivia, cuántos deseos, la canción y las fotos de los momentos.
 */
export function OutroRecap({ theme, ctx }: Props<'outro.recap'>) {
  const active = ctx.active
  const pareja = theme.look === 'pareja'
  const [notice, setNotice] = useState<string | null>(null)
  // La tarjeta del resumen que sube (los números suenan al aparecer, con su Pop).
  useCue(active, 'paper', 0.32)

  const content = (kind: string) => {
    const key = slideOfKind(ctx, kind)
    return key ? ctx.buyerContent(key) : undefined
  }
  const quizKey = slideOfKind(ctx, 'game.quiz')
  const [quiz] = useStored<QuizResult>(
    ctx,
    'resultado',
    { score: null, total: 0, attempts: 0 },
    quizKey ?? ctx.slideKey,
  )
  const wishes = (content('story.wishes')?.wishes as string[] | undefined)?.filter(Boolean).length
  const song = (content('media.video')?.songTitle as string | undefined)?.trim()
  // Sin fotos (lo eligió quien regala): el collage va con las ilustraciones.
  const moments = ctx.noPhotos
    ? []
    : ((content('story.moments')?.moments as { photo?: BuyerPhoto | null }[] | undefined) ?? [])
  const photos = moments
    .map((m) => ctx.resolveMedia(m.photo))
    .filter((src): src is string => !!src)
    .slice(0, 3)

  const stats = [
    { value: String(ctx.summaries.length), label: theme.surprisesLabel },
    ...(quizKey
      ? [
          {
            value: quiz.score === null ? '–' : `${quiz.score}/${quiz.total}`,
            label: theme.quizLabel,
          },
        ]
      : []),
    ...(wishes ? [{ value: String(wishes), label: theme.wishesLabel }] : []),
  ]

  const share = async () => {
    if (ctx.preview) return setNotice('En el regalo, este botón comparte el link de la Ribbly.')
    const result = await shareOrCopy({
      title: `La Ribbly de ${ctx.recipientName}`,
      text: `${ctx.senderName} me regaló una Ribbly por mi cumple 🎉`,
    })
    if (result === 'copied') setNotice('Copiamos el link: pegalo donde quieras compartirlo.')
    if (result === 'failed')
      setNotice('No pudimos compartirlo desde acá. Copiá el link de la barra del navegador.')
  }

  return (
    <Stage
      tone="deep"
      bg={
        pareja
          ? 'linear-gradient(180deg, #F7798A 0%, #F4607E 50%, #E8405A 100%)'
          : 'linear-gradient(180deg, #3B2A7E 0%, #6B3A8E 50%, #8ED0E8 100%)'
      }
      className={pareja ? 'is-pareja' : ''}
    >
      <div className="rb-bg">
        {pareja ? (
          <Bokeh
            seed={19}
            count={12}
            colors={['#FFFFFF', '#FFCCD5', '#FFC56E']}
            blur={9}
            maxOpacity={0.4}
          />
        ) : (
          <Confetti seed={19} count={22} />
        )}
      </div>
      {!pareja && <Bunting />}

      <div className="rb-body" style={{ paddingInline: u(18) }}>
        <Appear
          as="p"
          active={active}
          className="rb-kicker"
          style={{ fontSize: u(11), marginTop: u(34) }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Appear
          as="h2"
          active={active}
          delay={0.1}
          className="rb-playfair rb-shadow-text"
          style={{
            fontWeight: 900,
            fontStyle: 'italic',
            fontSize: u(30),
            lineHeight: 1.1,
            marginTop: u(6),
          }}
        >
          <T text={theme.title} ctx={ctx} />
        </Appear>

        <div className="rb-grow" style={{ marginTop: u(14), justifyContent: 'flex-start' }}>
          <Appear
            active={active}
            delay={0.25}
            y={50}
            className="rb-recap"
            {...editable(ctx, '', 'resumen')}
            data-resumen={
              ctx.style.resumen && ctx.style.resumen !== 'original' ? ctx.style.resumen : undefined
            }
            data-fotos={
              ctx.style.fotos && ctx.style.fotos !== 'original' ? ctx.style.fotos : undefined
            }
          >
            <div className="rb-collage" {...editable(ctx, '', 'fotos')}>
              {[0, 1, 2].map((i) => {
                const scenes = pareja ? SCENES_PAREJA : SCENES
                const Scene = scenes[i % scenes.length]!
                return (
                  <div key={i}>
                    {photos.length ? <img src={photos[i % photos.length]} alt="" /> : <Scene />}
                  </div>
                )
              })}
            </div>

            <div style={{ padding: `${u(14)} ${u(16)} ${u(18)}`, display: 'grid', gap: u(12) }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: u(8),
                }}
              >
                <span style={{ color: 'var(--rb-coral)' }}>
                  <Brand size={17} />
                </span>
                <span
                  className="rb-chip"
                  style={{
                    background: '#EAF5FD',
                    color: 'var(--rb-cielo-p)',
                    boxShadow: 'none',
                    minWidth: 0,
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <T
                      text={
                        // Si el chip nombra la edad y no hay edad, solo el nombre.
                        !ctx.vars.edad && theme.personChip.includes('{{edad}}')
                          ? '{{nombre}} 🎂'
                          : theme.personChip
                      }
                      ctx={ctx}
                    />
                  </span>
                </span>
              </div>

              <div className="rb-stats">
                {stats.map((stat, i) => (
                  <Pop
                    key={stat.label}
                    active={active}
                    delay={0.55 + i * 0.1}
                    from={0.5}
                    className="rb-stat"
                  >
                    <b>{stat.value}</b>
                    <small>
                      <T text={stat.label} ctx={ctx} />
                    </small>
                  </Pop>
                ))}
              </div>

              {song && (
                <Appear active={active} delay={0.85} x={-20} y={0} className="rb-song-band">
                  <Music size={20} style={{ opacity: 0.8, flex: 'none' }} />
                  <span style={{ minWidth: 0 }}>
                    <small style={{ display: 'block', fontSize: u(11), opacity: 0.8 }}>
                      <T text={theme.songLabel} ctx={ctx} />
                    </small>
                    <b
                      className="rb-fredoka"
                      style={{
                        display: 'block',
                        fontWeight: 600,
                        fontSize: u(17),
                        lineHeight: 1.15,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      <EmojiText text={song} />
                    </b>
                  </span>
                </Appear>
              )}

              <Appear active={active} delay={1} className="rb-index">
                {ctx.summaries.map((summary, i) => (
                  <span key={summary.key}>
                    <b>{String(i + 1).padStart(2, '0')}</b> {summary.title}
                  </span>
                ))}
              </Appear>
            </div>
          </Appear>
        </div>

        <div className="rb-actions">
          <Appear active={active} delay={1.15} y={20}>
            <Btn variant="white" onClick={share}>
              <Share2 size={16} />
              <T text={theme.shareLabel} ctx={ctx} />
            </Btn>
          </Appear>
        </div>
      </div>

      <Sheet
        open={notice !== null}
        onClose={() => setNotice(null)}
        icon={<Icon name="link" size="1em" large />}
        title="Compartir mi Ribbly"
      >
        {notice}
      </Sheet>
    </Stage>
  )
}
