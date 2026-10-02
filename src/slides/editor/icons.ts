import type { IconName } from '@/domain/icons'
import { SUMMARY_ICONS } from '../summary-icons'
import type { EditorIcon } from './modules'

export const EDITOR_ICONS: Record<EditorIcon, IconName> = {
  ...SUMMARY_ICONS,
  user: 'hola',
  lock: 'candado',
}
