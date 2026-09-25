import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { supportCounts } from '@/domain/support'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { SUPPORT_AGENT_ROLES } from '@/server/support/agent-session'
import { agentTickets } from '@/server/support/service'
import { PageHeader } from '../../_ui/primitives'
import { SupportInbox } from './SupportInbox'

export const metadata: Metadata = { title: 'Soporte' }
export const dynamic = 'force-dynamic'

/**
 * La bandeja de soporte: las consultas de los clientes, la conversación en
 * vivo y lo que hace falta para responder (su Boxie, sus compras, el detalle
 * técnico de un error).
 */
export default async function SupportPage({ searchParams }: PageProps<'/admin/soporte'>) {
  const session = await requireAdmin('/admin/soporte')
  if (!SUPPORT_AGENT_ROLES.includes(session.role)) redirect('/admin')
  const { ticket } = await searchParams
  const [tickets, team] = await Promise.all([
    agentTickets({ status: 'all', limit: 500 }),
    adminRepo().then((r) => r.listTeam()),
  ])
  const counts = supportCounts(tickets, new Date())

  return (
    <>
      <PageHeader
        eyebrow="Atención"
        title="Soporte"
        description={
          counts.open
            ? `${counts.open} ${counts.open === 1 ? 'consulta espera' : 'consultas esperan'} respuesta${counts.overdue ? ` · ${counts.overdue} ${counts.overdue === 1 ? 'atrasada' : 'atrasadas'}` : ''}.`
            : 'Al día: ninguna consulta espera respuesta.'
        }
      />
      <SupportInbox
        initialTickets={tickets}
        initialTicketId={typeof ticket === 'string' ? ticket : null}
        me={{ email: session.email, name: session.name }}
        team={team
          .filter((m) => !m.pending && SUPPORT_AGENT_ROLES.includes(m.role))
          .map((m) => ({ email: m.email, name: m.name }))}
      />
    </>
  )
}
