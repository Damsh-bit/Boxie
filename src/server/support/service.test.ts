import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * El soporte de punta a punta sobre la base de demo (en memoria): lo que
 * pasa al abrir una consulta, al responder y al cambiar el estado, los
 * eventos en vivo, los mails y quién puede ver qué.
 */

const pending = vi.hoisted(() => [] as (() => Promise<void>)[])
vi.mock('next/server', () => ({
  // Fuera de Next no hay "después de responder": se corre a mano (flush).
  after: (fn: () => Promise<void>) => {
    pending.push(fn)
  },
}))

process.env.DEMO_MODE = '1'

const service = await import('./service')
const { subscribe } = await import('./bus')
const { supportRepo, SupportError } = await import('./repo')
const { devOutbox } = await import('../mail/send')
const { demoDb, resetDemoDb } = await import('../admin/demo/store')

const flush = async () => {
  while (pending.length) await pending.shift()!()
}
const actor = { email: 'soporte@boxie.demo', name: 'Lean Soporte' }

function newTicket(overrides: Record<string, unknown> = {}) {
  return service.createTicket({
    topic: 'boxie',
    name: 'Sofía Pérez',
    email: 'Sofi@Ejemplo.com',
    message: 'No me llegó el mail del editor\nCompré hace una hora.',
    ...overrides,
  })
}

beforeEach(() => {
  resetDemoDb()
  devOutbox().length = 0
  pending.length = 0
  delete process.env.TOKEN_ENCRYPTION_KEY
})

describe('abrir una consulta', () => {
  it('devuelve el token, la conversación y avisa en vivo y por mail', async () => {
    const events: string[] = []
    const off = subscribe((e) => events.push(e.type))
    const { token, conversation } = await newTicket()
    off()

    expect(token).toMatch(/^[A-Za-z0-9_-]{32}$/)
    expect(conversation.ticket).toMatchObject({
      subject: 'No me llegó el mail del editor',
      customerEmail: 'sofi@ejemplo.com',
      status: 'open',
      unread: false,
    })
    expect(conversation.messages).toHaveLength(1)
    expect(events).toEqual(['ticket', 'message'])

    await flush()
    const mails = devOutbox()
    const customer = mails.find((m) => m.to === 'sofi@ejemplo.com')!
    const team = mails.find((m) => m.to === demoDb().settings.supportEmail)!
    expect(customer.subject).toBe(`Recibimos tu consulta #${conversation.ticket.number} 💬`)
    expect(customer.text).toContain(`/soporte/${token}`)
    expect(team.subject).toContain(`[Soporte #${conversation.ticket.number}] Mi Boxie`)
    expect(team.replyTo).toBe('sofi@ejemplo.com')
  })

  it('vincula la Boxie del código para el equipo, sin mostrársela al cliente', async () => {
    const boxie = demoDb().boxies[0]!
    const { conversation } = await newTicket({ boxieCode: boxie.code.toLowerCase() })
    const agentView = await (await supportRepo()).getTicket(conversation.ticket.id)
    expect(agentView).toMatchObject({ boxieId: boxie.id, orderId: boxie.orderId })
    expect(conversation.ticket).not.toHaveProperty('boxieId')
    expect(conversation.ticket).not.toHaveProperty('assignee')
  })

  it('un pago entra con prioridad alta', async () => {
    const { conversation } = await newTicket({ topic: 'pago' })
    expect((await (await supportRepo()).getTicket(conversation.ticket.id))!.priority).toBe('alta')
  })
})

describe('quién ve qué', () => {
  it('cada navegador ve y escribe solo en sus consultas', async () => {
    const mine = await newTicket()
    const other = await newTicket({ email: 'otra@ejemplo.com' })
    expect((await service.customerTickets([mine.token])).map((t) => t.id)).toEqual([
      mine.conversation.ticket.id,
    ])
    await expect(
      service.customerConversation([mine.token], other.conversation.ticket.id),
    ).rejects.toBeInstanceOf(SupportError)
    await expect(
      service.customerReply([mine.token], other.conversation.ticket.id, { body: 'hola' }),
    ).rejects.toBeInstanceOf(SupportError)
    expect(await service.customerTickets([])).toEqual([])
  })

  it('las notas internas no le llegan al cliente ni cambian el estado', async () => {
    const { token, conversation } = await newTicket()
    const id = conversation.ticket.id
    const { message } = await service.agentReply(actor, {
      ticketId: id,
      body: 'Revisar el pago en Mercado Pago',
      internal: true,
    })
    expect(message.internal).toBe(true)
    const view = await service.customerConversation([token], id)
    expect(view.messages.map((m) => m.body)).not.toContain('Revisar el pago en Mercado Pago')
    expect(view.ticket.status).toBe('open')
    await flush()
    expect(devOutbox().some((m) => m.subject.startsWith('Te respondimos'))).toBe(false)
  })
})

describe('responder', () => {
  it('queda esperando al cliente, se asigna a quien responde y avisa por mail (con tope)', async () => {
    const { token, conversation } = await newTicket()
    const id = conversation.ticket.id
    await flush()
    devOutbox().length = 0

    const first = await service.agentReply(actor, { ticketId: id, body: '¡Hola! Ya lo vemos.' })
    expect(first.ticket).toMatchObject({ status: 'pending', assignee: actor.email })
    expect(first.message.authorName).toBe('Lean')
    await flush()
    expect(devOutbox().map((m) => m.subject)).toEqual([
      `Te respondimos tu consulta #${conversation.ticket.number}`,
    ])

    // Otra respuesta enseguida no manda otro mail (uno cada 10 minutos).
    await service.agentReply(actor, { ticketId: id, body: 'Otra cosa' })
    await flush()
    expect(devOutbox()).toHaveLength(1)

    // El cliente ve las respuestas sin leer hasta que abre la charla.
    expect((await service.customerTickets([token]))[0]!.unread).toBe(true)
    await service.customerRead([token], id)
    expect((await service.customerTickets([token]))[0]!.unread).toBe(false)
  })

  it('el mail de respuesta lleva el link personal si hay clave de cifrado', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
    const { token, conversation } = await newTicket()
    await flush()
    devOutbox().length = 0
    await service.agentReply(actor, { ticketId: conversation.ticket.id, body: 'Listo' })
    await flush()
    expect(devOutbox()[0]!.text).toContain(`/soporte/${token}`)

    // Y desde otro dispositivo se recupera por mail.
    devOutbox().length = 0
    expect(await service.recoverTickets('SOFI@ejemplo.com')).toEqual({ sent: 1 })
    expect(devOutbox()[0]!.text).toContain(`/soporte/${token}`)
  })
})

describe('estados', () => {
  it('resolver deja un aviso; si el cliente escribe se reabre; cerrada ya no', async () => {
    const { token, conversation } = await newTicket()
    const id = conversation.ticket.id

    await service.agentUpdate(actor, { ticketId: id, status: 'resolved' })
    let view = await service.customerConversation([token], id)
    expect(view.ticket.status).toBe('resolved')
    expect(view.messages.at(-1)).toMatchObject({ author: 'system' })

    await service.customerRate([token], id, { rating: 'good' })
    await service.customerReply([token], id, { body: 'Me pasa de nuevo' })
    view = await service.customerConversation([token], id)
    expect(view.ticket).toMatchObject({ status: 'open', rating: 'good' })

    await service.agentUpdate(actor, { ticketId: id, status: 'closed' })
    await expect(service.customerReply([token], id, { body: '¿Hola?' })).rejects.toThrow(/cerrada/)
  })

  it('no se califica una consulta abierta', async () => {
    const { token, conversation } = await newTicket()
    await expect(
      service.customerRate([token], conversation.ticket.id, { rating: 'bad' }),
    ).rejects.toThrow(/resuelta/)
  })

  it('prioridad y asignación quedan en la bitácora', async () => {
    const { conversation } = await newTicket()
    await service.agentUpdate(actor, {
      ticketId: conversation.ticket.id,
      priority: 'urgente',
      assignee: 'socio@boxie.demo',
    })
    await flush()
    expect(demoDb().audit[0]).toMatchObject({
      actor: actor.email,
      action: 'support.update',
      entity: 'ticket',
    })
    expect(demoDb().audit[0]!.summary).toContain('prioridad urgente')
  })
})
