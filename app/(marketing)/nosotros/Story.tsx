'use client'

import { motion, useInView, useScroll, useSpring } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/ui/cn'
import { Emoji } from '@/ui/Icon'
import { Reveal, Swap, spring } from '@/ui/motion'
import { Mark } from '../_home/primitives'

export interface Chapter {
  id: string
  emoji: string
  kicker: string
  title: string
  text: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * "Nuestra historia": los capítulos bajan por una línea que se va llenando
 * con el scroll. En la computadora el título queda fijo a la izquierda con el
 * número del capítulo que se está leyendo.
 */
export function Story({ chapters }: { chapters: Chapter[] }) {
  const [active, setActive] = useState(0)
  const list = useRef<HTMLOListElement>(null)
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 65%', 'end 55%'] })
  const fill = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 })
  const current = chapters[active]

  return (
    <section
      id="historia"
      aria-labelledby="historia-title"
      className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="text-center lg:sticky lg:top-32 lg:self-start lg:text-left">
          <Reveal
            as="span"
            className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand/10 px-3.5 py-1.5 text-[0.7rem] font-extrabold tracking-[0.18em] text-brand uppercase"
          >
            Nuestra historia
          </Reveal>
          <Reveal
            as="h2"
            delay={0.05}
            className="font-display text-[2.1rem] leading-[1.08] font-bold text-balance text-ink sm:text-5xl"
          >
            <span id="historia-title">
              De un regalo hecho a mano a <Mark>Ribbly</Mark>
            </span>
          </Reveal>
          <Reveal
            as="p"
            delay={0.1}
            className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-pretty text-ink/70 lg:mx-0"
          >
            Cómo pasamos de armarle un regalo a un amigo que estaba lejos a hacer uno para
            cualquiera que quiera emocionar a alguien.
          </Reveal>
          {current && (
            <div className="mt-12 hidden items-end gap-4 lg:flex" aria-hidden>
              <span className="font-display text-[7.5rem] leading-[0.75] font-bold text-brand">
                <Swap id={active} y={24}>
                  {pad(active + 1)}
                </Swap>
              </span>
              <span className="pb-1 text-sm leading-snug text-ink/45">
                / {pad(chapters.length)}
                <br />
                <Swap id={current.id} className="font-semibold text-ink/70">
                  {current.kicker}
                </Swap>
              </span>
            </div>
          )}
        </div>

        <ol ref={list} className="relative space-y-6 pl-12 sm:space-y-8 sm:pl-16">
          <span
            aria-hidden
            className="absolute top-3 bottom-3 left-[19px] w-[3px] rounded-full bg-paper sm:left-[27px]"
          />
          <motion.span
            aria-hidden
            className="absolute top-3 bottom-3 left-[19px] w-[3px] origin-top rounded-full bg-brand sm:left-[27px]"
            style={{ scaleY: fill }}
          />
          {chapters.map((c, i) => (
            <ChapterItem
              key={c.id}
              chapter={c}
              index={i}
              active={i === active}
              onActive={setActive}
            />
          ))}
        </ol>
      </div>
    </section>
  )
}

function ChapterItem({
  chapter,
  index,
  active,
  onActive,
}: {
  chapter: Chapter
  index: number
  active: boolean
  onActive(index: number): void
}) {
  const ref = useRef<HTMLLIElement>(null)
  // Se "lee" el capítulo que cruza la franja del medio de la pantalla.
  const reading = useInView(ref, { margin: '-45% 0px -45% 0px' })
  useEffect(() => {
    if (reading) onActive(index)
  }, [reading, index, onActive])

  return (
    <li ref={ref} className="relative">
      <motion.span
        aria-hidden
        className="absolute top-6 -left-12 z-10 grid size-10 place-items-center rounded-full text-lg ring-4 ring-white sm:-left-16 sm:size-14 sm:text-2xl"
        initial={false}
        animate={{
          backgroundColor: active ? '#f44e63' : '#f7f4f6',
          scale: active ? 1.08 : 1,
        }}
        transition={spring.snappy}
      >
        <Emoji value={chapter.emoji} size="1.3em" />
      </motion.span>
      <Reveal
        y={36}
        className={cn(
          'rounded-[28px] bg-white p-6 ring-1 transition-[box-shadow,opacity] duration-500 sm:p-8',
          active
            ? 'shadow-[0_30px_60px_-28px_rgba(42,36,51,0.35)] ring-brand/20'
            : 'shadow-[0_2px_10px_rgba(42,36,51,0.04)] ring-black/5 lg:opacity-60',
        )}
      >
        <span className="text-xs font-extrabold tracking-[0.14em] text-brand uppercase">
          Capítulo {index + 1} · {chapter.kicker}
        </span>
        <h3 className="mt-2 font-display text-2xl leading-tight font-bold text-ink sm:text-[1.9rem]">
          {chapter.title}
        </h3>
        <p className="mt-3 text-[1.02rem] leading-relaxed text-ink/70">{chapter.text}</p>
      </Reveal>
    </li>
  )
}
