'use client'

import type { CSSProperties } from 'react'
import { Balloon, Bunting, Confetti, Heart, Stars } from './art'
import type { Deco, RbPalette } from './style-kit'

/**
 * La decoración que elige el comprador (eje `deco`): se suma alrededor del
 * contenido, en las esquinas y los bordes, sin tapar lo importante. Va entre
 * el fondo de la pantalla y su contenido (ver Stage en ui.tsx).
 */

const u = (n: number) => `calc(var(--u) * ${n})`

const DEFAULT_COLORS = {
  balloons: ['#F44E63', '#FFD35C', '#4FC3F7'] as [string, string, string],
  party: ['#F44E63', '#FFD35C', '#4FC3F7', '#B28DFF', '#5ED6A8', '#FFFFFF'],
}

export function DecoLayer({ kind, palette }: { kind: Deco; palette: RbPalette | null }) {
  const balloons = palette?.balloons ?? DEFAULT_COLORS.balloons
  const layer: CSSProperties = {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    pointerEvents: 'none',
    overflow: 'hidden',
  }
  return (
    <div className="rb-deco" data-deco={kind} style={layer} aria-hidden>
      {kind === 'globos' && (
        <>
          <Balloon
            color={balloons[0]}
            duration={6.5}
            style={{ position: 'absolute', left: '-3%', top: '9%', width: u(52) }}
          />
          <Balloon
            color={balloons[2]}
            duration={7.2}
            delay={-2}
            tilt={4}
            style={{ position: 'absolute', left: '6%', top: '15%', width: u(40) }}
          />
          <Balloon
            color={balloons[1]}
            duration={6.8}
            delay={-1}
            tilt={5}
            style={{ position: 'absolute', right: '-2%', top: '11%', width: u(50) }}
          />
          <Balloon
            color={balloons[0]}
            duration={7.6}
            delay={-3}
            style={{ position: 'absolute', right: '4%', bottom: '6%', width: u(38) }}
          />
        </>
      )}
      {kind === 'banderines' && (
        <Bunting style={{ position: 'absolute', top: 0, left: 0, width: '100%' }} />
      )}
      {kind === 'estrellas' && <Stars seed={9} count={22} sparks={5} area={95} />}
      {kind === 'corazones' && (
        <>
          <Heart
            color={balloons[0]}
            duration={6}
            style={{ position: 'absolute', left: '4%', top: '12%', width: u(34) }}
          />
          <Heart
            color={balloons[1]}
            duration={7}
            delay={-2}
            tilt={8}
            style={{ position: 'absolute', right: '6%', top: '18%', width: u(26) }}
          />
          <Heart
            color={balloons[2]}
            duration={6.6}
            delay={-1}
            style={{ position: 'absolute', left: '8%', bottom: '10%', width: u(24) }}
          />
          <Heart
            color={balloons[0]}
            duration={7.4}
            delay={-3}
            tilt={10}
            style={{ position: 'absolute', right: '5%', bottom: '7%', width: u(32) }}
          />
        </>
      )}
      {kind === 'confeti' && (
        <Confetti seed={31} count={22} colors={palette?.party ?? DEFAULT_COLORS.party} />
      )}
    </div>
  )
}
