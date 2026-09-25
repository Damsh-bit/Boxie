'use client'

import { motion, type TargetAndTransition } from 'framer-motion'
import {
  Earth,
  Heart,
  LockKeyhole,
  PencilLine,
  Smartphone,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/ui/cn'
import { Float, Stagger, StaggerItem, spring } from '@/ui/motion'
import { Mark, SectionHeading } from './primitives'

interface Benefit {
  icon: LucideIcon
  title: string
  text: string
  /** Cómo se mueve el ícono cuando la tarjeta está en hover. */
  wiggle: TargetAndTransition
  className?: string
  decoration?: string
}

const BENEFITS: Benefit[] = [
  {
    icon: Zap,
    title: 'Llega al instante',
    text: 'Sin envíos ni esperas: la personalizás y en minutos se la mandás por WhatsApp o mail. El regalo de último momento que no parece de último momento.',
    wiggle: { rotate: [0, -18, 14, -8, 0], scale: 1.15 },
    className: 'md:col-span-2 bg-brand text-white',
    decoration: '/brand/decoration-1.png',
  },
  {
    icon: Smartphone,
    title: 'Sin apps ni cuentas',
    text: 'Se abre desde el celular con un toque. Ni vos ni quien la recibe tienen que instalar nada.',
    wiggle: { x: [0, -3, 3, -3, 3, 0], rotate: [0, -6, 6, 0] },
  },
  {
    icon: Earth,
    title: 'Regalo a distancia',
    text: 'Otra ciudad, otro país: la Boxie llega igual. Ideal para amores y amistades a distancia.',
    wiggle: { rotate: 360, transition: { duration: 0.9, ease: 'easeInOut' } },
  },
  {
    icon: PencilLine,
    title: 'Editás hasta el final',
    text: 'Cambiá textos, fotos y canciones todas las veces que quieras hasta bloquearla para regalar.',
    wiggle: { x: [0, 4, -2, 5, 0], y: [0, -3, 2, -2, 0], rotate: [0, -12, 6, 0] },
  },
  {
    icon: LockKeyhole,
    title: 'Privada y segura',
    text: 'Link único imposible de adivinar y clave opcional: solo la abre quien vos quieras.',
    wiggle: { y: [0, -5, 0, -2, 0] },
  },
  {
    icon: Heart,
    title: 'Emociona de verdad',
    text: 'No es un archivo más: cada Boxie está pensada para despertar sonrisas, lágrimas lindas y ese «ay, qué hermoso».',
    wiggle: { scale: [1, 1.3, 1, 1.2, 1] },
    className: 'md:col-span-3 bg-ink text-white',
    decoration: '/brand/decoration-2.png',
  },
]

/** Por qué una Boxie: grilla tipo bento. Cada ícono tiene su gesto propio al pasar el mouse. */
export function WhyBoxie() {
  return (
    <section
      id="por-que"
      aria-labelledby="por-que-title"
      className="relative px-5 py-20 sm:px-8 sm:py-24"
    >
      <SectionHeading
        eyebrow="Regalá diferente, regalá con intención"
        title={
          <span id="por-que-title">
            Por qué una Boxie es el <Mark>regalo perfecto</Mark>
          </span>
        }
        text="Un regalo personalizado que no depende del correo, del stock ni de la distancia. Y que queda en su memoria (y en su celular)."
      />

      <Stagger className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-3" step={0.08}>
        {BENEFITS.map((b) => {
          const Icon = b.icon
          const colored = Boolean(b.className)
          return (
            <StaggerItem
              key={b.title}
              y={36}
              className={cn(
                'group relative flex min-h-[220px] flex-col overflow-hidden rounded-[28px] p-7 sm:p-8',
                b.className ?? 'bg-white text-ink ring-1 ring-black/5',
              )}
            >
              <motion.div
                className="relative z-10 flex h-full flex-col"
                initial="rest"
                animate="rest"
                whileHover="hover"
                whileTap="hover"
              >
                <motion.span
                  className={cn(
                    'grid size-14 place-items-center rounded-2xl',
                    colored ? 'bg-white/15 text-white' : 'bg-brand-soft text-brand',
                  )}
                  variants={{ rest: { rotate: 0, scale: 1, x: 0, y: 0 }, hover: b.wiggle }}
                  transition={{ duration: 0.6 }}
                >
                  <Icon className="size-7" aria-hidden />
                </motion.span>
                <h3 className="mt-6 font-display text-2xl leading-tight font-bold sm:text-[1.7rem]">
                  {b.title}
                </h3>
                <p
                  className={cn(
                    'mt-2 max-w-xl text-base leading-relaxed',
                    colored ? 'text-white/80' : 'text-ink/70',
                  )}
                >
                  {b.text}
                </p>
                <motion.span
                  aria-hidden
                  className={cn(
                    'absolute right-0 -bottom-4 h-1 w-full origin-left rounded-full',
                    colored ? 'bg-white/30' : 'bg-brand',
                  )}
                  variants={{ rest: { scaleX: 0 }, hover: { scaleX: 1 } }}
                  transition={spring.soft}
                />
              </motion.div>

              {b.decoration && (
                <Float
                  aria-hidden
                  className="pointer-events-none absolute right-4 bottom-4 hidden w-[150px] opacity-25 md:block"
                  distance={8}
                  rotate={4}
                  duration={6}
                >
                  <Image
                    src={b.decoration}
                    alt=""
                    width={150}
                    height={100}
                    className="h-auto w-full brightness-0 invert"
                  />
                </Float>
              )}
            </StaggerItem>
          )
        })}
      </Stagger>
    </section>
  )
}
