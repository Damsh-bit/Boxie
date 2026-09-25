import { NextResponse } from 'next/server'
import { z } from 'zod'
import { rateLimit } from '@/server/rate-limit'
import { supportAgent } from '@/server/support/agent-session'
import { agentTyping } from '@/server/support/service'
import { isSameOrigin } from '@/server/support/session'

/** "Escribiendo…" del equipo: efímero, no se guarda (uno cada 2 s por consulta alcanza). */

export const dynamic = 'force-dynamic'

const Body = z.object({ ticketId: z.uuid() })

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new NextResponse(null, { status: 403 })
  const agent = await supportAgent()
  if (!agent) return new NextResponse(null, { status: 401 })
  const parsed = Body.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new NextResponse(null, { status: 400 })
  if (rateLimit(`support:agent-typing:${parsed.data.ticketId}`, { limit: 1, windowMs: 2_000 }))
    agentTyping(parsed.data.ticketId, agent)
  return new NextResponse(null, { status: 204 })
}
