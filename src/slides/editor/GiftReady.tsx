'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy, ExternalLink, Eye, PencilLine, Share2 } from 'lucide-react'
import { useState } from 'react'
import { site } from '@/content/site'
import { Button, ButtonLink } from '@/ui/Button'
import { ConfettiBurst } from '@/ui/ConfettiBurst'
import { ease, spring, useCalm } from '@/ui/motion'
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

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: ease.out } },
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
  const calm = useCalm()
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
    <div className="relative min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,#ffe3e8_0%,#fdfbfb_45%)] px-4 pt-10 pb-16 sm:pt-16">
      <ConfettiBurst className="top-24" delay={0.35} />
      <motion.div
        className="relative mx-auto w-full max-w-lg rounded-[32px] bg-white p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.1)] sm:p-10"
        initial="hidden"
        animate="show"
        variants={{
          hidden: { opacity: 0, y: 50, scale: 0.95 },
          show: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { ...spring.gentle, staggerChildren: 0.07, delayChildren: 0.3 },
          },
        }}
      >
        <motion.div
          className="mb-4 inline-block text-6xl"
          aria-hidden
          variants={{
            hidden: { y: -80, scale: 0.4, rotate: -25, opacity: 0 },
            show: { y: 0, scale: 1, rotate: 0, opacity: 1, transition: spring.bouncy },
          }}
        >
          <motion.span
            className="inline-block"
            animate={
              calm
                ? undefined
                : {
                    transform: [
                      'rotate(0deg) scale(1)',
                      'rotate(-10deg) scale(1.08)',
                      'rotate(8deg) scale(1.08)',
                      'rotate(0deg) scale(1)',
                      'rotate(0deg) scale(1)',
                    ],
                  }
            }
            transition={{
              duration: 2.6,
              times: [0, 0.1, 0.2, 0.3, 1],
              repeat: Infinity,
              delay: 1.2,
            }}
          >
            🎁
          </motion.span>
        </motion.div>
        <motion.h1 variants={item} className="font-display text-3xl font-bold text-ink sm:text-4xl">
          {sandbox ? '¡Así se regala una Boxie!' : '¡Boxie lista!'}
        </motion.h1>
        <motion.p variants={item} className="mx-auto mt-3 max-w-sm text-neutral-600">
          {sandbox
            ? `Cuando la comprás, en este paso te damos un link único para mandarle a ${name} por WhatsApp.`
            : `Ya podés mandársela a ${name}. Se abre desde el celular, sin instalar nada.`}
        </motion.p>

        {giftUrl && (
          <>
            <motion.div
              variants={item}
              className="relative mt-8 overflow-hidden rounded-3xl bg-ink p-5 text-left text-white"
            >
              <span className="absolute -top-4 -right-2 text-7xl opacity-10" aria-hidden>
                🎀
              </span>
              <p className="text-xs font-semibold tracking-widest text-white/60 uppercase">
                Link del regalo
              </p>
              <p className="mt-2 font-mono text-sm break-all text-brand-muted">{giftUrl}</p>
              <motion.button
                type="button"
                onClick={() => void copy('link')}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/20"
                whileTap={{ scale: 0.94 }}
              >
                <CopyIcon done={copied === 'link'} />
                {copied === 'link' ? '¡Copiado!' : 'Copiar link'}
              </motion.button>
            </motion.div>

            <motion.div variants={item} className="mt-6 flex flex-col gap-3">
              <ButtonLink
                href={whatsappShareUrl(message)}
                external
                target="_blank"
                rel="noopener noreferrer"
                variant="whatsapp"
                size="lg"
                block
              >
                <Share2 className="size-5" aria-hidden /> Enviar por WhatsApp
              </ButtonLink>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" onClick={() => void share()}>
                  <Share2 className="size-4" aria-hidden /> Compartir
                </Button>
                <Button type="button" variant="secondary" onClick={() => void copy('message')}>
                  <CopyIcon done={copied === 'message'} />
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
            </motion.div>
          </>
        )}

        {sandbox && (
          <motion.div variants={item} className="mt-8 flex flex-col gap-3">
            <Button type="button" size="lg" block onClick={onViewGift}>
              <Eye className="size-5" aria-hidden /> Ver el regalo como {name}
            </Button>
            <ButtonLink href={`/checkout?tematica=${theme.slug}`} variant="dark" size="lg" block>
              Quiero regalar una Boxie {theme.name}
            </ButtonLink>
            <Button type="button" variant="ghost" onClick={onKeepEditing}>
              <PencilLine className="size-4" aria-hidden /> Seguir editando la prueba
            </Button>
          </motion.div>
        )}

        <motion.div
          variants={item}
          className="mt-8 space-y-2 border-t border-dashed border-neutral-200 pt-6 text-sm leading-relaxed text-neutral-500"
        >
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
        </motion.div>
      </motion.div>
    </div>
  )
}

/** Copiar → tilde, con un giro. */
function CopyIcon({ done }: { done: boolean }) {
  return (
    <span className="relative grid size-4 place-items-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={done ? 'done' : 'copy'}
          className="grid place-items-center"
          initial={{ scale: 0, rotate: -90, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0, rotate: 90, opacity: 0 }}
          transition={spring.bouncy}
        >
          {done ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
