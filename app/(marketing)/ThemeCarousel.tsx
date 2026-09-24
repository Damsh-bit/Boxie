'use client'

import { motion, useMotionValueEvent, useScroll } from 'framer-motion'
import { useRef, useState } from 'react'
import type { CatalogTheme } from '@/domain/catalog'
import { ease, spring } from '@/ui/motion'
import { ThemeCard } from '@/ui/ThemeCard'

/**
 * Las temáticas de la home. En el celular es un carrusel con imán y puntitos
 * que dicen cuántas hay y en cuál estás; en escritorio, una fila centrada.
 */
export function ThemeCarousel({ themes }: { themes: CatalogTheme[] }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const { scrollXProgress } = useScroll({ container: scroller })

  useMotionValueEvent(scrollXProgress, 'change', (p) => {
    setActive(Math.round(p * Math.max(themes.length - 1, 0)))
  })

  const goTo = (i: number) => {
    const el = scroller.current
    const card = el?.children[i] as HTMLElement | undefined
    if (!el || !card) return
    el.scrollTo({
      left: card.offsetLeft - (el.clientWidth - card.clientWidth) / 2,
      behavior: 'smooth',
    })
  }

  return (
    <>
      <motion.div
        ref={scroller}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto px-6 pt-2 pb-8 md:justify-center [&::-webkit-scrollbar]:hidden"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.25 }}
        variants={{ show: { transition: { staggerChildren: 0.12 } } }}
      >
        {themes.map((theme, i) => (
          <motion.div
            key={theme.id}
            data-reveal=""
            className="shrink-0 snap-center"
            variants={{
              hidden: { opacity: 0, y: 50, rotate: i % 2 ? 2 : -2 },
              show: { opacity: 1, y: 0, rotate: 0, transition: { duration: 0.8, ease: ease.out } },
            }}
          >
            <ThemeCard theme={theme} priority={i === 0} />
          </motion.div>
        ))}
      </motion.div>

      {themes.length > 1 && (
        <div className="flex justify-center gap-2 md:hidden" aria-hidden>
          {themes.map((theme, i) => (
            <motion.button
              key={theme.id}
              type="button"
              tabIndex={-1}
              onClick={() => goTo(i)}
              className="h-2 rounded-full"
              initial={false}
              animate={{
                width: i === active ? 28 : 8,
                backgroundColor: i === active ? '#2a2433' : 'rgba(42, 36, 51, 0.15)',
              }}
              transition={spring.snappy}
            />
          ))}
        </div>
      )}
    </>
  )
}
