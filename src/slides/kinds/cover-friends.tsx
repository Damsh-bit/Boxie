import { RichText } from '../RichText'
import { Appear, frames, Loop, Pop } from './motion'
import { tint, type Props } from './shared'

export function CoverFriends({ theme, ctx }: Props<'cover.friends'>) {
  const active = ctx.active
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      <Loop
        active={active}
        duration={12}
        frames={['translate(0px, 0px)', 'translate(-30px, 25px)', 'translate(0px, 0px)']}
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-20%',
          width: 350,
          height: 350,
          background: tint('--bx-primary', 15),
          borderRadius: '50%',
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />
      <Loop
        active={active}
        duration={14}
        delay={1}
        frames={['translate(0px, 0px)', 'translate(35px, -20px)', 'translate(0px, 0px)']}
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-20%',
          width: 350,
          height: 350,
          background: tint('--bx-ink', 10),
          borderRadius: '50%',
          filter: 'blur(60px)',
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}
      >
        <Appear
          active={active}
          y={-16}
          className="bx-font-fredoka"
          style={{
            fontSize: '0.9rem',
            color: 'var(--bx-primary)',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 700,
            marginBottom: 20,
            background: 'white',
            padding: '10px 25px',
            borderRadius: 30,
            boxShadow: `0 4px 15px ${tint('--bx-primary', 15)}`,
          }}
        >
          {theme.badge}
        </Appear>

        <Pop
          as="h1"
          active={active}
          delay={0.1}
          from={0.5}
          className="bx-font-fredoka"
          style={{
            color: 'var(--bx-primary)',
            fontSize: '4.5rem',
            lineHeight: 0.9,
            marginBottom: 40,
            textAlign: 'center',
            textShadow: `3px 3px 0px ${tint('--bx-primary', 10)}`,
            overflowWrap: 'anywhere',
            padding: '0 12px',
          }}
        >
          {ctx.recipientName || 'Alguien especial'}
        </Pop>

        <Pop
          active={active}
          delay={0.35}
          from={0.6}
          y={30}
          style={{
            background: 'white',
            padding: 30,
            borderRadius: 25,
            maxWidth: '85%',
            textAlign: 'center',
            boxShadow: '0 15px 35px rgba(0,0,0,0.08)',
            border: `2px solid ${tint('--bx-primary', 10)}`,
          }}
        >
          <p
            className="bx-font-fredoka"
            style={{
              fontSize: '1.3rem',
              color: '#555',
              margin: 0,
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            <RichText value={theme.quote} />
          </p>
          <div
            style={{
              marginTop: 20,
              color: 'var(--bx-primary)',
              fontWeight: 800,
              fontSize: '1.2rem',
              letterSpacing: 0.5,
            }}
          >
            {theme.thanks}
          </div>
        </Pop>

        <Pop
          active={active}
          delay={0.6}
          rotate={-30}
          style={{ position: 'absolute', top: -90, left: '10%', opacity: 0.9 }}
        >
          <Loop
            active={active}
            delay={1}
            duration={3}
            frames={frames.float(15, -6)}
            style={{ fontSize: '3.5rem' }}
          >
            {theme.emojiTop}
          </Loop>
        </Pop>
        <Pop
          active={active}
          delay={0.75}
          rotate={30}
          style={{ position: 'absolute', bottom: -60, right: '10%', opacity: 0.9 }}
        >
          <Loop
            active={active}
            delay={1.4}
            duration={4}
            frames={frames.float(15, 6)}
            style={{ fontSize: '3.5rem' }}
          >
            {theme.emojiBottom}
          </Loop>
        </Pop>
      </div>

      <Appear
        active={active}
        delay={0.9}
        y={14}
        className="bx-font-fredoka"
        style={{
          marginTop: 50,
          borderBottom: '2px solid var(--bx-primary)',
          paddingBottom: 5,
          color: 'var(--bx-ink)',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {theme.senderPrefix} {ctx.senderName}
      </Appear>
    </div>
  )
}
