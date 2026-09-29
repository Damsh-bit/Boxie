import { NextResponse } from 'next/server'
import { processAnnualReminders } from '@/server/customer/reminders'
import { env } from '@/server/env'

export async function GET(request: Request) {
  // Verificación opcional de token para cron (ej: Vercel Cron o trigger externo)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || env().TOKEN_ENCRYPTION_KEY

  if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const result = await processAnnualReminders()
  return NextResponse.json({
    ok: true,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
