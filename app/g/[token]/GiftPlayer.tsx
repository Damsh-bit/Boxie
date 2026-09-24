'use client'

import { AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import type { ParsedThemeConfig } from '@/slides/config'
import { Player, type PlayerData } from '@/slides/player/Player'
import { markGiftOpenedAction } from './actions'
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
}: {
  token: string
  config: ParsedThemeConfig
  data: PlayerData
  intro: boolean
}) {
  const [opened, setOpened] = useState(!intro)

  // La apertura se registra cuando el regalo se muestra de verdad (no al
  // armar la vista previa del link, ni con la tapa todavía cerrada).
  useEffect(() => {
    if (opened) void markGiftOpenedAction(token)
  }, [opened, token])

  return (
    <>
      {opened && <Player config={config} data={data} animateIn={intro} />}
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
