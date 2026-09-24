'use client'

import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { useState, type KeyboardEvent } from 'react'
import { cn } from '@/ui/cn'
import { spring } from '@/ui/motion'

const SWIPE = 60

/**
 * Fotos de la temática. Se pasan con las flechas, los puntos, el teclado o
 * deslizando con el dedo; cada foto entra desde el lado hacia el que se fue.
 */
export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [[index, direction], setPage] = useState<[number, number]>([0, 0])
  const count = images.length
  const go = (delta: number) => setPage(([i]) => [(i + delta + count) % count, delta])
  const jump = (i: number) => setPage(([current]) => [i, i > current ? 1 : -1])

  const onDragEnd = (_: unknown, { offset, velocity }: PanInfo) => {
    if (offset.x < -SWIPE || velocity.x < -500) go(1)
    else if (offset.x > SWIPE || velocity.x > 500) go(-1)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') go(1)
    else if (e.key === 'ArrowLeft') go(-1)
  }

  return (
    <div
      className="group relative h-[350px] w-full overflow-hidden bg-neutral-100 focus-visible:outline-offset-[-3px] sm:h-[420px] lg:h-auto lg:min-h-[520px] lg:w-1/2"
      role="region"
      aria-roledescription="carrusel"
      aria-label={`Fotos de ${alt}`}
      tabIndex={count > 1 ? 0 : undefined}
      onKeyDown={count > 1 ? onKeyDown : undefined}
    >
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
          custom={direction}
          variants={{
            enter: (d: number) => ({ x: d > 0 ? '100%' : '-100%', scale: 1, zIndex: 1 }),
            center: { x: '0%', scale: 1, opacity: 1, zIndex: 1 },
            exit: (d: number) => ({
              x: d > 0 ? '-35%' : '35%',
              scale: 0.94,
              opacity: 0.4,
              zIndex: 0,
            }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: spring.gentle, scale: spring.gentle, opacity: { duration: 0.4 } }}
          drag={count > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.6}
          onDragEnd={onDragEnd}
        >
          <Image
            src={images[index]!}
            alt={`${alt} · foto ${index + 1} de ${count}`}
            fill
            priority={index === 0}
            draggable={false}
            sizes="(max-width: 1024px) 100vw, 450px"
            className="pointer-events-none object-cover select-none"
          />
        </motion.div>
      </AnimatePresence>

      {count > 1 && (
        <>
          <ArrowButton side="left" onClick={() => go(-1)} />
          <ArrowButton side="right" onClick={() => go(1)} />
          <div className="absolute bottom-5 left-0 z-10 flex w-full justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index ? 'true' : undefined}
                onClick={() => jump(i)}
                className="grid h-5 place-items-center"
              >
                <motion.span
                  className="block h-2 rounded-full shadow-sm"
                  initial={false}
                  animate={{
                    width: i === index ? 22 : 8,
                    backgroundColor: i === index ? '#ffffff' : 'rgba(255, 255, 255, 0.6)',
                  }}
                  transition={spring.snappy}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ArrowButton({ side, onClick }: { side: 'left' | 'right'; onClick(): void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Foto anterior' : 'Foto siguiente'}
      className={cn(
        'absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink shadow-lg backdrop-blur transition-[background-color,color,opacity] duration-300 hover:bg-white hover:text-brand lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100',
        side === 'left' ? 'left-4' : 'right-4',
      )}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={spring.snappy}
    >
      <Icon className="size-5" aria-hidden />
    </motion.button>
  )
}
