'use client'

import { AnimatePresence, motion, useDragControls, type PanInfo } from 'framer-motion'
import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useSyncExternalStore, type ReactNode } from 'react'
import { cn } from './cn'
import { spring } from './motion'

const DESKTOP = '(min-width: 640px)'

function subscribe(callback: () => void) {
  const query = window.matchMedia(DESKTOP)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

/** true en pantallas de 640 px o más (en el servidor, false). */
export function useIsDesktop() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  )
}

interface ModalProps {
  open: boolean
  onOpenChange(open: boolean): void
  /** Mientras está ocupado no se puede cerrar (ni con Escape ni tocando afuera). */
  locked?: boolean
  title: ReactNode
  description?: ReactNode
  /** Ícono o emoji arriba del título. */
  icon?: ReactNode
  children?: ReactNode
  className?: string
}

/**
 * Diálogo de la casa: en escritorio aparece en el centro; en el celular sube
 * desde abajo como una hoja que se cierra arrastrándola hacia abajo. Entra y
 * sale animado (Radix se encarga del foco y de Escape).
 */
export function Modal({
  open,
  onOpenChange,
  locked = false,
  title,
  description,
  icon,
  children,
  className,
}: ModalProps) {
  const desktop = useIsDesktop()
  const drag = useDragControls()

  const onDragEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    if (!locked && (offset.y > 120 || velocity.y > 600)) onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={locked ? undefined : onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[100] bg-ink/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed z-[101] flex max-h-[92dvh] flex-col overflow-hidden bg-white shadow-2xl outline-none',
                  desktop
                    ? 'top-1/2 left-1/2 w-[calc(100%-24px)] max-w-lg rounded-3xl'
                    : 'inset-x-0 bottom-0 rounded-t-[28px]',
                  className,
                )}
                style={desktop ? { x: '-50%', y: '-50%' } : undefined}
                initial={desktop ? { opacity: 0, scale: 0.94 } : { y: '100%' }}
                animate={desktop ? { opacity: 1, scale: 1 } : { y: 0 }}
                exit={
                  desktop
                    ? { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
                    : { y: '100%', transition: { duration: 0.25, ease: [0.55, 0, 1, 0.45] } }
                }
                transition={desktop ? spring.soft : spring.gentle}
                drag={desktop ? false : 'y'}
                dragListener={false}
                dragControls={drag}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={onDragEnd}
              >
                {!desktop && (
                  <div
                    className="flex shrink-0 cursor-grab touch-none justify-center pt-3 pb-1 active:cursor-grabbing"
                    onPointerDown={(e) => drag.start(e)}
                    aria-hidden
                  >
                    <span className="h-1.5 w-10 rounded-full bg-neutral-300" />
                  </div>
                )}
                <Dialog.Close
                  className="absolute top-4 right-4 z-10 grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-ink disabled:opacity-40"
                  aria-label="Cerrar"
                  disabled={locked}
                >
                  <X className="size-5" aria-hidden />
                </Dialog.Close>
                <div
                  className="overflow-y-auto overscroll-contain px-6 pt-4 pb-6 sm:p-8"
                  style={{
                    paddingBottom: desktop ? undefined : 'max(24px, env(safe-area-inset-bottom))',
                  }}
                >
                  {icon && (
                    <motion.div
                      className="mb-2 text-center text-4xl"
                      aria-hidden
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ ...spring.bouncy, delay: 0.12 }}
                    >
                      {icon}
                    </motion.div>
                  )}
                  <Dialog.Title className="text-center font-display text-2xl font-bold text-ink">
                    {title}
                  </Dialog.Title>
                  {description ? (
                    <Dialog.Description className="mt-2 text-center text-sm text-neutral-600">
                      {description}
                    </Dialog.Description>
                  ) : (
                    <Dialog.Description className="sr-only">{title}</Dialog.Description>
                  )}
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
