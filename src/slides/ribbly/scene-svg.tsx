'use client'

import { motion } from 'framer-motion'
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { ease, spring } from '../player/motion'
import type { Cue } from '../player/sound'
import { useCue } from '../player/use-sound'
import {
  HEART_PATH,
  roughMeasure,
  type Measure,
  type Paint,
  type Scene,
  type SceneNode,
  STORY_H,
  STORY_W,
} from './love-art'
import { createMeasure, loadFonts, readFamilies, type Families } from './story-image'

/**
 * La escena de una pantalla de Pareja (love-art.ts) dibujada como SVG: el
 * fondo estirado al escenario y lo demás escalado sin deformarse, arriba.
 * La imagen para compartir dibuja la misma escena en un canvas.
 */

/**
 * La medida de los textos con las fuentes de verdad. En el servidor y en el
 * primer render es aproximada (así no cambia el HTML al hidratar); cuando las
 * fuentes terminan de cargar se vuelve a medir.
 */
export function useSceneMeasure(): Measure {
  const [state, setState] = useState<{ families: Families; version: number } | null>(null)
  useEffect(() => {
    const families = readFamilies()
    let alive = true
    const update = () => {
      if (alive) setState((s) => ({ families, version: (s?.version ?? 0) + 1 }))
    }
    void loadFonts(families).then(update)
    document.fonts?.addEventListener('loadingdone', update)
    return () => {
      alive = false
      document.fonts?.removeEventListener('loadingdone', update)
    }
  }, [])
  return useMemo(() => (state ? createMeasure(state.families) : roughMeasure), [state])
}

/** Cómo entra cada grupo cuando la pantalla queda a la vista. */
export interface Entrance {
  delay?: number
  x?: number
  y?: number
  scale?: number
  rotate?: number
  /** Con resorte (rebota) en vez de deslizarse. */
  pop?: boolean
  /** Con resorte pero sin su "pop" (adornos: que suene lo importante). */
  silent?: boolean
  /** Cómo suena al llegar, si no es un "pop" (una polaroid, un sticker). */
  cue?: Cue
}

interface Ctx {
  id: string
  /** Editor directo: los grupos con `edit` se marcan con data-edit. */
  editing?: boolean
  /** Capa estirada: los trazos no se deforman. */
  stretch?: boolean
  defs: ReactNode[]
  count: number
  active: boolean
  entrances: Record<string, Entrance>
  onTap?: (id: string) => void
}

function paintRef(ctx: Ctx, p: Paint | undefined): string | undefined {
  if (!p || typeof p === 'string') return p
  const id = `${ctx.id}-p${ctx.count++}`
  const stops = p.stops.map(([offset, color], i) => (
    <stop key={i} offset={offset} stopColor={color} />
  ))
  ctx.defs.push(
    'linear' in p ? (
      <linearGradient
        key={id}
        id={id}
        gradientUnits="userSpaceOnUse"
        x1={p.linear[0]}
        y1={p.linear[1]}
        x2={p.linear[2]}
        y2={p.linear[3]}
      >
        {stops}
      </linearGradient>
    ) : (
      <radialGradient
        key={id}
        id={id}
        gradientUnits="userSpaceOnUse"
        cx={p.radial[0]}
        cy={p.radial[1]}
        r={p.radial[2]}
      >
        {stops}
      </radialGradient>
    ),
  )
  return `url(#${id})`
}

const FAMILY = {
  fredoka: 'var(--font-fredoka), sans-serif',
  caveat: 'var(--font-caveat), cursive',
  outfit: 'var(--font-outfit), sans-serif',
  nunito: 'var(--font-nunito), sans-serif',
  dancing: 'var(--font-dancing), cursive',
  playfair: 'var(--font-playfair), serif',
}

function heartTransform(x: number, y: number, size: number, rotate = 0) {
  const k = size / 24
  return `translate(${x} ${y}) rotate(${rotate}) scale(${k}) translate(-12 -12.5)`
}

function renderNodes(nodes: SceneNode[], ctx: Ctx): ReactNode[] {
  return nodes.map((node, i) => {
    switch (node.type) {
      case 'path':
        return (
          <path
            key={i}
            d={node.d}
            fill={node.fill ? paintRef(ctx, node.fill) : 'none'}
            stroke={node.stroke}
            strokeWidth={node.stroke ? (node.width ?? 1) : undefined}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={node.opacity}
            vectorEffect={ctx.stretch && node.stroke ? 'non-scaling-stroke' : undefined}
          />
        )
      case 'text':
        return (
          <text
            key={i}
            x={node.x}
            y={node.y}
            fill={node.gradient ? paintRef(ctx, node.gradient) : node.color}
            letterSpacing={node.spacing}
            filter={node.shadow ? `url(#${ctx.id}-text-shadow)` : undefined}
            style={{
              fontFamily: FAMILY[node.font.family],
              fontWeight: node.font.weight,
              fontSize: node.font.size,
              fontStyle: node.font.italic ? 'italic' : 'normal',
              whiteSpace: 'pre',
            }}
          >
            {node.text}
          </text>
        )
      case 'heart': {
        const k = node.size / 24
        return (
          <path
            key={i}
            d={HEART_PATH}
            transform={heartTransform(node.x, node.y, node.size, node.rotate)}
            fill={node.fill ? paintRef(ctx, node.fill) : 'none'}
            stroke={node.stroke}
            strokeWidth={node.stroke ? (node.width ?? 1.6) / k : undefined}
            strokeLinejoin="round"
          />
        )
      }
      case 'rect':
        return (
          <rect
            key={i}
            x={node.x}
            y={node.y}
            width={node.w}
            height={node.h}
            rx={node.radius}
            fill={paintRef(ctx, node.fill)}
            opacity={node.opacity}
            filter={node.shadow ? `url(#${ctx.id}-paper-shadow)` : undefined}
          />
        )
      case 'photo': {
        const clipId = node.clip ? `${ctx.id}-c${ctx.count++}` : undefined
        if (node.clip) {
          ctx.defs.push(
            <clipPath key={clipId} id={clipId}>
              <path d={node.clip} />
            </clipPath>,
          )
        }
        const clipPath = clipId ? `url(#${clipId})` : undefined
        return node.src ? (
          <image
            key={i}
            href={node.src}
            x={node.x}
            y={node.y}
            width={node.w}
            height={node.h}
            preserveAspectRatio="xMidYMid slice"
            clipPath={clipPath}
          />
        ) : (
          <g key={i} clipPath={clipPath}>
            <rect
              x={node.x}
              y={node.y}
              width={node.w}
              height={node.h}
              fill={paintRef(ctx, {
                linear: [node.x, node.y, node.x + node.w, node.y + node.h],
                stops: [
                  [0, '#F9C9D9'],
                  [1, '#F48FB1'],
                ],
              })}
            />
            <path
              d={HEART_PATH}
              transform={heartTransform(
                node.x + node.w / 2,
                node.y + node.h / 2,
                Math.min(node.w, node.h) * 0.3,
              )}
              fill="rgba(255,255,255,0.85)"
            />
          </g>
        )
      }
      case 'group': {
        const transform =
          node.x || node.y || node.rotate
            ? `translate(${node.x ?? 0} ${node.y ?? 0}) rotate(${node.rotate ?? 0})`
            : undefined
        const children = renderNodes(node.children, ctx)
        const entrance = node.id ? ctx.entrances[node.id] : undefined
        const tap = node.tap && node.id && ctx.onTap
        const inner = entrance ? (
          <Enter entrance={entrance} active={ctx.active}>
            {children}
          </Enter>
        ) : (
          children
        )
        const mv = node.edit || node.style
        const group = (
          <g
            key={node.id ?? i}
            transform={transform}
            data-edit={ctx.editing && node.edit ? node.edit : undefined}
            data-style={ctx.editing && node.style ? node.style : undefined}
            onClick={
              tap
                ? (e) => {
                    e.stopPropagation()
                    ctx.onTap!(node.id!)
                  }
                : undefined
            }
            style={tap ? { cursor: 'zoom-in', pointerEvents: 'auto' } : undefined}
          >
            {inner}
          </g>
        )
        // Lo que el comprador movió o agrandó (layout.ts) va en un grupo sin
        // transform propio, para que agrande desde el centro de la pieza.
        return mv ? (
          <g key={node.id ?? i} data-mv={mv}>
            {group}
          </g>
        ) : (
          group
        )
      }
    }
  })
}

function Enter({
  entrance,
  active,
  children,
}: {
  entrance: Entrance
  active: boolean
  children: ReactNode
}) {
  const hidden = {
    opacity: 0,
    x: entrance.x ?? 0,
    y: entrance.y ?? 0,
    scale: entrance.scale ?? 1,
    rotate: entrance.rotate ?? 0,
  }
  const delay = entrance.delay ?? 0
  // Lo que entra con resorte suena al llegar (seguidos, suben de nota).
  useCue(active && !!entrance.pop && !entrance.silent, entrance.cue ?? 'pop', delay + 0.07)
  return (
    <motion.g
      style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
      initial={hidden}
      animate={
        active
          ? {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              rotate: 0,
              transition: entrance.pop
                ? { ...spring.pop, delay }
                : { duration: 0.8, ease: ease.out, delay },
            }
          : { ...hidden, transition: { duration: 0.2 } }
      }
    >
      {children}
    </motion.g>
  )
}

function Defs({ id, children }: { id: string; children: ReactNode[] }) {
  return (
    <defs>
      <filter id={`${id}-text-shadow`} x="-20%" y="-50%" width="140%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#000" floodOpacity="0.35" />
      </filter>
      <filter id={`${id}-paper-shadow`} x="-25%" y="-20%" width="150%" height="150%">
        <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#963C5A" floodOpacity="0.24" />
      </filter>
      {children}
    </defs>
  )
}

/**
 * Las dos capas de la escena. El fondo se estira para tocar los bordes; lo
 * demás se escala parejo, centrado y arriba, como una historia (en un
 * teléfono más alto que 9:16 sobra lugar abajo, donde va el botón).
 */
export function SceneView({
  scene,
  active,
  entrances = {},
  onTap,
  label,
  editing = false,
}: {
  scene: Scene
  active: boolean
  /** Editor directo (SlideContext.editing). */
  editing?: boolean
  entrances?: Record<string, Entrance>
  onTap?: (id: string) => void
  /** Lo que dice la pantalla, para lectores de pantalla. */
  label: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const bgCtx: Ctx = { id: `${id}b`, stretch: true, defs: [], count: 0, active, entrances: {} }
  const bg = renderNodes(scene.bg, bgCtx)
  const fgCtx: Ctx = { id: `${id}f`, editing, defs: [], count: 0, active, entrances, onTap }
  const fg = renderNodes(scene.fg, fgCtx)
  const viewBox = `0 0 ${STORY_W} ${STORY_H}`
  return (
    <>
      <svg className="rb-scene" viewBox={viewBox} preserveAspectRatio="none" aria-hidden>
        <Defs id={bgCtx.id}>{bgCtx.defs}</Defs>
        {bg}
      </svg>
      <svg
        className="rb-scene rb-scene-fg"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMin meet"
        role="img"
        aria-label={label}
      >
        <Defs id={fgCtx.id}>{fgCtx.defs}</Defs>
        {fg}
      </svg>
    </>
  )
}
