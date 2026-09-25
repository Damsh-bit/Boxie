import { Gift, Wand2 } from 'lucide-react'
import type { Metadata, Route } from 'next'
import { screenName } from '@/content/screens'
import { formatARS } from '@/domain/money'
import { describeLifetime } from '@/domain/plans'
import { slideDefinitions } from '@/slides/schemas'
import { getStorefront, type Storefront } from '@/server/storefront'
import { ButtonLink } from '@/ui/Button'
import { Reveal } from '@/ui/motion'
import { PageIntro } from '../_components/PageIntro'
import { Mark, SectionHeading } from '../_home/primitives'
import { PlanCards, PlanPromises } from '../_plans/PlanCards'
import { PlanComparison, type ComparisonGroup } from '../_plans/PlanComparison'
import { Faq } from '../ayuda/Faq'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const sf = await getStorefront()
  return {
    title: 'Planes y precios',
    description: `Los planes de Boxie, desde ${formatARS(sf.priceFromCents)}: pago único, sin suscripción. Compará pantallas, juegos, fotos y días online de cada uno.`,
    alternates: { canonical: '/precios' },
  }
}

/** La tabla: primero las pantallas (desde qué plan viene cada una), después los límites. */
function comparisonOf(sf: Storefront): ComparisonGroup[] {
  const rank = new Map(sf.plans.map((p, i) => [p.slug, i]))
  return [
    {
      title: 'Pantallas del regalo',
      rows: sf.screens.map((row) => {
        const name = screenName(row.kind, slideDefinitions[row.kind].label)
        const from = rank.get(row.fromPlan) ?? 0
        return {
          key: row.kind,
          emoji: name.emoji,
          label: name.label,
          cells: sf.plans.map((_, i) => i >= from),
        }
      }),
    },
    {
      title: 'Para personalizar y regalar',
      rows: [
        {
          key: 'pantallas',
          label: 'Pantallas en total',
          cells: sf.plans.map((p) => String(p.screens)),
        },
        {
          key: 'modulos',
          label: 'Módulos para personalizar',
          cells: sf.plans.map((p) => String(p.modules)),
        },
        {
          key: 'fotos',
          emoji: '🖼️',
          label: 'Fotos propias',
          cells: sf.plans.map((p) => (p.maxPhotos > 0 ? `Hasta ${p.maxPhotos}` : false)),
        },
        {
          key: 'clave',
          emoji: '🔐',
          label: 'Clave para abrirla',
          cells: sf.plans.map((p) => p.allowPassword),
        },
        {
          key: 'dias',
          emoji: '⏳',
          label: 'Días online desde que la regalás',
          cells: sf.plans.map((p) => `${p.days} días`),
        },
        {
          key: 'link',
          emoji: '🔗',
          label: 'Link único por WhatsApp o mail',
          cells: sf.plans.map(() => true),
        },
        {
          key: 'editar',
          emoji: '✏️',
          label: 'La editás hasta bloquearla',
          cells: sf.plans.map(() => true),
        },
      ],
    },
  ]
}

function faqsOf(sf: Storefront) {
  const recommended = sf.recommended
  return [
    {
      question: '¿Qué cambia entre un plan y otro?',
      answer: `Cada plan suma pantallas, juegos, fotos y días online, e incluye todo lo de los planes de abajo. Todas las temáticas traen lo mismo en cada plan: el precio no cambia según la temática. El regalo queda online ${describeLifetime(sf.lifetimeDays)} según el plan, contados desde que lo bloqueás para regalar.`,
    },
    {
      question: '¿Cuál me conviene?',
      answer: recommended
        ? `El más elegido es ${recommended.name}: trae ${recommended.screens} pantallas${recommended.games ? ` y ${recommended.games} juegos` : ''}, y queda online ${recommended.days} días. Si querés algo simple y rápido, el plan más básico alcanza para emocionar; si querés todo, el más completo. Podés probar el editor gratis antes de decidir.`
        : 'Podés probar el editor gratis antes de decidir: es el mismo que usás después de comprar.',
    },
    {
      question: '¿Hay que pagar algo más después?',
      answer:
        'No. Es un pago único con Mercado Pago (tarjeta, débito o dinero en cuenta): sin suscripciones, sin costos de envío y sin cargos escondidos.',
    },
    {
      question: '¿Tienen descuentos?',
      answer: sf.welcome
        ? `Sí: con el código ${sf.welcome.code} tenés ${sf.welcome.discount} en tu primera Boxie. Lo cargás en el checkout y el descuento se calcula al instante.`
        : 'Cada tanto hay promociones: seguinos en Instagram para enterarte primero.',
    },
    {
      question: '¿Puedo cambiar de plan después de comprar?',
      answer:
        'El plan se elige al comprar. Si te equivocaste de plan, escribinos por el chat de ayuda antes de bloquear la Boxie y lo vemos juntos.',
    },
  ]
}

export default async function PricingPage() {
  const sf = await getStorefront()
  const sample = sf.themes[0]?.slug ?? 'pareja'
  const editorHref = `/ejemplo/${sample}/personalizar` as Route
  const byPlans = sf.plans.length > 1

  return (
    <div className="overflow-x-clip bg-paper pb-24">
      <PageIntro
        eyebrow="Planes y precios"
        title={
          <>
            Elegí cómo <Mark>emocionar</Mark>
          </>
        }
        text={
          byPlans
            ? `Un solo pago, desde ${formatARS(sf.priceFromCents)}. Todas las temáticas traen lo mismo en cada plan: elegí cuánto querés que traiga tu regalo.`
            : `Un solo pago de ${formatARS(sf.priceFromCents)}, todo incluido, en cualquier temática.`
        }
      />

      {sf.salesPaused && (
        <p
          role="status"
          className="mx-auto mb-6 max-w-xl rounded-2xl bg-amber-50 px-4 py-3 text-center text-sm text-amber-900 ring-1 ring-amber-200"
        >
          Pausamos las ventas por un rato. Mientras tanto podés probar el editor gratis.
        </p>
      )}

      {byPlans ? (
        <section aria-label="Planes" className="px-5 sm:px-8">
          <PlanCards
            plans={sf.plans}
            hrefs={Object.fromEntries(
              sf.plans.map((p) => [p.slug, `/galeria?plan=${p.slug}` as Route]),
            )}
          />
          <PlanPromises />
        </section>
      ) : (
        <Reveal className="mx-auto max-w-md rounded-[30px] bg-white p-8 text-center shadow-[0_30px_70px_-30px_rgba(244,78,99,0.45)] ring-2 ring-brand">
          <p className="font-display text-6xl font-bold text-ink">{formatARS(sf.priceFromCents)}</p>
          <p className="mt-2 text-ink/60">
            {sf.maxScreens} pantallas, fotos, su canción y juegos. Online{' '}
            {describeLifetime(sf.lifetimeDays)}.
          </p>
          <ButtonLink href="/galeria" size="lg" block className="mt-6">
            <Gift className="size-5" aria-hidden /> Elegir mi Boxie
          </ButtonLink>
        </Reveal>
      )}

      {byPlans && sf.screens.length > 0 && (
        <section aria-labelledby="comparar-title" className="px-4 pt-20 sm:px-8 sm:pt-24">
          <SectionHeading
            eyebrow="Pantalla por pantalla"
            title={
              <span id="comparar-title">
                Qué trae <Mark>cada plan</Mark>
              </span>
            }
            text="Un plan incluye todo lo de los de abajo. Lo que ves acá es lo que va a vivir quien la reciba."
          />
          <PlanComparison
            plans={sf.plans}
            groups={comparisonOf(sf)}
            caption="Comparación de los planes de Boxie: pantallas, fotos, clave y días online"
          />
        </section>
      )}

      <section
        aria-labelledby="precios-preguntas"
        className="mx-auto mt-20 grid max-w-6xl grid-cols-1 gap-10 px-5 sm:mt-24 sm:px-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
      >
        <div>
          <SectionHeading
            align="left"
            eyebrow="Antes de elegir"
            title={
              <span id="precios-preguntas">
                Preguntas sobre los <Mark>planes</Mark>
              </span>
            }
            text="¿Te queda alguna otra? Tocá el botón de ayuda y te respondemos por chat."
            className="lg:mb-8"
          />
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <ButtonLink href="/galeria" size="lg">
              <Gift className="size-5" aria-hidden /> Elegir mi Boxie
            </ButtonLink>
            <ButtonLink href={editorHref} variant="white" size="lg">
              <Wand2 className="size-5 text-brand" aria-hidden /> Probar gratis
            </ButtonLink>
          </div>
        </div>
        <Faq items={faqsOf(sf)} />
      </section>
    </div>
  )
}
