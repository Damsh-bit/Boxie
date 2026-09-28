'use client'

import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion'
import { ArrowRight, ChevronDown, PauseCircle, Play, Smartphone, Wand2, Zap } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import type { Route } from 'next'
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactNode,
} from 'react'
import type { SocialProof } from '@/domain/social-proof'
import { ButtonLink, Nudge } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { rememberRecipient } from '@/ui/recipient'
import { MercadoPagoLogo } from '@/ui/MercadoPagoLogo'
import { Swap, ease, spring, useCalm } from '@/ui/motion'
import { HeroPreview } from './HeroPreview'
import { Magnetic, useMouseParallax } from './primitives'
import { PurchaseTicker } from './PurchaseTicker'
import { avatarGradient, type HomeTheme } from './theme-look'

/** La bandera en SVG: Windows no dibuja los emojis de banderas. */
function FlagAR({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" aria-hidden className={className}>
      <rect width="18" height="12" rx="2.5" fill="#74ACDF" />
      <rect y="4" width="18" height="4" fill="#fff" />
      <circle cx="9" cy="6" r="1.3" fill="#F6B40E" />
    </svg>
  )
}

const TRUST: { icon: ReactNode; label: string }[] = [
  {
    icon: <MercadoPagoLogo className="size-5 text-[#00B1EA]" />,
    label: 'Pago seguro con Mercado Pago',
  },
  { icon: <Zap className="size-4 text-brand" aria-hidden />, label: 'Llega al instante' },
  { icon: <Smartphone className="size-4 text-brand" aria-hidden />, label: 'Sin apps ni cuentas' },
  {
    icon: <FlagAR className="h-3 w-[18px] shadow-[0_0_0_1px_rgba(42,36,51,0.08)]" />,
    label: 'Hecho en Argentina',
  },
]

const count = new Intl.NumberFormat('es-AR')

const WIDE = '(min-width: 1024px)'

function subscribeWide(callback: () => void) {
  const query = window.matchMedia(WIDE)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

/** true con la portada en dos columnas (lg; en el servidor, false). */
function useWide() {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
}

const rise = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: ease.out } },
}

const line = {
  hidden: { y: '105%' },
  show: { y: '0%', transition: { duration: 0.9, ease: ease.out } },
}

/**
 * La portada: titular, un armador en vivo (elegís la temática, escribís el
 * nombre y el celular de al lado lo muestra) y el llamado a comprar con el
 * precio a la vista.
 */
export function Hero({
  themes,
  salesPaused,
  proof,
}: {
  themes: HomeTheme[]
  salesPaused: boolean
  proof: SocialProof
}) {
  const ref = useRef<HTMLElement>(null)
  const calm = useCalm()
  const router = useRouter()
  const [slug, setSlug] = useState(themes[0]?.slug ?? 'pareja')
  const [name, setName] = useState('')
  const theme = themes.find((t) => t.slug === slug) ?? themes[0]

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const markY = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 160])
  const markRotate = useTransform(scrollYProgress, [0, 1], [0, calm ? 0 : 12])
  // En una columna el celular va debajo del armador: si subiera, lo taparía.
  const wide = useWide()
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, calm || !wide ? 0 : -70])

  // La marca de fondo se corre al revés que el mouse, y una luz suave lo sigue.
  const mouse = useMouseParallax()
  const markMouseX = useTransform(mouse.x, (v) => v * -26)
  const markMouseY = useTransform(mouse.y, (v) => v * -18)
  const lightX = useMotionValue(0)
  const lightY = useMotionValue(0)
  const lightOn = useSpring(0, { stiffness: 80, damping: 20 })
  const light = useMotionTemplate`radial-gradient(560px circle at ${lightX}px ${lightY}px, rgba(244,78,99,0.14), transparent 65%)`
  const followLight = (e: PointerEvent<HTMLElement>) => {
    if (calm || e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    lightX.set(e.clientX - r.left)
    lightY.set(e.clientY - r.top)
    lightOn.set(1)
  }

  if (!theme) return null

  const short = name.trim()
  // El nombre viaja a la ficha, al checkout y al editor: no se vuelve a pedir.
  const href =
    `/tematicas/${theme.slug}${short ? `?para=${encodeURIComponent(short)}` : ''}` as Route
  const cta = short && short.length <= 10 ? `Crear la Boxie de ${short}` : 'Crear su Boxie'

  return (
    <section
      ref={ref}
      aria-labelledby="hero-title"
      onPointerMove={followLight}
      onPointerLeave={() => lightOn.set(0)}
      className="relative isolate overflow-hidden bg-[linear-gradient(12.84deg,#F44E63_-14.02%,rgba(255,255,255,0)_38.2%)] pt-[104px] pb-16 sm:pt-[112px] lg:flex lg:min-h-dvh lg:items-center lg:pb-24"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: light, opacity: lightOn }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[90px] left-[6%] -z-10 w-[min(480px,110vw)] md:top-auto md:right-[-60px] md:bottom-[-80px] md:left-auto md:w-[560px]"
        style={{ y: markY, rotate: markRotate }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.4, ease: ease.out }}
      >
        <motion.div style={{ x: markMouseX, y: markMouseY }}>
          <Image
            src="/brand/boxie-mark.png"
            alt=""
            width={532}
            height={679}
            priority
            className="h-auto w-full opacity-20 md:opacity-45"
          />
        </motion.div>
      </motion.div>

      <motion.div
        // grid-cols-1 (minmax(0, 1fr)): nada de adentro puede ensanchar la grilla más que la pantalla.
        className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-x-10 gap-y-10 px-4 [grid-template-areas:'copy'_'builder'_'phone'] min-[380px]:px-5 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-y-7 lg:[grid-template-areas:'copy_phone'_'builder_phone']"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
      >
        <div className="flex min-w-0 flex-col items-center gap-6 text-center [grid-area:copy] lg:items-start lg:self-end lg:text-left">
          {proof.events.length ? (
            <motion.div
              data-reveal=""
              variants={rise}
              className="flex w-full justify-center lg:justify-start"
            >
              <PurchaseTicker events={proof.events} themes={themes} />
            </motion.div>
          ) : (
            <motion.span
              data-reveal=""
              variants={rise}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-white/70 px-3.5 py-1.5 text-xs font-bold tracking-wide text-ink shadow-[0_6px_20px_rgba(42,36,51,0.08)] ring-1 ring-black/5 backdrop-blur"
            >
              <motion.span
                aria-hidden
                animate={calm ? undefined : { rotate: [0, 18, -10, 0], scale: [1, 1.25, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 2.4 }}
              >
                ✨
              </motion.span>
              <span className="truncate">Regalo digital personalizado · Hecho en Argentina</span>
            </motion.span>
          )}

          <h1
            id="hero-title"
            className="text-[2.6rem] leading-[1.02] font-extrabold tracking-tight text-ink min-[380px]:text-5xl sm:text-6xl md:text-7xl"
          >
            <span className="block overflow-hidden pb-1">
              <motion.span data-reveal="" className="block" variants={line}>
                Regalá una
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-1">
              <motion.span
                data-reveal=""
                className="block font-display text-[3.4rem] leading-[1.05] text-brand min-[380px]:text-[64px] sm:text-7xl md:text-8xl"
                variants={line}
              >
                <BouncyWord word="BOXIE" />
              </motion.span>
            </span>
            <span className="block overflow-hidden pb-1">
              <motion.span
                data-reveal=""
                className="block text-[1.35rem] font-bold tracking-normal text-balance text-ink/85 min-[380px]:text-2xl sm:text-3xl"
                variants={line}
              >
                el regalo digital que emociona
              </motion.span>
            </span>
          </h1>

          <motion.p
            data-reveal=""
            variants={rise}
            className="max-w-xl text-base font-medium text-pretty text-ink/75 min-[380px]:text-lg md:text-xl"
          >
            Fotos, dedicatoria, su canción y juegos en una experiencia personalizada que se abre
            desde el celular. La creás en 5 minutos y llega al instante por WhatsApp.
          </motion.p>

          {proof.sold && <SoldCount sold={proof.sold} events={proof.events} themes={themes} />}
        </div>

        <motion.div
          data-reveal=""
          variants={rise}
          className="w-full max-w-xl min-w-0 justify-self-center [grid-area:builder] lg:self-start lg:justify-self-start"
        >
          <form
            id="armador"
            className="rounded-[28px] bg-white/80 p-3.5 shadow-[0_24px_60px_-20px_rgba(42,36,51,0.28)] ring-1 ring-black/5 backdrop-blur-md min-[380px]:p-4 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault()
              rememberRecipient(short)
              router.push(href)
            }}
          >
            <p className="mb-3 flex items-center justify-center gap-2 text-sm font-bold text-ink lg:justify-start">
              <Wand2 className="size-4 shrink-0 text-brand" aria-hidden />
              Armala acá mismo y mirá cómo queda
            </p>

            <ThemePicker themes={themes} value={theme.slug} onChange={setSlug} />

            <label className="group relative mt-3 block">
              <span className="sr-only">¿Para quién es la Boxie?</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 16))}
                maxLength={16}
                autoComplete="off"
                enterKeyHint="go"
                placeholder="¿Para quién es? Ej: Sofi"
                className="h-13 w-full rounded-full border-2 border-transparent bg-white px-5 pr-12 text-base font-semibold text-ink shadow-[inset_0_0_0_1px_rgba(42,36,51,0.12)] transition-[border-color,box-shadow] duration-200 outline-none placeholder:font-medium placeholder:text-ink/40 focus:border-brand focus:shadow-[0_0_0_4px_rgba(244,78,99,0.15)]"
              />
              <motion.span
                aria-hidden
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-lg"
                animate={short ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
                key={short.length}
              >
                {short ? '💖' : '✍️'}
              </motion.span>
            </label>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Magnetic strength={0.18} className="min-w-0 sm:flex-1">
                <ButtonLink
                  href={href}
                  onClick={() => rememberRecipient(short)}
                  size="lg"
                  block
                  className="min-w-0 px-6 text-base sm:text-lg"
                >
                  <span className="relative inline-flex min-w-0">
                    <Swap id={cta} className="truncate">
                      {cta}
                    </Swap>
                  </span>
                  <Nudge x={4}>
                    <ArrowRight className="size-5" aria-hidden />
                  </Nudge>
                </ButtonLink>
              </Magnetic>
              <ButtonLink
                href={
                  `/ejemplo/${theme.slug}${short ? `?para=${encodeURIComponent(short)}` : ''}` as Route
                }
                onClick={() => rememberRecipient(short)}
                variant="white"
                size="lg"
                block
                className="px-5 text-base sm:w-auto"
              >
                <span className="grid size-7 place-items-center rounded-full bg-brand text-white">
                  <Play className="size-3 translate-x-px fill-current" aria-hidden />
                </span>
                Ver ejemplo
              </ButtonLink>
            </div>

            {salesPaused ? (
              <p className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm text-amber-900 lg:justify-start">
                <PauseCircle className="size-4 shrink-0" aria-hidden />
                Pausamos las ventas por un rato: podés armarla y probarla igual.
              </p>
            ) : (
              <p className="mt-3 text-center text-sm text-ink/65 lg:text-left">
                <span className="relative inline-block font-display text-base font-bold text-ink">
                  <Swap id={theme.priceLabel}>{theme.priceLabel}</Swap>
                </span>{' '}
                · pago único · sin suscripciones
              </p>
            )}
          </form>

          <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-semibold text-ink/70 lg:justify-start">
            {TRUST.map(({ icon, label }) => (
              <motion.li
                key={label}
                className="flex cursor-default items-center gap-1.5 transition-colors hover:text-ink"
                whileHover="hover"
              >
                <motion.span
                  className="flex"
                  variants={{ hover: { rotate: [0, -14, 10, 0], scale: [1, 1.25, 1.1] } }}
                  transition={{ duration: 0.5 }}
                >
                  {icon}
                </motion.span>
                {label}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div className="min-w-0 [grid-area:phone] lg:py-6" style={{ y: phoneY }}>
          <HeroPreview theme={theme} name={name} />
        </motion.div>
      </motion.div>

      <motion.div
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 lg:block lg:[@media(max-height:820px)]:hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.6 }}
      >
        <a
          href="#emocionar"
          aria-label="Ver las temáticas"
          className="grid place-items-center rounded-full border border-ink/15 bg-white/60 p-2 text-ink backdrop-blur transition-colors hover:bg-white"
        >
          <motion.span
            className="block"
            animate={
              calm
                ? undefined
                : { transform: ['translateY(-2px)', 'translateY(4px)', 'translateY(-2px)'] }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="size-5" aria-hidden />
          </motion.span>
        </a>
      </motion.div>
    </section>
  )
}

/**
 * Una palabra del título cuyas letras saltan cuando les pasa el mouse por
 * encima. Los lectores de pantalla la leen entera.
 */
function BouncyWord({ word }: { word: string }) {
  // Con "reducir movimiento" las letras quedan quietas (misma estructura: el
  // servidor no sabe la preferencia y la hidratación tiene que coincidir).
  const calm = useCalm()
  return (
    <>
      <span className="sr-only">{word}</span>
      <span aria-hidden>
        {Array.from(word).map((ch, i) => (
          <motion.span
            key={i}
            className="inline-block cursor-default"
            whileHover={calm ? undefined : { y: -12, rotate: i % 2 ? 7 : -7, scale: 1.08 }}
            transition={spring.bouncy}
          >
            {ch}
          </motion.span>
        ))}
      </span>
    </>
  )
}

/**
 * "+500 Boxies regaladas" con las iniciales de quienes compraron hace poco.
 * Solo aparece cuando las ventas reales pasan el mínimo (content/social-proof).
 */
function SoldCount({
  sold,
  events,
  themes,
}: {
  sold: number
  events: SocialProof['events']
  themes: HomeTheme[]
}) {
  const faces = events.slice(0, 4)
  return (
    <motion.div
      data-reveal=""
      variants={rise}
      className="-mt-1 flex items-center justify-center gap-3 lg:justify-start"
    >
      {faces.length > 0 && (
        <span className="flex -space-x-2.5" aria-hidden>
          {faces.map((e, i) => {
            const color = themes.find((t) => t.slug === e.theme)?.color ?? '#F44E63'
            return (
              <span
                key={e.id}
                className="grid size-8 place-items-center rounded-full font-fun text-sm font-semibold text-white ring-2 ring-white [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]"
                style={{
                  background: avatarGradient(color),
                  zIndex: faces.length - i,
                }}
              >
                {e.name.charAt(0)}
              </span>
            )
          })}
        </span>
      )}
      <p className="text-sm font-medium text-ink/70">
        <b className="font-display text-lg font-bold text-ink">+{count.format(sold)}</b> Boxies
        regaladas
      </p>
    </motion.div>
  )
}

/**
 * Las temáticas del armador. Con pocas, reparten el ancho; con más (el panel
 * publica las que quiera), son una fila que se desliza con el dedo, con los
 * bordes difuminados y la elegida siempre a la vista.
 */
function ThemePicker({
  themes,
  value,
  onChange,
}: {
  themes: HomeTheme[]
  value: string
  onChange(slug: string): void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const many = themes.length > 3
  const [edges, setEdges] = useState({ start: false, end: many })

  useEffect(() => {
    const el = scroller.current
    if (!el || !many) return
    const update = () =>
      setEdges({
        start: el.scrollLeft > 4,
        end: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [many])

  // La temática elegida (o la que eligió otra sección) queda centrada.
  useEffect(() => {
    const el = scroller.current
    const selected = el?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!el || !selected || el.scrollWidth <= el.clientWidth) return
    el.scrollTo({
      left: selected.offsetLeft - (el.clientWidth - selected.offsetWidth) / 2,
      behavior: 'smooth',
    })
  }, [value])

  const fade = 28
  const mask = many
    ? `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'} 0, #000 ${fade}px, #000 calc(100% - ${fade}px), ${edges.end ? 'transparent' : '#000'} 100%)`
    : undefined

  return (
    <div
      ref={scroller}
      role="group"
      aria-label="Temática"
      className={cn(
        'relative flex gap-1 rounded-full bg-paper/80 p-1',
        many &&
          'snap-x snap-proximity scroll-px-2 [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden',
      )}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {themes.map((t) => {
        const selected = t.slug === value
        return (
          <motion.button
            key={t.slug}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(t.slug)}
            className={cn(
              'relative rounded-full py-2.5 text-sm font-semibold transition-colors duration-200',
              many ? 'shrink-0 snap-center px-3.5' : 'min-w-0 flex-1 px-2 sm:px-3',
              selected ? 'text-ink' : 'text-ink/60 hover:text-ink',
            )}
            whileHover="hover"
            whileTap={{ scale: 0.94 }}
            transition={spring.snappy}
          >
            {selected && (
              <motion.span
                layoutId="hero-theme"
                className="absolute inset-0 rounded-full bg-white shadow-[0_4px_14px_rgba(42,36,51,0.12)]"
                transition={spring.snappy}
                aria-hidden
              />
            )}
            <span className="relative flex items-center justify-center gap-1.5 whitespace-nowrap">
              <motion.span
                aria-hidden
                className="inline-block"
                variants={{ hover: { rotate: [0, -16, 12, 0], scale: [1, 1.3, 1.15] } }}
                transition={{ duration: 0.5 }}
              >
                {t.emoji}
              </motion.span>
              <span className={cn(!many && 'truncate')}>{t.name}</span>
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
