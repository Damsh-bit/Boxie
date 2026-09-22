'use client'

import { useState } from 'react'
import { cn } from '@/ui/cn'

export function Faq({ items }: { items: { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const expanded = open === i
        return (
          <div
            key={item.question}
            className={cn(
              'rounded-2xl border bg-white transition',
              expanded
                ? 'border-brand shadow-[0_10px_30px_rgb(244_78_99/0.08)]'
                : 'border-neutral-100',
            )}
          >
            <h3>
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={`faq-${i}`}
                onClick={() => setOpen(expanded ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left text-lg font-semibold text-ink"
              >
                {item.question}
                <span className="text-2xl text-brand" aria-hidden>
                  {expanded ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              id={`faq-${i}`}
              hidden={!expanded}
              className="px-6 pb-5 leading-relaxed text-neutral-600"
            >
              {item.answer}
            </div>
          </div>
        )
      })}
    </div>
  )
}
