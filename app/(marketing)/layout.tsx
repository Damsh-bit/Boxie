import { isDemoMode } from '@/server/demo'
import { DemoBanner } from '@/ui/DemoBanner'
import { Footer } from '@/ui/Footer'
import { Navbar } from '@/ui/Navbar'

export default function MarketingLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      {isDemoMode() && <DemoBanner />}
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
