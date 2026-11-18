import { StoryMomentsGrid } from './rb-story-moments-love'
import type { Props } from './shared'

/**
 * 05 · Recorrido: las fotos de quien regala como polaroids en una grilla de
 * 2 × 2 (rb-story-moments-love.tsx). En Pareja, con cinta washi; en
 * Cumpleaños, con moños y globos, en dos diseños.
 */
export function StoryMoments(props: Props<'story.moments'>) {
  return <StoryMomentsGrid {...props} />
}
