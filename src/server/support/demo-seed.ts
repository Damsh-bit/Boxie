import 'server-only'
import { createHash } from 'node:crypto'
import type {
  SupportMessage,
  SupportPriority,
  SupportStatus,
  SupportTopic,
  TicketContext,
} from '@/domain/support'
import type { DemoDb, DemoSupport } from '../admin/demo/seed'

/**
 * Conversaciones de muestra para el panel en modo demo: una bandeja creíble
 * (resueltas, esperando al cliente, sin leer, una atrasada y una nota
 * interna), con horarios relativos a "ahora". Las de "Mi Boxie" están
 * vinculadas a Boxies y compradores de la demo. Ningún dato es real.
 */

interface Line {
  /** Minutos antes de ahora. */
  ago: number
  author: 'customer' | 'agent' | 'system'
  body: string
  internal?: boolean
  /** Nombre del admin (del equipo de la demo). */
  agent?: string
}

interface Scenario {
  topic: SupportTopic
  status: SupportStatus
  priority: SupportPriority
  subject: string
  /** Vincular a una Boxie de la demo: sin bloquear o ya regalada. */
  boxie?: 'editing' | 'locked'
  customer?: { name: string; email: string }
  assignee?: string
  rating?: 'good' | 'bad'
  context?: TicketContext
  /** El equipo ya leyó lo último del cliente. */
  readByAgent?: boolean
  lines: Line[]
}

const H = 60
const D = 24 * H

const SCENARIOS: Scenario[] = [
  {
    topic: 'boxie',
    status: 'resolved',
    priority: 'normal',
    subject: 'No me llegó el mail para editar mi Boxie',
    boxie: 'editing',
    assignee: 'soporte@boxie.demo',
    rating: 'good',
    readByAgent: true,
    lines: [
      {
        ago: 9 * D,
        author: 'customer',
        body: 'Hola! Compré una Boxie hace un rato y no me llegó el mail para editarla 😕',
      },
      {
        ago: 9 * D - 25,
        author: 'agent',
        agent: 'Soporte',
        body: '¡Hola! Ya te reenviamos el link al mail de la compra. Si no lo ves en unos minutos, fijate en spam o promociones 🙌',
      },
      { ago: 9 * D - 40, author: 'customer', body: '¡Llegó! Estaba en promociones. Gracias!!' },
      { ago: 9 * D - 45, author: 'system', body: 'Marcamos tu consulta como resuelta.' },
    ],
  },
  {
    topic: 'pago',
    status: 'closed',
    priority: 'alta',
    subject: 'Me figura el pago como pendiente',
    customer: { name: 'Martina Gómez', email: 'martina.gomez@ejemplo.com' },
    assignee: 'socio@boxie.demo',
    readByAgent: true,
    lines: [
      {
        ago: 6 * D,
        author: 'customer',
        body: 'Pagué con transferencia y en Mercado Pago me figura pendiente. ¿Tengo que hacer algo?',
      },
      {
        ago: 6 * D - 50,
        author: 'agent',
        agent: 'Socio',
        body: 'Hola Martina: con transferencia a veces tarda unas horas. Ya se acreditó y te mandamos el mail con el acceso. ¡Que la disfrutes!',
      },
      { ago: 6 * D - 55, author: 'system', body: 'La consulta quedó cerrada.' },
    ],
  },
  {
    topic: 'error',
    status: 'pending',
    priority: 'normal',
    subject: 'Cuando toco "Subir foto" en el iPhone no pasa nada',
    boxie: 'editing',
    assignee: 'soporte@boxie.demo',
    readByAgent: true,
    context: {
      url: '/editor',
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      viewport: '390x844',
    },
    lines: [
      {
        ago: 2 * D,
        author: 'customer',
        body: 'Cuando toco "Subir foto" en el iPhone no pasa nada. En la compu anda bien.',
      },
      {
        ago: 2 * D - 90,
        author: 'agent',
        agent: 'Soporte',
        internal: true,
        body: 'iOS 17.5 + Safari. Probé con un iPhone 13 y anda: puede ser el permiso de Fotos.',
      },
      {
        ago: 2 * D - 95,
        author: 'agent',
        agent: 'Soporte',
        body: '¡Hola! ¿Podés fijarte en Ajustes → Safari → Cámara/Fotos que esté en "Permitir"? Si sigue igual, contame qué aparece al tocar el botón.',
      },
    ],
  },
  {
    topic: 'boxie',
    status: 'open',
    priority: 'normal',
    subject: 'Me equivoqué en el nombre y ya la bloqueé',
    boxie: 'locked',
    lines: [
      {
        ago: 3 * H,
        author: 'customer',
        body: 'Me equivoqué en el nombre de mi novia y ya la bloqueé 😭 Puse "Sofia" y es "Sofía". ¿Se puede cambiar?',
      },
    ],
  },
  {
    topic: 'otro',
    status: 'open',
    priority: 'normal',
    subject: '¿Hacen Boxies para empresas?',
    customer: { name: 'Julián Ferreyra', email: 'rrhh@empresa-ejemplo.com' },
    lines: [
      {
        ago: 27 * H,
        author: 'customer',
        body: '¿Hacen Boxies personalizadas para empresas? Somos 40 personas y queremos regalar una para fin de año.',
      },
    ],
  },
  {
    topic: 'boxie',
    status: 'open',
    priority: 'alta',
    subject: 'El regalo le pide una clave y no le puse ninguna',
    boxie: 'locked',
    assignee: 'socio@boxie.demo',
    readByAgent: true,
    lines: [
      {
        ago: 50,
        author: 'customer',
        body: 'El regalo le pide una clave a mi novia y yo no le puse ninguna. ¡Es hoy nuestro aniversario!',
      },
      {
        ago: 42,
        author: 'agent',
        agent: 'Socio',
        internal: true,
        body: 'Revisé la Boxie: tiene clave. Seguro la cargó sin querer en el editor. Le paso cómo verla.',
      },
    ],
  },
  {
    topic: 'pago',
    status: 'open',
    priority: 'alta',
    subject: 'Pagué con débito y no me llegó nada',
    customer: { name: 'Carla Benítez', email: 'carla.benitez@ejemplo.com' },
    lines: [
      {
        ago: 18,
        author: 'customer',
        body: 'Pagué con débito hace 10 minutos, me descontaron la plata y no me llegó ningún mail.',
      },
    ],
  },
]

/** Un UUID fijo por número (la demo es determinística). */
const id = (kind: number, n: number) =>
  `5a0b7c1e-1b2a-4c3d-9e8f-${String(kind).padStart(4, '0')}${String(n).padStart(8, '0')}`

export function seedSupport(db: DemoDb, now = new Date()): DemoSupport {
  const at = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()
  // Boxies de la demo para vincular: una en edición y una ya regalada, con su comprador.
  const active = db.boxies.filter((b) => b.status === 'active')
  const pick = {
    editing: active.filter((b) => !b.lockedAt),
    locked: active.filter((b) => b.lockedAt),
  }
  const used = { editing: 0, locked: 0 }

  const tickets: DemoSupport['tickets'] = []
  const messages: SupportMessage[] = []
  let messageNumber = 1

  SCENARIOS.forEach((s, index) => {
    const number = 1001 + index
    const ticketId = id(1, number)
    const boxie = s.boxie ? pick[s.boxie][used[s.boxie]++] : undefined
    const order = boxie ? db.orders.find((o) => o.id === boxie.orderId) : undefined
    const customer = order
      ? { name: order.buyerName, email: order.buyerEmail }
      : (s.customer ?? { name: 'Cliente', email: 'cliente@ejemplo.com' })

    const lines = s.lines.map((line) => ({ ...line, createdAt: at(line.ago) }))
    const lastPublic = [...lines].reverse().find((l) => !l.internal)!
    const lastCustomer = [...lines].reverse().find((l) => l.author === 'customer')
    const lastAgent = [...lines].reverse().find((l) => l.author === 'agent' && !l.internal)
    const firstAgent = lines.find((l) => l.author === 'agent' && !l.internal)
    const lastTeamTouch = [...lines].reverse().find((l) => l.author === 'agent')

    for (const line of lines) {
      messages.push({
        id: id(2, messageNumber++),
        ticketId,
        author: line.author,
        authorName:
          line.author === 'customer'
            ? customer.name.split(' ')[0]!
            : line.author === 'agent'
              ? line.agent!
              : 'Boxie',
        body: line.body,
        internal: line.internal ?? false,
        createdAt: line.createdAt,
      })
    }

    const ticket: DemoSupport['tickets'][number] = {
      id: ticketId,
      number,
      topic: s.topic,
      status: s.status,
      priority: s.priority,
      subject: s.subject,
      customerName: customer.name,
      customerEmail: customer.email,
      boxieCode: boxie?.code ?? null,
      boxieId: boxie?.id ?? null,
      orderId: boxie?.orderId ?? null,
      assignee: s.assignee ?? null,
      context: s.context ?? null,
      rating: s.rating ?? null,
      firstResponseAt: firstAgent?.createdAt ?? null,
      resolvedAt: s.status === 'resolved' || s.status === 'closed' ? lastPublic.createdAt : null,
      lastMessageAt: lastPublic.createdAt,
      lastCustomerMessageAt: lastCustomer?.createdAt ?? null,
      lastAgentMessageAt: lastAgent?.createdAt ?? null,
      customerReadAt: lastPublic.createdAt,
      agentReadAt: s.readByAgent ? (lastTeamTouch?.createdAt ?? lastPublic.createdAt) : null,
      customerNotifiedAt: lastAgent?.createdAt ?? null,
      teamNotifiedAt: lines[0]!.createdAt,
      createdAt: lines[0]!.createdAt,
      updatedAt: lines.at(-1)!.createdAt,
      // Nadie tiene el token de estos tickets: son de muestra.
      accessTokenHash: createHash('sha256').update(`demo-ticket-${number}`).digest('hex'),
      accessTokenEnc: null,
    }
    tickets.push(ticket)
  })

  return { tickets, messages, nextNumber: 1001 + SCENARIOS.length }
}
