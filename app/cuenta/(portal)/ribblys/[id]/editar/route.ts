import type { Route } from 'next'
import { redirect } from 'next/navigation'
import { getOrRotateEditorUrl } from '@/server/customer/data'
import { requireCustomerSession } from '@/server/customer/session'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  // Rotar el link del editor cambia estado: que no lo dispare otro sitio por
  // detrás (un <img>, un fetch) con la sesión del cliente. Un clic desde un
  // mail es navegación y sigue andando.
  const crossSite = request.headers.get('sec-fetch-site') === 'cross-site'
  const navigation = request.headers.get('sec-fetch-mode') === 'navigate'
  if (crossSite && !navigation) redirect('/cuenta')

  const params = await props.params
  if (!UUID.test(params.id)) redirect('/cuenta')
  const session = await requireCustomerSession('/cuenta')
  const editorUrl = await getOrRotateEditorUrl(params.id, session.email)
  redirect(editorUrl as unknown as Route)
}
