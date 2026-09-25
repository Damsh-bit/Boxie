import {
  Activity,
  ChartLine,
  Gift,
  Handshake,
  LayoutDashboard,
  Layers,
  Palette,
  Plug,
  Settings,
  ShoppingBag,
  SquareKanban,
  TicketPercent,
  Users,
  UsersRound,
  Wallet,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react'
import type { Route } from 'next'
import type { AdminRole } from '@/domain/admin/types'

/**
 * Las secciones del panel. `roles` limita quién las ve (sin `roles`, todos).
 * El orden es el del menú.
 */

export interface NavItem {
  href: Route
  label: string
  icon: LucideIcon
  /** Descripción corta (buscador y ayudas). */
  hint: string
  roles?: AdminRole[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

const MONEY: AdminRole[] = ['owner', 'admin']
const CONTENT: AdminRole[] = ['owner', 'admin', 'editor']
const SUPPORT: AdminRole[] = ['owner', 'admin', 'support']

export const NAV: NavGroup[] = [
  {
    label: 'Negocio',
    items: [
      {
        href: '/admin',
        label: 'Resumen',
        icon: LayoutDashboard,
        hint: 'El tablero: ventas, rentabilidad y alertas',
      },
      {
        href: '/admin/finanzas',
        label: 'Finanzas',
        icon: Wallet,
        hint: 'Estado de resultados, gastos y punto de equilibrio',
        roles: MONEY,
      },
      {
        href: '/admin/analitica',
        label: 'Analítica',
        icon: ChartLine,
        hint: 'Embudo, horarios, temáticas y cohortes',
        roles: MONEY,
      },
    ],
  },
  {
    label: 'Ventas',
    items: [
      {
        href: '/admin/ventas',
        label: 'Ventas',
        icon: ShoppingBag,
        hint: 'Órdenes, pagos y reembolsos',
        roles: SUPPORT,
      },
      {
        href: '/admin/boxies',
        label: 'Boxies',
        icon: Gift,
        hint: 'Buscar por código, mail o destinatario; soporte',
        roles: SUPPORT,
      },
      {
        href: '/admin/clientes',
        label: 'Clientes',
        icon: Users,
        hint: 'Quién compra, cuánto y cada cuánto',
        roles: SUPPORT,
      },
      {
        href: '/admin/cupones',
        label: 'Cupones',
        icon: TicketPercent,
        hint: 'Descuentos, topes, vencimientos y la oferta de la ficha',
        roles: MONEY,
      },
      {
        href: '/admin/afiliados',
        label: 'Afiliados',
        icon: Handshake,
        hint: 'Códigos de creadores y comisiones',
        roles: MONEY,
      },
    ],
  },
  {
    label: 'Producto',
    items: [
      {
        href: '/admin/tematicas',
        label: 'Temáticas',
        icon: Palette,
        hint: 'Catálogo, módulos, ficha y versiones',
        roles: CONTENT,
      },
      {
        href: '/admin/generador',
        label: 'Generador',
        icon: WandSparkles,
        hint: 'Crear temáticas en lote desde una lista',
        roles: CONTENT,
      },
      {
        href: '/admin/planes',
        label: 'Planes',
        icon: Layers,
        hint: 'Precios por nivel y qué incluye cada uno',
        roles: MONEY,
      },
    ],
  },
  {
    label: 'Equipo',
    items: [
      {
        href: '/admin/tareas',
        label: 'Tareas',
        icon: SquareKanban,
        hint: 'El tablero de trabajo del equipo',
      },
      {
        href: '/admin/actividad',
        label: 'Actividad',
        icon: Activity,
        hint: 'Quién hizo qué y cuándo',
      },
      {
        href: '/admin/equipo',
        label: 'Equipo',
        icon: UsersRound,
        hint: 'Administradores, roles e invitaciones',
        roles: ['owner'],
      },
    ],
  },
  {
    label: 'Ajustes',
    items: [
      {
        href: '/admin/configuracion',
        label: 'Configuración',
        icon: Settings,
        hint: 'Precio base, comisiones, oferta y datos del negocio',
        roles: MONEY,
      },
      {
        href: '/admin/sistema',
        label: 'Sistema',
        icon: Plug,
        hint: 'Conexiones y qué falta para la base real',
      },
    ],
  },
]

export function navFor(role: AdminRole): NavGroup[] {
  return NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.roles || i.roles.includes(role)),
  })).filter((g) => g.items.length > 0)
}

export function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}
