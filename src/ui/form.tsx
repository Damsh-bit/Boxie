'use client'

import { AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'
import { ease, Notice } from './motion'

const control =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-ink outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 disabled:opacity-60 aria-[invalid=true]:border-red-400 aria-[invalid=true]:focus:ring-red-100'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 resize-y', className)} {...props} />
}

/** Select nativo (el mejor en el celular) con su flechita, que el navegador ya no dibuja. */
export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        className={cn(control, 'cursor-pointer appearance-none pr-11', className)}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-neutral-500"
        aria-hidden
      />
    </div>
  )
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return (
    <label
      className={cn(
        'mb-2 block text-xs font-bold tracking-wide text-neutral-500 uppercase',
        className,
      )}
      {...props}
    />
  )
}

/** Mensaje bajo un campo (ayuda o error) que aparece y se va deslizando. */
export function FieldMessage({
  id,
  error,
  hint,
  className,
}: {
  id?: string
  error?: ReactNode
  hint?: ReactNode
  className?: string
}) {
  const message = error || hint
  return (
    <AnimatePresence initial={false} mode="wait">
      {message && (
        <Notice.p
          key={error ? 'error' : 'hint'}
          id={id}
          role={error ? 'alert' : undefined}
          className={cn(
            'mt-1.5 text-xs',
            error ? 'font-medium text-red-600' : 'text-neutral-500',
            className,
          )}
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -4, height: 0 }}
          transition={{ duration: 0.22, ease: ease.out }}
        >
          {message}
        </Notice.p>
      )}
    </AnimatePresence>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-1 text-brand">*</span>}
      </Label>
      {children}
      <FieldMessage error={error} hint={hint} />
    </div>
  )
}
