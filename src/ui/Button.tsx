import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from './cn'

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-all outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-white shadow-[0_4px_15px_rgb(244_78_99/0.35)] hover:-translate-y-0.5 hover:bg-brand-dark',
        secondary: 'border border-mauve bg-paper text-ink hover:bg-white',
        outline: 'border-2 border-brand bg-transparent text-brand hover:bg-brand hover:text-white',
        dark: 'bg-ink text-white hover:bg-ink/90',
        ghost: 'text-ink hover:bg-brand/5 hover:text-brand',
        whatsapp: 'bg-[#25D366] text-white hover:bg-[#1ebe5a]',
        danger: 'bg-red-600 text-white hover:bg-red-700',
      },
      size: {
        sm: 'h-9 rounded-full px-4 text-sm',
        md: 'h-11 rounded-full px-6 text-base',
        lg: 'h-14 rounded-full px-8 text-lg',
        xl: 'h-16 rounded-full px-10 text-xl',
        icon: 'size-10 rounded-full',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }

export function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : 'button'
  return (
    <Component className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  )
}
