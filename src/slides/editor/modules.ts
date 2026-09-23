import type { z } from 'zod'
import { buyerSlides, type ParsedThemeConfig } from '../config'
import { missingRequired, type MissingField } from '../fields'
import { slideDefinitions, type SlideKind } from '../schemas'
import type { SlideDefinition, SummaryIcon } from '../types'
import type { EditorDraft } from './draft'

/**
 * Los módulos del editor: uno por cada slide de la temática que tiene algo
 * para completar (dedicatoria, canción, razones, anécdota, cuponera), más los
 * datos de la portada y la clave opcional. Salen de la temática: una temática
 * nueva con otras slides trae sus módulos sin tocar el editor.
 */

export type EditorIcon = SummaryIcon | 'user' | 'lock'

export interface EditorModule {
  id: string
  kind: 'globals' | 'slide' | 'password'
  /** Clave de la slide (módulos de slide). */
  slideKey: string | null
  slideKind: SlideKind | null
  /** Qué slide mostrar en la vista previa mientras se edita este módulo. */
  previewIndex: number
  title: string
  intro: string
  icon: EditorIcon
}

export type ModuleState = 'complete' | 'incomplete' | 'optional'

export interface ModuleProgress {
  state: ModuleState
  missing: MissingField[]
}

export const GLOBALS_MODULE_ID = 'destinatario'
export const PASSWORD_MODULE_ID = 'clave'

export function editorModules(
  config: ParsedThemeConfig,
  { password = true }: { password?: boolean } = {},
): EditorModule[] {
  const coverIndex = config.slides.findIndex((s) => s.kind.startsWith('cover.'))
  const modules: EditorModule[] = [
    {
      id: GLOBALS_MODULE_ID,
      kind: 'globals',
      slideKey: null,
      slideKind: null,
      previewIndex: Math.max(coverIndex, 0),
      title: 'Para quién es',
      intro: 'Su nombre va en la portada y aparece en todo el regalo. El tuyo, en cada firma.',
      icon: 'user',
    },
  ]

  for (const slide of buyerSlides(config)) {
    const definition: SlideDefinition = slideDefinitions[slide.kind]
    modules.push({
      id: slide.key,
      kind: 'slide',
      slideKey: slide.key,
      slideKind: slide.kind,
      previewIndex: config.slides.indexOf(slide),
      title: definition.editor?.title ?? definition.summary?.title ?? definition.label,
      intro: definition.editor?.intro ?? definition.description,
      icon: definition.summary?.icon ?? 'sparkles',
    })
  }

  if (password) {
    modules.push({
      id: PASSWORD_MODULE_ID,
      kind: 'password',
      slideKey: null,
      slideKind: null,
      previewIndex: 0,
      title: 'Clave para abrirla',
      intro:
        'Opcional. Si la activás, el regalo pide una clave antes de abrirse. Se la pasás vos, por otro lado.',
      icon: 'lock',
    })
  }
  return modules
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.every(isBlank)
  if (typeof value === 'object') return Object.values(value).every(isBlank)
  return false
}

export function moduleProgress(
  module: EditorModule,
  draft: EditorDraft,
  extra: { hasPassword?: boolean } = {},
): ModuleProgress {
  if (module.kind === 'globals') {
    const missing: MissingField[] = []
    if (!draft.recipientName.trim())
      missing.push({ path: 'recipientName', label: 'Para (destinatario)' })
    if (!draft.senderName.trim()) missing.push({ path: 'senderName', label: 'De parte de' })
    return { state: missing.length ? 'incomplete' : 'complete', missing }
  }

  if (module.kind === 'password') {
    return { state: extra.hasPassword ? 'complete' : 'optional', missing: [] }
  }

  const schema = slideDefinitions[module.slideKind!].buyerSchema as z.ZodType | null
  const value = draft.slides[module.slideKey!] ?? {}
  if (!schema) return { state: 'complete', missing: [] }
  const missing = missingRequired(schema, value)
  if (missing.length) return { state: 'incomplete', missing }
  return { state: isBlank(value) ? 'optional' : 'complete', missing: [] }
}

export function progressSummary(
  modules: EditorModule[],
  draft: EditorDraft,
  extra: { hasPassword?: boolean } = {},
) {
  const all = modules.map((m) => ({ module: m, ...moduleProgress(m, draft, extra) }))
  const required = all.filter((m) => m.module.kind !== 'password')
  return {
    modules: all,
    done: required.filter((m) => m.state === 'complete').length,
    total: required.length,
    missing: all.flatMap((m) =>
      m.missing.map((field) => ({ moduleId: m.module.id, module: m.module.title, ...field })),
    ),
  }
}
