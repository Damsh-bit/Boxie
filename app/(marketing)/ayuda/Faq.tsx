'use client'

import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { cn } from '@/ui/cn'
import { Collapse, ease, spring } from '@/ui/motion'

export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  // Varias listas en la misma página (el centro de ayuda): ids que no se pisan.
  const base = useId()
  return (
    <motion.div
      className="space-y-3"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      {items.map((item, i) => {
        const expanded = open === i
        return (
          <motion.div
            key={item.question}
            data-reveal=""
            className={cn(
              'rounded-2xl border bg-white transition-[border-color,box-shadow] duration-300',
              expanded
                ? 'border-brand shadow-[0_10px_30px_rgb(244_78_99/0.08)]'
                : 'border-neutral-100 hover:border-neutral-200',
            )}
            variants={{
              hidden: { opacity: 0, y: 16 },
              show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: ease.out } },
            }}
          >
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`${base}-${i}`}
                onClick={() => setOpen(expanded ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-lg font-semibold text-ink"
              >
                {item.question}
                <motion.span
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full transition-colors duration-300',
                    expanded ? 'bg-brand text-white' : 'bg-brand-soft text-brand',
                  )}
                  animate={{ rotate: expanded ? 135 : 0 }}
                  transition={spring.snappy}
                  aria-hidden
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                </motion.span>
              </button>
            </h3>
            <Collapse open={expanded} id={`${base}-${i}`}>
              <p className="px-6 pb-5 leading-relaxed text-neutral-600">{item.answer}</p>
            </Collapse>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
