import { DatabaseZap } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { supportCounts, type SupportTicket } from '@/domain/support'
import { adminRepo } from '@/server/admin/repo'
import { requireAdmin } from '@/server/admin/session'
import { SUPPORT_AGENT_ROLES } from '@/server/support/agent-session'
import { SupportError } from '@/server/support/repo'
import { agentTickets } from '@/server/support/service'
import { Card, EmptyState, PageHeader } from '../../_ui/primitives'
import { SupportInbox } from './SupportInbox'

export const metadata: Metadata = { title: 'Soporte' }
export const dynamic = 'force-dynamic'

/** La bandeja, o null si la base todavía no tiene el soporte (falta la migración). */
async function loadTickets(): Promise<SupportTicket[] | null> {
  try {
    return await agentTickets({ status: 'all', limit: 500 })
  } catch (error) {
    if (error instanceof SupportError && error.code === 'unavailable') return null
    throw error
  }
}

/**
 * La bandeja de soporte: las consultas de los clientes, la conversación en
 * vivo y lo que hace falta para responder (su Boxie, sus compras, el detalle
 * técnico de un error).
 */
export default async function SupportPage({ searchParams }: PageProps<'/admin/soporte'>) {
  const session = await requireAdmin('/admin/soporte')
  if (!SUPPORT_AGENT_ROLES.includes(session.role)) redirect('/admin')
  const { ticket } = await searchParams
  const [tickets, team] = await Promise.all([loadTickets(), adminRepo().then((r) => r.listTeam())])

  if (!tickets)
    return (
      <>
        <PageHeader eyebrow="Atención" title="Soporte" />
        <Card>
          <EmptyState
            icon={<DatabaseZap className="size-6" aria-hidden />}
            title="Falta conectar el soporte a la base"
            text="La base todavía no tiene las tablas de soporte. Aplicá la migración 20260926120000_support.sql (npx supabase db push) y la bandeja empieza a funcionar. Mientras tanto, el botón de ayuda del sitio avisa que el chat no está disponible."
            action={
              <Link
                href="/admin/sistema"
                className="inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white hover:bg-ink/90"
              >
                Ver qué falta en Sistema
              </Link>
            }
          />
        </Card>
      </>
    )

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
