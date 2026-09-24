import Image from 'next/image'
import Link from 'next/link'
import { MessageCard } from '@/ui/MessageCard'
import { Reveal } from '@/ui/motion'

export default function GiftNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#ffd6de_0%,#fff_60%)] px-5 py-12 text-center">
      <MessageCard emoji="🔗" title="Este link no existe" className="max-w-md">
        <p className="leading-relaxed text-neutral-600">
          Revisá que esté completo: los links de los regalos son largos y a veces se cortan al
          copiarlos. Si el problema sigue, pedile a quien te lo mandó que te lo reenvíe.
        </p>
      </MessageCard>
      <Reveal delay={0.5} y={12}>
        <Link
          href="/"
          className="mt-8 block opacity-80 transition-opacity hover:opacity-100"
          aria-label="Boxie Digital"
        >
          <Image src="/brand/boxie-logo.png" alt="Boxie" width={103} height={36} />
        </Link>
      </Reveal>
    </div>
  )
}
