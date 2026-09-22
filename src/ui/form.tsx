import type { ComponentProps, ReactNode } from 'react'
import { cn } from './cn'

const control =
  'w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-base text-ink outline-none transition placeholder:text-neutral-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand/10 disabled:opacity-60 aria-[invalid=true]:border-red-400'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, className)} {...props} />
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 resize-y', className)} {...props} />
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(control, 'appearance-none bg-[length:12px] pr-10', className)}
      {...props}
    />
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
      {hint && !error && <p className="mt-1.5 text-xs text-neutral-500">{hint}</p>}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
