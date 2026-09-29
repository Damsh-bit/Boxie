import { businessContact } from '@/domain/business'
import { getBusinessInfo } from '@/server/catalog'
import { getUsdExchangeRate } from '@/server/currency'
import { isDemoMode } from '@/server/demo'
import { CurrencyProvider } from '@/ui/currency/CurrencyContext'
import { DemoBanner } from '@/ui/DemoBanner'
import { Footer } from '@/ui/Footer'
import { Navbar } from '@/ui/Navbar'
import { SupportWidget } from '@/ui/support/SupportWidget'

export default async function MarketingLayout({ children }: LayoutProps<'/'>) {
  // Los datos de contacto del pie salen de la Configuración del panel.
  const [businessInfo, exchangeRate] = await Promise.all([getBusinessInfo(), getUsdExchangeRate()])
  const contact = businessContact(businessInfo, 'Hola Ribbly 👋 Tengo una consulta')
  return (
    <CurrencyProvider initialRate={exchangeRate.rate}>
      {isDemoMode() && <DemoBanner />}
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer contact={contact} />
      <SupportWidget />
    </CurrencyProvider>
  )
}
