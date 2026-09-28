import {
  CircleCheck,
  CircleDashed,
  CircleOff,
  Database,
  FileCode2,
  ListChecks,
  Plug,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { adminRepo } from '@/server/admin/repo'
import { demoPersistence } from '@/server/admin/demo/store'
import { requireAdmin } from '@/server/admin/session'
import { getUsdExchangeRate } from '@/server/currency'
import {
  CAPABILITIES,
  capabilityStatus,
  checkSchema,
  connections,
  runtimeInfo,
  type Connection,
  type DbStatus,
} from '../../_lib/capabilities'
import { Badge, Card, CardHeader, PageHeader, type Tone } from '../../_ui/primitives'

export const metadata: Metadata = { title: 'Sistema' }

const STATE: Record<
  Connection['state'],
  { label: string; tone: Tone; icon: typeof CircleCheck; box: string }
> = {
  ok: { label: 'Listo', tone: 'good', icon: CircleCheck, box: 'bg-[#e7f6e7] text-good-ink' },
  demo: { label: 'Demo', tone: 'warning', icon: CircleDashed, box: 'bg-[#fff4d6] text-[#8a6300]' },
  warning: {
    label: 'Revisar',
    tone: 'warning',
    icon: TriangleAlert,
    box: 'bg-[#fff4d6] text-[#8a6300]',
  },
  missing: { label: 'Falta', tone: 'critical', icon: XCircle, box: 'bg-[#fdeaea] text-critical' },
  off: {
    label: 'Apagado',
    tone: 'neutral',
    icon: CircleOff,
    box: 'bg-neutral-100 text-neutral-500',
  },
}

const DB: Record<DbStatus, { label: string; tone: Tone }> = {
  ok: { label: 'En la base', tone: 'good' },
  missing: { label: 'Falta migración', tone: 'critical' },
  unknown: { label: 'Sin verificar', tone: 'warning' },
  demo: { label: 'Migración lista', tone: 'info' },
  pending: { label: 'Por hacer', tone: 'warning' },
}

const CONNECT_STEPS = [
  'Crear el proyecto en Supabase (conviene São Paulo, al lado de las funciones de Vercel en gru1).',
  'Aplicar las migraciones: npx supabase link y npx supabase db push (son 10; la última es marketing).',
  'Crear el primer admin con npm run admin:create -- <mail> <clave> <nombre> owner (guarda la clave en users; no hace falta Supabase Auth).',
  'Cargar en Vercel NEXT_PUBLIC_SITE_URL, las de Supabase, SESSION_SECRET, TOKEN_ENCRYPTION_KEY, MP_ACCESS_TOKEN y RESEND_API_KEY.',
  'Sacar DEMO_MODE: el panel pasa solo a la base real y esta página la verifica en vivo.',
  'Sumar al equipo desde Equipo: a cada uno le llega la invitación por mail.',
]

const FIRST_RUN_CHECKS = [
  'Planes y precio base (Configuración) con los precios de venta reales.',
  'Una compra real de punta a punta: la orden en Ventas con su plan, la Boxie en Boxies y el mail del editor en la casilla.',
  'Reembolsar esa compra en Mercado Pago y marcarla en Ventas: el regalo deja de abrirse.',
  'Invitar a alguien del equipo y activar la cuenta desde el mail.',
  'Abrir una consulta desde el botón de ayuda y responderla desde Soporte.',
  'Borrar las órdenes, Boxies y clientes de prueba antes de abrir la venta.',
]

export default async function SystemPage() {
  await requireAdmin('/admin/sistema')
  const repo = await adminRepo()
  const demo = repo.mode === 'demo'
  const [schema, rate] = await Promise.all([
    demo ? Promise.resolve(null) : checkSchema(),
    getUsdExchangeRate().catch(() => null),
  ])
  const list = connections({ schema, rate })
  const info = runtimeInfo()
  const rows = CAPABILITIES.map((c) => ({ ...c, ...capabilityStatus(c, schema) }))
  const pending = list.filter((c) => c.state === 'missing' || c.state === 'warning').length

  return (
    <>
      <PageHeader
        eyebrow="Ajustes"
        title="Sistema"
        description={
          demo
            ? 'Qué está conectado, qué falta y qué parte del panel depende de la base de datos.'
            : `Qué está conectado y qué falta, verificado ahora contra la base y las variables de este deploy.${
                pending
                  ? ` ${pending === 1 ? 'Queda 1 cosa' : `Quedan ${pending} cosas`} por revisar.`
                  : ''
              }`
        }
      />

      {demo && (
        <Card className="mb-5 border-[#f3d27a] bg-[#fff8e1]">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold/40 text-[#6b5000]">
              <Database className="size-5" aria-hidden />
            </span>
            <div className="text-sm text-[#5c4a00]">
              <p className="text-base font-semibold">El panel está en modo demo</p>
              <p className="mt-1">
                Todo lo que ves son datos de muestra (un año de ventas simuladas) y los cambios se
                guardan en{' '}
                {demoPersistence === 'archivo'
                  ? 'un archivo local (.cache/admin-demo-db.json): sobreviven a reiniciar el servidor.'
                  : 'la memoria del servidor: en un deploy pueden perderse al reiniciarse la instancia.'}{' '}
                Al conectar Supabase, el mismo panel pasa a leer y escribir la base real, sin
                cambiar nada de la interfaz.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {list.map((c, i) => {
          const s = STATE[c.state]
          const Icon = s.icon
          return (
            <Card key={c.id} delay={i * 0.04}>
              <div className="flex items-start gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${s.box}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {c.name}
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </p>
                  <p className="text-xs text-neutral-500">{c.what}</p>
                  <p className="mt-2 text-sm break-words text-neutral-700">{c.detail}</p>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="mt-5" padded={false} delay={0.2}>
        <div className="p-5 pb-3 sm:p-6 sm:pb-3">
          <CardHeader
            className="mb-0"
            icon={<Plug />}
            title="Qué necesita la base, sección por sección"
            description={
              demo
                ? 'En demo no hay base que verificar: cada fila dice qué migración (supabase/migrations) trae lo que usa.'
                : schema?.reachable
                  ? 'Verificado en vivo: cada tabla y columna que usa cada sección, consultada recién en la base conectada.'
                  : 'No se pudo consultar la base: revisá la conexión de arriba.'
            }
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-y border-line bg-canvas/60 text-left text-xs text-neutral-500">
                <th scope="col" className="px-6 py-2.5 font-semibold">
                  Sección
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Usa
                </th>
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Estado
                </th>
                <th scope="col" className="px-6 py-2.5 font-semibold">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.section} className="border-b border-line last:border-0">
                  <th scope="row" className="px-6 py-3 text-left align-top font-semibold">
                    <Link href={c.href as Route} className="text-ink hover:text-brand">
                      {c.section}
                    </Link>
                  </th>
                  <td className="px-3 py-3 align-top font-mono text-xs text-neutral-600">
                    {c.uses}
                    <span className="mt-1 block text-[11px] text-neutral-400">{c.migration}</span>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge tone={DB[c.status].tone}>{DB[c.status].label}</Badge>
                  </td>
                  <td
                    className={
                      c.status === 'missing'
                        ? 'px-6 py-3 align-top font-medium text-critical'
                        : c.status === 'unknown'
                          ? 'px-6 py-3 align-top text-[#8a6300]'
                          : 'px-6 py-3 align-top text-neutral-600'
                    }
                  >
                    {c.detail ?? (c.note || '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {demo ? (
          <Card delay={0.25}>
            <CardHeader
              icon={<FileCode2 />}
              title="Para conectar Supabase"
              description="En orden; el detalle está en docs/ADMIN.md"
            />
            <ol className="space-y-2.5 text-sm text-neutral-700">
              {CONNECT_STEPS.map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>
        ) : (
          <Card delay={0.25}>
            <CardHeader
              icon={<ListChecks />}
              title="Antes de abrir la venta"
              description="Lo que no se puede verificar solo: recorrerlo una vez con la base real (docs/ADMIN.md)."
            />
            <ul className="space-y-2.5 text-sm text-neutral-700">
              {FIRST_RUN_CHECKS.map((step) => (
                <li key={step} className="flex gap-3">
                  <span
                    className="mt-0.5 size-4 shrink-0 rounded border-2 border-line"
                    aria-hidden
                  />
                  {step}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card delay={0.3}>
          <CardHeader title="Esta instalación" />
          <dl className="space-y-2 text-sm">
            {[
              ['Modo', demo ? 'Demo (datos de muestra)' : 'Producción (Supabase)'],
              ['Entorno', info.environment],
              ['Sitio', info.site ?? '—'],
              ['Pagos', info.payments],
              ['Versión', info.commit ?? 'local'],
              ['Región de las funciones', info.region ?? '—'],
              [
                'Datos de demo',
                demo ? (demoPersistence === 'archivo' ? 'En archivo local' : 'En memoria') : '—',
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="shrink-0 text-neutral-600">{k}</dt>
                <dd className="min-w-0 text-right font-semibold break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  )
}
