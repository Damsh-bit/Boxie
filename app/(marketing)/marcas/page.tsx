import { Handshake } from 'lucide-react'
import type { Metadata } from 'next'
import { industries, partnershipFormats, partnershipSteps } from '@/content/brands'
import { site } from '@/content/site'
import { SPONSOR_KIND_LABELS } from '@/domain/sponsors'
import { getLiveSponsors } from '@/server/sponsors/repo'
import { getStorefront } from '@/server/storefront'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { SponsorMark } from '@/ui/sponsors/SponsorUnits'
import { Mark, SectionHeading } from '../_home/primitives'
import { BrandsHero } from './BrandsHero'
import { FutureMarquee } from './FutureMarquee'
import { LeadForm } from './LeadForm'
import { PlacementShowcase } from './PlacementShowcase'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Ribbly para marcas',
  description:
    'Sumá tu marca a Ribbly: sponsors en la web, una Ribbly con tu marca, campañas por fecha y regalos corporativos. Cafeterías, florerías, bares, cines y eventos.',
  alternates: { canonical: '/marcas' },
}

/** Los tipos de Ribbly a los que vamos (la cinta grande). */
const FUTURE = [
  'Ribbly Gamer',
  'Ribbly Cine',
  'Ribbly Eventos',
  'Ribbly Viajes',
  'Ribbly Fútbol',
  'Ribbly Egresados',
  'Ribbly Empresas',
  'Ribbly Casamientos',
]

export default async function BrandsPage() {
  const [sf, sponsors] = await Promise.all([getStorefront(), getLiveSponsors()])
  const allies = sponsors.filter((s) => s.placements.includes('marcas'))

  return (
    <div className="overflow-x-clip bg-white">
      <BrandsHero />

      {/* Hacia dónde vamos: una Ribbly para cada rubro. */}
      <FutureMarquee items={FUTURE} />

      <section
        id="formatos"
        aria-labelledby="formatos-title"
        className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-28"
      >
        <SectionHeading
          eyebrow="Formatos"
          title={
            <span id="formatos-title">
              Cuatro formas de <Mark>sumarte</Mark>
            </span>
          }
          text={`Ribbly es un producto digital: la misma experiencia (${sf.themes.length} temáticas y hasta ${sf.maxScreens} sorpresas por regalo) se adapta a tu marca, tu rubro y tu fecha.`}
        />
        <Stagger className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4" step={0.08}>
          {partnershipFormats.map((f, i) => (
            <StaggerItem
              key={f.id}
              y={30}
              className="group relative flex flex-col overflow-hidden rounded-[28px] bg-canvas p-6 ring-1 ring-black/5 transition-colors duration-300 hover:bg-white hover:shadow-[0_30px_60px_-30px_rgba(42,36,51,0.35)]"
            >
              <span className="font-display text-sm font-bold text-ink/30">0{i + 1}</span>
              <span
                aria-hidden
                className="mt-4 inline-block origin-bottom-left text-4xl transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"
              >
                {f.emoji}
              </span>
              <h3 className="mt-4 font-display text-xl leading-tight font-bold text-ink">
                {f.title}
              </h3>
              <p className="mt-2 flex-1 text-[0.95rem] leading-relaxed text-ink/65">{f.text}</p>
              <p className="mt-5 border-t border-black/[0.06] pt-4 text-sm text-ink/55">
                <strong className="text-ink">Ideal para:</strong> {f.ideal}
              </p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section
        aria-labelledby="lugares-title"
        className="rounded-[40px] bg-gradient-to-b from-paper/60 to-white px-5 py-20 sm:px-8 sm:py-28"
      >
        <SectionHeading
          eyebrow="Dónde aparece tu marca"
          title={
            <span id="lugares-title">
              En la web, en tu local <Mark>y en el regalo</Mark>
            </span>
          }
          text="La gente te encuentra en Ribbly, arma su regalo desde tu local y quien lo recibe sabe que llegó con vos."
        />
        <PlacementShowcase />
      </section>

      <section aria-labelledby="pasos-title" className="px-5 py-20 sm:px-8 sm:py-28">
        <SectionHeading
          eyebrow="Cómo trabajamos"
          title={
            <span id="pasos-title">
              De la charla a la <Mark>calle</Mark>
            </span>
          }
        />
        <Stagger
          as="ol"
          className="relative mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6"
          step={0.1}
        >
          <span
            aria-hidden
            className="absolute top-7 right-[12%] left-[12%] hidden h-0.5 bg-[repeating-linear-gradient(90deg,rgb(244_78_99/0.35)_0_10px,transparent_10px_18px)] lg:block"
          />
          {partnershipSteps.map((step, i) => (
            <StaggerItem as="li" key={step.title} y={24} className="relative text-center">
              <span className="relative mx-auto grid size-14 place-items-center rounded-full bg-brand font-display text-xl font-bold text-white shadow-[0_12px_28px_-10px_rgb(244_78_99/0.7)] ring-8 ring-white">
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-ink">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs leading-relaxed text-ink/65">{step.text}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section
        id="aliados"
        aria-labelledby="aliados-title"
        className="scroll-mt-20 px-5 pb-20 sm:px-8 sm:pb-28"
      >
        <SectionHeading
          eyebrow="Aliados"
          title={
            <span id="aliados-title">
              {allies.length > 0 ? (
                <>
                  Ya regalan <Mark>Ribbly</Mark>
                </>
              ) : (
                <>
                  Buscamos a los <Mark>primeros</Mark>
                </>
              )}
            </span>
          }
          text={
            allies.length > 0
              ? 'Marcas y comercios que ya son parte de Ribbly.'
              : 'Estamos sumando a los primeros aliados: cafeterías, florerías, bares, cines y eventos que quieran regalar algo distinto. ¿Sos vos?'
          }
        />
        {allies.length > 0 ? (
          <Stagger className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4" step={0.08}>
            {allies.map((a) => (
              <StaggerItem
                key={a.id}
                y={24}
                className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 ring-1 ring-black/5 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)]"
              >
                <SponsorMark sponsor={a} size={60} />
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">
                    {a.url ? (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="hover:text-brand"
                      >
                        {a.name}
                      </a>
                    ) : (
                      a.name
                    )}
                  </p>
                  <p className="text-sm text-ink/55">
                    {SPONSOR_KIND_LABELS[a.kind]}
                    {a.city && ` · ${a.city}`}
                  </p>
                  {a.offer && <p className="mt-1 text-sm text-ink/70">{a.offer}</p>}
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        ) : (
          <Reveal className="mx-auto flex max-w-3xl flex-wrap justify-center gap-3">
            {industries.map((i) => (
              <span
                key={i.id}
                className="inline-flex items-center gap-2 rounded-full border-2 border-dashed border-black/10 px-5 py-3 font-semibold text-ink/60"
              >
                <span aria-hidden>{i.emoji}</span> ¿Tu {i.label.toLowerCase().replace(/s$/, '')}?
              </span>
            ))}
          </Reveal>
        )}
      </section>

      <section
        id="sumate"
        aria-labelledby="sumate-title"
        className="scroll-mt-20 px-4 pb-24 sm:px-8"
      >
        <Reveal className="mx-auto grid max-w-6xl overflow-hidden rounded-[40px] bg-white shadow-[0_40px_90px_-45px_rgba(42,36,51,0.45)] ring-1 ring-black/5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="relative isolate overflow-hidden bg-ink p-8 text-white sm:p-12">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -bottom-20 -z-10 size-80 rounded-full bg-brand/40 blur-3xl"
            />
            <span className="grid size-14 place-items-center rounded-2xl bg-white/10">
              <Handshake className="size-7 text-brand-muted" aria-hidden />
            </span>
            <h2
              id="sumate-title"
              className="mt-6 font-display text-3xl leading-tight font-bold text-balance sm:text-4xl"
            >
              Hagamos algo juntos
            </h2>
            <p className="mt-3 leading-relaxed text-white/70">
              Contanos de tu negocio y armamos una propuesta a tu medida. Te respondemos nosotros,
              no un bot.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-white/80">
              <li>✦ Sin costo por conversar</li>
              <li>✦ Propuestas para comercios chicos y marcas grandes</li>
              <li>✦ Resultados medidos con links y cupones propios</li>
            </ul>
            <p className="mt-10 text-sm text-white/50">
              ¿Preferís mail?{' '}
              <a
                className="font-semibold text-white underline-offset-4 hover:underline"
                href={`mailto:${site.emails.marketing}`}
              >
                {site.emails.marketing}
              </a>
            </p>
          </div>
          <div className="p-6 sm:p-10">
            <LeadForm />
          </div>
        </Reveal>
      </section>
    </div>
  )
}
