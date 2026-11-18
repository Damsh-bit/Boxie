import { ChevronUp } from 'lucide-react'
import { Balloon, Bokeh, Bunting, Confetti, Heart, Ribbon } from '../ribbly/art'
import { useRbPalette } from '../ribbly/look'
import { FoilNumber } from '../ribbly/pieces'
import { Btn, Stage, StyleSpot, T, u } from '../ribbly/ui'
import { Appear, frames, Loop, Pop } from './motion'
import type { Props } from './shared'

/** Pareja: la cinta de la R cruza el fondo rosa y flotan corazones. */
function LoveDecor({ active }: { active: boolean }) {
  return (
    <>
      <div className="rb-bg">
        <Bokeh seed={11} count={12} colors={['#FFFFFF', '#FFE4E9']} blur={6} maxOpacity={0.7} />
        <Ribbon
          active={active}
          style={{ position: 'absolute', left: 0, bottom: 0, width: '100%', height: '62%' }}
        />
      </div>
      <Heart color="#F44E63" style={{ right: '9%', top: '56%', width: u(58) }} duration={6.2} />
      <Heart
        color="#F7798A"
        style={{ left: '10%', top: '64%', width: u(34) }}
        duration={5.4}
        delay={-2}
        tilt={8}
      />
    </>
  )
}

const BALLOON_SPOTS = [
  { style: { left: '5%', top: '53%', width: u(64) }, duration: 6.4, delay: 0, tilt: -3 },
  { style: { right: '8%', top: '47%', width: u(78) }, duration: 7.2, delay: -2, tilt: 4 },
  { style: { left: '27%', top: '66%', width: u(52) }, duration: 5.6, delay: -1, tilt: 3 },
  { style: { right: '26%', top: '67%', width: u(58) }, duration: 6.8, delay: -3.4, tilt: -3 },
] as const

/**
 * Los globos de la intro (eje `globos`): redondos, corazones, el número de la
 * edad en globos metalizados o ninguno. Con otra paleta, toman sus colores.
 */
function IntroBalloons({ kind = 'original', age }: { kind?: string; age?: string }) {
  const palette = useRbPalette()
  const colors = palette
    ? [palette.balloons[2], palette.primary, palette.balloons[0], palette.balloons[1]]
    : ['#F2A93B', '#F44E63', '#B28DFF', '#5ED6A8']
  if (kind === 'sin') return null
  if (kind === 'numero' && age) {
    return (
      <>
        <FoilNumber
          value={age}
          style={{
            position: 'absolute',
            left: '50%',
            top: '55%',
            width: u(age.length > 1 ? 150 : 84),
            translate: '-50% 0',
          }}
        />
        <Balloon
          color={colors[1]!}
          {...BALLOON_SPOTS[0]}
          style={{ ...BALLOON_SPOTS[0].style, width: u(52) }}
        />
        <Balloon
          color={colors[3]!}
          {...BALLOON_SPOTS[1]}
          style={{ ...BALLOON_SPOTS[1].style, width: u(56) }}
        />
      </>
    )
  }
  return (
    <>
      {BALLOON_SPOTS.map((spot, i) =>
        kind === 'corazones' ? (
          <Heart
            key={i}
            color={colors[i]!}
            duration={spot.duration}
            delay={spot.delay}
            tilt={spot.tilt}
            style={{ position: 'absolute', ...spot.style }}
          />
        ) : (
          <Balloon key={i} color={colors[i]!} {...spot} />
        ),
      )}
    </>
  )
}

/** 01 · Intro: la marca sobre el cielo, con guirnalda, globos y confeti (o la cinta, en Pareja). */
export function IntroBrand({ theme, ctx }: Props<'intro.brand'>) {
  const active = ctx.active
  if (theme.look === 'pareja') {
    return (
      <Stage
        bg="linear-gradient(170deg, #FFE4E9 0%, #FFCCD5 55%, #F7A8B8 100%)"
        className="is-pareja"
        style={{ color: '#2A2433' }}
      >
        <LoveDecor active={active} />
        <div className="rb-body">
          <div className="rb-intro-logo" style={{ color: '#F44E63', filter: 'none' }}>
            <Pop active={active} from={0.2} rotate={-18}>
              <i className="rb-mark" style={{ height: u(106), display: 'block' }} aria-hidden />
            </Pop>
            <Appear as="h1" active={active} delay={0.25} y={16} className="rb-intro-word">
              RIBBLY
            </Appear>
            <Appear
              as="p"
              active={active}
              delay={0.45}
              y={12}
              className="rb-sub"
              style={{ marginTop: u(16), fontSize: u(15), color: '#2A2433' }}
            >
              <T text={theme.tagline} ctx={ctx} />
            </Appear>
          </div>
          <div className="rb-actions">
            <Appear active={active} delay={1.2} y={24}>
              <Btn variant="glass" mods="is-ink" onClick={ctx.next} style={{ color: '#2A2433' }}>
                <Loop as="span" active={active} duration={1.3} frames={frames.bounce(4)}>
                  <ChevronUp size={16} strokeWidth={3} style={{ display: 'block' }} />
                </Loop>
                <T text={theme.hint} ctx={ctx} />
              </Btn>
            </Appear>
          </div>
        </div>
      </Stage>
    )
  }
  return (
    <Stage bg="linear-gradient(165deg, #7FD4F7 0%, #9EC8F0 45%, #F7D7A8 75%, #FBC9D4 100%)">
      <div className="rb-bg">
        <Confetti seed={1} count={30} />
      </div>
      <Bunting />
      <IntroBalloons kind={ctx.style.globos} age={ctx.vars.edad} />
      <StyleSpot
        ctx={ctx}
        styles="globos"
        style={{ left: '4%', right: '4%', top: '46%', height: '34%' }}
      />

      <div className="rb-body">
        <div className="rb-intro-logo">
          <Pop active={active} from={0.2} rotate={-18}>
            <i className="rb-mark" style={{ height: u(106), display: 'block' }} aria-hidden />
          </Pop>
          <Appear as="h1" active={active} delay={0.25} y={16} className="rb-intro-word">
            RIBBLY
          </Appear>
          <Appear
            as="p"
            active={active}
            delay={0.45}
            y={12}
            className="rb-sub rb-shadow-text"
            style={{ marginTop: u(16), fontSize: u(15) }}
          >
            <T text={theme.tagline} ctx={ctx} />
          </Appear>
        </div>

        <div className="rb-actions">
          <Appear active={active} delay={0.9} y={24}>
            <Btn variant="glass" mods="is-ink" onClick={ctx.next}>
              <Loop as="span" active={active} duration={1.3} frames={frames.bounce(4)}>
                <ChevronUp size={16} strokeWidth={3} style={{ display: 'block' }} />
              </Loop>
              <T text={theme.hint} ctx={ctx} />
            </Btn>
          </Appear>
        </div>
      </div>
    </Stage>
  )
}
