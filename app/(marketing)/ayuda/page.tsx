import { ExternalLink, Gift, KeyRound, Layers, Mail, MessageCircle, Wand2 } from 'lucide-react'
import type { Metadata, Route } from 'next'
import { helpCategories } from '@/content/help'
import { legalDocs } from '@/content/legal'
import { site } from '@/content/site'
import { formatARS } from '@/domain/money'
import { describeLifetime } from '@/domain/plans'
import { getStorefront, type Storefront } from '@/server/storefront'
import { LiftLink } from '@/ui/LiftLink'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'
import { SupportButton } from '@/ui/SupportButton'
import { PageIntro } from '../_components/PageIntro'
import { Mark, SectionHeading } from '../_home/primitives'
import { HelpCenter } from './HelpCenter'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Centro de ayuda',
  description:
    'Preguntas frecuentes sobre Boxie: cómo comprar, personalizar y regalar, planes, pagos, privacidad y cómo hablar con soporte.',
  alternates: { canonical: '/ayuda' },
}

function categoriesOf(sf: Storefront) {
  const byPlans = sf.plans.length > 1
  return helpCategories({
    price: byPlans ? `desde ${formatARS(sf.priceFromCents)}` : formatARS(sf.priceFromCents),
    plans: byPlans,
    lifetime: describeLifetime(sf.lifetimeDays),
    editWindowDays: sf.editWindowDays,
    maxPhotos: sf.maxPhotos,
    passwordByPlan: sf.plans.some((p) => !p.allowPassword),
    welcome: sf.welcome,
  })
}

export default async function HelpPage() {
  const sf = await getStorefront()
  const categories = categoriesOf(sf)
  const sample = sf.themes[0]?.slug ?? 'pareja'

  const shortcuts: { href: Route; icon: typeof Gift; title: string; text: string }[] = [
    {
      href: '/mi-boxie',
      icon: KeyRound,
      title: 'Entrar a mi Boxie',
      text: 'Recuperá tu link para editar',
    },
    {
      href: '/precios',
      icon: Layers,
      title: 'Planes y precios',
      text: 'Qué trae cada plan',
    },
    {
      href: `/ejemplo/${sample}/personalizar` as Route,
      icon: Wand2,
      title: 'Probar el editor',
      text: 'Gratis, sin comprar',
    },
    {
      href: '/galeria',
      icon: Gift,
      title: 'Elegir una Boxie',
      text: 'Todas las temáticas',
    },
  ]

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: categories.flatMap((c) =>
      c.items.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer },
      })),
    ),
  }).replace(/</g, '\\u003c')

  return (
    <div className="overflow-x-clip bg-paper/40 pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <PageIntro
        eyebrow="Centro de ayuda"
        title={
          <>
            ¿En qué te <Mark>ayudamos</Mark>?
          </>
        }
        text="Las respuestas a lo que más nos preguntan. Y si no está lo que buscás, te responde una persona por chat."
      />

      <Stagger
        className="mx-auto mb-16 grid max-w-6xl grid-cols-2 gap-3 px-5 sm:gap-4 sm:px-8 lg:grid-cols-4"
        step={0.06}
      >
        {shortcuts.map(({ href, icon: Icon, title, text }) => (
          <StaggerItem key={href} className="h-full" y={20}>
            <LiftLink
              href={href}
              lift={4}
              className="flex h-full flex-col gap-3 rounded-3xl bg-white p-4 ring-1 ring-black/5 transition-shadow hover:shadow-[0_18px_40px_-20px_rgba(42,36,51,0.3)] sm:flex-row sm:items-center sm:p-5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{title}</span>
                <span className="block text-sm text-ink/55">{text}</span>
              </span>
            </LiftLink>
          </StaggerItem>
        ))}
      </Stagger>

      <HelpCenter categories={categories} />

      <section
        aria-labelledby="contacto-title"
        className="mx-auto mt-20 max-w-6xl px-5 sm:mt-24 sm:px-8"
      >
        <Reveal className="relative overflow-hidden rounded-[36px] bg-ink px-6 py-10 text-white sm:px-10 sm:py-12">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-brand/40 blur-3xl"
          />
          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <h2
                id="contacto-title"
                className="font-display text-3xl leading-tight font-bold sm:text-4xl"
              >
                ¿Seguís con dudas? <Mark>Hablemos</Mark>
              </h2>
              <p className="mt-3 max-w-xl text-white/70">
                Abrí el chat y te responde una persona del equipo. Te avisamos por mail cuando haya
                respuesta, así no tenés que quedarte esperando.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <SupportButton size="lg" detail={{ topic: 'otro' }}>
                <MessageCircle className="size-5" aria-hidden /> Abrir el chat
              </SupportButton>
              {sf.business.whatsapp && (
                <a
                  href={sf.business.whatsapp.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#25D366] px-8 text-lg font-semibold text-white transition-colors hover:bg-[#1ebe5a]"
                >
                  WhatsApp
                </a>
              )}
              <a
                href={`mailto:${sf.business.supportEmail}`}
                className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-white/70 underline-offset-4 hover:text-white hover:underline"
              >
                <Mail className="size-4" aria-hidden /> {sf.business.supportEmail}
              </a>
            </div>
          </div>
        </Reveal>
      </section>

      <section aria-labelledby="legales-title" className="mx-auto mt-20 max-w-6xl px-5 sm:px-8">
        <SectionHeading
          align="left"
          eyebrow="Legales"
          title={<span id="legales-title">Información legal y políticas</span>}
          text="Para tu tranquilidad, cumplimos con las normas vigentes en Argentina."
          className="mb-8 sm:mb-8"
        />
        <Stagger className="grid gap-4 sm:grid-cols-2" step={0.08}>
          {legalDocs.map((doc) => (
            <StaggerItem key={doc.slug} y={24}>
              <LiftLink
                href={`/legales/${doc.slug}` as Route}
                className="flex h-full items-start gap-4 rounded-3xl bg-white p-6 ring-1 ring-black/5 transition-[box-shadow] duration-300 hover:shadow-[0_18px_40px_-20px_rgba(42,36,51,0.3)]"
              >
                <span className="text-3xl" aria-hidden>
                  {doc.icon}
                </span>
                <span>
                  <span className="block font-display text-xl font-bold text-ink">{doc.title}</span>
                  <span className="mt-1 block text-ink/60">{doc.summary}</span>
                </span>
              </LiftLink>
            </StaggerItem>
          ))}
        </Stagger>
        <Reveal delay={0.1}>
          <a
            href={site.consumerDefenseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-ink/20 p-5 text-center text-sm text-ink/60 transition-colors hover:border-brand hover:text-brand"
          >
            Defensa de las y los consumidores. Para reclamos ingresá aquí.
            <ExternalLink className="size-4 shrink-0" aria-hidden />
          </a>
        </Reveal>
      </section>
    </div>
  )
}
