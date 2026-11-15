import { ChevronUp } from 'lucide-react'
import { Balloon, Bunting, Confetti } from '../ribbly/art'
import { Btn, Stage, T, u } from '../ribbly/ui'
import { Appear, frames, Loop, Pop } from './motion'
import type { Props } from './shared'

/** 01 · Intro: la marca sobre el cielo, con guirnalda, globos y confeti. */
export function IntroBrand({ theme, ctx }: Props<'intro.brand'>) {
  const active = ctx.active
  return (
    <Stage bg="linear-gradient(165deg, #7FD4F7 0%, #9EC8F0 45%, #F7D7A8 75%, #FBC9D4 100%)">
      <div className="rb-bg">
        <Confetti seed={1} count={30} />
      </div>
      <Bunting />
      <Balloon color="#F2A93B" style={{ left: '5%', top: '53%', width: u(64) }} duration={6.4} />
      <Balloon
        color="#F44E63"
        style={{ right: '8%', top: '47%', width: u(78) }}
        duration={7.2}
        delay={-2}
        tilt={4}
      />
      <Balloon
        color="#B28DFF"
        style={{ left: '27%', top: '66%', width: u(52) }}
        duration={5.6}
        delay={-1}
        tilt={3}
      />
      <Balloon
        color="#5ED6A8"
        style={{ right: '26%', top: '67%', width: u(58) }}
        duration={6.8}
        delay={-3.4}
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
