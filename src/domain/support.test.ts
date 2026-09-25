import { describe, expect, it } from 'vitest'
import {
  customerMessages,
  firstResponseMinutes,
  hoursWaiting,
  initialPriority,
  isOverdue,
  NewTicketSchema,
  shouldNotifyCustomer,
  shouldNotifyTeam,
  statusAfterAgentMessage,
  statusAfterCustomerMessage,
  subjectFrom,
  SupportRuleError,
  supportCounts,
  TicketPatchSchema,
  toCustomerTicket,
  unreadByAgent,
  unreadByCustomer,
  type SupportMessage,
  type SupportTicket,
} from './support'

const NOW = new Date('2026-09-25T15:00:00.000Z')
const ago = (hours: number) => new Date(NOW.getTime() - hours * 3_600_000).toISOString()

function ticket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: '8d3f7c1e-1b2a-4c3d-9e8f-000000000001',
    number: 1042,
    topic: 'boxie',
    status: 'open',
    priority: 'normal',
    subject: 'No puedo entrar al editor',
    customerName: 'Sofía',
    customerEmail: 'sofi@example.com',
    boxieCode: 'K7M2Q9XD',
    boxieId: null,
    orderId: null,
    assignee: null,
    context: null,
    rating: null,
    firstResponseAt: null,
    resolvedAt: null,
    lastMessageAt: ago(1),
    lastCustomerMessageAt: ago(1),
    lastAgentMessageAt: null,
    customerReadAt: null,
    agentReadAt: null,
    customerNotifiedAt: null,
    teamNotifiedAt: null,
    createdAt: ago(1),
    updatedAt: ago(1),
    ...overrides,
  }
}

describe('nuevo ticket', () => {
  const valid = {
    topic: 'boxie',
    name: '  Sofía  ',
    email: 'sofi@example.com',
    message: 'No me llegó el mail del editor',
  }

  it('limpia los textos y normaliza el código de la Boxie', () => {
    const parsed = NewTicketSchema.parse({ ...valid, boxieCode: 'k7m2-q9xd' })
    expect(parsed.name).toBe('Sofía')
    expect(parsed.boxieCode).toBe('K7M2Q9XD')
  })

  it('sin código queda en null; un código mal escrito se explica', () => {
    expect(NewTicketSchema.parse(valid).boxieCode).toBeNull()
    expect(NewTicketSchema.parse({ ...valid, boxieCode: '   ' }).boxieCode).toBeNull()
    const bad = NewTicketSchema.safeParse({ ...valid, boxieCode: 'K7M2-Q9X0' })
    expect(bad.success).toBe(false)
    expect(bad.error?.issues[0]?.message).toContain('K7M2-Q9XD')
  })

  it('rechaza mensajes vacíos, mails inválidos y a los bots', () => {
    expect(NewTicketSchema.safeParse({ ...valid, message: 'hola' }).success).toBe(false)
    expect(NewTicketSchema.safeParse({ ...valid, email: 'sofi' }).success).toBe(false)
    expect(NewTicketSchema.safeParse({ ...valid, website: 'spam.com' }).success).toBe(false)
    expect(NewTicketSchema.safeParse({ ...valid, topic: 'reclamo' }).success).toBe(false)
  })

  it('el contexto técnico tiene tope y no acepta campos de más', () => {
    const context = { url: 'https://boxie.test/checkout', viewport: '375x812' }
    expect(NewTicketSchema.parse({ ...valid, context }).context).toEqual(context)
    expect(NewTicketSchema.safeParse({ ...valid, context: { cookie: 'x' } }).success).toBe(false)
  })

  it('el asunto es la primera línea, corta', () => {
    expect(subjectFrom('  El regalo no abre\nLo probé en dos celulares', 'boxie')).toBe(
      'El regalo no abre',
    )
    expect(subjectFrom('x'.repeat(200), 'otro')).toHaveLength(78)
    expect(subjectFrom('   ', 'pago')).toBe('Pagos y compras')
  })

  it('los pagos entran con prioridad alta', () => {
    expect(initialPriority('pago')).toBe('alta')
    expect(initialPriority('error')).toBe('normal')
  })
})

describe('estados', () => {
  it('cuando el cliente escribe, le toca al equipo (y reabre una resuelta)', () => {
    expect(statusAfterCustomerMessage('pending')).toBe('open')
    expect(statusAfterCustomerMessage('resolved')).toBe('open')
    expect(() => statusAfterCustomerMessage('closed')).toThrow(SupportRuleError)
  })

  it('cuando responde el equipo, espera al cliente; una nota interna no cambia nada', () => {
    expect(statusAfterAgentMessage('open', false)).toBe('pending')
    expect(statusAfterAgentMessage('open', true)).toBe('open')
    expect(statusAfterAgentMessage('open', false, 'resolved')).toBe('resolved')
  })

  it('un cambio sin nada que cambiar no pasa', () => {
    const id = '8d3f7c1e-1b2a-4c3d-9e8f-000000000001'
    expect(TicketPatchSchema.safeParse({ ticketId: id }).success).toBe(false)
    expect(TicketPatchSchema.safeParse({ ticketId: id, assignee: null }).success).toBe(true)
  })
})

describe('avisos por mail', () => {
  it('al cliente, uno cada 10 minutos como mucho', () => {
    expect(shouldNotifyCustomer({ customerNotifiedAt: null }, NOW)).toBe(true)
    expect(shouldNotifyCustomer({ customerNotifiedAt: ago(0.1) }, NOW)).toBe(false)
    expect(shouldNotifyCustomer({ customerNotifiedAt: ago(0.2) }, NOW)).toBe(true)
  })

  it('al equipo, cada 30 minutos si el cliente vuelve a escribir', () => {
    expect(shouldNotifyTeam({ teamNotifiedAt: null }, NOW)).toBe(true)
    expect(shouldNotifyTeam({ teamNotifiedAt: ago(0.25) }, NOW)).toBe(false)
    expect(shouldNotifyTeam({ teamNotifiedAt: ago(0.5) }, NOW)).toBe(true)
  })
})

describe('lectura y tiempos', () => {
  it('sabe quién tiene mensajes sin leer', () => {
    expect(unreadByAgent(ticket())).toBe(true)
    expect(unreadByAgent(ticket({ agentReadAt: ago(0.5) }))).toBe(false)
    expect(unreadByCustomer(ticket())).toBe(false)
    expect(unreadByCustomer(ticket({ lastAgentMessageAt: ago(0.5), customerReadAt: ago(1) }))).toBe(
      true,
    )
  })

  it('marca atrasado según la prioridad, solo si le toca al equipo', () => {
    expect(hoursWaiting(ticket({ lastCustomerMessageAt: ago(3) }), NOW)).toBeCloseTo(3)
    expect(isOverdue(ticket({ lastCustomerMessageAt: ago(3), priority: 'urgente' }), NOW)).toBe(
      true,
    )
    expect(isOverdue(ticket({ lastCustomerMessageAt: ago(3) }), NOW)).toBe(false)
    expect(isOverdue(ticket({ status: 'pending', lastCustomerMessageAt: ago(90) }), NOW)).toBe(
      false,
    )
  })

  it('mide la primera respuesta en minutos', () => {
    expect(firstResponseMinutes(ticket())).toBeNull()
    expect(firstResponseMinutes(ticket({ createdAt: ago(2), firstResponseAt: ago(1.5) }))).toBe(30)
  })

  it('cuenta la bandeja', () => {
    const counts = supportCounts(
      [
        ticket(),
        ticket({ status: 'pending', assignee: 'lean@boxie.test', agentReadAt: ago(0.5) }),
        ticket({ status: 'open', lastCustomerMessageAt: ago(30), agentReadAt: ago(1) }),
        ticket({ status: 'closed' }),
      ],
      NOW,
    )
    expect(counts).toEqual({ open: 2, pending: 1, unassigned: 2, overdue: 1, unread: 1 })
  })
})

describe('lo que ve el cliente', () => {
  it('nunca ve notas internas ni datos del equipo', () => {
    const messages: SupportMessage[] = [
      {
        id: '1',
        ticketId: 't',
        author: 'customer',
        authorName: 'Sofía',
        body: 'Hola',
        internal: false,
        createdAt: ago(1),
      },
      {
        id: '2',
        ticketId: 't',
        author: 'agent',
        authorName: 'Lean',
        body: 'Revisar el pago en MP',
        internal: true,
        createdAt: ago(0.5),
      },
    ]
    expect(customerMessages(messages).map((m) => m.id)).toEqual(['1'])
    const view = toCustomerTicket(
      ticket({ assignee: 'lean@boxie.test', context: { url: '/x' } }),
    ) as unknown as Record<string, unknown>
    expect(view.assignee).toBeUndefined()
    expect(view.context).toBeUndefined()
    expect(view.boxieId).toBeUndefined()
  })
})

describe('dispositivo', () => {
  it('describe el celular y el navegador de un reporte', async () => {
    const { describeDevice } = await import('./support')
    expect(
      describeDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('iPhone · Safari 17')
    expect(
      describeDevice(
        'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36',
      ),
    ).toBe('Android · Chrome 129')
    expect(
      describeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.2792.52',
      ),
    ).toBe('Windows · Edge 129')
    expect(describeDevice(undefined)).toBeNull()
    expect(describeDevice('curl/8.0')).toBeNull()
  })
})
