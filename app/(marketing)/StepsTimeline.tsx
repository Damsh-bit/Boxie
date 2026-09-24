'use client'

import { motion } from 'framer-motion'
import { Gift, Mail, PencilLine, ShoppingBag, type LucideIcon } from 'lucide-react'
import { howItWorks, type HowItWorksIcon } from '@/content/site'
import { ease, spring } from '@/ui/motion'

const ICONS: Record<HowItWorksIcon, LucideIcon> = {
  bag: ShoppingBag,
  mail: Mail,
  pen: PencilLine,
  gift: Gift,
}

/**
 * Los cuatro pasos, unidos por una línea que se dibuja al llegar. Horizontal
 * en escritorio, vertical en el celular.
 */
export function StepsTimeline() {
  return (
    <motion.ol
      className="relative mx-auto grid max-w-5xl gap-10 md:grid-cols-4 md:gap-6"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={{ show: { transition: { staggerChildren: 0.18, delayChildren: 0.1 } } }}
    >
      {/* La línea que une los pasos. */}
      <motion.span
        aria-hidden
        className="absolute top-7 left-[12.5%] hidden h-0.5 w-[75%] origin-left rounded-full bg-[linear-gradient(90deg,#f44e63,#ff9a9e,#c893d7)] md:block"
        variants={{
          hidden: { scaleX: 0 },
          show: { scaleX: 1, transition: { duration: 1.4, ease: ease.inOut } },
        }}
      />
      <motion.span
        aria-hidden
        className="absolute top-7 bottom-7 left-7 w-0.5 origin-top rounded-full bg-[linear-gradient(180deg,#f44e63,#ff9a9e,#c893d7)] md:hidden"
        variants={{
          hidden: { scaleY: 0 },
          show: { scaleY: 1, transition: { duration: 1.4, ease: ease.inOut } },
        }}
      />

      {howItWorks.map((step, i) => {
        const Icon = ICONS[step.icon]
        return (
          <motion.li
            key={step.title}
            data-reveal=""
            className="relative flex gap-5 text-left md:flex-col md:items-center md:gap-4 md:text-center"
            variants={{
              hidden: { opacity: 0, y: 24 },
              show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: ease.out } },
            }}
          >
            <motion.span
              className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-brand shadow-[0_10px_30px_rgba(244,78,99,0.18)] ring-1 ring-brand/10"
              variants={{
                hidden: { scale: 0.4, rotate: -20 },
                show: { scale: 1, rotate: 0, transition: spring.bouncy },
              }}
              whileHover={{ rotate: -8, scale: 1.08 }}
            >
              <Icon className="size-6" aria-hidden />
              <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-brand text-xs font-bold text-white">
                {i + 1}
              </span>
            </motion.span>
            <div>
              <h3 className="font-display text-xl font-bold text-ink">{step.title}</h3>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-neutral-600">{step.text}</p>
            </div>
          </motion.li>
        )
      })}
    </motion.ol>
  )
}
