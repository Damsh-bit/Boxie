import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Icon } from '@/ui/Icon'
import { useCue } from '../player/use-sound'
import { SUMMARY_ICONS } from '../summary-icons'
import {
  bondGroup,
  bondNote,
  chapterLabel,
  chapterNote,
  chapterNumber,
  chapterSlides,
  resolveChapterTopic,
  resolveTone,
  sinceLabel,
  threadKnots,
  TOPIC_COPY,
  type ThreadTopic,
} from '../ribbly/thread'
import { editable, Stage, T, u } from '../ribbly/ui'
import { fill } from '../ribbly/vars'
import type { SlideContext } from '../types'
import { Appear, ease } from './motion'
import type { Props } from './shared'

/**
 * El hilo de la historia (ribbly/thread.ts): el prólogo y los capítulos que
 * van entre las pantallas. Una cinta cruza la pantalla y ata una tarjeta con
 * la nota de quien regala; arriba, los nudos del hilo marcan en qué capítulo
 * va la historia, y abajo, lo que viene para regalarte.
 */

type Look = 'cumple' | 'pareja' | 'amistad'

/** Fondo de papel y cinta de cada ocasión. Con otra paleta, la cinta toma su color. */
const LOOKS: Record<Look, { bg: string; ribbon: string }> = {
  cumple: {
    bg: 'radial-gradient(120% 75% at 50% 0%, #FFFFFF 0%, #FFF9EE 55%, #FBEBD2 100%)',
    ribbon: 'var(--rb-coral)',
  },
  pareja: {
    bg: 'radial-gradient(120% 75% at 50% 0%, #FFFFFF 0%, #FFF1F4 55%, #FADCE4 100%)',
    ribbon: 'var(--rb-p1, #E0345A)',
  },
  amistad: {
    bg: 'radial-gradient(120% 75% at 50% 0%, #FFFFFF 0%, #F7F0FC 55%, #EBDDF6 100%)',
    ribbon: 'var(--rb-p1, #9A5BC4)',
  },
}

/** La cinta que eligió quien regala (piece-options.ts · THREAD_RIBBONS). */
const RIBBONS: Record<string, string> = {
  roja: '#D7263D',
  dorada: '#C9932E',
  celeste: '#2F9BD6',
  lila: '#8E6BD8',
  verde: '#23996E',
}

function lookOf(value: string | undefined): Look {
  return value === 'pareja' || value === 'amistad' ? value : 'cumple'
}

function ribbonOf(ctx: SlideContext, look: Look): string {
  return RIBBONS[ctx.style.cinta ?? ''] ?? LOOKS[look].ribbon
}

// ── Piezas ──────────────────────────────────────────────────────────────────

/**
 * La cinta del capítulo (diseño de 390 × 760): entra por un costado, da una
 * vuelta en el espacio libre entre la tarjeta y lo que viene, y sale por el
 * otro, como un hilo que viene de la pantalla anterior y sigue en la próxima.
 */
const CHAPTER_PATH =
  'M-30 556 C40 506 110 596 180 548 C232 512 226 458 190 462 C150 466 160 536 220 540 C290 544 330 476 420 506'

/** La cinta del prólogo: cruza de lado a lado entre los dos nombres. */
const TIE_PATH = 'M-4 34 C70 8 130 54 200 30 C270 6 330 52 404 24'

/** La cinta: se dibuja de punta a punta cuando la pantalla llega. */
function Ribbon({
  active,
  color,
  tie = false,
  flip = false,
}: {
  active: boolean
  color: string
  /** La del prólogo, dentro de la fila de los nombres. */
  tie?: boolean
  flip?: boolean
}) {
  return (
    <svg
      className={tie ? 'rb-thread-tie-band' : 'rb-thread-ribbon'}
      viewBox={tie ? '0 0 400 60' : '0 0 390 760'}
      preserveAspectRatio="none"
      style={{ transform: flip ? 'scaleX(-1)' : undefined }}
      aria-hidden
    >
      <motion.path
        d={tie ? TIE_PATH : CHAPTER_PATH}
        fill="none"
        stroke={color}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        className="rb-thread-band"
        initial={false}
        animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={{
          pathLength: { duration: active ? 1.7 : 0.2, delay: active ? 0.1 : 0, ease: ease.inOut },
          opacity: { duration: 0.2 },
        }}
      />
    </svg>
  )
}

/** Moño de cinta: el que ata la tarjeta (y el que une los dos nombres). */
function Bow({ color, style }: { color: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 120 64" className="rb-thread-bow" style={style} aria-hidden>
      <path d="M58 30 C40 6 10 2 8 22 C6 40 38 42 58 32 Z" fill={color} />
      <path d="M62 30 C80 6 110 2 112 22 C114 40 82 42 62 32 Z" fill={color} />
      <path d="M58 30 C40 6 10 2 8 22" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="3" />
      <path d="M62 30 C80 6 110 2 112 22" fill="none" stroke="rgba(0,0,0,0.14)" strokeWidth="3" />
      <path d="M54 34 L40 62 L50 58 L56 64 L60 36 Z" fill={color} />
      <path d="M66 34 L80 62 L70 58 L64 64 L60 36 Z" fill={color} />
      <rect x="51" y="22" width="18" height="18" rx="6" fill={color} />
      <rect x="51" y="22" width="18" height="18" rx="6" fill="rgba(0,0,0,0.16)" />
    </svg>
  )
}

/** Los nudos del hilo: el prólogo y cada capítulo, con el actual marcado. */
function Knots({ ctx, color }: { ctx: SlideContext; color: string }) {
  const knots = threadKnots(ctx.slides)
  const current = knots.indexOf(ctx.index)
  if (knots.length < 2) return null
  return (
    <div
      className="rb-thread-knots"
      style={{ '--rb-thread': color } as CSSProperties}
      role="img"
      aria-label={`Parte ${current + 1} de ${knots.length} de la historia`}
      {...editable(ctx, '', 'cinta')}
    >
      <i className="rb-thread-line" />
      {knots.map((index, i) => (
        <motion.b
          key={index}
          data-state={i < current ? 'done' : i === current ? 'now' : 'next'}
          initial={false}
          animate={ctx.active ? { scale: 1, opacity: 1 } : { scale: 0.4, opacity: 0 }}
          transition={{ duration: 0.4, delay: ctx.active ? 0.3 + i * 0.05 : 0, ease: ease.out }}
        />
      ))}
    </div>
  )
}

/** Lo que viene para regalarte: las pantallas hasta el próximo capítulo. */
function Gifts({
  ctx,
  label,
  delay,
  sentence = false,
}: {
  ctx: SlideContext
  label: string
  delay: number
  /** El rótulo es una frase (el del prólogo), no una etiqueta corta. */
  sentence?: boolean
}) {
  const gifts = chapterSlides(ctx.slides, ctx.index)
    .flatMap((s) => ctx.summaries.filter((x) => x.key === s.key))
    .slice(0, 3)
  return (
    <Appear active={ctx.active} delay={delay} y={14} className="rb-thread-gifts">
      {gifts.length > 0 && (
        <>
          <p className={sentence ? 'rb-thread-gifts-lead' : 'rb-kicker rb-thread-gifts-label'}>
            <T text={label} ctx={ctx} />
          </p>
          <ul>
            {gifts.map((gift) => (
              <li key={gift.key}>
                <Icon name={SUMMARY_ICONS[gift.icon]} size="1.25em" />
                <T text={gift.title} ctx={ctx} />
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        className="rb-thread-next"
        onClick={(e) => {
          e.stopPropagation()
          ctx.next()
        }}
      >
        Seguir <ChevronRight size="1.1em" aria-hidden />
      </button>
    </Appear>
  )
}

/** La tarjeta atada a la cinta: la nota de quien regala, firmada. */
function NoteCard({
  ctx,
  color,
  note,
  tilt,
  edit,
  bow = true,
  children,
}: {
  ctx: SlideContext
  color: string
  note: string
  tilt: number
  edit: string
  /** El moño que la ata (el prólogo ya tiene el suyo entre los nombres). */
  bow?: boolean
  children?: React.ReactNode
}) {
  return (
    <Appear
      active={ctx.active}
      delay={0.75}
      y={26}
      className={bow ? 'rb-thread-card' : 'rb-thread-card is-plain'}
      style={{ rotate: `${tilt}deg` }}
      data-letra={ctx.style.letra && ctx.style.letra !== 'original' ? ctx.style.letra : undefined}
    >
      {bow && <Bow color={color} style={{ top: u(-30) }} />}
      <p className="rb-thread-note" lang="es" {...editable(ctx, edit, 'letra')}>
        <T text={note} ctx={ctx} />
      </p>
      <p className="rb-thread-sign" style={{ color }}>
        — <T text="{{de}}" ctx={ctx} />
      </p>
      {children}
    </Appear>
  )
}

// ── Capítulo ────────────────────────────────────────────────────────────────

/**
 * Un capítulo del hilo: "{{de}} pensó en <lo que pensó>", su nota y lo que
 * viene para regalarte. El tema, la voz y el número salen solos.
 */
export function StoryThread({ theme, buyer, ctx }: Props<'story.thread'>) {
  const active = ctx.active
  const look = lookOf(theme.look)
  const color = ribbonOf(ctx, look)
  // La cinta que entra, y la nota que se escribe.
  useCue(active, 'whoosh', 0.1)
  useCue(active, 'write', 0.85)

  const topic: ThreadTopic = resolveChapterTopic(ctx.slides, ctx.index, theme.topic)
  const copy = TOPIC_COPY[topic]
  const number = chapterNumber(ctx.slides, ctx.index)
  const group = bondGroup(ctx.vars.vinculo, look)
  const tone = resolveTone(ctx.vars.tono, group)

  const kicker = theme.kicker.trim() || chapterLabel(ctx.slides, ctx.index, theme.topic)
  const thought = buyer.idea.trim() || theme.thought.trim() || copy.thought
  const note =
    buyer.ownText.trim() ||
    chapterNote(topic, {
      tone,
      version: buyer.version,
      seed: `${ctx.recipientName}|${ctx.senderName}|${ctx.slideKey}`,
    })
  // Los capítulos alternan el lado de la cinta: el hilo zigzaguea por el regalo.
  const flip = number % 2 === 0

  return (
    <Stage tone="soft" bg={LOOKS[look].bg} className={`rb-thread is-${look}`}>
      <Ribbon active={active} color={color} flip={flip} />

      <div className="rb-body rb-thread-body">
        <Appear as="p" active={active} delay={0.2} className="rb-kicker rb-thread-kicker">
          <T text={kicker} ctx={ctx} />
        </Appear>
        <Knots ctx={ctx} color={color} />

        <div className="rb-thread-idea" {...editable(ctx, 'idea')}>
          <Appear as="p" active={active} delay={0.35} className="rb-caveat rb-thread-lead">
            <span style={{ color }}>
              <T text={theme.lead} ctx={ctx} />
            </span>
          </Appear>
          <h2 className="rb-thread-thought">
            <motion.span
              initial={false}
              animate={active ? { y: '0%', opacity: 1 } : { y: '40%', opacity: 0 }}
              transition={{ duration: 0.7, delay: active ? 0.5 : 0, ease: ease.out }}
            >
              <T text={thought} ctx={ctx} />
            </motion.span>
          </h2>
        </div>

        <NoteCard
          ctx={ctx}
          color={color}
          note={note}
          tilt={flip ? 1.2 : -1.2}
          edit="version,ownText"
        />

        <Gifts ctx={ctx} label={theme.giftLabel.trim() || copy.gift} delay={1.05} />
      </div>
    </Stage>
  )
}

// ── Prólogo ─────────────────────────────────────────────────────────────────

/**
 * El prólogo: los dos nombres atados por la cinta, desde cuándo y cómo empezó
 * todo. Lo que elige quien regala acá (vínculo y tono) le da la voz a todos
 * los capítulos.
 */
export function StoryBond({ theme, buyer, ctx }: Props<'story.bond'> | Props<'story.bond-love'>) {
  const active = ctx.active
  const look = lookOf(theme.look)
  const color = ribbonOf(ctx, look)
  useCue(active, 'whoosh', 0.1)
  useCue(active, 'heart', 1.1)

  const group = bondGroup(buyer.relation, look)
  const tone = resolveTone(buyer.tone, group)
  const note =
    buyer.ownText.trim() ||
    bondNote(group, {
      tone,
      version: buyer.version,
      seed: `${ctx.recipientName}|${ctx.senderName}|${ctx.slideKey}`,
    })
  const recipient = ctx.recipientName || 'Alguien especial'
  const sender = ctx.senderName || 'Vos'
  // Sin "desde cuándo", en Pareja van los días juntos de la Love edition.
  const since =
    sinceLabel(buyer.since) ||
    (ctx.vars.dias_juntos ? `${ctx.vars.dias_juntos} días de historia` : '')
  const origin = buyer.origin.trim()

  return (
    <Stage tone="soft" bg={LOOKS[look].bg} className={`rb-thread is-bond is-${look}`}>
      <div className="rb-body rb-thread-body">
        <Appear as="p" active={active} delay={0.2} className="rb-kicker rb-thread-kicker">
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Knots ctx={ctx} color={color} />

        <div className="rb-thread-names">
          <Appear
            as="h2"
            active={active}
            delay={0.3}
            className="rb-thread-name"
            {...editable(ctx, '@recipientName')}
          >
            {recipient}
          </Appear>
          <div className="rb-thread-tie" {...editable(ctx, '', 'cinta')}>
            <Ribbon active={active} color={color} tie />
            <Appear active={active} delay={1.2} scale={0.5} y={0} className="rb-thread-tie-bow">
              <Bow color={color} />
            </Appear>
          </div>
          <Appear
            as="h2"
            active={active}
            delay={0.45}
            className="rb-thread-name"
            {...editable(ctx, '@senderName')}
          >
            {sender}
          </Appear>
          {(since || ctx.editing) && (
            <Appear
              as="p"
              active={active}
              delay={1.3}
              className="rb-thread-since"
              style={{ color }}
              {...editable(ctx, 'since')}
            >
              {since || '¿Desde cuándo?'}
            </Appear>
          )}
        </div>

        <NoteCard
          ctx={ctx}
          color={color}
          note={note}
          tilt={-1}
          edit="relation,tone,version,ownText"
          bow={false}
        >
          {(origin || ctx.editing) && (
            <div className="rb-thread-origin" {...editable(ctx, 'origin')}>
              <p className="rb-kicker">
                <T text={theme.originLabel} ctx={ctx} />
              </p>
              <p className="rb-playfair">
                {origin ? `“${fill(origin, ctx.vars)}”` : 'Tocá para contar cómo empezó todo.'}
              </p>
            </div>
          )}
        </NoteCard>

        <Gifts ctx={ctx} label={theme.nextLead} delay={1.4} sentence />
      </div>
    </Stage>
  )
}
