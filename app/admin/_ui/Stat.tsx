'use client'

import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { formatDelta } from '@/domain/admin/format'
import { cn } from '@/ui/cn'
import { ease } from '@/ui/motion'
import { Sparkline } from './charts'
import { formatValue, type NumberFormat } from './format-value'

export { formatValue, type NumberFormat }

/** Un número que cuenta hasta su valor al aparecer en pantalla. */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number
  format: NumberFormat
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const motionValue = useMotionValue(0)
  const text = useTransform(motionValue, (v) => formatValue(v, format))
  useEffect(() => {
    if (!inView) return
    const controls = animate(motionValue, value, { duration: 1.1, ease: ease.out })
    return () => controls.stop()
  }, [inView, motionValue, value])
  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  )
}

/**
 * Tarjeta de un indicador: rótulo, valor (cuenta hasta llegar), variación
 * contra el período anterior (verde si mejora, que no siempre es "sube") y,
 * opcional, una línea con la tendencia.
 */
export function Stat({
  label,
  value,
  format = 'number',
  delta,
  goodWhenUp = true,
  hint,
  trend,
  icon,
  className,
  delay = 0,
  compareLabel = 'vs. período anterior',
}: {
  label: string
  value: number
  format?: NumberFormat
  delta?: number | null
  goodWhenUp?: boolean
  hint?: string
  trend?: number[]
  /** Ícono ya dibujado (<Wallet />). */
  icon?: ReactNode
  className?: string
  delay?: number
  compareLabel?: string
}) {
  const direction = delta === undefined || delta === null ? 0 : Math.sign(Math.round(delta * 100))
  const good = direction === 0 ? null : direction > 0 === goodWhenUp
  const Arrow = direction > 0 ? ArrowUpRight : direction < 0 ? ArrowDownRight : Minus
  return (
    <motion.div
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-line bg-white p-5 shadow-[0_1px_2px_rgba(42,36,51,0.04),0_8px_24px_rgba(42,36,51,0.04)]',
        className,
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: ease.out, delay }}
      whileHover={{
        y: -3,
        boxShadow: '0 1px 2px rgba(42,36,51,0.04), 0 16px 40px rgba(42,36,51,0.08)',
      }}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-canvas text-neutral-500 [&_svg]:size-4">
            {icon}
          </span>
        )}
        <p className="text-sm font-medium text-neutral-600">{label}</p>
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-tight text-ink">
        <CountUp value={value} format={format} />
      </p>
      <div className="mt-3 flex min-h-5 items-center gap-2 text-xs">
        {delta !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
              good === null && 'bg-neutral-100 text-neutral-600',
              good === true && 'bg-[#e7f6e7] text-good-ink',
              good === false && 'bg-[#fdeaea] text-[#a52a2a]',
            )}
          >
            <Arrow className="size-3.5" aria-hidden />
            {formatDelta(delta)}
          </span>
        )}
        <span className="truncate text-neutral-500">
          {hint ?? (delta !== undefined ? compareLabel : '')}
        </span>
      </div>
      {trend && trend.length > 1 && (
        <div className="pointer-events-none absolute right-4 bottom-12 w-24 opacity-90" aria-hidden>
          <Sparkline values={trend} />
        </div>
      )}
    </motion.div>
  )
}
