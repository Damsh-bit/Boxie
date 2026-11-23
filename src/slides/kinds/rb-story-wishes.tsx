import { motion } from 'framer-motion'
import { EmojiText } from '@/ui/Icon'
import { SoundCue, useSound } from '../player/use-sound'
import { Bokeh } from '../ribbly/art'
import { editable, Stage, T, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import { Appear, spring } from './motion'
import type { Props } from './shared'

const NOTE_COLORS = ['#FFFDF2', '#D8F0FB', '#FFF3C8', '#E8DEFF', '#D9F7E8']
const LOVE_NOTES = ['#FFFDF2', '#FFE4E9', '#FFF3C8', '#F0E8FF', '#E8F4FD']
const TILTS = [-2.2, 1.6, 1.2, -2.6, -1.4, 2.2, 2.6, -1, -1.8, 1.4]

type Vars = React.CSSProperties & Record<`--${string}`, string>

/** Lo elegido para las notas (ejes `sujecion` y `notas`), como atributos del escenario. */
function noteStyle(style: Record<string, string>) {
  const pick = (axis: string) =>
    style[axis] && style[axis] !== 'original' ? style[axis] : undefined
  return { 'data-sujecion': pick('sujecion'), 'data-notas': pick('notas') }
}

/**
 * 14 · 10 deseos: notas de colores pegadas con cinta, una por deseo, que van
 * apareciendo de la #1 a la última (150 ms entre una y otra).
 */
export function StoryWishes(props: Props<'story.wishes'>) {
  const { theme, buyer } = props
  return theme.look !== 'pareja' && buyer.variant === 'noche' ? (
    <WishesNight {...props} />
  ) : (
    <WishesSky {...props} />
  )
}

/** Las notas de quien regala; sin tocar, las sugeridas del diseño. */
export function wishesFor(
  theme: { suggestions: string[]; nightSuggestions: string[] },
  buyer: { wishes: string[] },
  night: boolean,
): string[] {
  const mine = buyer.wishes.filter((w) => w.trim())
  const untouched =
    !mine.length || mine.join('\n') === theme.suggestions.filter((w) => w.trim()).join('\n')
  if (untouched) {
    return ((night ? theme.nightSuggestions : theme.suggestions) ?? []).filter((w) => w.trim())
  }
  return mine
}

function useWishes({ theme, buyer }: Props<'story.wishes'>, night = false) {
  return wishesFor(theme, buyer, night)
}

/**
 * Cada nota suena al pegarse (de la #1 a la última, subiendo la escala) y
 * también al tocarla: las notas son un xilofón.
 */
function NoteSound({ active, index }: { active: boolean; index: number }) {
  return <SoundCue when={active} cue="note" delay={0.41 + index * 0.15} step={index} />
}

function WishesSky(props: Props<'story.wishes'>) {
  const { theme, buyer, ctx } = props
  const active = ctx.active
  const wishes = useWishes(props)
  const pareja = theme.look === 'pareja'
  const colors = pareja ? LOVE_NOTES : NOTE_COLORS
  const title = buyer.title.trim() || theme.title
  const subtitle = buyer.subtitle.trim() || (ctx.vars.edad ? theme.subtitle : theme.subtitleNoAge)
  const play = useSound()

  return (
    <Stage
      bg={
        pareja
          ? 'linear-gradient(180deg, #F7798A 0%, #F4607E 50%, #E8405A 100%)'
          : 'linear-gradient(180deg, #4FC3F7 0%, #6FB6EE 50%, #9BC4F0 100%)'
      }
      className={pareja ? 'is-pareja' : ''}
      {...noteStyle(ctx.style)}
    >
      <div className="rb-bg">
        {pareja ? (
          <Bokeh seed={14} count={12} colors={['#FFFFFF', '#FFCCD5']} blur={10} maxOpacity={0.35} />
        ) : (
          <>
            <i
              className="rb-cloud"
              style={{ left: '-20%', top: '4%', width: '70%', height: '16%' }}
            />
            <i
              className="rb-cloud"
              style={{ right: '-24%', top: '38%', width: '80%', height: '18%' }}
            />
            <i
              className="rb-cloud"
              style={{ left: '-10%', bottom: '2%', width: '90%', height: '16%' }}
            />
          </>
        )}
      </div>

      <div className="rb-body">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: u(14),
            alignSelf: 'flex-start',
            textAlign: 'left',
            marginTop: u(6),
          }}
        >
          <Appear
            as="span"
            active={active}
            x={-24}
            y={0}
            className="rb-playfair rb-shadow-text"
            style={{ fontWeight: 900, fontStyle: 'italic', fontSize: u(68), lineHeight: 0.9 }}
          >
            {wishes.length}
          </Appear>
          <span>
            <Appear
              as="h2"
              active={active}
              delay={0.12}
              className="rb-title rb-shadow-text"
              style={{ fontSize: u(33) }}
              {...editable(ctx, 'title')}
            >
              <T text={title} ctx={ctx} />
            </Appear>
            <Appear
              as="p"
              active={active}
              delay={0.22}
              className="rb-hand rb-shadow-text"
              style={{ fontSize: u(25), textAlign: 'left' }}
              {...editable(ctx, 'subtitle')}
            >
              <T text={subtitle} ctx={ctx} />
            </Appear>
          </span>
        </div>

        <div className="rb-notes rb-scroll">
          {wishes.map((wish, i) => {
            const last = i === wishes.length - 1 && wishes.length > 1
            const tilt = TILTS[i % TILTS.length]!
            return (
              <motion.div
                key={i}
                {...editable(ctx, `wishes.${i}`, 'notas,sujecion')}
                className={`rb-note ${last ? 'is-last' : ''}`}
                style={
                  {
                    '--c': last ? (pareja ? '#2A2433' : '#F4607E') : colors[i % colors.length]!,
                    '--tape': `${-tilt}deg`,
                  } as Vars
                }
                initial={false}
                animate={
                  active
                    ? {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        rotate: tilt,
                        transition: { ...spring.bouncy, delay: 0.35 + i * 0.15 },
                      }
                    : {
                        opacity: 0,
                        scale: 0.6,
                        y: 24,
                        rotate: tilt * 4,
                        transition: { duration: 0.2 },
                      }
                }
                whileTap={{ scale: 1.06, rotate: 0 }}
                onTap={() => play('note', { step: i })}
              >
                <NoteSound active={active} index={i} />
                <em>#{i + 1}</em>
                <p>
                  <EmojiText text={wish} />
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Stage>
  )
}

const NIGHT_NOTES = [
  '#F8F4E9',
  '#F2E2C8',
  '#D9E6F2',
  '#D9E6F2',
  '#E9D7B8',
  '#F8F4E9',
  '#F8F4E9',
  '#D9E6F2',
  '#D9E6F2',
]
const NIGHT_TILTS = [-1.2, 1, 0.8, -1.4, -0.8, 1.2, 1.4, -0.6, -1]

/**
 * 14 · Diseño Noche dorada: "10 razones por las que te elijo" sobre azul
 * noche, con filigrana dorada en las esquinas, notas crema y celestes con
 * cinta azul y la última destacada, oscura con borde dorado.
 */
function WishesNight(props: Props<'story.wishes'>) {
  const { theme, buyer, ctx } = props
  const active = ctx.active
  const wishes = useWishes(props, true)
  const title = buyer.title.trim() || fill(theme.nightTitle, ctx.vars)
  const subtitle = buyer.subtitle.trim() || fill(theme.nightSubtitle, ctx.vars)
  const featured = wishes.length > 1 ? wishes.length - 1 : -1
  const play = useSound()
  // Si quedan impares antes de la destacada, la última de la grilla va al medio.
  const loneIndex = featured > 0 && featured % 2 === 1 ? featured - 1 : -1

  return (
    <Stage
      tone="deep"
      bg="linear-gradient(180deg, #1B345C 0%, #172C4F 55%, #13223C 100%)"
      className="rb-night"
      {...noteStyle(ctx.style)}
    >
      <div className="rb-bg">
        <svg
          className="rb-night-blobs"
          viewBox="0 0 360 640"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d="M248 0H360V250C330 236 318 200 322 168 326 132 300 120 280 96 258 70 236 34 248 0Z"
            fill="#BBD9EF"
            opacity="0.9"
          />
          <path
            d="M0 470C26 478 52 500 60 530 68 562 92 590 120 612 132 622 140 632 144 640H0Z"
            fill="#BBD9EF"
            opacity="0.85"
          />
          <path d="M0 0H70C56 6 40 8 28 18 18 26 8 30 0 30Z" fill="#BBD9EF" opacity="0.18" />
        </svg>
        <svg
          className="rb-night-filigree"
          viewBox="0 0 360 640"
          preserveAspectRatio="none"
          aria-hidden
        >
          <g fill="none" stroke="#DCBE88" strokeWidth="0.9" strokeLinecap="round" opacity="0.9">
            <path d="M14 70V22Q14 14 22 14H66" />
            <path d="M22 50C22 30 34 22 52 22M30 34C36 30 40 30 44 34 46 38 42 42 38 40" />
            <path d="M346 70V22Q346 14 338 14H296" />
            <path d="M338 50C338 30 326 22 308 22M330 34C324 30 320 30 316 34 314 38 318 42 322 40" />
            <path d="M346 570V618Q346 626 338 626H300M336 600C330 612 318 616 306 614" />
            <path d="M150 616C162 606 176 606 186 612 196 618 208 618 216 610M168 606C172 600 180 600 182 606" />
          </g>
          <g fill="#DCBE88">
            <path d="M40 270l1.6 4.2 4.2 1.6-4.2 1.6-1.6 4.2-1.6-4.2-4.2-1.6 4.2-1.6z" />
            <path d="M336 300l1.3 3.2 3.2 1.3-3.2 1.3-1.3 3.2-1.3-3.2-3.2-1.3 3.2-1.3z" />
            <path d="M326 470l1.6 4.2 4.2 1.6-4.2 1.6-1.6 4.2-1.6-4.2-4.2-1.6 4.2-1.6z" />
            <path d="M30 560l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z" />
          </g>
        </svg>
      </div>

      <div className="rb-body rb-night-body">
        <Appear as="p" active={active} y={-8} className="rb-night-logo">
          Ribbly
          <svg viewBox="0 0 24 25" aria-hidden>
            <path
              d="M12 21.2s-7.6-4.7-9.8-9.4C.7 8.3 2.8 4.3 6.6 4.3c2.2 0 3.7 1.2 5.4 3.3 1.7-2.1 3.2-3.3 5.4-3.3 3.8 0 5.9 4 4.4 7.5-2.2 4.7-9.8 9.4-9.8 9.4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            />
          </svg>
        </Appear>
        <div className="rb-night-head">
          <Appear as="span" active={active} delay={0.08} x={-24} y={0} className="rb-night-number">
            {wishes.length}
          </Appear>
          <span>
            <Appear
              as="h2"
              active={active}
              delay={0.16}
              className="rb-night-title"
              {...editable(ctx, 'title')}
            >
              <T text={title} ctx={ctx} />
            </Appear>
            <Appear
              as="p"
              active={active}
              delay={0.24}
              className="rb-night-sub"
              {...editable(ctx, 'subtitle')}
            >
              <T text={subtitle} ctx={ctx} />
            </Appear>
          </span>
        </div>

        <div className="rb-night-notes rb-scroll">
          {wishes.map((wish, i) => {
            const isFeatured = i === featured
            const tilt = isFeatured ? 0 : NIGHT_TILTS[i % NIGHT_TILTS.length]!
            return (
              <motion.div
                key={i}
                {...editable(ctx, `wishes.${i}`, 'notas,sujecion')}
                className={`rb-night-note ${isFeatured ? 'is-featured' : ''} ${i === loneIndex ? 'is-alone' : ''}`}
                style={{ '--c': NIGHT_NOTES[i % NIGHT_NOTES.length]! } as Vars}
                initial={false}
                animate={
                  active
                    ? {
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        rotate: tilt,
                        transition: { ...spring.bouncy, delay: 0.35 + i * 0.15 },
                      }
                    : {
                        opacity: 0,
                        scale: 0.7,
                        y: 20,
                        rotate: tilt * 3,
                        transition: { duration: 0.2 },
                      }
                }
                whileTap={{ scale: 1.05, rotate: 0 }}
                onTap={() => play('note', { step: i })}
              >
                <NoteSound active={active} index={i} />
                <i aria-hidden />
                <em>#{i + 1}</em>
                <p>
                  <EmojiText text={wish} />
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </Stage>
  )
}
