'use client'

import { useEffect } from 'react'
import type { ParsedThemeConfig } from '@/slides/config'
import { Player, type PlayerData } from '@/slides/player/Player'
import { markGiftOpenedAction } from './actions'

/** El regalo, a pantalla completa. */
export function GiftPlayer({
  token,
  config,
  data,
}: {
  token: string
  config: ParsedThemeConfig
  data: PlayerData
}) {
  useEffect(() => {
    void markGiftOpenedAction(token)
  }, [token])
  return <Player config={config} data={data} />
}
