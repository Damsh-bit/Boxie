import type { ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { Stagger, StaggerItem } from '@/ui/motion'

/**
 * El encabezado de las páginas del sitio: etiqueta, título (con la palabra
 * destacada en `<Mark>`, como en la home) y bajada. Deja lugar para la barra
 * de navegación fija y entra escalonado al llegar.
 */
export function PageIntro({
  eyebrow,
  title,
  text,
  children,
  className,
  align = 'center',
}: {
  eyebrow?: ReactNode
  title: ReactNode
  text?: ReactNode
  /** Lo que va debajo de la bajada (un buscador, botones). */
  children?: ReactNode
  className?: string
  align?: 'center' | 'left'
}) {
  return (
    <header
      className={cn(
        'relative isolate px-5 pt-[118px] pb-10 sm:px-8 sm:pt-[140px] sm:pb-14',
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-10 left-1/2 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
      />
      <Stagger
        immediate
        step={0.08}
        className={cn(
          'mx-auto max-w-3xl',
          align === 'center' ? 'text-center' : 'text-center lg:max-w-6xl lg:text-left',
        )}
      >
        {eyebrow && (
          <StaggerItem
            as="span"
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.18em] text-brand uppercase"
          >
            {eyebrow}
          </StaggerItem>
        )}
        <StaggerItem
          as="h1"
          className="font-display text-[2.35rem] leading-[1.06] font-bold text-balance text-ink sm:text-5xl lg:text-6xl"
        >
          {title}
        </StaggerItem>
        {text && (
          <StaggerItem
            as="p"
            className={cn(
              'mt-4 text-lg leading-relaxed text-pretty text-ink/70 sm:text-xl',
              align === 'center' && 'mx-auto max-w-2xl',
            )}
          >
            {text}
          </StaggerItem>
        )}
        {children && <StaggerItem className="mt-7">{children}</StaggerItem>}
      </Stagger>
    </header>
  )
}
