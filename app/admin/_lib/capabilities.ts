import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatARS, pesosToCents } from '@/domain/money'
import type { ExchangeRate } from '@/server/currency'
import { serviceDb } from '@/server/db/client'
import { isDemoMode } from '@/server/demo'

/**
 * Qué necesita cada parte del panel de la base de datos, y qué conexiones
 * externas están configuradas. Es la lista explícita de "lo que falta para
 * vender" (se ve en Sistema y está en docs/ADMIN.md).
 *
 * Con la base conectada, Sistema no confía en esta lista: verifica en vivo,
 * tabla por tabla y columna por columna, que lo que usa cada sección exista
 * (checkSchema). En demo muestra qué migración trae cada cosa.
 */

export interface DbNeed {
  table: string
  /** Columnas que llegaron con migraciones posteriores a la tabla. */
  columns?: string[]
}

export interface Capability {
  section: string
  href: string
  uses: string
  /** Migración que trae lo que usa (supabase/migrations/<migration>.sql). */
  migration: string
  needs: DbNeed[]
  note: string
  /** Funcionalidad que todavía no existe: no depende de la base. */
  pending?: boolean
}

export const CAPABILITIES: Capability[] = [
  {
    section: 'Login del panel',
    href: '/admin/login',
    uses: 'users (rol + password_hash)',
    migration: '20260925130000_users_password_hash',
    needs: [{ table: 'users', columns: ['role', 'email', 'password_hash'] }],
    note: 'Clave propia del panel (scrypt) en users: ya no depende de Supabase Auth. El primer admin se crea con npm run admin:create.',
  },
  {
    section: 'Resumen y Analítica',
    href: '/admin',
    uses: 'orders · boxies · plans · admin_boxie_stats',
    migration: '20260925120000_admin_backoffice',
    needs: [{ table: 'orders' }, { table: 'boxies' }, { table: 'admin_boxie_stats' }],
    note: 'Hoy calcula sobre las órdenes; con volumen conviene pasar a admin_kpis() y compañía.',
  },
  {
    section: 'Ventas',
    href: '/admin/ventas',
    uses: 'orders · payment_events · admin_refund_boxie()',
    migration: '20260922120000_core_schema',
    needs: [{ table: 'orders' }, { table: 'payment_events' }],
    note: 'Reembolso: la plata se devuelve en Mercado Pago; la base marca orden y Boxie.',
  },
  {
    section: 'Boxies',
    href: '/admin/boxies',
    uses: 'boxies · boxie_content · media_assets',
    migration: '20260923120000_editor',
    needs: [{ table: 'boxies' }, { table: 'boxie_content' }, { table: 'media_assets' }],
    note: 'Módulos completos y última edición se calculan del contenido.',
  },
  {
    section: 'Clientes',
    href: '/admin/clientes',
    uses: 'orders (agrupadas por mail)',
    migration: '20260922120000_core_schema',
    needs: [{ table: 'orders' }],
    note: '',
  },
  {
    section: 'Cupones',
    href: '/admin/cupones',
    uses: 'coupons · settings.offer_coupon_id',
    migration: '20260922120000_core_schema',
    needs: [{ table: 'coupons' }, { table: 'settings', columns: ['offer_coupon_id'] }],
    note: '',
  },
  {
    section: 'Temáticas y Generador',
    href: '/admin/tematicas',
    uses: 'themes · theme_versions · publish_theme()',
    migration: '20260925120000_admin_backoffice',
    needs: [{ table: 'themes', columns: ['origin'] }, { table: 'theme_versions' }],
    note: 'themes.origin guarda de dónde salió (a mano o el generador).',
  },
  {
    section: 'Afiliados',
    href: '/admin/afiliados',
    uses: 'affiliates · coupons.affiliate_id · orders.affiliate_id',
    migration: '20260925120000_admin_backoffice',
    needs: [{ table: 'affiliates', columns: ['email', 'notes'] }],
    note: '',
  },
  {
    section: 'Planes',
    href: '/admin/planes',
    uses: 'plans · orders.plan_id · slides[].plan en la temática',
    migration: '20260925120000_admin_backoffice',
    needs: [{ table: 'plans' }, { table: 'orders', columns: ['plan_id'] }],
    note: 'El checkout cobra el precio del plan (lo calcula el servidor).',
  },
  {
    section: 'Finanzas',
    href: '/admin/finanzas',
    uses: 'expenses · settings (comisiones, impuestos, meta)',
    migration: '20260925120000_admin_backoffice',
    needs: [
      { table: 'expenses' },
      { table: 'settings', columns: ['gateway_fee_bps', 'tax_bps', 'monthly_goal_cents'] },
    ],
    note: 'La inversión de las campañas de Marketing entra sola como gasto.',
  },
  {
    section: 'Configuración',
    href: '/admin/configuracion',
    uses: 'settings',
    migration: '20260925120000_admin_backoffice',
    needs: [
      {
        table: 'settings',
        columns: ['sales_paused', 'variable_cost_cents', 'business_name', 'support_email'],
      },
    ],
    note: 'Precio base, vida del regalo, oferta, pausar ventas, costos y datos del negocio.',
  },
  {
    section: 'Soporte',
    href: '/admin/soporte',
    uses: 'support_tickets · support_messages · support_post_message()',
    migration: '20260926120000_support',
    needs: [{ table: 'support_tickets' }, { table: 'support_messages' }],
    note: 'En vivo: stream SSE (bus en memoria + lectura de cambios cada 2,5 s).',
  },
  {
    section: 'Marketing',
    href: '/admin/marketing',
    uses: 'marketing_campaigns · marketing_spend · marketing_traffic · order_attribution · marketing_settings · marketing_track()',
    migration: '20260927120000_marketing',
    needs: [
      { table: 'marketing_campaigns' },
      { table: 'marketing_spend' },
      { table: 'marketing_traffic' },
      { table: 'order_attribution' },
      { table: 'marketing_settings' },
    ],
    note: 'Sin estas tablas se ve lo que sale de las ventas; la tienda no mide visitas ni el origen de las compras (y no falla).',
  },
  {
    section: 'Tareas',
    href: '/admin/tareas',
    uses: 'admin_tasks',
    migration: '20260925120000_admin_backoffice',
    needs: [{ table: 'admin_tasks' }],
    note: '',
  },
  {
    section: 'Actividad',
    href: '/admin/actividad',
    uses: 'admin_audit_log',
    migration: '20260925120000_admin_backoffice',
    needs: [{ table: 'admin_audit_log' }],
    note: 'Cada acción del panel deja su registro (no se puede editar).',
  },
  {
    section: 'Equipo',
    href: '/admin/equipo',
    uses: 'users (+ invitación con token y vencimiento)',
    migration: '20260925130000_users_password_hash',
    needs: [
      {
        table: 'users',
        columns: ['email', 'name', 'role', 'invite_token_hash', 'invite_expires_at'],
      },
    ],
    note: 'La invitación llega por mail con un link a /admin/activar (vence en 48 h); si el mail no sale, el link se copia desde el panel.',
  },
  {
    section: 'Fotos de las temáticas',
    href: '/admin/tematicas',
    uses: 'Storage: bucket theme-assets · media_assets (owner theme)',
    migration: '20260922120300_storage',
    needs: [],
    pending: true,
    note: 'El bucket existe; falta subir las fotos desde el panel (hoy se cargan por link).',
  },
]

/* ── Verificación en vivo contra la base ─────────────────────────── */

export type TableCheck =
  | { state: 'ok' }
  | { state: 'no-table' }
  | { state: 'no-columns'; columns: string[] }
  | { state: 'error'; message: string }

export type SchemaReport =
  { reachable: true; tables: Map<string, TableCheck> } | { reachable: false; error: string }

const MISSING_TABLE = new Set(['42P01', 'PGRST205'])
const MISSING_COLUMN = new Set(['42703', 'PGRST204'])

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : String(e))

async function selectNothing(db: SupabaseClient, table: string, columns: string) {
  const { error } = await db
    .from(table)
    .select(columns)
    .limit(0)
    .abortSignal(AbortSignal.timeout(5000))
  return error
}

async function checkTable(db: SupabaseClient, table: string, columns: string[]) {
  const error = await selectNothing(db, table, columns.length ? columns.join(',') : '*')
  if (!error) return { state: 'ok' } satisfies TableCheck
  const code = error.code ?? ''
  if (MISSING_TABLE.has(code)) return { state: 'no-table' } satisfies TableCheck
  if (MISSING_COLUMN.has(code) && columns.length) {
    // La tabla está: se prueba columna por columna para decir cuál falta.
    const each = await Promise.all(columns.map((c) => selectNothing(db, table, c)))
    const missing = columns.filter((_, i) => MISSING_COLUMN.has(each[i]?.code ?? ''))
    if (missing.length) return { state: 'no-columns', columns: missing } satisfies TableCheck
  }
  return { state: 'error', message: error.message || code || 'error' } satisfies TableCheck
}

/**
 * Consulta la base conectada (service role) por cada tabla y columna que usa
 * el panel. Son selects vacíos (limit 0), en paralelo: no leen datos.
 */
export async function checkSchema(): Promise<SchemaReport> {
  const wanted = new Map<string, Set<string>>()
  for (const c of CAPABILITIES)
    for (const n of c.needs) {
      const cols = wanted.get(n.table) ?? new Set<string>()
      n.columns?.forEach((col) => cols.add(col))
      wanted.set(n.table, cols)
    }

  let db: SupabaseClient
  try {
    db = serviceDb() as unknown as SupabaseClient
  } catch (e) {
    return { reachable: false, error: errorMessage(e) }
  }

  const results = await Promise.all(
    [...wanted].map(async ([table, cols]): Promise<[string, TableCheck]> => {
      try {
        return [table, await checkTable(db, table, [...cols])]
      } catch (e) {
        return [table, { state: 'error', message: errorMessage(e) }]
      }
    }),
  )
  const tables = new Map(results)
  if (results.every(([, r]) => r.state === 'error')) {
    const first = results.find(([, r]) => r.state === 'error')?.[1]
    return {
      reachable: false,
      error: first?.state === 'error' ? first.message : 'la base no respondió',
    }
  }
  return { reachable: true, tables }
}

export type DbStatus = 'ok' | 'missing' | 'unknown' | 'demo' | 'pending'

/** Estado de una sección contra el resultado de checkSchema (null = demo). */
export function capabilityStatus(
  c: Capability,
  report: SchemaReport | null,
): { status: DbStatus; detail: string | null } {
  if (c.pending) return { status: 'pending', detail: null }
  if (!report) return { status: 'demo', detail: null }
  if (!report.reachable) return { status: 'unknown', detail: report.error }

  const missing: string[] = []
  let failure: string | null = null
  for (const need of c.needs) {
    const r = report.tables.get(need.table)
    if (!r) continue
    if (r.state === 'no-table') missing.push(need.table)
    else if (r.state === 'no-columns')
      missing.push(
        ...r.columns
          .filter((col) => need.columns?.includes(col))
          .map((col) => `${need.table}.${col}`),
      )
    else if (r.state === 'error') failure ??= `${need.table}: ${r.message}`
  }
  if (missing.length)
    return {
      status: 'missing',
      detail: `Falta en la base: ${missing.join(', ')}. Se aplica con ${c.migration}.sql.`,
    }
  if (failure) return { status: 'unknown', detail: `No se pudo verificar (${failure}).` }
  return { status: 'ok', detail: null }
}

/* ── Conexiones externas ─────────────────────────────────────────── */

export interface Connection {
  id: string
  name: string
  what: string
  state: 'ok' | 'demo' | 'missing' | 'warning' | 'off'
  detail: string
}

const has = (key: string) => Boolean(process.env[key]?.trim())

/**
 * El webhook de Mercado Pago (/api/webhooks/mercadopago) todavía no existe: el
 * pago se confirma cuando el comprador vuelve al sitio (/api/checkout/return).
 * Pasar a true al sumarlo, y Sistema empieza a exigir MP_WEBHOOK_SECRET.
 */
const MP_WEBHOOK_READY = false

/**
 * log.ts reporta a Sentry, pero nada llama a Sentry.init: con el DSN solo no
 * se envía nada. Pasar a true al sumar instrumentation.ts con Sentry.init.
 */
const SENTRY_READY = false

const pesos = (n: number) => formatARS(pesosToCents(Math.round(n)))

export function connections({
  schema,
  rate,
}: {
  schema: SchemaReport | null
  rate: ExchangeRate | null
}): Connection[] {
  const demo = isDemoMode()
  const supabase = has('NEXT_PUBLIC_SUPABASE_URL') && has('SUPABASE_SERVICE_ROLE_KEY')
  const provider = process.env.PAYMENTS_PROVIDER?.trim() || 'mercadopago'
  const mp = provider === 'mercadopago' && has('MP_ACCESS_TOKEN')
  const sandbox = process.env.MP_SANDBOX?.trim() === 'true'
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '') ?? ''
  const defaultAdmin = demo && !has('ADMIN_DEMO_PASSWORD')
  const pixel = has('NEXT_PUBLIC_META_PIXEL_ID')
  const capi = has('META_CAPI_TOKEN')

  const missingInDb =
    schema?.reachable === true
      ? [...schema.tables.values()].filter(
          (t) => t.state === 'no-table' || t.state === 'no-columns',
        ).length
      : 0

  const db: Connection = {
    id: 'db',
    name: 'Base de datos (Supabase)',
    what: 'Órdenes, Boxies, temáticas y todo lo del panel',
    state: demo ? 'demo' : !supabase ? 'missing' : 'ok',
    detail: demo
      ? 'Modo demo: el panel usa datos de muestra.'
      : !supabase
        ? 'Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'
        : 'Conectada.',
  }
  if (!demo && supabase && schema) {
    if (!schema.reachable) {
      db.state = 'missing'
      db.detail = `No responde: ${schema.error}`
    } else if (missingInDb) {
      db.state = 'warning'
      db.detail = `Conectada, pero a ${missingInDb === 1 ? 'una tabla le falta' : `${missingInDb} tablas les falta`} algo de las migraciones (ver la tabla de abajo).`
    } else {
      db.detail = `Conectada: las ${schema.tables.size} tablas que usa el panel están, verificadas ahora.`
    }
  }

  let payments: Pick<Connection, 'state' | 'detail'>
  if (demo) payments = { state: 'demo', detail: 'En demo el checkout no cobra.' }
  else if (provider === 'fake')
    payments = {
      state: 'warning',
      detail:
        'Proveedor de prueba (PAYMENTS_PROVIDER=fake): "Ir a pagar" aprueba sin cobrar. En producción no se admite.',
    }
  else if (!mp)
    payments = {
      state: 'missing',
      detail: 'Falta MP_ACCESS_TOKEN (o PAYMENTS_PROVIDER no es mercadopago).',
    }
  else if (!MP_WEBHOOK_READY)
    payments = {
      state: 'warning',
      detail:
        'Cobra con Checkout Pro y confirma el pago cuando el comprador vuelve al sitio. Falta el webhook: si cierra la pestaña antes de volver, la orden queda pendiente aunque haya pagado.' +
        (sandbox ? ' MP_SANDBOX está activo (checkout de prueba viejo).' : ''),
    }
  else
    payments = has('MP_WEBHOOK_SECRET')
      ? { state: 'ok', detail: 'Access token y firma del webhook configurados.' }
      : { state: 'warning', detail: 'Falta MP_WEBHOOK_SECRET para validar los avisos.' }

  const https = site.startsWith('https://')

  return [
    db,
    {
      id: 'payments',
      name: 'Pagos (Mercado Pago)',
      what: 'Cobrar y confirmar cada pago',
      ...payments,
    },
    {
      id: 'site',
      name: 'Dominio del sitio',
      what: 'Links de los mails y vuelta desde Mercado Pago',
      state: !site ? (demo ? 'demo' : 'missing') : https ? 'ok' : demo ? 'demo' : 'warning',
      detail: !site
        ? 'Falta NEXT_PUBLIC_SITE_URL.'
        : https
          ? `${site}`
          : `${site}: sin https, Mercado Pago no devuelve al comprador al sitio y el pago no se confirma solo (normal en local).`,
    },
    {
      id: 'mail',
      name: 'Mails (Resend)',
      what: 'Link del editor, soporte e invitaciones del equipo',
      state: has('RESEND_API_KEY') ? 'ok' : demo ? 'demo' : 'missing',
      detail: has('RESEND_API_KEY')
        ? `Configurado. Sale desde ${process.env.MAIL_FROM?.trim() || 'hola@boxiedigital.com.ar'}: ese dominio tiene que estar verificado en Resend.`
        : demo
          ? 'En demo los mails quedan en el log.'
          : 'Sin RESEND_API_KEY no sale ningún mail: ni el link del editor, ni las respuestas de soporte, ni las invitaciones del equipo (quedan en el log).',
    },
    {
      id: 'secrets',
      name: 'Secretos propios',
      what: 'Firmar sesiones y cifrar el link del regalo',
      state:
        has('SESSION_SECRET') && has('TOKEN_ENCRYPTION_KEY') ? 'ok' : demo ? 'demo' : 'missing',
      detail:
        has('SESSION_SECRET') && has('TOKEN_ENCRYPTION_KEY')
          ? 'SESSION_SECRET y TOKEN_ENCRYPTION_KEY configurados.'
          : 'Faltan SESSION_SECRET y/o TOKEN_ENCRYPTION_KEY.',
    },
    {
      id: 'admin',
      name: 'Acceso al panel',
      what: 'Quién puede entrar',
      state: defaultAdmin ? 'warning' : 'ok',
      detail: defaultAdmin
        ? 'Se entra con el usuario de muestra (admin@boxie.demo). En un deploy esa clave no sirve: sin ADMIN_DEMO_PASSWORD el panel queda cerrado.'
        : demo
          ? 'Usuario de demo con clave propia (ADMIN_DEMO_PASSWORD).'
          : 'Clave propia del panel (scrypt) en users, con roles. El equipo entra por invitación (/admin/activar).',
    },
    {
      id: 'host',
      name: 'Subdominio del panel',
      what: 'admin.boxiedigital.com.ar',
      state: has('ADMIN_HOST') ? 'ok' : 'warning',
      detail: has('ADMIN_HOST')
        ? `El panel solo responde en ${process.env.ADMIN_HOST}.`
        : 'Sin ADMIN_HOST el panel responde en /admin del dominio principal.',
    },
    {
      id: 'currency',
      name: 'Cotización del dólar (DolarApi)',
      what: 'Precios de referencia en USD en la tienda',
      state: !rate ? 'warning' : rate.source === 'dolarapi' ? 'ok' : 'warning',
      detail: !rate
        ? 'No se pudo consultar.'
        : rate.source === 'dolarapi'
          ? `1 USD = ${pesos(rate.rate)} (oficial, se actualiza cada hora). Se cobra siempre en pesos.`
          : `DolarApi no responde: se usa la tasa de respaldo (${pesos(rate.rate)}). Se cobra siempre en pesos.`,
    },
    {
      id: 'meta',
      name: 'Píxel de Meta y API de conversiones',
      what: 'Que Meta optimice los anuncios por ventas',
      state: !pixel ? 'off' : !capi ? 'warning' : has('META_TEST_EVENT_CODE') ? 'warning' : 'ok',
      detail: !pixel
        ? 'Apagados. Antes de prenderlos, actualizar la Política de privacidad (hoy dice que no se comparten datos para publicidad).'
        : !capi
          ? 'El píxel está prendido; falta META_CAPI_TOKEN para mandar las compras desde el servidor.'
          : has('META_TEST_EVENT_CODE')
            ? 'Prendidos, pero con META_TEST_EVENT_CODE: los eventos van a "Probar eventos". Sacarlo en producción.'
            : 'Píxel y API de conversiones prendidos.',
    },
    {
      id: 'sentry',
      name: 'Monitoreo de errores (Sentry)',
      what: 'Aviso si algo falla en producción',
      state: SENTRY_READY && has('NEXT_PUBLIC_SENTRY_DSN') ? 'ok' : 'warning',
      detail: !SENTRY_READY
        ? has('NEXT_PUBLIC_SENTRY_DSN')
          ? 'El DSN está, pero Sentry nunca se inicializa (falta instrumentation.ts con Sentry.init): hoy no se reporta nada.'
          : 'Sin configurar. Además del DSN falta inicializarlo en el código (instrumentation.ts). Recomendado antes de vender.'
        : has('NEXT_PUBLIC_SENTRY_DSN')
          ? 'Configurado.'
          : 'Falta NEXT_PUBLIC_SENTRY_DSN. Recomendado antes de vender.',
    },
  ]
}

export function runtimeInfo() {
  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'desconocido',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    region: process.env.VERCEL_REGION ?? null,
    site: process.env.NEXT_PUBLIC_SITE_URL?.trim() || null,
    payments: isDemoMode()
      ? 'Sin cobro (demo)'
      : process.env.PAYMENTS_PROVIDER === 'fake'
        ? 'Proveedor de prueba'
        : process.env.MP_SANDBOX?.trim() === 'true'
          ? 'Mercado Pago (sandbox)'
          : 'Mercado Pago',
  }
}
