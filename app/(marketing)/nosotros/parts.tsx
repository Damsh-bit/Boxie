'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { spring } from '@/ui/motion'

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
