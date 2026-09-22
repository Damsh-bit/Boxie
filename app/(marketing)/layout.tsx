import { Footer } from '@/ui/Footer'
import { Navbar } from '@/ui/Navbar'

export default function MarketingLayout({ children }: LayoutProps<'/'>) {
  return (
    <>
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
