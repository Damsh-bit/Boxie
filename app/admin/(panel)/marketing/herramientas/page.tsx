import { Calculator, CircleCheck, CircleDashed, FlaskConical, Link2, Radar } from 'lucide-react'
import type { Metadata } from 'next'
import { siteUrl } from '@/content/site'
import { requireAdmin } from '@/server/admin/session'
import { Badge, Card, CardHeader, PageHeader } from '../../../_ui/primitives'
import { loadMarketing } from '../_lib/load'
import { MarketingNav } from '../_ui/MarketingNav'
import { AbCalculator, QuickCalculator, UtmBuilder } from './Tools'

export const metadata: Metadata = { title: 'Herramientas · Marketing' }

export default async function ToolsPage({
  searchParams,
}: PageProps<'/admin/marketing/herramientas'>) {
  await requireAdmin('/admin/marketing/herramientas')
  const ctx = await loadMarketing(await searchParams, '30d')
  const { m, data, base } = ctx

  const destinations = [
    { path: '/', label: 'Inicio' },
    ...data.themes
      .filter((t) => t.status === 'published')
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((t) => ({ path: `/tematicas/${t.slug}`, label: `Temática · ${t.name}` })),
    { path: '/precios', label: 'Precios' },
    { path: '/galeria', label: 'Galería de temáticas' },
  ]
  const campaigns = m.campaigns
    .filter((c) => c.status !== 'draft')
    .map((c) => ({ utm: c.utmCampaign, name: c.name }))

  const pixel = Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim())
  const capi = pixel && Boolean(process.env.META_CAPI_TOKEN?.trim())
  const tracked = m.traffic.length > 0
  const withOrigin = m.attributions.length > 0
  const checks: { ok: boolean; title: string; detail: string }[] = [
    {
      ok: true,
      title: 'Origen de cada visita',
      detail:
        'La tienda guarda de dónde llega cada persona (UTM, identificadores de clic de Google y TikTok, sitio de origen) sin cookies y respetando "no rastrear".',
    },
    {
      ok: m.available,
      title: 'Base de marketing',
      detail: m.available
        ? 'Campañas, inversión, visitas y el origen de las órdenes se guardan en la base.'
        : 'Falta aplicar la migración 20260927120000_marketing.sql (Sistema).',
    },
    {
      ok: m.available && tracked,
      title: 'Visitas medidas',
      detail: tracked
        ? 'Llegan visitas al contador (por día, origen, dispositivo y página de entrada).'
        : 'Todavía no llegó ninguna visita medida.',
    },
    {
      ok: m.available && withOrigin,
      title: 'Origen de las compras',
      detail: withOrigin
        ? 'El checkout manda el primer y el último origen con cada orden.'
        : 'Todavía no hay órdenes con origen (las anteriores a la medición quedan "sin datos").',
    },
    {
      ok: pixel,
      title: 'Píxel de Meta',
      detail: pixel
        ? 'Activo: cuenta visitas, fichas vistas e inicios de pago (respeta "no rastrear").'
        : 'Se activa con NEXT_PUBLIC_META_PIXEL_ID. Antes, actualizar la Política de Privacidad: hoy dice que no se comparten datos con terceros para publicidad.',
    },
    {
      ok: capi,
      title: 'API de conversiones de Meta',
      detail: capi
        ? 'Activa: cada compra acreditada le llega a Meta desde el servidor (mail y teléfono cifrados), para que optimice por ventas.'
        : 'Se activa con META_CAPI_TOKEN (y el ID del píxel). Es lo que le permite a Meta optimizar por compras y no por clics.',
    },
    {
      ok: false,
      title: 'Conversión de Google Ads',
      detail:
        'Pendiente: con la etiqueta de conversión (o importando las compras) Google puja por ventas.',
    },
  ]

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Herramientas"
        description="Lo de todos los días: armar links que se midan bien, saber si una prueba ganó y hacer cuentas rápidas."
      >
        <MarketingNav />
      </PageHeader>

      <Card delay={0.05}>
        <CardHeader
          icon={<Link2 />}
          title="Constructor de links"
          description="Links con UTM para anuncios, creadoras, la bio y las difusiones"
        />
        <UtmBuilder baseUrl={siteUrl()} destinations={destinations} campaigns={campaigns} />
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card delay={0.1}>
          <CardHeader
            icon={<FlaskConical />}
            title="Prueba A/B"
            description="Dos anuncios, dos páginas o dos precios: ¿la diferencia es real?"
          />
          <AbCalculator />
        </Card>
        <Card delay={0.14}>
          <CardHeader
            icon={<Radar />}
            title="Medición"
            description="Qué se está midiendo y qué falta"
          />
          <ul className="space-y-2.5">
            {checks.map((c) => (
              <li key={c.title} className="flex items-start gap-3 rounded-2xl bg-canvas p-3">
                {c.ok ? (
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-good" aria-hidden />
                ) : (
                  <CircleDashed className="mt-0.5 size-5 shrink-0 text-neutral-400" aria-hidden />
                )}
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
                    {c.title}
                    <Badge tone={c.ok ? 'good' : 'neutral'}>{c.ok ? 'Listo' : 'Pendiente'}</Badge>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-600">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-5" delay={0.14}>
        <CardHeader
          icon={<Calculator />}
          title="Calculadora rápida"
          description="Con lo que dice el administrador de anuncios, todos los indicadores de una"
        />
        <QuickCalculator contributionMargin={base.contributionMargin} />
      </Card>
    </>
  )
}
