import { businessContact } from '@/domain/business'
import { getBusinessInfo } from '@/server/catalog'
import { isDemoMode } from '@/server/demo'
import { DemoBanner } from '@/ui/DemoBanner'
import { Footer } from '@/ui/Footer'
import { Navbar } from '@/ui/Navbar'

export default async function MarketingLayout({ children }: LayoutProps<'/'>) {
  // Los datos de contacto del pie salen de la Configuración del panel.
  const contact = businessContact(await getBusinessInfo(), 'Hola Boxie 👋 Tengo una consulta')
  return (
    <>
      {isDemoMode() && <DemoBanner />}
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer contact={contact} />
    </>
  )
}
