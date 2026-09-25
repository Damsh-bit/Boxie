import 'server-only'
import { isDemoMode } from '@/server/demo'

/**
 * Qué necesita cada parte del panel de la base de datos, y qué conexiones
 * externas están configuradas. Es la lista explícita de "lo que falta para
 * pasar de la demo a producción" (se ve en Sistema y está en docs/ADMIN.md).
 */

export type DbStatus = 'exists' | 'migration' | 'pending'

export interface Capability {
  section: string
  href: string
  uses: string
  status: DbStatus
  note: string
}

export const CAPABILITIES: Capability[] = [
  {
    section: 'Login del panel',
    href: '/admin/login',
    uses: 'Supabase Auth · admin_users',
    status: 'exists',
    note: 'Crear el primer admin (docs/OPERACION.md).',
  },
  {
    section: 'Resumen y Analítica',
    href: '/admin',
    uses: 'orders · boxies · admin_kpis() · admin_sales_by_day() · admin_theme_ranking()',
    status: 'exists',
    note: 'Las funciones de analítica ya están en la base.',
  },
  {
    section: 'Ventas',
    href: '/admin/ventas',
    uses: 'orders · payment_events · admin_refund_boxie()',
    status: 'exists',
    note: 'Reembolso: la plata se devuelve en Mercado Pago; la base marca orden y Boxie.',
  },
  {
    section: 'Boxies',
    href: '/admin/boxies',
    uses: 'boxies · boxie_content · media_assets',
    status: 'exists',
    note: 'Módulos completos y última edición se calculan del contenido.',
  },
  {
    section: 'Clientes',
    href: '/admin/clientes',
    uses: 'orders (agrupadas por mail)',
    status: 'exists',
    note: '',
  },
  {
    section: 'Cupones',
    href: '/admin/cupones',
    uses: 'coupons · settings.offer_coupon_id',
    status: 'exists',
    note: '',
  },
  {
    section: 'Temáticas y Generador',
    href: '/admin/tematicas',
    uses: 'themes · theme_versions · publish_theme()',
    status: 'exists',
    note: 'Nueva columna themes.origin (de dónde salió).',
  },
  {
    section: 'Afiliados',
    href: '/admin/afiliados',
    uses: 'affiliates · coupons.affiliate_id · orders.affiliate_id',
    status: 'migration',
    note: 'Columnas nuevas: affiliates.email y notes.',
  },
  {
    section: 'Planes',
    href: '/admin/planes',
    uses: 'plans · orders.plan_id · slides[].plan en la temática',
    status: 'migration',
    note: 'Tabla nueva + el checkout tiene que cobrar el precio del plan.',
  },
  {
    section: 'Finanzas',
    href: '/admin/finanzas',
    uses: 'expenses · settings (comisiones, impuestos, meta)',
    status: 'migration',
    note: 'Tabla nueva de gastos y columnas nuevas en settings.',
  },
  {
    section: 'Configuración',
    href: '/admin/configuracion',
    uses: 'settings',
    status: 'migration',
    note: 'Columnas nuevas: costos, meta, datos del negocio, pausar ventas.',
  },
  {
    section: 'Tareas',
    href: '/admin/tareas',
    uses: 'admin_tasks',
    status: 'migration',
    note: 'Tabla nueva.',
  },
  {
    section: 'Actividad',
    href: '/admin/actividad',
    uses: 'admin_audit_log',
    status: 'migration',
    note: 'Tabla nueva: cada acción del panel deja su registro.',
  },
  {
    section: 'Equipo',
    href: '/admin/equipo',
    uses: 'admin_users (+ email, nombre, rol) · auth.admin.inviteUserByEmail',
    status: 'migration',
    note: 'Invitar necesita la API de administración de Supabase Auth.',
  },
  {
    section: 'Fotos de las temáticas',
    href: '/admin/tematicas',
    uses: 'Storage: bucket theme-media · media_assets (owner theme)',
    status: 'pending',
    note: 'Hoy las fotos se cargan por link (Unsplash o del sitio).',
  },
]

export interface Connection {
  id: string
  name: string
  what: string
  state: 'ok' | 'demo' | 'missing' | 'warning'
  detail: string
}

const has = (key: string) => Boolean(process.env[key]?.trim())

export function connections(): Connection[] {
  const demo = isDemoMode()
  const supabase = has('NEXT_PUBLIC_SUPABASE_URL') && has('SUPABASE_SERVICE_ROLE_KEY')
  const mp = process.env.PAYMENTS_PROVIDER === 'mercadopago' && has('MP_ACCESS_TOKEN')
  const defaultAdmin = demo && !has('ADMIN_DEMO_PASSWORD')
  return [
    {
      id: 'db',
      name: 'Base de datos (Supabase)',
      what: 'Órdenes, Boxies, temáticas y todo lo del panel',
      state: demo ? 'demo' : supabase ? 'ok' : 'missing',
      detail: demo
        ? 'Modo demo: el panel usa datos de muestra en memoria.'
        : supabase
          ? 'Conectada.'
          : 'Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
    },
    {
      id: 'payments',
      name: 'Pagos (Mercado Pago)',
      what: 'Cobrar y recibir los avisos de pago',
      state: demo ? 'demo' : mp ? (has('MP_WEBHOOK_SECRET') ? 'ok' : 'warning') : 'missing',
      detail: demo
        ? 'En demo el checkout no cobra.'
        : mp
          ? has('MP_WEBHOOK_SECRET')
            ? 'Access token y firma del webhook configurados.'
            : 'Falta MP_WEBHOOK_SECRET para validar los avisos.'
          : 'Falta MP_ACCESS_TOKEN (o PAYMENTS_PROVIDER no es mercadopago).',
    },
    {
      id: 'mail',
      name: 'Mails (Resend)',
      what: 'Links del editor y del regalo',
      state: has('RESEND_API_KEY') ? 'ok' : demo ? 'demo' : 'warning',
      detail: has('RESEND_API_KEY')
        ? 'Configurado.'
        : 'Sin RESEND_API_KEY los mails se escriben en el log.',
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
        ? 'Se entra con el usuario de muestra (admin@boxie.demo). En un deploy público, definí ADMIN_DEMO_PASSWORD.'
        : demo
          ? 'Usuario de demo con clave propia (ADMIN_DEMO_PASSWORD).'
          : 'Supabase Auth + admin_users.',
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
      id: 'sentry',
      name: 'Monitoreo de errores (Sentry)',
      what: 'Aviso si algo falla en producción',
      state: has('NEXT_PUBLIC_SENTRY_DSN') ? 'ok' : 'warning',
      detail: has('NEXT_PUBLIC_SENTRY_DSN')
        ? 'Configurado.'
        : 'Opcional, pero recomendado antes de vender.',
    },
  ]
}

export function runtimeInfo() {
  return {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'desconocido',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    region: process.env.VERCEL_REGION ?? null,
  }
}
