'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { ease, spring } from '@/ui/motion'

/** El subrayado de "una experiencia.", que se dibuja de izquierda a derecha. */
export function DrawUnderline() {
  return (
    <motion.span
      aria-hidden
      className="absolute bottom-1 left-0 -z-10 h-2.5 w-full origin-left rounded bg-brand/20"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.9, ease: ease.inOut, delay: 0.6 }}
    />
  )
}

export function TeamPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <motion.div
      className="mx-auto mb-5 size-[200px] overflow-hidden rounded-full border-[3px] border-transparent shadow-[0_5px_15px_rgba(0,0,0,0.1)] transition-colors duration-300 hover:border-brand"
      whileHover={{ scale: 1.05, rotate: -2 }}
      transition={spring.bouncy}
    >
      <Image src={src} alt={alt} width={200} height={200} className="size-full object-cover" />
    </motion.div>
  )
}

/** Ícono de un valor: salta al pasar el mouse por la tarjeta. */
export function ValueIcon({ children }: { children: ReactNode }) {
  return (
    <motion.div
      className="mb-4 inline-block text-4xl"
      whileHover={{ scale: 1.25, rotate: -10 }}
      transition={spring.bouncy}
      aria-hidden
    >
      {children}
    </motion.div>
  )
}
