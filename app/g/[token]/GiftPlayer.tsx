'use client'

import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ParsedThemeConfig } from '@/slides/config'
import { Player, type PlayerData } from '@/slides/player/Player'
import { markGiftOpenedAction } from './actions'
import { GiftAfterglow } from './GiftAfterglow'
import { GiftIntro } from './GiftIntro'

/**
 * El regalo, a pantalla completa. Sin clave arranca con la tapa ("Abrir mi
 * regalo"); con clave, la pantalla de la clave ya hizo de tapa.
 */
export function GiftPlayer({
  token,
  config,
  data,
  intro,
  offer = null,
}: {
  token: string
  config: ParsedThemeConfig
  data: PlayerData
  intro: boolean
  /** El cupón de bienvenida (lo ofrece la tarjeta del final). */
  offer?: { code: string; discount: string } | null
}) {
  const [opened, setOpened] = useState(!intro)
  const [atEnd, setAtEnd] = useState(false)
  const [afterglow, setAfterglow] = useState(false)

  // Llegó a la última pantalla: después de un momento (para que la disfrute), la invitación a regalar.
  useEffect(() => {
    if (!atEnd) return
    const timer = setTimeout(() => setAfterglow(true), 2500)
    return () => clearTimeout(timer)
  }, [atEnd])

  // La apertura se registra cuando el regalo se muestra de verdad (no al
  // armar la vista previa del link, ni con la tapa todavía cerrada).
  useEffect(() => {
    if (opened) void markGiftOpenedAction(token)
  }, [opened, token])

  return (
    <>
      {opened && (
        <Player
          config={config}
          data={data}
          animateIn={intro}
          onSlideChange={(index) => setAtEnd(index >= config.slides.length - 1)}
        />
      )}
      <GiftAfterglow show={afterglow} senderName={data.senderName} offer={offer} />
      <AnimatePresence>
        {!opened && (
          <GiftIntro
            key="tapa"
            recipientName={data.recipientName}
            senderName={data.senderName}
            onOpen={() => setOpened(true)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
