'use client'

import { Check, Copy, ExternalLink, Eye, PencilLine, Share2 } from 'lucide-react'
import type { Route } from 'next'
import Link from 'next/link'
import { useState } from 'react'
import { site } from '@/content/site'
import { Button, buttonVariants } from '@/ui/Button'
import { cn } from '@/ui/cn'
import { formatLongDate, giftShareMessage, whatsappShareUrl } from './share'

interface Props {
  sandbox: boolean
  recipientName: string
  /** Link del regalo. En el modo prueba no hay link real. */
  giftUrl: string | null
  expiresAt: string
  emailedTo: string | null
  hasPassword: boolean
  theme: { name: string; slug: string }
  /** Modo prueba: abrir el regalo acá mismo, como lo vería el destinatario. */
  onViewGift?(): void
  /** Modo prueba: volver al editor. */
  onKeepEditing?(): void
}

/** La Boxie ya está bloqueada: el link para mandar y cómo mandarlo. */
export function GiftReady({
  sandbox,
  recipientName,
  giftUrl,
  expiresAt,
  emailedTo,
  hasPassword,
  theme,
  onViewGift,
  onKeepEditing,
}: Props) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null)
  const name = recipientName.trim() || 'esa persona'
  const message = giftUrl ? giftShareMessage({ recipientName, url: giftUrl, hasPassword }) : ''

  async function copy(what: 'link' | 'message') {
    if (!giftUrl) return
    try {
      await navigator.clipboard.writeText(what === 'link' ? giftUrl : message)
      setCopied(what)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      setCopied(null)
    }
  }

  async function share() {
    if (!giftUrl) return
    if (navigator.share) {
      try {
        await navigator.share({ title: `Un regalo para ${name}`, text: message })
      } catch {
        // cancelado
      }
    } else {
      await copy('message')
    }
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,#ffe3e8_0%,#fdfbfb_45%)] px-4 pt-10 pb-16 sm:pt-16">
      <div className="mx-auto w-full max-w-lg rounded-[32px] bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.1)] sm:p-10">
        <div className="mb-4 text-6xl" aria-hidden>
          🎁
        </div>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {sandbox ? '¡Así se regala una Boxie!' : '¡Boxie lista!'}
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-neutral-600">
          {sandbox
            ? `Cuando la comprás, en este paso te damos un link único para mandarle a ${name} por WhatsApp.`
            : `Ya podés mandársela a ${name}. Se abre desde el celular, sin instalar nada.`}
        </p>

        {giftUrl && (
          <>
            <div className="relative mt-8 overflow-hidden rounded-3xl bg-ink p-5 text-left text-white">
              <span className="absolute -top-4 -right-2 text-7xl opacity-10" aria-hidden>
                🎀
              </span>
              <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">
                Link del regalo
              </p>
              <p className="mt-2 font-mono text-sm break-all text-brand-muted">{giftUrl}</p>
              <button
                type="button"
                onClick={() => void copy('link')}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
              >
                {copied === 'link' ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied === 'link' ? '¡Copiado!' : 'Copiar link'}
              </button>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <a
                href={whatsappShareUrl(message)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: 'whatsapp', size: 'lg', block: true }))}
              >
                <Share2 className="size-5" aria-hidden /> Enviar por WhatsApp
              </a>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" onClick={() => void share()}>
                  <Share2 className="size-4" aria-hidden /> Compartir
                </Button>
                <Button type="button" variant="secondary" onClick={() => void copy('message')}>
                  {copied === 'message' ? '¡Copiado!' : 'Copiar mensaje'}
                </Button>
              </div>
              <a
                href={giftUrl}
                target="_blank"
                rel="noopener"
                className="mt-1 inline-flex items-center justify-center gap-2 text-sm font-semibold text-brand hover:underline"
              >
                <ExternalLink className="size-4" aria-hidden /> Ver el regalo
              </a>
            </div>
          </>
        )}

        {sandbox && (
          <div className="mt-8 flex flex-col gap-3">
            <Button type="button" size="lg" block onClick={onViewGift}>
              <Eye className="size-5" aria-hidden /> Ver el regalo como {name}
            </Button>
            <Link
              href={`/checkout?tematica=${theme.slug}` as Route}
              className={cn(buttonVariants({ variant: 'dark', size: 'lg', block: true }))}
            >
              Quiero regalar una Boxie {theme.name}
            </Link>
            <Button type="button" variant="ghost" onClick={onKeepEditing}>
              <PencilLine className="size-4" aria-hidden /> Seguir editando la prueba
            </Button>
          </div>
        )}

        <div className="mt-8 space-y-2 border-t border-dashed border-neutral-200 pt-6 text-sm leading-relaxed text-neutral-500">
          <p>
            {sandbox ? 'En una compra real, el regalo queda' : 'El regalo queda'} disponible hasta
            el <strong className="text-ink">{formatLongDate(expiresAt)}</strong>.
          </p>
          {hasPassword && !sandbox && (
            <p>Le pusiste clave: pasásela por otro lado, no en el mismo mensaje.</p>
          )}
          {emailedTo && (
            <p>
              También te mandamos el link a <strong className="text-ink">{emailedTo}</strong>.
            </p>
          )}
          <p>
            ¿Te equivocaste en algo? Escribinos a{' '}
            <a href={`mailto:${site.emails.help}`} className="font-semibold text-brand">
              {site.emails.help}
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
