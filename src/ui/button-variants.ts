import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Estilos de los botones. Viven aparte de `Button.tsx` (que es de cliente)
 * para que las páginas de servidor también los puedan usar.
 *
 * Las transiciones de CSS son solo de color y sombra: el movimiento (levantar,
 * hundirse al tocar) lo hace framer-motion con resortes. Si CSS también
 * transicionara `transform`, las dos animaciones se pisarían.
 */
export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[color,background-color,border-color,box-shadow,opacity] duration-200 outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand text-white shadow-[0_4px_15px_rgb(244_78_99/0.35)] hover:bg-brand-dark hover:shadow-[0_10px_28px_rgb(244_78_99/0.42)]',
        secondary: 'border border-mauve bg-paper text-ink hover:bg-white',
        outline: 'border-2 border-brand bg-transparent text-brand hover:bg-brand hover:text-white',
        dark: 'bg-ink text-white shadow-[0_4px_15px_rgb(42_36_51/0.25)] hover:bg-ink/90',
        ghost: 'text-ink hover:bg-brand/5 hover:text-brand',
        whatsapp:
          'bg-[#25D366] text-white shadow-[0_4px_15px_rgb(37_211_102/0.3)] hover:bg-[#1ebe5a]',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        white: 'bg-white text-ink shadow-[0_4px_15px_rgb(0_0_0/0.08)] hover:text-brand',
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

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
