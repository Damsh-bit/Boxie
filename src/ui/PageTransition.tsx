'use client'

import { motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { ease } from './motion'

// La primera carga no se anima: el HTML del servidor tiene que verse apenas
// llega (sin esperar a que cargue JavaScript). Solo las navegaciones internas
// entran con un fundido.
let navigated = false

/** Entrada suave de cada página al navegar dentro del sitio (va en un template.tsx). */
export function PageTransition({ children }: { children: ReactNode }) {
  const [animateIn] = useState(() => navigated)
  useEffect(() => {
    navigated = true
  }, [])
  return (
    <motion.div
      initial={animateIn ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: ease.out }}
    >
      {children}
    </motion.div>
  )
}
