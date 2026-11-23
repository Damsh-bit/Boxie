import { describe, expect, it } from 'vitest'
import amistad from '../../../supabase/seed/themes/amistad.json'
import cumpleanos from '../../../supabase/seed/themes/cumpleanos.json'
import pareja from '../../../supabase/seed/themes/pareja.json'
import { readThemeConfig } from '../config'
import { playSound, themeSounds } from './sound'

describe('sonidos', () => {
  it('suena solo la Ribbly de cumpleaños', () => {
    expect(themeSounds(readThemeConfig(cumpleanos.config))).toBe(true)
    expect(themeSounds(readThemeConfig(pareja.config))).toBe(false)
    expect(themeSounds(readThemeConfig(amistad.config))).toBe(false)
  })

  it('sin navegador (servidor) no hace nada ni falla', () => {
    const stop = playSound('fanfare')
    expect(() => stop()).not.toThrow()
  })
})
