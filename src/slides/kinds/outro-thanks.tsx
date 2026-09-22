import type { Props } from './shared'

export function OutroThanks({ theme, ctx }: Props<'outro.thanks'>) {
  return (
    <div>
      <h1 style={{ fontSize: '3rem', color: 'white' }}>{theme.title}</h1>
      <p style={{ color: 'white' }}>{theme.text}</p>
      <button
        type="button"
        onClick={() => ctx.goTo(0)}
        style={{
          background: 'white',
          color: 'var(--bx-primary)',
          padding: '10px 20px',
          borderRadius: 30,
          border: 'none',
          marginTop: 20,
          cursor: 'pointer',
          fontWeight: 600,
        }}
      >
        {theme.replayLabel}
      </button>
    </div>
  )
}
