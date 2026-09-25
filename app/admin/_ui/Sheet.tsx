'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'

/**
 * Panel lateral para crear y editar (un cupón, un plan, un gasto) sin salir
 * de la lista. Entra desde la derecha; en el celular ocupa toda la pantalla.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  locked = false,
  wide = false,
}: {
  open: boolean
  onOpenChange(open: boolean): void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  /** Botones fijos abajo (Guardar, Cancelar). */
  footer?: ReactNode
  /** Mientras guarda no se cierra. */
  locked?: boolean
  wide?: boolean
}) {
  return (
    <Dialog.Root open={open} onOpenChange={locked ? undefined : onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                className={cn(
                  'fixed inset-y-0 right-0 z-[101] flex w-full flex-col bg-white shadow-[-20px_0_60px_rgba(42,36,51,0.18)] outline-none sm:rounded-l-[28px]',
                  wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
                )}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%', transition: { duration: 0.25, ease: ease.in } }}
                transition={spring.gentle}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                  <div className="min-w-0">
                    <Dialog.Title className="font-display text-2xl font-bold text-ink">
                      {title}
                    </Dialog.Title>
                    {description ? (
                      <Dialog.Description className="mt-1 text-sm text-neutral-500">
                        {description}
                      </Dialog.Description>
                    ) : (
                      <Dialog.Description className="sr-only">{title}</Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className="-mr-2 grid size-10 shrink-0 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-ink disabled:opacity-40"
                    aria-label="Cerrar"
                    disabled={locked}
                  >
                    <X className="size-5" aria-hidden />
                  </Dialog.Close>
                </div>
                <motion.div
                  className="flex-1 overflow-y-auto px-6 py-6"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: ease.out, delay: 0.1 }}
                >
                  {children}
                </motion.div>
                {footer && (
                  <div className="flex items-center justify-end gap-2 border-t border-line bg-white px-6 py-4">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
