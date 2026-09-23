import type { Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { site } from '@/content/site'
import { buttonVariants } from '@/ui/Button'
import { cn } from '@/ui/cn'

export type EditorMessageKind =
  'no-session' | 'bad-link' | 'rate' | 'server' | 'expired' | 'refunded' | 'demo'

const COPY: Record<EditorMessageKind, { emoji: string; title: string; text: ReactNode }> = {
  'no-session': {
    emoji: '📬',
    title: 'Entrá con el link de tu mail',
    text: (
      <>
        Después de pagar te mandamos un mail con tu <strong>link personal de edición</strong>.
        Abrilo desde cualquier dispositivo: no hace falta usuario ni clave.
      </>
    ),
  },
  'bad-link': {
    emoji: '🔗',
    title: 'Ese link no funciona',
    text: (
      <>
        Puede que esté incompleto o que te hayamos mandado uno nuevo (el anterior deja de andar).
        Buscá el último mail que te enviamos o escribinos y te lo reenviamos.
      </>
    ),
  },
  rate: {
    emoji: '⏳',
    title: 'Demasiados intentos',
    text: <>Esperá unos minutos y volvé a abrir el link de tu mail.</>,
  },
  server: {
    emoji: '🛠️',
    title: 'No pudimos abrir el editor',
    text: <>Tuvimos un problema de nuestro lado. Probá de nuevo en un rato.</>,
  },
  expired: {
    emoji: '⌛',
    title: 'El plazo para editar venció',
    text: (
      <>
        Esta Boxie ya no se puede editar. Si creés que es un error, escribinos con el código de tu
        Boxie.
      </>
    ),
  },
  refunded: {
    emoji: '↩️',
    title: 'Esta Boxie fue reembolsada',
    text: <>Si tenés dudas sobre la devolución, escribinos.</>,
  },
  demo: {
    emoji: '🧪',
    title: 'En la demo, el editor es de prueba',
    text: (
      <>
        Esta versión de demostración no cobra ni guarda Boxies reales. Podés probar el editor
        completo con cualquier temática: lo que cargues queda en tu navegador.
      </>
    ),
  },
}

export function EditorMessage({
  kind,
  themes = [],
}: {
  kind: EditorMessageKind
  themes?: { slug: string; name: string }[]
}) {
  const copy = COPY[kind]
  return (
    <div className="flex min-h-dvh flex-col items-center bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 py-12">
      <Link href="/" aria-label="Boxie Digital, inicio">
        <Image src="/brand/boxie-logo.png" alt="Boxie" width={129} height={45} priority />
      </Link>
      <div className="mt-10 w-full max-w-xl rounded-[30px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.08)] sm:p-10">
        <div className="mb-4 text-5xl" aria-hidden>
          {copy.emoji}
        </div>
        <h1 className="mb-3 font-display text-3xl font-bold text-ink">{copy.title}</h1>
        <p className="leading-relaxed text-neutral-600">{copy.text}</p>

        {kind === 'demo' && themes.length > 0 && (
          <div className="mt-6 flex flex-col gap-3">
            {themes.map((t) => (
              <Link
                key={t.slug}
                href={`/ejemplo/${t.slug}/personalizar` as Route}
                className={cn(buttonVariants({ block: true }))}
              >
                Probar el editor · {t.name}
              </Link>
            ))}
          </div>
        )}

        {kind !== 'demo' && (
          <p className="mt-6 text-sm text-neutral-500">
            ¿Necesitás ayuda? Escribinos a{' '}
            <a href={`mailto:${site.emails.help}`} className="font-semibold text-brand">
              {site.emails.help}
            </a>{' '}
            con el mail que usaste al comprar.
          </p>
        )}
      </div>
    </div>
  )
}
