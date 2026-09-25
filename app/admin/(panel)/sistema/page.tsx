import {
  CircleCheck,
  CircleDashed,
  Database,
  FileCode2,
  Plug,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import type { Metadata, Route } from 'next'
import Link from 'next/link'
import { adminRepo } from '@/server/admin/repo'
import { demoPersistence } from '@/server/admin/demo/store'
import { requireAdmin } from '@/server/admin/session'
import { CAPABILITIES, connections, runtimeInfo, type DbStatus } from '../../_lib/capabilities'
import { Badge, Card, CardHeader, PageHeader, type Tone } from '../../_ui/primitives'

export const metadata: Metadata = { title: 'Sistema' }

const STATE = {
  ok: { label: 'Listo', tone: 'good', icon: CircleCheck },
  demo: { label: 'Demo', tone: 'warning', icon: CircleDashed },
  warning: { label: 'Revisar', tone: 'warning', icon: TriangleAlert },
  missing: { label: 'Falta', tone: 'critical', icon: XCircle },
} as const

const DB: Record<DbStatus, { label: string; tone: Tone }> = {
  exists: { label: 'Ya está en la base', tone: 'good' },
  migration: { label: 'Migración nueva lista', tone: 'info' },
  pending: { label: 'Pendiente', tone: 'warning' },
}

export default async function SystemPage() {
  await requireAdmin('/admin/sistema')
  const repo = await adminRepo()
  const list = connections()
  const info = runtimeInfo()
  const demo = repo.mode === 'demo'

  return (
    <>
      <PageHeader
        eyebrow="Ajustes"
        title="Sistema"
        description="Qué está conectado, qué falta y qué parte del panel depende de la base de datos."
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
                <span
                  className={
                    c.state === 'ok'
                      ? 'grid size-10 shrink-0 place-items-center rounded-xl bg-[#e7f6e7] text-good-ink'
                      : c.state === 'missing'
                        ? 'grid size-10 shrink-0 place-items-center rounded-xl bg-[#fdeaea] text-critical'
                        : 'grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff4d6] text-[#8a6300]'
                  }
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                    {c.name}
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </p>
                  <p className="text-xs text-neutral-500">{c.what}</p>
                  <p className="mt-2 text-sm text-neutral-700">{c.detail}</p>
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
            description="“Migración nueva lista” = el archivo supabase/migrations/20260925120000_admin_backoffice.sql, probado sobre Postgres, que hay que aplicar al conectar."
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
              {CAPABILITIES.map((c) => (
                <tr key={c.section} className="border-b border-line last:border-0">
                  <th scope="row" className="px-6 py-3 text-left font-semibold">
                    <Link href={c.href as Route} className="text-ink hover:text-brand">
                      {c.section}
                    </Link>
                  </th>
                  <td className="px-3 py-3 font-mono text-xs text-neutral-600">{c.uses}</td>
                  <td className="px-3 py-3">
                    <Badge tone={DB[c.status].tone}>{DB[c.status].label}</Badge>
                  </td>
                  <td className="px-6 py-3 text-neutral-600">{c.note || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card delay={0.25}>
          <CardHeader
            icon={<FileCode2 />}
            title="Para conectar Supabase"
            description="En orden; el detalle está en docs/ADMIN.md"
          />
          <ol className="space-y-2.5 text-sm text-neutral-700">
            {[
              'Crear (o liberar) el proyecto en Supabase, región São Paulo.',
              'Aplicar las migraciones: npx supabase link y npx supabase db push (incluye admin_backoffice).',
              'Crear el primer admin en Authentication y sumarlo a admin_users con rol owner.',
              'Cargar en Vercel NEXT_PUBLIC_SUPABASE_URL, la anon key, SUPABASE_SERVICE_ROLE_KEY, SESSION_SECRET y TOKEN_ENCRYPTION_KEY.',
              'Sacar DEMO_MODE: el panel pasa solo a src/server/admin/supabase-repo.ts (ya implementado).',
              'Entrar con el admin real y recorrer el panel una vez (checklist en docs/ADMIN.md).',
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
        <Card delay={0.3}>
          <CardHeader title="Esta instalación" />
          <dl className="space-y-2 text-sm">
            {[
              ['Modo', demo ? 'Demo (datos de muestra)' : 'Producción (Supabase)'],
              ['Entorno', info.environment],
              ['Versión', info.commit ?? 'local'],
              ['Región', info.region ?? '—'],
              [
                'Datos de demo',
                demo ? (demoPersistence === 'archivo' ? 'En archivo local' : 'En memoria') : '—',
              ],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-neutral-600">{k}</dt>
                <dd className="font-semibold text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  )
}
