'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Ellipsis } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'

export interface MenuItem {
  label: string
  icon?: ReactNode
  onSelect(): void
  danger?: boolean
  disabled?: boolean
}

/** Menú de "más acciones" (⋯) de una fila o una tarjeta. */
export function Menu({
  items,
  label = 'Más acciones',
  trigger,
  align = 'end',
}: {
  items: (MenuItem | 'separator')[]
  label?: string
  trigger?: ReactNode
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenu.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            className="grid size-9 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-canvas hover:text-ink data-[state=open]:bg-canvas data-[state=open]:text-ink"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
          >
            <Ellipsis className="size-5" aria-hidden />
          </button>
        )}
      </DropdownMenu.Trigger>
      <AnimatePresence>
        {open && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content asChild align={align} sideOffset={6} forceMount>
              <motion.div
                className="z-[120] min-w-52 rounded-2xl border border-line bg-white p-1.5 shadow-[0_18px_50px_rgba(42,36,51,0.16)] outline-none"
                initial={{ opacity: 0, scale: 0.94, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1 } }}
                transition={spring.snappy}
                style={{ transformOrigin: 'var(--radix-dropdown-menu-content-transform-origin)' }}
                onClick={(e) => e.stopPropagation()}
              >
                {items.map((item, i) =>
                  item === 'separator' ? (
                    <DropdownMenu.Separator key={i} className="my-1 h-px bg-line" />
                  ) : (
                    <DropdownMenu.Item
                      key={item.label}
                      disabled={item.disabled}
                      onSelect={item.onSelect}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40 [&_svg]:size-4',
                        item.danger
                          ? 'text-critical data-[highlighted]:bg-[#fdeaea]'
                          : 'text-ink data-[highlighted]:bg-canvas',
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </DropdownMenu.Item>
                  ),
                )}
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  )
}
