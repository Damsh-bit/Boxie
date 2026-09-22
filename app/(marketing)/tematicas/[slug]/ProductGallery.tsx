'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/ui/cn'

export function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0)
  const count = images.length
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count)

  return (
    <div className="relative h-[350px] w-full bg-neutral-100 lg:h-auto lg:min-h-[500px] lg:w-1/2">
      <Image
        key={index}
        src={images[index]!}
        alt={alt}
        fill
        priority={index === 0}
        sizes="(max-width: 1024px) 100vw, 450px"
        className="animate-fade-in-up object-cover"
      />
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Foto anterior"
            className="absolute top-1/2 left-4 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/40 text-lg text-ink transition hover:bg-white hover:text-brand"
          >
            ❮
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Foto siguiente"
            className="absolute top-1/2 right-4 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/40 text-lg text-ink transition hover:bg-white hover:text-brand"
          >
            ❯
          </button>
          <div className="absolute bottom-5 left-0 flex w-full justify-center gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'size-2 rounded-full bg-white/60 transition',
                  i === index && 'scale-125 bg-white',
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
