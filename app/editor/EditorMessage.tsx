import { ArrowRight } from 'lucide-react'
import type { Route } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { site } from '@/content/site'
import { HoverZoom, LiftLink } from '@/ui/LiftLink'
import { MessageCard } from '@/ui/MessageCard'
import { Reveal, Stagger, StaggerItem } from '@/ui/motion'

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
        Esta versión de demostración no cobra ni guarda Boxies reales. Elegí una temática y probá el
        editor completo: lo que cargues queda en tu navegador.
      </>
    ),
  },
}

export function EditorMessage({
  kind,
  themes = [],
}: {
  kind: EditorMessageKind
  themes?: { slug: string; name: string; image: string }[]
}) {
  const copy = COPY[kind]
  return (
    <div className="flex min-h-dvh flex-col items-center bg-[linear-gradient(180deg,#fff0f3_0%,#ffffff_45%)] px-5 py-12">
      <Reveal y={-12}>
        <Link href="/" aria-label="Boxie Digital, inicio">
          <Image src="/brand/boxie-logo.png" alt="Boxie" width={129} height={45} priority />
        </Link>
      </Reveal>
      <MessageCard emoji={copy.emoji} title={copy.title} className="mt-10">
        <p className="leading-relaxed text-neutral-600">{copy.text}</p>

        {kind === 'demo' && themes.length > 0 && (
          <Stagger immediate delay={0.35} step={0.08} className="mt-7 grid gap-3 sm:grid-cols-3">
            {themes.map((t) => (
              <StaggerItem key={t.slug} y={18} className="h-full">
                <LiftLink
                  href={`/ejemplo/${t.slug}/personalizar` as Route}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-100 bg-white text-left shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-[border-color,box-shadow] duration-300 hover:border-brand hover:shadow-[0_14px_34px_rgb(244_78_99/0.18)]"
                >
                  <div className="relative h-28 overflow-hidden">
                    <HoverZoom className="absolute inset-0">
                      <Image src={t.image} alt="" fill sizes="200px" className="object-cover" />
                    </HoverZoom>
                  </div>
                  <span className="flex flex-1 items-center justify-between gap-2 px-3.5 py-3">
                    <span className="leading-tight">
                      <span className="block text-[11px] font-semibold tracking-wide text-neutral-400 uppercase">
                        Probar
                      </span>
                      <span className="font-semibold text-ink transition-colors group-hover:text-brand">
                        {t.name}
                      </span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-neutral-400 transition-colors group-hover:text-brand"
                      aria-hidden
                    />
                  </span>
                </LiftLink>
              </StaggerItem>
            ))}
          </Stagger>
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
      </MessageCard>
    </div>
  )
}
