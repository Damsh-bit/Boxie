import { slideDefinitions, type SlideKind } from './schemas'
import type { SlideDefinition } from './types'

/**
 * Cómo se llama una pantalla en el repaso final y en el editor. Lo da su tipo
 * (`summary`, `editor`), pero una temática lo puede pisar con sus props
 * `screenTitle`, `editorTitle` y `editorIntro`: la misma pantalla de notas es
 * "10 deseos" en Cumpleaños y "10 razones" en Pareja.
 *
 * Sin React: lo usan el player, el editor y el panel.
 */

interface Named {
  kind: SlideKind
  props: unknown
}

function own(props: unknown, key: string): string | undefined {
  const value = (props as Record<string, unknown> | null | undefined)?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function slideSummary(slide: Named) {
  const definition = slideDefinitions[slide.kind] as SlideDefinition
  if (!definition.summary) return null
  return {
    ...definition.summary,
    title: own(slide.props, 'screenTitle') ?? definition.summary.title,
  }
}

export function slideEditorInfo(slide: Named) {
  const definition = slideDefinitions[slide.kind] as SlideDefinition
  return {
    title:
      own(slide.props, 'editorTitle') ??
      definition.editor?.title ??
      own(slide.props, 'screenTitle') ??
      definition.summary?.title ??
      definition.label,
    intro: own(slide.props, 'editorIntro') ?? definition.editor?.intro ?? definition.description,
  }
}
