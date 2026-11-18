import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processAnnualReminders } from '@/server/customer/reminders'
import { env } from '@/server/env'

/** Comparación en tiempo constante: el secreto no se adivina por cuánto tarda. */
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Recordatorios anuales. Vercel Cron manda `Authorization: Bearer <CRON_SECRET>`.
 * Sin CRON_SECRET no corre: antes usaba TOKEN_ENCRYPTION_KEY como contraseña,
 * y una clave de cifrado no debe viajar en un header.
 */
export async function GET(request: Request) {
  const cronSecret = env().CRON_SECRET
  const isProduction = process.env.NODE_ENV === 'production'

  if (!cronSecret) {
    if (isProduction) {
      return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 503 })
    }
  } else if (!sameSecret(request.headers.get('authorization') ?? '', `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const result = await processAnnualReminders()
  return NextResponse.json({
    ok: true,
    ...result,
    timestamp: new Date().toISOString(),
  })
}
