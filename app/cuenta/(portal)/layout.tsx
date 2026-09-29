import Link from 'next/link'
import { Gift, PackageCheck, HelpCircle } from 'lucide-react'
import { requireCustomerSession } from '@/server/customer/session'
import { CustomerLogoutButton } from './CustomerLogoutButton'

export default async function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireCustomerSession('/cuenta')

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF8F5]">
      {/* Barra de navegación del Portal de Clientes */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-8">
            <Link href="/cuenta" className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-brand text-white shadow-sm shadow-brand/30">
                <Gift className="size-5" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-ink">
                Boxie{' '}
                <span className="text-xs font-semibold tracking-wider text-brand uppercase">
                  Cliente
                </span>
              </span>
            </Link>

            <nav className="hidden items-center gap-1 sm:flex">
              <Link
                href="/cuenta"
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-neutral-100"
              >
                <Gift className="size-4 text-brand" /> Mis Boxies
              </Link>
              <Link
                href="/cuenta/pedidos"
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
              >
                <PackageCheck className="size-4 text-neutral-500" /> Mis Compras
              </Link>
              <Link
                href="/soporte"
                className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-100"
              >
                <HelpCircle className="size-4 text-neutral-500" /> Ayuda
              </Link>
            </nav>
          </div>

          {/* Perfil del Cliente */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              {session.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.avatarUrl}
                  alt={session.name}
                  className="size-8 rounded-full border border-line object-cover"
                />
              ) : (
                <div className="grid size-8 place-items-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                  {session.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="hidden text-left sm:block">
                <p className="text-xs leading-tight font-bold text-ink">{session.name}</p>
                <p className="text-[10px] leading-tight text-neutral-500">{session.email}</p>
              </div>
            </div>

            <CustomerLogoutButton />
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  )
}
