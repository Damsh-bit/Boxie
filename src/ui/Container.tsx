import type { ComponentProps } from 'react'
import { cn } from './cn'

export function Container({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('mx-auto w-full max-w-6xl px-5 sm:px-8', className)} {...props} />
}

export function SectionTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('font-display text-3xl font-bold text-ink sm:text-4xl', className)}
      {...props}
    />
  )
}

export function Eyebrow({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn('text-xs font-extrabold tracking-[0.2em] text-brand uppercase', className)}
      {...props}
    />
  )
}
