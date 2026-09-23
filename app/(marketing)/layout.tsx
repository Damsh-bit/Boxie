import { isDemoMode } from '@/server/demo'
import { Footer } from '@/ui/Footer'
import { Navbar } from '@/ui/Navbar'

export default function MarketingLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      {isDemoMode() && (
        <div className="fixed inset-x-0 bottom-0 z-[60] bg-ink/95 px-4 py-2 text-center text-xs text-white backdrop-blur">
          Versión de demostración · el catálogo y los precios son reales, el cobro todavía está
          desactivado.
        </div>
      )}
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
