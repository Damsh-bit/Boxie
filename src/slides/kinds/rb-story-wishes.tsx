import { motion } from 'framer-motion'
import { EmojiText } from '@/ui/Icon'
import { Bokeh } from '../ribbly/art'
import { Stage, T, u } from '../ribbly/ui'
import { Appear, spring } from './motion'
import type { Props } from './shared'

const NOTE_COLORS = ['#FFFDF2', '#D8F0FB', '#FFF3C8', '#E8DEFF', '#D9F7E8']
const LOVE_NOTES = ['#FFFDF2', '#FFE4E9', '#FFF3C8', '#F0E8FF', '#E8F4FD']
const TILTS = [-2.2, 1.6, 1.2, -2.6, -1.4, 2.2, 2.6, -1, -1.8, 1.4]

type Vars = React.CSSProperties & Record<`--${string}`, string>

/**
 * 14 · 10 deseos: notas de colores pegadas con cinta, una por deseo, que van
 * apareciendo de la #1 a la última (150 ms entre una y otra).
 */
export function StoryWishes({ theme, buyer, ctx }: Props<'story.wishes'>) {
  const active = ctx.active
  const mine = buyer.wishes.filter((w) => w.trim())
  const wishes = mine.length ? mine : theme.suggestions.filter((w) => w.trim())
  const pareja = theme.look === 'pareja'
  const colors = pareja ? LOVE_NOTES : NOTE_COLORS

  return (
    <Stage
      bg={
        pareja
          ? 'linear-gradient(180deg, #F7798A 0%, #F4607E 50%, #E8405A 100%)'
          : 'linear-gradient(180deg, #4FC3F7 0%, #6FB6EE 50%, #9BC4F0 100%)'
      }
      className={pareja ? 'is-pareja' : ''}
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
            >
              <T text={theme.title} ctx={ctx} />
            </Appear>
            <Appear
              as="p"
              active={active}
              delay={0.22}
              className="rb-hand rb-shadow-text"
              style={{ fontSize: u(25), textAlign: 'left' }}
            >
              <T text={ctx.vars.edad ? theme.subtitle : theme.subtitleNoAge} ctx={ctx} />
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
              >
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
