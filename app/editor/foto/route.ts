import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { UploadResult } from '@/slides/editor/contract'
import { isDemoMode } from '@/server/demo'
import { SESSION_EXPIRED, uploadPhoto } from '@/server/editor'
import { EDITOR_COOKIE, readEditorSession } from '@/server/editor-session'
import { log } from '@/server/log'
import { rateLimit } from '@/server/rate-limit'

/**
 * Subida de fotos del editor. La foto llega ya comprimida desde el navegador
 * (unos cientos de KB); acá se valida el formato real y se guarda en Storage.
 * Reemplaza al Base64 dentro del documento de Firestore del prototipo.
 */

const reply = (body: UploadResult, status: number) => NextResponse.json(body, { status })

/** La cookie es SameSite=Lax (no viaja en un POST de otro sitio); igual se exige el mismo origen. */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    return new URL(origin).host === request.headers.get('host')
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (isDemoMode()) return reply({ ok: false, error: 'No disponible en la demo.' }, 404)
  if (!sameOrigin(request)) return reply({ ok: false, error: 'Origen inválido.' }, 403)

  const session = readEditorSession((await cookies()).get(EDITOR_COOKIE)?.value)
  if (!session) return reply({ ok: false, error: SESSION_EXPIRED }, 401)
  if (!rateLimit(`editor-photo:${session.boxieId}`, { limit: 40, windowMs: 10 * 60_000 })) {
    return reply({ ok: false, error: 'Subiste muchas fotos seguidas. Esperá unos minutos.' }, 429)
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof Blob)) return reply({ ok: false, error: 'Falta la foto.' }, 400)

  try {
    const result = await uploadPhoto(session, file, {
      width: Number(form?.get('width')),
      height: Number(form?.get('height')),
    })
    return reply(result, result.ok ? 200 : 400)
  } catch (error) {
    log.error('No se pudo subir la foto', error, { boxieId: session.boxieId })
    return reply({ ok: false, error: 'No pudimos subir la foto. Probá de nuevo.' }, 500)
  }
}
