'use client'

import { motion } from 'framer-motion'
import {
  CircleAlert,
  CreditCard,
  Gift,
  Lock,
  Mail,
  MailOpen,
  PenLine,
  ShoppingCart,
  Sparkles,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { formatDateTime, formatRelative } from '@/domain/admin/format'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'

export type TimelineIcon =
  'cart' | 'card' | 'gift' | 'mail' | 'edit' | 'lock' | 'open' | 'refund' | 'alert' | 'spark'

const ICONS: Record<TimelineIcon, LucideIcon> = {
  cart: ShoppingCart,
  card: CreditCard,
  gift: Gift,
  mail: Mail,
  edit: PenLine,
  lock: Lock,
  open: MailOpen,
  refund: Undo2,
  alert: CircleAlert,
  spark: Sparkles,
}

const TONES = {
  neutral: 'bg-canvas text-neutral-500',
  brand: 'bg-brand text-white',
  good: 'bg-[#e7f6e7] text-good-ink',
  warning: 'bg-[#fff4d6] text-[#8a6300]',
  critical: 'bg-[#fdeaea] text-critical',
  violet: 'bg-[#f1ebfb] text-series-5',
}

export interface TimelineItem {
  at: string
  title: string
  detail?: string
  icon: TimelineIcon
  tone: keyof typeof TONES
}

/** Línea de tiempo vertical (de la compra al regalo abierto). */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative">
      <motion.span
        className="absolute top-3 bottom-3 left-[17px] w-px origin-top bg-line"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.8, ease: ease.out }}
        aria-hidden
      />
      {items.map((item, i) => {
        const Icon = ICONS[item.icon]
        return (
          <motion.li
            key={`${item.at}-${item.title}`}
            className="relative flex gap-4 pb-5 last:pb-0"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: ease.out, delay: 0.1 + i * 0.07 }}
          >
            <motion.span
              className={cn(
                'relative z-10 grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-white',
                TONES[item.tone],
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ ...spring.bouncy, delay: 0.15 + i * 0.07 }}
            >
              <Icon className="size-4" aria-hidden />
            </motion.span>
            <div className="min-w-0 pt-1">
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              {item.detail && <p className="text-sm text-neutral-600">{item.detail}</p>}
              <p className="mt-0.5 text-xs text-neutral-500">
                <time dateTime={item.at}>{formatDateTime(item.at)}</time> ·{' '}
                {formatRelative(item.at)}
              </p>
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
