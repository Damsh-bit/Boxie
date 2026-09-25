'use client'

import { motion } from 'framer-motion'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { ease } from '@/ui/motion'

/**
 * Fila de tabla que lleva al detalle: se puede tocar entera, con Enter desde
 * el teclado y abrir en otra pestaña con Ctrl/⌘ + clic.
 */
export function RowLink({
  href,
  index = 0,
  children,
}: {
  href: string
  index?: number
  children: ReactNode
}) {
  const router = useRouter()
  const open = (newTab: boolean) => {
    if (newTab) window.open(href, '_blank')
    else router.push(href as Route)
  }
  return (
    <motion.tr
      role="link"
      tabIndex={0}
      onClick={(e) => open(e.metaKey || e.ctrlKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open(e.metaKey || e.ctrlKey)
      }}
      onMouseEnter={() => router.prefetch(href as Route)}
      className="cursor-pointer border-b border-line transition-colors outline-none last:border-0 hover:bg-canvas/70 focus-visible:bg-brand-soft/50"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: ease.out, delay: Math.min(index * 0.02, 0.3) }}
    >
      {children}
    </motion.tr>
  )
}
