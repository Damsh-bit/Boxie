'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Table2, ChartColumn } from 'lucide-react'
import {
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'
import { formatValue, type NumberFormat } from './format-value'

/**
 * Gráficos del panel, en SVG propio y animados con framer-motion.
 *
 * Reglas (skill de visualización): marcas finas (líneas de 2 px, barras de
 * hasta 24 px con punta redondeada), grilla de líneas finas y sólidas, un
 * solo eje Y, colores de series en orden fijo (--color-series-N, validados
 * para daltonismo), leyenda cuando hay más de una serie, tooltip que nunca es
 * la única forma de leer un dato (cada gráfico tiene su vista de tabla) y el
 * texto siempre en tinta, nunca del color de la serie.
 */

export const SERIES = [1, 2, 3, 4, 5, 6].map((n) => `var(--color-series-${n})`)
const GRID = '#efe9ed'
const AXIS = '#d9d1d6'
const MUTED = '#8a8189'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

/** Ticks "lindos" (0, 250 mil, 500 mil…) para un máximo dado. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v)
  if (ticks[ticks.length - 1]! < max) ticks.push(ticks[ticks.length - 1]! + step)
  return ticks
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function Tooltip({
  x,
  y,
  width,
  children,
}: {
  x: number
  y: number
  width: number
  children: ReactNode
}) {
  const flip = x > width - 180
  return (
    <motion.div
      className="pointer-events-none absolute z-10 min-w-36 rounded-xl border border-line bg-white/95 px-3 py-2 text-xs shadow-[0_10px_30px_rgba(42,36,51,0.14)] backdrop-blur"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1, x: flip ? 'calc(-100% - 14px)' : 14, y: '-50%' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      {children}
    </motion.div>
  )
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="h-0.5 w-3 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
      <span className="font-semibold text-ink tabular-nums">{value}</span>
      <span className="truncate text-neutral-500">{label}</span>
    </div>
  )
}

export function Legend({
  items,
}: {
  items: { label: string; color: string; shape?: 'line' | 'box' }[]
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className={cn(
              'shrink-0',
              item.shape === 'box' ? 'size-2.5 rounded-[3px]' : 'h-0.5 w-3.5 rounded-full',
            )}
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

// ── Serie temporal (línea / área) ──────────────────────────────────────────

export interface TimePoint {
  label: string
  values: number[]
}

export function LineChart({
  data,
  series,
  format,
  height = 260,
  area = true,
  ariaLabel,
}: {
  data: TimePoint[]
  series: { name: string; color?: string }[]
  format: NumberFormat
  height?: number
  area?: boolean
  ariaLabel: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const gradientId = useId()
  const pad = { top: 12, right: 12, bottom: 28, left: 64 }
  const plotW = Math.max(width - pad.left - pad.right, 10)
  const plotH = height - pad.top - pad.bottom
  const max = Math.max(...data.flatMap((d) => d.values), 0)
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1
  const xOf = (i: number) =>
    pad.left + (data.length <= 1 ? plotW / 2 : (i / (data.length - 1)) * plotW)
  const yOf = (v: number) => pad.top + plotH - (v / top) * plotH
  const colors = series.map((s, i) => s.color ?? SERIES[i % SERIES.length]!)

  const paths = series.map((_, si) => {
    const pts = data.map((d, i) => [xOf(i), yOf(d.values[si] ?? 0)] as const)
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
    const fill = `${line}L${xOf(data.length - 1).toFixed(1)},${yOf(0)}L${xOf(0).toFixed(1)},${yOf(0)}Z`
    return { line, fill }
  })

  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotW / 80))))
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left - pad.left
    const i = Math.round((x / plotW) * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, i)))
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover((h) => Math.min((h ?? -1) + 1, data.length - 1))
    if (e.key === 'ArrowLeft') setHover((h) => Math.max((h ?? data.length) - 1, 0))
    if (e.key === 'Escape') setHover(null)
  }
  const drawKey = `${data.length}-${data[0]?.label}-${data.at(-1)?.label}`

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          className="overflow-visible outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-brand/40"
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={onKey}
          onBlur={() => setHover(null)}
        >
          <defs>
            {colors.map((c, i) => (
              <linearGradient key={i} id={`${gradientId}-${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.16} />
                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={pad.left + plotW}
                y1={yOf(t)}
                y2={yOf(t)}
                stroke={t === 0 ? AXIS : GRID}
                strokeWidth={1}
              />
              <text
                x={pad.left - 10}
                y={yOf(t)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill={MUTED}
                className="tabular-nums"
              >
                {formatValue(t, format === 'ars' ? 'ars-compact' : format)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % labelEvery === 0 || i === data.length - 1 ? (
              <text
                key={d.label}
                x={xOf(i)}
                y={height - 8}
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                fontSize={11}
                fill={MUTED}
              >
                {d.label}
              </text>
            ) : null,
          )}
          {area &&
            paths.map((p, i) => (
              <motion.path
                key={`fill-${drawKey}-${i}`}
                d={p.fill}
                fill={`url(#${gradientId}-${i})`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            ))}
          {paths.map((p, i) => (
            <motion.path
              key={`line-${drawKey}-${i}`}
              d={p.line}
              fill="none"
              stroke={colors[i]}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: ease.inOut, delay: i * 0.12 }}
            />
          ))}
          {hover !== null && (
            <g>
              <line
                x1={xOf(hover)}
                x2={xOf(hover)}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke={AXIS}
                strokeWidth={1}
              />
              {series.map((_, si) => (
                <circle
                  key={si}
                  cx={xOf(hover)}
                  cy={yOf(data[hover]!.values[si] ?? 0)}
                  r={4.5}
                  fill={colors[si]}
                  stroke="white"
                  strokeWidth={2}
                />
              ))}
            </g>
          )}
        </svg>
      )}
      <AnimatePresence>
        {hover !== null && data[hover] && (
          <Tooltip x={xOf(hover)} y={pad.top + plotH / 2} width={width}>
            <p className="mb-1 font-semibold text-neutral-500">{data[hover].label}</p>
            {series.map((s, si) => (
              <TooltipRow
                key={s.name}
                color={colors[si]!}
                label={s.name}
                value={formatValue(data[hover]!.values[si] ?? 0, format)}
              />
            ))}
          </Tooltip>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Columnas ───────────────────────────────────────────────────────────────

export function ColumnChart({
  data,
  series,
  format,
  height = 240,
  ariaLabel,
  highlightLast = false,
}: {
  data: TimePoint[]
  series: { name: string; color?: string }[]
  format: NumberFormat
  height?: number
  ariaLabel: string
  /** El último período (en curso) va más claro. */
  highlightLast?: boolean
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const pad = { top: 16, right: 8, bottom: 28, left: 64 }
  const plotW = Math.max(width - pad.left - pad.right, 10)
  const plotH = height - pad.top - pad.bottom
  const values = data.flatMap((d) => d.values)
  const max = Math.max(...values, 0)
  const min = Math.min(...values, 0)
  const ticksUp = niceTicks(max)
  const ticksDown =
    min < 0
      ? niceTicks(-min)
          .map((t) => -t)
          .filter((t) => t < 0)
      : []
  const top = ticksUp[ticksUp.length - 1] || 1
  const bottom = ticksDown.length ? ticksDown[ticksDown.length - 1]! : 0
  const span = top - bottom || 1
  const yOf = (v: number) => pad.top + ((top - v) / span) * plotH
  const band = plotW / Math.max(data.length, 1)
  const groupGap = 2
  const barW = Math.min(
    24,
    Math.max(4, (band * 0.62 - groupGap * (series.length - 1)) / series.length),
  )
  const groupW = barW * series.length + groupGap * (series.length - 1)
  const colors = series.map((s, i) => s.color ?? SERIES[i % SERIES.length]!)
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(plotW / 64))))

  const bar = (x: number, v: number) => {
    const y0 = yOf(0)
    const y1 = yOf(v)
    const h = Math.abs(y1 - y0)
    const r = Math.min(4, h, barW / 2)
    if (h < 0.5) return ''
    if (v >= 0)
      return `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + barW - r}Q${x + barW},${y1} ${x + barW},${y1 + r}V${y0}Z`
    return `M${x},${y0}V${y1 - r}Q${x},${y1} ${x + r},${y1}H${x + barW - r}Q${x + barW},${y1} ${x + barW},${y1 - r}V${y0}Z`
  }

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          className="overflow-visible"
        >
          {[...ticksDown, ...ticksUp].map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={pad.left + plotW}
                y1={yOf(t)}
                y2={yOf(t)}
                stroke={t === 0 ? AXIS : GRID}
                strokeWidth={1}
              />
              <text
                x={pad.left - 10}
                y={yOf(t)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill={MUTED}
                className="tabular-nums"
              >
                {formatValue(t, format === 'ars' ? 'ars-compact' : format)}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x0 = pad.left + band * i + (band - groupW) / 2
            const faded = highlightLast && i === data.length - 1
            return (
              <g
                key={d.label}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                role="img"
                aria-label={`${d.label}: ${series.map((s, si) => `${s.name} ${formatValue(d.values[si] ?? 0, format)}`).join(', ')}`}
                className="outline-none"
              >
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={plotH}
                  fill={hover === i ? 'rgba(42,36,51,0.035)' : 'transparent'}
                  rx={6}
                />
                {series.map((_, si) => (
                  <motion.path
                    key={si}
                    d={bar(x0 + si * (barW + groupGap), d.values[si] ?? 0)}
                    fill={colors[si]}
                    fillOpacity={faded ? 0.45 : 1}
                    style={{ transformOrigin: `0px ${yOf(0)}px` }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ ...spring.soft, delay: 0.1 + i * 0.03 }}
                  />
                ))}
                {(i % labelEvery === 0 || i === data.length - 1) && (
                  <text
                    x={pad.left + band * i + band / 2}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fill={MUTED}
                  >
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      <AnimatePresence>
        {hover !== null && data[hover] && (
          <Tooltip x={pad.left + band * hover + band / 2} y={pad.top + plotH / 3} width={width}>
            <p className="mb-1 font-semibold text-neutral-500">{data[hover].label}</p>
            {series.map((s, si) => (
              <TooltipRow
                key={s.name}
                color={colors[si]!}
                label={s.name}
                value={formatValue(data[hover]!.values[si] ?? 0, format)}
              />
            ))}
          </Tooltip>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Barras horizontales (rankings) ─────────────────────────────────────────

export function BarList({
  items,
  format,
  color = SERIES[0],
  emptyText = 'Sin datos en el período.',
}: {
  items: { label: ReactNode; value: number; detail?: ReactNode; color?: string; key: string }[]
  format: NumberFormat
  color?: string
  emptyText?: string
}) {
  const max = Math.max(...items.map((i) => i.value), 1)
  if (items.length === 0)
    return <p className="py-6 text-center text-sm text-neutral-500">{emptyText}</p>
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={item.key} className="min-w-0">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 truncate text-ink">{item.label}</span>
            <span className="shrink-0 font-semibold text-ink tabular-nums">
              {formatValue(item.value, format)}
              {item.detail && (
                <span className="ml-1.5 font-normal text-neutral-500">{item.detail}</span>
              )}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <motion.div
              className="h-full rounded-full"
              style={{ background: item.color ?? color }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.8, ease: ease.out, delay: 0.1 + i * 0.06 }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

// ── Dona (parte de un todo, hasta 6 porciones) ─────────────────────────────

export function Donut({
  items,
  format,
  center,
  size = 180,
}: {
  items: { label: string; value: number; color?: string }[]
  format: NumberFormat
  center?: { value: string; label: string }
  size?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const total = items.reduce((s, i) => s + i.value, 0)
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const gap = items.length > 1 ? 2 : 0
  const lengths = items.map((item) => (total > 0 ? (item.value / total) * c : 0))
  const arcs = items.map((item, i) => ({
    ...item,
    color: item.color ?? SERIES[i % SERIES.length]!,
    dash: Math.max(lengths[i]! - gap, 0),
    offset: lengths.slice(0, i).reduce((s, l) => s + l, 0),
  }))
  const shown = hover !== null ? items[hover] : null
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="-rotate-90"
          role="img"
          aria-label={items.map((i) => `${i.label}: ${formatValue(i.value, format)}`).join(', ')}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--color-canvas)"
            strokeWidth={stroke}
          />
          {arcs.map((arc, i) => (
            <motion.circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={arc.color}
              strokeWidth={hover === i ? stroke + 4 : stroke}
              strokeDashoffset={-arc.offset}
              initial={{ strokeDasharray: `0 ${c}` }}
              animate={{ strokeDasharray: `${arc.dash} ${c}` }}
              transition={{ duration: 0.9, ease: ease.out, delay: 0.15 + i * 0.08 }}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              style={{ transition: 'stroke-width 150ms' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={shown?.label ?? 'total'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-lg font-semibold text-ink tabular-nums">
                {shown ? formatValue(shown.value, format) : center?.value}
              </p>
              <p className="max-w-24 truncate text-xs text-neutral-500">
                {shown ? shown.label : center?.label}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ul className="w-full min-w-0 space-y-2">
        {arcs.map((arc, i) => (
          <li
            key={arc.label}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-2 py-1 text-sm transition-colors',
              hover === i && 'bg-canvas',
            )}
            onPointerEnter={() => setHover(i)}
            onPointerLeave={() => setHover(null)}
          >
            <span
              className="size-2.5 shrink-0 rounded-[3px]"
              style={{ background: arc.color }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-ink">{arc.label}</span>
            <span className="shrink-0 font-semibold text-ink tabular-nums">
              {formatValue(arc.value, format)}
            </span>
            <span className="w-11 shrink-0 text-right text-xs text-neutral-500 tabular-nums">
              {total > 0 ? `${Math.round((arc.value / total) * 100)}%` : '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Embudo ─────────────────────────────────────────────────────────────────

export function Funnel({
  steps,
}: {
  steps: { label: string; count: number; ofTotal: number; ofPrevious: number }[]
}) {
  return (
    <ol className="space-y-3">
      {steps.map((step, i) => (
        <li key={step.label}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-ink">
              <span className="mr-2 inline-grid size-5 place-items-center rounded-full bg-canvas text-[11px] font-bold text-neutral-500">
                {i + 1}
              </span>
              {step.label}
            </span>
            <span className="shrink-0 tabular-nums">
              <span className="font-semibold text-ink">{formatValue(step.count, 'number')}</span>
              {i > 0 && (
                <span className="ml-2 text-xs text-neutral-500">
                  {formatValue(step.ofPrevious, 'percent')} del paso anterior
                </span>
              )}
            </span>
          </div>
          <div className="h-7 overflow-hidden rounded-lg bg-canvas">
            <motion.div
              className="flex h-full items-center justify-end rounded-lg bg-brand pr-2 text-[11px] font-bold text-white"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(step.ofTotal * 100, step.count > 0 ? 2 : 0)}%` }}
              transition={{ duration: 0.9, ease: ease.out, delay: 0.1 + i * 0.1 }}
              style={{ opacity: 1 - i * 0.12 }}
            >
              {step.ofTotal >= 0.12 && formatValue(step.ofTotal, 'percent')}
            </motion.div>
          </div>
        </li>
      ))}
    </ol>
  )
}

// ── Mapa de calor (día × hora) ─────────────────────────────────────────────

const HEAT = ['#fbe7ea', '#f8c6ce', '#f59aa8', '#f16e82', '#e0455c', '#b92c42']

export function Heatmap({
  matrix,
  rows,
  columns,
  format = 'number',
}: {
  matrix: number[][]
  rows: string[]
  columns: string[]
  format?: NumberFormat
}) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null)
  const max = Math.max(...matrix.flat(), 1)
  const step = (v: number) =>
    v === 0 ? -1 : Math.min(HEAT.length - 1, Math.floor((v / max) * HEAT.length))
  return (
    <div className="relative">
      <div className="overflow-x-auto pb-1">
        <table className="w-full min-w-[560px] border-separate" style={{ borderSpacing: 2 }}>
          <thead>
            <tr>
              <th className="w-10" />
              {columns.map((c, i) => (
                <th key={c} scope="col" className="text-[10px] font-medium text-neutral-400">
                  {i % 3 === 0 ? c : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, r) => (
              <tr key={rows[r]}>
                <th scope="row" className="pr-2 text-left text-xs font-medium text-neutral-500">
                  {rows[r]}
                </th>
                {row.map((v, c) => {
                  const s = step(v)
                  return (
                    <td key={c} className="p-0">
                      <motion.div
                        className="h-6 rounded-[5px]"
                        style={{ background: s < 0 ? 'var(--color-canvas)' : HEAT[s] }}
                        initial={{ opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: hover?.r === r && hover.c === c ? 1.15 : 1 }}
                        transition={{ duration: 0.3, delay: (r * 24 + c) * 0.002 }}
                        onPointerEnter={() => setHover({ r, c })}
                        onPointerLeave={() => setHover(null)}
                        title={`${rows[r]} ${columns[c]}: ${formatValue(v, format)}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-500">
        <span className="min-h-4">
          {hover && (
            <>
              <span className="font-semibold text-ink">
                {rows[hover.r]} {columns[hover.c]}
              </span>
              : {formatValue(matrix[hover.r]![hover.c]!, format)} ventas
            </>
          )}
        </span>
        <span className="flex items-center gap-1">
          Menos
          {HEAT.map((c) => (
            <span key={c} className="size-3 rounded-[3px]" style={{ background: c }} aria-hidden />
          ))}
          Más
        </span>
      </div>
    </div>
  )
}

// ── Línea mínima ───────────────────────────────────────────────────────────

export function Sparkline({ values, color = SERIES[0] }: { values: number[]; color?: string }) {
  const w = 96
  const h = 32
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const pts = values.map((v, i) => [
    (i / Math.max(values.length - 1, 1)) * w,
    h - 2 - ((v - min) / (max - min || 1)) * (h - 4),
  ])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x!.toFixed(1)},${y!.toFixed(1)}`).join('')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full overflow-visible">
      <motion.path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.55}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: ease.inOut, delay: 0.3 }}
      />
      <motion.circle
        cx={pts.at(-1)?.[0]}
        cy={pts.at(-1)?.[1]}
        r={3}
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ ...spring.bouncy, delay: 1.3 }}
      />
    </svg>
  )
}

// ── Gráfico ↔ tabla ────────────────────────────────────────────────────────

/**
 * Envuelve un gráfico con su vista de tabla (lo que un lector de pantalla o
 * quien quiera los números exactos necesita). El botón alterna las dos.
 */
export function WithTable({
  chart,
  columns,
  rows,
  caption,
}: {
  chart: ReactNode
  columns: string[]
  rows: (string | number)[][]
  caption: string
}) {
  const [table, setTable] = useState(false)
  const rowsMemo = useMemo(() => rows, [rows])
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setTable((t) => !t)}
        className="absolute -top-12 right-0 flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-neutral-500 transition-colors hover:bg-canvas hover:text-ink"
        aria-pressed={table}
      >
        {table ? (
          <ChartColumn className="size-3.5" aria-hidden />
        ) : (
          <Table2 className="size-3.5" aria-hidden />
        )}
        {table ? 'Ver gráfico' : 'Ver tabla'}
      </button>
      <AnimatePresence mode="wait" initial={false}>
        {table ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="max-h-72 overflow-auto rounded-xl border border-line"
          >
            <table className="w-full text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="sticky top-0 bg-canvas">
                <tr>
                  {columns.map((c) => (
                    <th
                      key={c}
                      scope="col"
                      className="px-3 py-2 text-left text-xs font-semibold text-neutral-500"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rowsMemo.map((row, i) => (
                  <tr key={i} className="border-t border-line">
                    {row.map((cell, j) => (
                      <td key={j} className={cn('px-3 py-1.5', j > 0 && 'tabular-nums')}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        ) : (
          <motion.div
            key="chart"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {chart}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
