'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { Database, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'

/**
 * Piezas básicas del panel: tarjetas, encabezados, insignias y estados
 * vacíos. Mismo lenguaje que el sitio (bordes muy redondeados, coral de
 * marca, Josefin en los títulos) con la densidad que pide una herramienta.
 */

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  children,
}: {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
      <motion.div
        className="min-w-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: ease.out }}
      >
        {eyebrow && (
          <p className="mb-1.5 text-xs font-bold tracking-[0.14em] text-brand uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-[28px] leading-tight font-bold text-ink sm:text-[34px]">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-[15px] break-words text-neutral-600">{description}</p>
        )}
        {children}
      </motion.div>
      {actions && (
        <motion.div
          className="flex flex-wrap items-center gap-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: ease.out, delay: 0.08 }}
        >
          {actions}
        </motion.div>
      )}
    </div>
  )
}

interface CardProps extends HTMLMotionProps<'section'> {
  /** Retraso de la entrada (segundos), para escalonar un tablero. */
  delay?: number
  padded?: boolean
}

export function Card({ className, delay = 0, padded = true, children, ...props }: CardProps) {
  return (
    <motion.section
      className={cn(
        'rounded-[22px] border border-line bg-white shadow-[0_1px_2px_rgba(42,36,51,0.04),0_8px_24px_rgba(42,36,51,0.04)]',
        padded && 'p-5 sm:p-6',
        className,
      )}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: ease.out, delay }}
      {...props}
    >
      {children}
    </motion.section>
  )
}

export function CardHeader({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** Un ícono ya dibujado (<Wallet />): los Server Components no pasan componentes. */
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand [&_svg]:size-[18px]">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm break-words text-neutral-500">{description}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export type Tone =
  'neutral' | 'brand' | 'good' | 'warning' | 'critical' | 'info' | 'violet' | 'dark'

const TONES: Record<Tone, string> = {
  neutral: 'bg-neutral-100 text-neutral-700',
  brand: 'bg-brand-soft text-brand-dark',
  good: 'bg-[#e7f6e7] text-good-ink',
  warning: 'bg-[#fff4d6] text-[#7a5800]',
  critical: 'bg-[#fdeaea] text-[#a52a2a]',
  info: 'bg-[#e6f0fb] text-[#1f5ea8]',
  violet: 'bg-[#f1ebfb] text-[#5b3a9e]',
  dark: 'bg-ink text-white',
}

const DOTS: Record<Tone, string> = {
  neutral: 'bg-neutral-400',
  brand: 'bg-brand',
  good: 'bg-good',
  warning: 'bg-warning',
  critical: 'bg-critical',
  info: 'bg-series-2',
  violet: 'bg-series-5',
  dark: 'bg-white',
}

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
  className,
}: {
  tone?: Tone
  dot?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOTS[tone])} aria-hidden />}
      {children}
    </span>
  )
}

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <motion.span
        className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand [&_svg]:size-6"
        initial={{ scale: 0.6, rotate: -12, opacity: 0 }}
        animate={{ scale: 1, rotate: 0, opacity: 1 }}
        transition={spring.bouncy}
      >
        {icon ?? <Inbox className="size-6" aria-hidden />}
      </motion.span>
      <p className="font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-neutral-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/**
 * Marca lo que en producción depende de la base (Supabase) y hoy corre sobre
 * los datos de demostración. `what` dice qué tabla o función lo respalda.
 */
export function NeedsDb({ what, className }: { what: string; className?: string }) {
  return (
    <span
      className={cn(
        'group relative inline-flex items-center gap-1 rounded-full border border-dashed border-[#c9a100]/60 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-[#7a5800]',
        className,
      )}
      title={`Necesita la base de datos: ${what}. Hoy usa datos de demostración.`}
    >
      <Database className="size-3" aria-hidden />
      Base de datos
      <span className="sr-only">: {what}. Hoy usa datos de demostración.</span>
    </span>
  )
}

export function KeyValue({
  items,
  className,
}: {
  items: { label: ReactNode; value: ReactNode }[]
  className?: string
}) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-3 sm:grid-cols-2', className)}>
      {items.map((item, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
            {item.label}
          </dt>
          <dd className="mt-0.5 text-[15px] break-words text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Barra de progreso animada (meta del mes, uso de un cupón, módulos completos). */
export function Progress({
  value,
  tone = 'brand',
  className,
  label,
}: {
  /** 0 a 1 (se recorta). */
  value: number
  tone?: 'brand' | 'good' | 'warning' | 'critical' | 'info'
  className?: string
  label?: string
}) {
  const color = {
    brand: 'bg-brand',
    good: 'bg-good',
    warning: 'bg-warning',
    critical: 'bg-critical',
    info: 'bg-series-2',
  }[tone]
  const track = {
    brand: 'bg-brand-soft',
    good: 'bg-[#e7f6e7]',
    warning: 'bg-[#fff4d6]',
    critical: 'bg-[#fdeaea]',
    info: 'bg-[#e6f0fb]',
  }[tone]
  const pct = Math.max(0, Math.min(value, 1)) * 100
  return (
    <div
      className={cn('h-2 overflow-hidden rounded-full', track, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
    >
      <motion.div
        className={cn('h-full rounded-full', color)}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, ease: ease.out, delay: 0.15 }}
      />
    </div>
  )
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn('mb-3 text-sm font-bold tracking-wide text-neutral-500 uppercase', className)}
    >
      {children}
    </h2>
  )
}
