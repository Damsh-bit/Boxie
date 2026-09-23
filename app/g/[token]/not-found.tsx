import Image from 'next/image'
import Link from 'next/link'

export default function GiftNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#ffd6de_0%,#fff_60%)] px-5 py-12 text-center">
      <div className="w-full max-w-md rounded-[30px] bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.1)]">
        <div className="mb-4 text-5xl" aria-hidden>
          🔗
        </div>
        <h1 className="font-display text-2xl font-bold text-ink">Este link no existe</h1>
        <p className="mt-3 leading-relaxed text-neutral-600">
          Revisá que esté completo: los links de los regalos son largos y a veces se cortan al
          copiarlos. Si el problema sigue, pedile a quien te lo mandó que te lo reenvíe.
        </p>
      </div>
      <Link href="/" className="mt-8 opacity-80 hover:opacity-100" aria-label="Boxie Digital">
        <Image src="/brand/boxie-logo.png" alt="Boxie" width={103} height={36} />
      </Link>
    </div>
  )
}
