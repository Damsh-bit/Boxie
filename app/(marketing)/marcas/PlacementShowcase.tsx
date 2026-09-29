'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Globe, Smartphone, Store } from 'lucide-react'
import { useState } from 'react'
import { industries } from '@/content/brands'
import type { PublicSponsor } from '@/domain/sponsors'
import { cn } from '@/ui/cn'
import { ease, spring } from '@/ui/motion'
import { SponsorTile } from '@/ui/sponsors/SponsorUnits'
import { PhoneFrame } from '../_home/primitives'
import { PseudoQr } from './PseudoQr'

/** Un aliado de ejemplo para las maquetas (se muestra como ejemplo, no como cliente). */
const cafe = industries[0]!
const EXAMPLE: PublicSponsor = {
  id: 'ejemplo',
  name: cafe.brand,
  kind: 'local',
  tagline: 'Especialidad, medialunas y ahora regalos que emocionan.',
  offer: cafe.campaign,
  description: '',
  emoji: cafe.emoji,
  logoUrl: null,
  color: cafe.color,
  url: null,
  city: 'Tu ciudad',
  couponCode: 'TUCAFE10',
  placements: [],
}

const TABS = [
  {
    id: 'web',
    icon: Globe,
    label: 'En Ribbly',
    title: 'En el sitio, entre las temáticas',
    text: 'Tu tarjeta aparece en la galería, la portada o precios, con tu propuesta, tu cupón y tu link. La ve quien está eligiendo un regalo.',
    soon: false,
  },
  {
    id: 'local',
    icon: Store,
    label: 'En tu local',
    title: 'En el vaso, el ticket o la mesa',
    text: 'Un QR con tu marca: quien compra arma una Ribbly y se la manda a alguien. Cada escaneo cuenta en tu campaña.',
    soon: false,
  },
  {
    id: 'regalo',
    icon: Smartphone,
    label: 'Dentro del regalo',
    title: 'En la Ribbly que se abre',
    text: 'Tu logo en la portada y tu mensaje en el cierre, con un cupón para la próxima visita. Lo ve quien recibe el regalo, en el momento más lindo.',
    soon: true,
  },
] as const

export function PlacementShowcase() {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('web')
  const tab = TABS.find((t) => t.id === active)!

  return (
    <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
      <div>
        <div role="tablist" aria-label="Dónde aparece tu marca" className="grid gap-2">
          {TABS.map((t) => {
            const selected = t.id === active
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`lugar-${t.id}`}
                aria-selected={selected}
                aria-controls="lugar-panel"
                onClick={() => setActive(t.id)}
                className={cn(
                  'relative flex items-start gap-4 rounded-3xl p-4 text-left transition-colors sm:p-5',
                  selected
                    ? 'text-white'
                    : 'bg-white text-ink ring-1 ring-black/5 hover:ring-black/15',
                )}
              >
                {selected && (
                  <motion.span
                    layoutId="lugar-activo"
                    className="absolute inset-0 rounded-3xl bg-ink shadow-[0_20px_40px_-20px_rgba(42,36,51,0.6)]"
                    transition={spring.snappy}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    'relative grid size-11 shrink-0 place-items-center rounded-2xl',
                    selected ? 'bg-white/10 text-brand-muted' : 'bg-brand-soft text-brand',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="relative min-w-0">
                  <span className="flex flex-wrap items-center gap-2 font-display text-lg font-bold">
                    {t.label}
                    {t.soon && (
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 font-sans text-[0.62rem] font-extrabold tracking-wider uppercase',
                          selected ? 'bg-brand text-white' : 'bg-brand-soft text-brand',
                        )}
                      >
                        Próximamente
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-sm leading-relaxed',
                      selected ? 'text-white/70' : 'text-ink/60',
                    )}
                  >
                    {t.text}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-xs text-ink/45">Las marcas de las maquetas son ejemplos.</p>
      </div>

      <div
        id="lugar-panel"
        role="tabpanel"
        aria-labelledby={`lugar-${active}`}
        className="relative grid min-h-[480px] place-items-center overflow-hidden rounded-[36px] bg-gradient-to-br from-paper/70 via-white to-brand-soft p-6 ring-1 ring-black/5 sm:p-10"
      >
        <p className="absolute top-5 left-6 text-xs font-extrabold tracking-[0.16em] text-ink/40 uppercase">
          {tab.title}
        </p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            className="w-full"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ duration: 0.45, ease: ease.out }}
          >
            {active === 'web' && (
              <div className="mx-auto w-full max-w-[330px] pt-6">
                <SponsorTile sponsor={EXAMPLE} />
              </div>
            )}
            {active === 'local' && <CupMockup />}
            {active === 'regalo' && <GiftClosingMockup />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/** Un vaso de café con la faja de Boxie y el QR. */
function CupMockup() {
  return (
    <div className="relative mx-auto flex h-[360px] w-full max-w-[340px] items-end justify-center">
      <motion.div
        className="relative h-[300px] w-[200px]"
        initial={{ rotate: -4 }}
        animate={{ rotate: [-4, -2, -4] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Tapa */}
        <div className="absolute -top-3 left-1/2 h-7 w-[220px] -translate-x-1/2 rounded-t-xl rounded-b-md bg-[#3b3340]" />
        {/* Vaso (se angosta abajo) */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-white to-[#f1ebe6] shadow-[0_40px_70px_-35px_rgba(42,36,51,0.6)]"
          style={{ clipPath: 'polygon(0 0, 100% 0, 88% 100%, 12% 100%)' }}
        />
        {/* Faja con la marca y el QR */}
        <div
          className="absolute inset-x-0 top-[34%] flex h-[42%] items-center gap-3 px-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${cafe.color}, color-mix(in srgb, ${cafe.color} 60%, #2a2433))`,
            clipPath: 'polygon(1% 0, 99% 0, 96% 100%, 4% 100%)',
          }}
        >
          <PseudoQr seed="vaso" className="size-16 shrink-0 rounded-md" />
          <div className="min-w-0">
            <p className="text-[0.6rem] font-extrabold tracking-[0.14em] text-white/70 uppercase">
              {cafe.brand}
            </p>
            <p className="font-display text-sm leading-tight font-bold">
              Escaneá y regalá una Ribbly ✨
            </p>
          </div>
        </div>
      </motion.div>
      <motion.span
        aria-hidden
        className="absolute top-2 left-1/2 text-3xl"
        animate={{ y: [-4, -18, -4], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        ♨️
      </motion.span>
    </div>
  )
}

/** El cierre de una Ribbly con la marca que la regaló. */
function GiftClosingMockup() {
  return (
    <div className="mx-auto w-[230px]">
      <PhoneFrame label={`Cierre de una Ribbly regalada por ${cafe.brand}`}>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink px-6 text-center text-white">
          <div
            aria-hidden
            className="absolute -top-16 left-1/2 size-56 -translate-x-1/2 rounded-full blur-3xl"
            style={{ backgroundColor: `color-mix(in srgb, ${cafe.color} 60%, transparent)` }}
          />
          <p className="relative font-fun text-2xl leading-tight font-semibold">
            Gracias por abrirla 💌
          </p>
          <p className="relative mt-2 text-xs text-white/70">Con cariño, Sofi</p>
          <div className="relative mt-8 w-full rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
            <p className="text-[0.55rem] font-extrabold tracking-[0.16em] text-white/50 uppercase">
              Este regalo llegó con
            </p>
            <p className="mt-1 font-display text-base font-bold">
              {cafe.emoji} {cafe.brand}
            </p>
            <p className="mt-2 rounded-lg bg-white py-1.5 text-[0.7rem] font-bold text-ink">
              Tu próximo café va por nuestra cuenta
            </p>
          </div>
        </div>
      </PhoneFrame>
    </div>
  )
}
