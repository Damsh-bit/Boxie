'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Gift, Heart, X } from 'lucide-react'
import type { Route } from 'next'
import { useState } from 'react'
import { ButtonLink } from '@/ui/Button'
import { spring } from '@/ui/motion'

const DISMISSED = 'bx-afterglow'

function wasDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED) === '1'
  } catch {
    return false
  }
}

/**
 * Al terminar el regalo: "¿Te emocionó? Respondele con una Boxie". Quien lo
 * recibe acaba de vivir el producto; esto le da el camino para regalar uno
 * (a quien se lo mandó o a otra persona), con el cupón de bienvenida si está
 * vigente. Los links van etiquetados (utm_medium=regalo): en Marketing se ven
 * como el canal "Regalos recibidos".
 *
 * Aparece una vez por visita y se cierra con la X.
 */
export function GiftAfterglow({
  show,
  senderName,
  offer,
}: {
  show: boolean
  senderName: string
  offer: { code: string; discount: string } | null
}) {
  const [closed, setClosed] = useState(wasDismissed)
  const open = show && !closed
  const sender = senderName.trim()
  const link = (campaign: string, para?: string) => {
    const params = new URLSearchParams({
      utm_source: 'boxie',
      utm_medium: 'regalo',
      utm_campaign: campaign,
    })
    if (para) params.set('para', para)
    if (offer) params.set('cupon', offer.code)
    return `/?${params}` as Route
  }
  const close = () => {
    setClosed(true)
    try {
      sessionStorage.setItem(DISMISSED, '1')
    } catch {
      // Sin almacenamiento: se cierra igual.
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          className="fixed inset-x-3 bottom-3 z-[80] mx-auto max-w-md rounded-[28px] bg-white p-5 shadow-[0_24px_70px_rgba(42,36,51,0.35)] ring-1 ring-black/5 sm:bottom-6"
          initial={{ y: 160, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 160, opacity: 0 }}
          transition={spring.gentle}
          aria-label="Regalá una Boxie"
        >
          <button
            type="button"
            onClick={close}
            className="absolute top-3 right-3 grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-ink"
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden />
          </button>
          <p className="flex items-center gap-2 pr-8 font-display text-xl font-bold text-ink">
            <Heart className="size-5 fill-brand text-brand" aria-hidden /> ¿Te emocionó?
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {sender
              ? `Devolvele el gesto a ${sender}, o sorprendé a alguien más.`
              : 'Sorprendé a alguien con una Boxie hecha por vos.'}
            {offer && (
              <>
                {' '}
                Tu primera Boxie tiene <b className="text-brand">{offer.discount}</b>.
              </>
            )}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {sender && (
              <ButtonLink href={link('respuesta', sender)} block onClick={close}>
                <Gift className="size-4" aria-hidden /> Responderle con una Boxie
              </ButtonLink>
            )}
            <ButtonLink
              href={link('regalo-recibido')}
              variant={sender ? 'secondary' : 'primary'}
              block
              onClick={close}
            >
              {sender ? 'Regalar a otra persona' : 'Crear una Boxie'}
            </ButtonLink>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
