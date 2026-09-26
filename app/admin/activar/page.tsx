import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { getInviteDetails } from '@/server/admin/invite'
import { getAdminSession } from '@/server/admin/session'
import { Button } from '@/ui/Button'
import { ActivateScreen } from './ActivateScreen'

export const metadata: Metadata = { title: 'Activar cuenta de equipo' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ token?: string }>
}

export default async function ActivatePage({ searchParams }: PageProps) {
  const { token } = await searchParams
  if (!token) {
    return <InvalidInviteMessage error="No se proporcionó ningún token de activación." />
  }

  const details = await getInviteDetails(token)
  if (!details.ok) {
    return <InvalidInviteMessage error={details.error} />
  }

  const currentSession = await getAdminSession()

  return (
    <ActivateScreen token={token} user={details.user} currentUserEmail={currentSession?.email} />
  )
}

function InvalidInviteMessage({ error }: { error: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-5 py-12 sm:px-8">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white/95 p-8 text-center shadow-xl backdrop-blur-md">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
          <AlertCircle className="size-6" />
        </div>
        <h1 className="text-xl font-bold text-ink">Enlace no disponible</h1>
        <p className="mt-2 text-sm text-neutral-600">{error}</p>
        <div className="mt-6">
          <Link href="/admin/login" className="block w-full">
            <Button className="w-full">
              <ArrowLeft className="size-4" /> Ir al inicio de sesión
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
