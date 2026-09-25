import type {
  CustomerTicket,
  NewTicketInput,
  SupportMessage,
  SupportRating,
} from '@/domain/support'

/**
 * Las llamadas del widget de soporte a /api/soporte. Devuelven el dato o un
 * error con el mensaje para la persona (y los errores por campo del
 * formulario, si los hay).
 */

export class SupportRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fields: Record<string, string> = {},
  ) {
    super(message)
    this.name = 'SupportRequestError'
  }
}

export interface Conversation {
  ticket: CustomerTicket
  messages: SupportMessage[]
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api/soporte${path}`, {
      ...init,
      headers: { 'content-type': 'application/json', ...init?.headers },
      cache: 'no-store',
    })
  } catch {
    throw new SupportRequestError('Sin conexión. Revisá internet y probá de nuevo.', 0)
  }
  const body = (await response.json().catch(() => null)) as
    (T & { error?: string; fields?: Record<string, string> }) | null
  if (!response.ok)
    throw new SupportRequestError(
      body?.error ?? 'Algo salió mal. Probá de nuevo en un rato.',
      response.status,
      body?.fields,
    )
  return body as T
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  body: body === undefined ? undefined : JSON.stringify(body),
})

export const supportApi = {
  tickets: () => call<{ tickets: CustomerTicket[] }>('/tickets').then((r) => r.tickets),
  conversation: (id: string) => call<Conversation>(`/tickets/${id}`),
  create: (input: NewTicketInput) => call<Conversation>('/tickets', post(input)),
  send: (id: string, body: string) =>
    call<{ message: SupportMessage }>(`/tickets/${id}/mensajes`, post({ body })).then(
      (r) => r.message,
    ),
  read: (id: string) => call<{ ok: true }>(`/tickets/${id}/leido`, post()),
  typing: (id: string) => call<{ ok: true }>(`/tickets/${id}/escribiendo`, post()),
  rate: (id: string, rating: SupportRating) =>
    call<{ ticket: CustomerTicket }>(`/tickets/${id}/calificar`, post({ rating })).then(
      (r) => r.ticket,
    ),
  recover: (email: string) => call<{ ok: true }>('/recuperar', post({ email })),
}
