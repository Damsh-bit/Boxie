import { MoreHorizontal, Play } from 'lucide-react'
import { useState } from 'react'
import { Icon } from '@/ui/Icon'
import { Burst } from '../ribbly/art'
import { Btn, Stage, T, u } from '../ribbly/ui'
import { Appear, Pop } from './motion'
import type { Props } from './shared'

const MOTIFS = [
  <path key="a" d="M0 40 V26 a20 20 0 0 1 40 0 V40 Z" fill="#4A1028" />,
  <path
    key="b"
    d="M20 6 l4.4 9 l9.9 1.4 l-7.2 7 l1.7 9.8 L20 28.6 l-8.8 4.6 l1.7 -9.8 l-7.2 -7 l9.9 -1.4 Z"
    fill="#4A1028"
  />,
  <g key="c" fill="#4A1028">
    <circle cx="14" cy="15" r="8" />
    <circle cx="27" cy="27" r="8" />
  </g>,
  <path key="d" d="M0 24 q10 -12 20 0 t20 0 V40 H0 Z" fill="#F44E63" />,
  <path key="e" d="M20 6 L34 20 L20 34 L6 20 Z" fill="#4A1028" />,
  <path
    key="f"
    d="M20 33 C6 23 7 10 14 10 c3.4 0 5 2.4 6 4 c1 -1.6 2.6 -4 6 -4 c7 0 8 13 -6 23 Z"
    fill="#fff"
  />,
  <circle key="g" cx="20" cy="22" r="11" fill="#4A1028" opacity="0.55" />,
  <path key="h" d="M0 30 h40 M0 20 h40 M0 10 h40" stroke="#4A1028" strokeWidth="4" opacity="0.6" />,
]

/** Portada chiquita de cada playlist: un color y una figura. */
function Thumb({ color, index }: { color: string; index: number }) {
  return (
    <svg className="rb-mix-thumb" viewBox="0 0 40 40" aria-hidden>
      <rect width="40" height="40" fill={color} />
      {MOTIFS[index % MOTIFS.length]}
    </svg>
  )
}

/** 07 · Playlist: una lista de playlists para festejar, estilo app de música. */
export function MediaMix({ theme, ctx }: Props<'media.mix'>) {
  const active = ctx.active
  const playlists = theme.playlists.filter((p) => p.name)
  const [selected, setSelected] = useState(0)
  const [party, setParty] = useState(0)
  const current = playlists[Math.min(selected, playlists.length - 1)]

  return (
    <Stage bg="linear-gradient(160deg, #1B3B6F 0%, #4A2A6B 50%, #2B1B4E 100%)">
      <div className="rb-body">
        <Pop active={active} from={0.6} className="rb-mix-cover">
          <i style={{ left: 0, background: '#5ED6A8', transform: 'rotate(-9deg)' }}>
            <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }} aria-hidden>
              <path d="M0 40 V30 a16 16 0 0 1 32 0 V40 Z" fill="#4A1028" />
            </svg>
          </i>
          <i style={{ right: 0, background: '#FFD35C', transform: 'rotate(9deg)' }}>
            <svg viewBox="0 0 40 40" style={{ width: '100%', height: '100%' }} aria-hidden>
              <path d="M0 26 q10 -10 20 0 t20 0 V40 H0 Z" fill="#F44E63" />
            </svg>
          </i>
          <i className="is-main">
            <svg viewBox="0 0 40 40" style={{ width: '62%' }} aria-hidden>
              <path
                d="M20 2 l5.6 11.4 l12.6 1.8 l-9.1 8.9 l2.1 12.5 L20 30.7 l-11.2 5.9 l2.1 -12.5 l-9.1 -8.9 l12.6 -1.8 Z"
                fill="#FFB8CC"
              />
            </svg>
          </i>
        </Pop>

        <Appear
          as="p"
          active={active}
          delay={0.15}
          className="rb-kicker"
          style={{ color: 'var(--rb-sol)', marginTop: u(20) }}
        >
          <T text={theme.kicker} ctx={ctx} />
        </Appear>
        <Appear
          as="h2"
          active={active}
          delay={0.22}
          className="rb-title"
          style={{ fontSize: u(36), marginTop: u(6) }}
        >
          <T text={theme.title} ctx={ctx} />
        </Appear>
        <Appear as="p" active={active} delay={0.3} className="rb-sub" style={{ marginTop: u(4) }}>
          <T text={theme.subtitle} ctx={ctx} extra={{ n: String(playlists.length) }} />
        </Appear>

        <Appear
          active={active}
          delay={0.4}
          style={{ display: 'flex', gap: u(10), marginTop: u(16), position: 'relative' }}
        >
          <Btn variant="white" href={current?.url || undefined} mods="is-flat">
            <Play size={15} fill="currentColor" />
            <T text={theme.listenLabel} ctx={ctx} />
          </Btn>
          <Btn
            variant="glass"
            mods="rb-btn-icon"
            onClick={() => setParty((n) => n + 1)}
            aria-label="¡Fiesta!"
          >
            <Icon name="cotillon" size={u(24)} />
          </Btn>
          {party > 0 && <Burst key={party} x="78%" y="50%" seed={party} count={28} power={0.8} />}
        </Appear>

        <div className="rb-mix-list rb-scroll">
          {playlists.map((p, i) => (
            <Appear key={i} active={active} delay={0.5 + i * 0.06} y={16} duration={0.5}>
              <a
                className={`rb-mix-row ${i === selected ? 'is-on' : ''}`}
                href={p.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                onPointerEnter={() => setSelected(i)}
                onFocus={() => setSelected(i)}
                onClick={() => setSelected(i)}
              >
                <Thumb color={p.color} index={i} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b>{p.name}</b>
                  <small>{p.description}</small>
                </span>
                <MoreHorizontal size={16} style={{ opacity: 0.5, flex: 'none' }} />
              </a>
            </Appear>
          ))}
        </div>
      </div>
    </Stage>
  )
}
