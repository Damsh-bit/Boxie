'use client'

import { motion, useScroll, useSpring } from 'framer-motion'

/** Barrita arriba de todo que muestra cuánto falta leer (textos largos). */
export function ReadingProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 })
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[55] h-1 origin-left bg-[linear-gradient(90deg,#f44e63,#ff9a9e)]"
      style={{ scaleX }}
    />
  )
}
