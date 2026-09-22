import type { Props } from './shared'

export function IntroLogo({ theme, ctx }: Props<'intro.logo'>) {
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
      <img
        src={ctx.resolveMedia(theme.logo) ?? ctx.logoUrl}
        alt="Boxie"
        className="bx-intro-logo"
      />
      <p className="bx-intro-tagline">{theme.tagline}</p>
      <div className="bx-swipe-hint">{theme.hint}</div>
    </div>
  )
}
