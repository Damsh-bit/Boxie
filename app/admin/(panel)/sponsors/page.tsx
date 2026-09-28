import type { Metadata } from 'next'
import { requireAdmin } from '@/server/admin/session'
import { sponsorsRepo } from '@/server/sponsors/repo'
import { PageHeader } from '../../_ui/primitives'
import { SponsorsBoard } from './SponsorsBoard'

export const metadata: Metadata = { title: 'Sponsors' }

export default async function SponsorsPage() {
  await requireAdmin('/admin/sponsors')
  const repo = await sponsorsRepo()
  const { available, sponsors } = await repo.list()

  return (
    <>
      <PageHeader
        eyebrow="Negocio"
        title="Sponsors"
        description="Marcas y comercios aliados: de un contacto nuevo a una campaña activa. Un sponsor activo y dentro de sus fechas aparece en los lugares del sitio que le elijas; sin ninguno, esos lugares invitan a sumarse."
      />
      <SponsorsBoard sponsors={sponsors} available={available} demo={repo.mode === 'demo'} />
    </>
  )
}
