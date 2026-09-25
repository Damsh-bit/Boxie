'use client'

import { motion } from 'framer-motion'
import { Gift, Home, LifeBuoy } from 'lucide-react'
import { ButtonLink } from './Button'
import { Float, spring, useCalm } from './motion'
import { SupportButton } from './SupportButton'

/**
 * "No encontramos esa página": una caja de regalo vacía que se sacude, y las
 * salidas más útiles (inicio, galería y avisar del link roto).
 */
export function NotFoundContent() {
  const calm = useCalm()
  return (
    <div className="relative isolate flex min-h-[70dvh] flex-col items-center justify-center px-5 pt-[120px] pb-20 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute top-24 left-1/2 -z-10 size-[26rem] -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
      />
      <Float distance={10} duration={6}>
        <motion.div
          className="relative mb-6 text-[7rem] leading-none select-none sm:text-[9rem]"
          aria-hidden
          initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
          animate={
            calm
              ? { scale: 1, rotate: 0, opacity: 1 }
              : { scale: 1, rotate: [0, -8, 8, -4, 0], opacity: 1 }
          }
          transition={{ ...spring.bouncy, rotate: { duration: 0.9, delay: 0.5 } }}
        >
          🎁
        </motion.div>
      </Float>
      <motion.p
        className="font-display text-sm font-bold tracking-[0.3em] text-brand uppercase"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Error 404
      </motion.p>
      <motion.h1
        className="mt-3 max-w-xl font-display text-4xl leading-tight font-bold text-balance text-ink sm:text-5xl"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Esta sorpresa no está acá
      </motion.h1>
      <motion.p
        className="mt-4 max-w-md text-lg text-ink/65"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        La página que buscás no existe o cambió de lugar. Si llegaste desde un link de regalo,
        revisá que esté completo.
      </motion.p>
      <motion.div
        className="mt-8 flex w-full max-w-md flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <ButtonLink href="/" size="lg">
          <Home className="size-5" aria-hidden /> Ir al inicio
        </ButtonLink>
        <ButtonLink href="/galeria" variant="white" size="lg">
          <Gift className="size-5 text-brand" aria-hidden /> Ver las Boxies
        </ButtonLink>
        <SupportButton
          variant="ghost"
          size="lg"
          detail={{ topic: 'error', message: 'Encontré un link que no funciona.' }}
        >
          <LifeBuoy className="size-5" aria-hidden /> Avisar del link roto
        </SupportButton>
      </motion.div>
    </div>
  )
}
