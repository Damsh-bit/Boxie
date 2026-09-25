import type { Metadata } from 'next'
import { SUPPORT_TOPICS, type SupportTopic } from '@/domain/support'
import { PageIntro } from '../_components/PageIntro'
import { Mark } from '../_home/primitives'
import { SupportCenterPage } from './SupportCenterPage'

export const metadata: Metadata = {
  title: 'Soporte',
  description: 'Tus consultas con el equipo de Boxie: seguí la conversación y abrí una nueva.',
  robots: { index: false, follow: false },
}

const one = (v: string | string[] | undefined) => (typeof v === 'string' ? v : null)

/**
 * El centro de soporte (/soporte): las consultas de este navegador y la
 * conversación en vivo. Adonde llevan los links de los mails
 * (/soporte/<token> deja la cookie y vuelve acá con ?consulta=).
 */
export default async function SupportPage({ searchParams }: PageProps<'/soporte'>) {
  const params = await searchParams
  const topic = one(params.tema)
  const ticketId = one(params.consulta)

  return (
    <div className="overflow-x-clip bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_35%)] pb-20">
      <PageIntro
        eyebrow="Soporte"
        title={
          <>
            Estamos para <Mark>ayudarte</Mark>
          </>
        }
        text="Tus consultas con el equipo, en un solo lugar. Te avisamos por mail cuando respondemos."
        className="pb-8 sm:pb-10"
      />
      <SupportCenterPage
        initial={{
          ticketId: ticketId && /^[0-9a-f-]{36}$/i.test(ticketId) ? ticketId : null,
          newTicket: one(params.nuevo) === '1',
          newTopic: SUPPORT_TOPICS.includes(topic as SupportTopic) ? (topic as SupportTopic) : null,
          code: one(params.codigo),
          error: one(params.error),
        }}
      />
    </div>
  )
}
