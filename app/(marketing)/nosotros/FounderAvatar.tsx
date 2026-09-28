'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import type { Founder } from '@/content/about'
import { cn } from '@/ui/cn'
import { useCalm } from '@/ui/motion'

/** Las formas por las que pasa el avatar: una gota que respira. */
const BLOB = [
  '42% 58% 62% 38% / 44% 42% 58% 56%',
  '60% 40% 36% 64% / 56% 58% 42% 44%',
  '48% 52% 58% 42% / 38% 60% 40% 62%',
  '42% 58% 62% 38% / 44% 42% 58% 56%',
]

/**
 * La cara de cada fundador. Mientras no haya foto, sus iniciales sobre su
 * color, en una forma orgánica que cambia despacio (con "reducir movimiento"
 * se queda quieta). `still` la deja redonda (las pilas de avatares).
 */
export function FounderAvatar({
  founder,
  size,
  className,
  still = false,
}: {
  founder: Founder
  size: number
  className?: string
  still?: boolean
}) {
  const calm = useCalm()
  const moving = !still && !calm
  const background = `radial-gradient(circle at 30% 25%, color-mix(in srgb, ${founder.color} 55%, white) 0%, ${founder.color} 55%, color-mix(in srgb, ${founder.color} 70%, #2a2433) 100%)`

  return (
    <motion.div
      aria-hidden
      className={cn(
        'relative isolate grid shrink-0 place-items-center overflow-hidden',
        still && 'rounded-full',
        className,
      )}
      style={{
        width: size,
        height: size,
        background,
        borderRadius: still ? '9999px' : BLOB[0],
      }}
      animate={moving ? { borderRadius: BLOB } : undefined}
      transition={{ duration: 12, ease: 'easeInOut', repeat: Infinity }}
    >
      {founder.photo ? (
        <Image src={founder.photo} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span
          className="font-display font-bold text-white drop-shadow-[0_2px_6px_rgba(42,36,51,0.25)]"
          style={{ fontSize: Math.round(size * (still ? 0.3 : 0.36)), letterSpacing: '0.02em' }}
        >
          {founder.initials}
        </span>
      )}
    </motion.div>
  )
}
