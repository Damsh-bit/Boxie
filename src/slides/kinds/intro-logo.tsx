import { Appear, frames, Loop, Pop } from './motion'
import type { Props } from './shared'

export function IntroLogo({ theme, ctx }: Props<'intro.logo'>) {
  const active = ctx.active
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
    >
      <Loop active={active} delay={1} duration={3} frames={frames.bounce(10)}>
        <Pop
          as="img"
          active={active}
          from={0}
          rotate={-15}
          src={ctx.resolveMedia(theme.logo) ?? ctx.logoUrl}
          alt="Boxie"
          className="bx-intro-logo"
        />
      </Loop>
      <Appear as="p" active={active} delay={0.5} y={12} className="bx-intro-tagline">
        {theme.tagline}
      </Appear>
      <Appear active={active} delay={1.1} y={12} className="bx-swipe-hint">
        <Loop active={active} delay={1.8} duration={1.6} frames={frames.bounce(6)}>
          {theme.hint}
        </Loop>
      </Appear>
    </div>
  )
}
