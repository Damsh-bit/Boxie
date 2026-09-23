import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { ImageResponse } from 'next/og'
import { isDemoMode } from '@/server/demo'
import { findGift } from '@/server/gift'

/**
 * La tarjeta del link en WhatsApp (docs/ARQUITECTURA.md §2.1): el canal de
 * Boxie es WhatsApp y sus robots no ejecutan JavaScript, así que la imagen
 * se arma en el servidor con el nombre de quien recibe el regalo.
 */

export const alt = 'Un regalo de Boxie'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function GiftCard({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const gift = isDemoMode() ? null : await findGift(token).catch(() => null)
  const ready = gift?.availability === 'available'
  const recipient = ready ? gift.recipientName.trim() : ''
  const sender = ready ? gift.senderName.trim() : ''

  const mark = await readFile(join(process.cwd(), 'public', 'brand', 'boxie-mark.png'))
  const markSrc = `data:image/png;base64,${mark.toString('base64')}`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #F44E63 0%, #FF8FA3 55%, #FFC2CD 100%)',
        padding: '0 80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          width: 260,
          height: 260,
          borderRadius: 60,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 30px 60px rgba(42,36,51,0.25)',
          flexShrink: 0,
        }}
      >
        <img src={markSrc} width={150} height={191} alt="" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 70, color: 'white' }}>
        <div style={{ fontSize: 34, fontWeight: 600, opacity: 0.9, letterSpacing: 2 }}>
          BOXIE DIGITAL
        </div>
        <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, marginTop: 16 }}>
          {recipient ? `${recipient}, tenés un regalo` : 'Tenés un regalo'}
        </div>
        <div style={{ fontSize: 36, marginTop: 24, opacity: 0.95 }}>
          {sender ? `De parte de ${sender} · Abrilo desde el celular` : 'Abrilo desde el celular'}
        </div>
      </div>
    </div>,
    size,
  )
}
