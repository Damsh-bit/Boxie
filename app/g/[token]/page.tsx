import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatLongDate } from '@/slides/editor/share'
import { isDemoMode } from '@/server/demo'
import { findGift, giftContent, giftCookieName, hasGiftAccess, type Gift } from '@/server/gift'
import { GiftPlayer } from './GiftPlayer'
import { PasswordGate } from './PasswordGate'

export const dynamic = 'force-dynamic'

async function gift(token: string): Promise<Gift | null> {
  return isDemoMode() ? null : findGift(token)
}

export async function generateMetadata({ params }: PageProps<'/g/[token]'>): Promise<Metadata> {
  const found = await gift((await params).token)
  const robots = { index: false, follow: false }
  if (!found || found.availability !== 'available') return { title: 'Boxie Digital', robots }
  const title = `${found.recipientName ? `${found.recipientName}, tenés` : 'Tenés'} un regalo 🎁`
  const description = found.senderName
    ? `${found.senderName} te preparó una Boxie. Abrila desde el celular.`
    : 'Te prepararon una Boxie. Abrila desde el celular.'
  return {
    title: { absolute: title },
    description,
    robots,
    openGraph: { title, description, type: 'website', siteName: 'Boxie Digital' },
  }
}

/** El regalo: /g/<token>. Sin usuario ni clave (salvo que el comprador ponga una). */
export default async function GiftPage({ params }: PageProps<'/g/[token]'>) {
  const { token } = await params
  const found = await gift(token)
  if (!found) notFound()

  if (found.availability !== 'available') {
    return <GiftMessage gift={found} />
  }

  const access = (await cookies()).get(giftCookieName(found.boxieId))?.value
  if (!hasGiftAccess(found, access)) {
    return <PasswordGate token={token} recipientName={found.recipientName} />
  }

  const { config, data } = await giftContent(found)
  return <GiftPlayer token={token} config={config} data={data} />
}

function GiftMessage({ gift }: { gift: Gift }) {
  const copy = {
    not_ready: {
      emoji: '🎀',
      title: 'Tu regalo todavía se está preparando',
      text: `${gift.senderName || 'Quien te lo regala'} todavía no terminó de armarlo. Volvé a abrir este link en un rato.`,
    },
    expired: {
      emoji: '⌛',
      title: 'Este regalo ya no está disponible',
      text: `Las Boxies se pueden abrir durante un tiempo limitado, y este plazo terminó el ${formatLongDate(gift.expiresAt)}.`,
    },
    refunded: {
      emoji: '📭',
      title: 'Este regalo ya no está disponible',
      text: 'Quien lo compró lo canceló.',
    },
  }[gift.availability as 'not_ready' | 'expired' | 'refunded']

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#ffd6de_0%,#fff_60%)] px-5 py-12 text-center">
      <div className="w-full max-w-md rounded-[30px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
        <div className="mb-4 text-5xl" aria-hidden>
          {copy.emoji}
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">{copy.title}</h1>
        <p className="mt-3 leading-relaxed text-neutral-600">{copy.text}</p>
      </div>
      <Link href="/" className="mt-8 opacity-80 hover:opacity-100" aria-label="Boxie Digital">
        <Image src="/brand/boxie-logo.png" alt="Boxie" width={103} height={36} />
      </Link>
    </div>
  )
}
