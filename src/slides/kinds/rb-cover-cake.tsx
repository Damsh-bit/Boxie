import { motion } from 'framer-motion'
import { useState } from 'react'
import { useSound } from '../player/use-sound'
import { Bunting, Burst, Cake, Confetti, Rays } from '../ribbly/art'
import { Btn, editable, Stage, T, TapMark, u } from '../ribbly/ui'
import { Appear, Pop } from './motion'
import type { Props } from './shared'

/** El nombre entra entero: cuanto más largo, más chico. */
function nameSize(name: string): number {
  const length = name.length
  if (length <= 6) return 58
  if (length <= 9) return 48
  if (length <= 13) return 38
  return 30
}

/**
 * 02 · Portada de festejo: el nombre, la torta con las velas de la edad y un
 * toque para soplarlas (las llamas se apagan con humo y arranca el confeti).
 */
export function CoverCake({ theme, ctx }: Props<'cover.cake'>) {
  const active = ctx.active
  const [blown, setBlown] = useState(false)
  // Al volver a la portada, las velas están prendidas de nuevo.
  if (!active && blown) setBlown(false)
  const name = ctx.recipientName || 'Alguien especial'
  const play = useSound()

  const blow = () => {
    if (blown) return ctx.next()
    setBlown(true)
    play('blow')
  }

  return (
    <Stage bg="linear-gradient(172deg, #FF6B8A 0%, #FF9A6B 60%, #FFC46B 100%)">
      <div className="rb-bg">
        <Rays at="50% 47%" strength={0.14} />
        <Confetti seed={2} count={26} />
      </div>
      <Bunting />

      <div className="rb-body">
        <Appear
          as="p"
          active={active}
          y={14}
          className="rb-sub rb-shadow-text"
          style={{ marginTop: u(52), fontSize: u(15) }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Pop
          as="h1"
          active={active}
          delay={0.15}
          from={0.5}
          className="rb-cake-name"
          style={{ fontSize: u(nameSize(name)), marginTop: u(6), maxWidth: '100%' }}
          {...editable(ctx, '@recipientName')}
        >
          {name}
        </Pop>

        <div className="rb-grow">
          <Appear active={active} delay={0.3} y={70} duration={0.9}>
            <motion.button
              type="button"
              className="rb-cake-tap"
              onClick={blow}
              {...editable(ctx, 'age,treatment,birthday', 'torta,velas')}
              aria-label={blown ? 'Seguir' : 'Soplar las velitas'}
              whileTap={{ scale: 0.96 }}
              animate={blown ? { scale: [1, 1.07, 1] } : { scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
            >
              <Cake
                age={ctx.vars.edad}
                lit={!blown}
                flicker={active}
                flavor={ctx.style.torta}
                candles={ctx.style.velas}
              />
            </motion.button>
          </Appear>
          {/* El soplido ya trae sus brillitos. */}
          {blown && <Burst key="soplo" y="38%" count={46} power={1.15} cue={null} />}

          <Pop
            as="p"
            active={active}
            delay={0.55}
            from={0.7}
            // El saludo, con una campanita.
            cue="chime"
            className="rb-hand rb-shadow-text"
            style={{ fontSize: u(31), fontWeight: 700, marginTop: u(14) }}
          >
            <T text={theme.greeting} ctx={ctx} />
          </Pop>
        </div>

        <div className="rb-actions" style={{ marginTop: 0 }}>
          <Appear active={active} delay={0.8} y={20} style={{ position: 'relative' }}>
            <Btn
              variant="glass"
              onClick={blow}
              cue={blown ? 'tap' : null}
              style={{ fontSize: u(15) }}
            >
              <T text={blown ? theme.blown : theme.cta} ctx={ctx} />
            </Btn>
            {!blown && <TapMark style={{ left: '50%', top: '50%' }} />}
          </Appear>
          <Appear
            as="p"
            active={active}
            delay={1}
            y={10}
            className="rb-sender"
            {...editable(ctx, '@senderName')}
          >
            <T text={theme.senderPrefix} ctx={ctx} /> {ctx.senderName}
          </Appear>
        </div>
      </div>
    </Stage>
  )
}
